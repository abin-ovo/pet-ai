import { BrowserWindow, ipcMain } from 'electron'
import { z } from 'zod'
import { assertTrusted, validateCommand } from '../shared/validation'
import { connectionSchema, type Rect, type RuntimeStatus, type Tab } from '../shared/types'
import type { DragCommand } from '../shared/bridge'
import type { Store } from './store'
import type { ChatController } from './ai/controller'
import type { CredentialStore } from './storage/credentials'
import { saveConnection } from './ai/connection'
const rect = z.object({ x: z.number().finite().min(0), y: z.number().finite().min(0), width: z.number().finite().min(0).max(360), height: z.number().finite().min(0).max(300) }).strict().refine(r => r.x+r.width <= 361 && r.y+r.height <= 301)
const dragSchema = z.object({ phase: z.enum(['start','move','end']), screenX: z.number().finite().min(-100000).max(100000), screenY: z.number().finite().min(-100000).max(100000) }).strict()
export type HostDependencies = { store: Store; chat: ChatController; credentials: CredentialStore; pet: BrowserWindow; panel: BrowserWindow; status(): RuntimeStatus; setConnected(value: boolean): void; dispatch(input: unknown): Promise<void>; openPanel(tab: Tab): void; hide(): void; setHitRegions(regions: Rect[]): void; drag(command: DragCommand): void }
export function registerIpc(d: HostDependencies) {
  let connectionQueue: Promise<void> = Promise.resolve()
  const handle = (name: string, fn: (...args: any[]) => unknown, petOnly = false) => {
    ipcMain.handle(`pet:${name}`, (event, ...args: unknown[]) => {
      const owner = BrowserWindow.fromWebContents(event.sender)
      if (!owner || (owner !== d.pet && owner !== d.panel)) throw new Error('不受信任的窗口')
      assertTrusted(event.sender.id, owner.webContents.id, event.senderFrame === owner.webContents.mainFrame)
      if (petOnly && owner !== d.pet) throw new Error('仅宠物窗口可操作桌面位置')
      return fn(...args)
    })
  }
  handle('snapshot', () => d.store.snapshot)
  handle('status', d.status)
  handle('dispatch', async input => { validateCommand(input); await d.dispatch(input); return d.store.snapshot })
  handle('open-panel', tab => d.openPanel(z.enum(['pet','chat','memories','settings']).parse(tab)))
  handle('close-panel', () => d.panel.hide())
  handle('hide', d.hide)
  handle('chat', text => d.status().connected ? d.chat.send(z.string().trim().min(1).max(2000).parse(text)) : { status: 'error', reason: '聊天尚未连接，请前往设置' })
  handle('cancel-chat', () => d.chat.cancel())
  handle('check-connection', () => d.chat.checkConnection())
  handle('connection', async (raw, keyRaw) => {
    const connection = connectionSchema.parse(raw)
    const key = z.string().trim().min(1).max(4096).optional().parse(keyRaw)
    const operation = connectionQueue.then(async () => {
      d.chat.cancel(); d.setConnected(false)
      try {
        await saveConnection({ snapshot: () => d.store.snapshot, credentials: d.credentials, update: c => d.store.update(s => ({ ...s, connection: c })) }, connection, key)
        d.setConnected(true)
      } catch (e) { d.setConnected(false); throw e }
    })
    connectionQueue = operation.catch(() => {})
    return operation
  })
  handle('disconnect', () => {
    const operation = connectionQueue.then(async () => { d.chat.cancel(); d.setConnected(false); await d.credentials.clear(); await d.store.update(s => ({ ...s, connection: null })) })
    connectionQueue = operation.catch(() => {})
    return operation
  })
  handle('hit-regions', regions => d.setHitRegions(z.array(rect).max(8).parse(regions)), true)
  handle('drag', input => d.drag(dragSchema.parse(input)), true)
}
