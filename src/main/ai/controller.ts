import type { Snapshot, ChatResult, Connection, ConnectionCheckResult } from '../../shared/types'
import type { ProviderMessage } from './context'
import { buildContext } from './context'
import { creditConnection } from '../../pet/engine'
export type ChatDeps = { snapshot(): Snapshot; update(f: (s: Snapshot) => Snapshot): Promise<void>; readKey(): Promise<string | null>; request(config: Connection, key: string, messages: ProviderMessage[], signal: AbortSignal): Promise<{ text: string }>; onBusy(busy: boolean): void }
export class ChatController {
  private active: AbortController | null = null
  private committing: AbortController | null = null
  constructor(private deps: ChatDeps) {}
  async checkConnection(): Promise<ConnectionCheckResult> {
    if (this.active) return { status: 'error', reason: '正在连接模型服务，请等待当前请求完成' }
    const connection = this.deps.snapshot().connection
    if (!connection) return { status: 'error', reason: '请先保存聊天连接' }
    const controller = new AbortController()
    this.active = controller
    this.deps.onBusy(true)
    try {
      const key = await this.deps.readKey()
      if (controller.signal.aborted) return { status: 'cancelled', reason: '检测已取消' }
      if (!key) return { status: 'error', reason: '请先保存连接密钥' }
      await this.deps.request(connection, key, [{ role: 'user', content: '请只回复：连接成功' }], controller.signal)
      return controller.signal.aborted ? { status: 'cancelled', reason: '检测已取消' } : { status: 'ok', reason: '连接正常，模型已成功回复。可以去聊天了。' }
    } catch (e) {
      return controller.signal.aborted ? { status: 'cancelled', reason: '检测已取消' } : { status: 'error', reason: e instanceof Error ? e.message : '检测失败，请检查连接设置' }
    } finally {
      if (this.active === controller) { this.active = null; this.deps.onBusy(false) }
    }
  }
  async send(raw: string): Promise<ChatResult> {
    const text = raw.trim()
    if (!text || text.length > 2000) return { status: 'error', reason: '请写下 1–2000 个字' }
    if (this.active) return { status: 'error', reason: '小团正在听你说，稍等一下' }
    const snapshot = this.deps.snapshot()
    if (!snapshot.connection) return { status: 'error', reason: '聊天尚未连接，请先前往设置' }
    const controller = new AbortController()
    this.active = controller
    this.deps.onBusy(true)
    try {
      const key = await this.deps.readKey()
      if (controller.signal.aborted) return { status: 'cancelled', reason: '已取消，内容为你保留' }
      if (!key) return { status: 'error', reason: '请在设置中保存连接密钥' }
      await this.deps.update(s => {
        if (controller.signal.aborted || (s.messages.at(-1)?.role === 'user' && s.messages.at(-1)?.text === text)) return s
        return { ...s, messages: [...s.messages, { id: crypto.randomUUID(), role: 'user', text, createdAt: Date.now() }] }
      })
      const context = buildContext(this.deps.snapshot(), text)
      const reply = await this.deps.request(snapshot.connection, key, context, controller.signal)
      if (controller.signal.aborted || this.active !== controller) return { status: 'cancelled', reason: '已取消，内容为你保留' }
      // Once a provider reply has been accepted for persistence, finish the commit.
      // A cancellation here must not report a cancelled reply that was in fact saved.
      this.committing = controller
      const message = { id: crypto.randomUUID(), role: 'assistant' as const, text: reply.text, createdAt: Date.now() }
      await this.deps.update(s => controller.signal.aborted ? s : ({ ...s, messages: [...s.messages, message], pet: creditConnection(s.pet, Date.now()) }))
      return controller.signal.aborted ? { status: 'cancelled', reason: '已取消' } : { status: 'ok', message }
    } catch (e) {
      return controller.signal.aborted ? { status: 'cancelled', reason: '已取消，内容为你保留' } : { status: 'error', reason: e instanceof Error ? e.message : '暂时没连上，请稍后再试' }
    } finally {
      if (this.committing === controller) this.committing = null
      if (this.active === controller) { this.active = null; this.deps.onBusy(false) }
    }
  }
  cancel(): void { if (this.active && this.active === this.committing) return; this.active?.abort(); this.active = null; this.deps.onBusy(false) }
}
