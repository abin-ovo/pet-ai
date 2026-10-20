import { expect, it } from 'vitest'
import { ChatController, type ChatDeps } from '../../src/main/ai/controller'
import { buildContext } from '../../src/main/ai/context'
import { createSnapshot } from '../../src/shared/defaults'
import { Store } from '../../src/main/store'
const setup = (request: ChatDeps['request'], connected = true) => {
  let snapshot = createSnapshot(0)
  if (connected) snapshot.connection = { endpoint: 'https://example.test/chat', model: 'pet-model' }
  const controller = new ChatController({ snapshot: () => snapshot, update: async f => { snapshot = f(snapshot) }, readKey: async () => connected ? 'local-test-key' : null, request, onBusy: () => {} })
  return { controller, snapshot: () => snapshot }
}
it('does not send unconfigured chats or alter relationship on failure', async () => {
  let requests = 0
  const a = setup(async () => { requests++; return { text: 'hello' } }, false)
  expect((await a.controller.send('你好')).status).toBe('error')
  expect(requests).toBe(0)
  const b = setup(async () => { throw new Error('连接暂时失败') })
  expect((await b.controller.send('今天很累')).status).toBe('error')
  expect(b.snapshot().pet.bond).toBe(0)
  expect(b.snapshot().messages.map(m => m.text)).toEqual(['今天很累'])
  await b.controller.send('今天很累')
  expect(b.snapshot().messages).toHaveLength(1)
})
it('cancels late replies and refuses overlapping requests', async () => {
  let finish!: (value: { text: string }) => void
  const a = setup(() => new Promise(resolve => { finish = resolve }))
  const first = a.controller.send('你好')
  await new Promise(resolve => setTimeout(resolve, 0))
  expect((await a.controller.send('又来啦')).status).toBe('error')
  a.controller.cancel()
  finish({ text: '迟到的回复' })
  expect((await first).status).toBe('cancelled')
  expect(a.snapshot().messages.map(m => m.role)).toEqual(['user'])
  expect(a.snapshot().pet.bond).toBe(0)
})
it('stores a successful reply but never invents confirmed memories', async () => {
  const a = setup(async () => ({ text: '过来靠一会儿吧。' }))
  expect((await a.controller.send('累了')).status).toBe('ok')
  expect(a.snapshot().messages.map(m => m.role)).toEqual(['user', 'assistant'])
  expect(a.snapshot().memories).toEqual([])
  expect(a.snapshot().pet.bond).toBe(1)
})
it('checks the saved connection without sending private context or modifying the pet', async () => {
  let sent: unknown
  const a = setup(async (_config, _key, messages) => { sent = messages; return { text: '连接成功' } })
  a.snapshot().messages = [{ id: 'private', role: 'user', text: '私人聊天', createdAt: 0 }]
  a.snapshot().memories = [{ id: 'private-memory', kind: 'moment', text: '私人回忆', createdAt: 0 }]
  const before = structuredClone(a.snapshot())
  expect((await a.controller.checkConnection()).status).toBe('ok')
  expect(sent).toEqual([{ role: 'user', content: '请只回复：连接成功' }])
  expect(a.snapshot()).toEqual(before)
})
it('returns actionable connection check failures and prevents concurrent chats', async () => {
  let finish!: (value: { text: string }) => void
  const a = setup(() => new Promise(resolve => { finish = resolve }))
  const checking = a.controller.checkConnection()
  await new Promise(resolve => setTimeout(resolve, 0))
  expect((await a.controller.send('你好')).status).toBe('error')
  a.controller.cancel()
  finish({ text: '迟到的检测回复' })
  expect((await checking).status).toBe('cancelled')
  expect(a.snapshot().messages).toEqual([])
  const b = setup(async () => { throw new Error('API 预付余额已耗尽') })
  expect(await b.controller.checkConnection()).toEqual({ status: 'error', reason: 'API 预付余额已耗尽' })
})
it('limits context and removes deleted memories and source messages independently', () => {
  const s = createSnapshot(0)
  s.messages = Array.from({ length: 25 }, (_, i) => ({ id: String(i), role: 'user' as const, text: `消息${i}`, createdAt: 0 }))
  s.memories = [{ id: 'a', kind: 'preference', text: '喜欢绿茶', createdAt: 0 }]
  const context = buildContext(s, '新消息')
  expect(context).toHaveLength(21)
  expect(context[0].content).toContain('喜欢绿茶')
  expect(context.some(m => m.content === '消息0')).toBe(false)
  s.memories = []; s.messages = s.messages.filter(m => m.id !== '24')
  const clean = buildContext(s, '新消息')
  expect(clean[0].content).not.toContain('喜欢绿茶')
  expect(clean.some(m => m.content === '消息24')).toBe(false)
})
it('reports a completed reply when cancel arrives after the persistence commit boundary', async () => {
  let release!: () => void
  let entered!: () => void
  const started = new Promise<void>(resolve => { entered = resolve })
  const initial = createSnapshot(0)
  initial.connection = { endpoint: 'https://example.test/chat', model: 'pet' }
  const store = new Store(initial, { save: async (s) => { if (s.messages.at(-1)?.role === 'assistant') { entered(); await new Promise<void>(resolve => { release = resolve }) } } }, () => {}, () => {})
  const chat = new ChatController({ snapshot: () => store.snapshot, update: f => store.update(f), readKey: async () => 'test', request: async () => ({ text: '我在这里。' }), onBusy: () => {} })
  const pending = chat.send('今天很累')
  await started
  chat.cancel()
  release()
  expect((await pending).status).toBe('ok')
  expect(store.snapshot.messages.map(m => m.role)).toEqual(['user', 'assistant'])
  expect(store.snapshot.pet.bond).toBe(1)
})
