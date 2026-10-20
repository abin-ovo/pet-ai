import type { Snapshot, PetCommand, Tab, ChatResult, Connection, ConnectionCheckResult, Rect, RuntimeStatus } from './types'
export type DragCommand = { phase: 'start' | 'move' | 'end'; screenX: number; screenY: number }
export interface PetBridge {
  getSnapshot(): Promise<Snapshot>
  dispatch(command: PetCommand): Promise<Snapshot>
  subscribe(listener: (snapshot: Snapshot) => void): () => void
  status(): Promise<RuntimeStatus>
  subscribeStatus(listener: (status: RuntimeStatus) => void): () => void
  onTab(listener: (tab: Tab) => void): () => void
  openPanel(tab: Tab): Promise<void>
  closePanel(): Promise<void>
  hide(): Promise<void>
  sendChat(text: string): Promise<ChatResult>
  cancelChat(): Promise<void>
  checkConnection(): Promise<ConnectionCheckResult>
  saveConnection(connection: Connection, key?: string): Promise<void>
  removeConnection(): Promise<void>
  setHitRegions(regions: Rect[]): Promise<void>
  drag(command: DragCommand): Promise<void>
}
declare global { interface Window { xiaotuan: PetBridge } }
