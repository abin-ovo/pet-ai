import type { Connection, Snapshot } from '../../shared/types'
export type ConnectionDeps = { snapshot(): Snapshot; credentials: { read(endpoint?: string): Promise<string | null>; write(key: string, endpoint?: string): Promise<void>; clear(): Promise<void> }; update(connection: Connection): Promise<void> }
export async function saveConnection(deps: ConnectionDeps, connection: Connection, key?: string): Promise<void> {
  const old = deps.snapshot().connection
  if (!key && old?.endpoint !== connection.endpoint) throw new Error('服务地址已更改，请重新填写连接密钥')
  const previousKey = await deps.credentials.read(old?.endpoint)
  if (!key && !previousKey) throw new Error('请填写连接密钥')
  if (key) await deps.credentials.write(key, connection.endpoint)
  try { await deps.update(connection) }
  catch (e) {
    if (key) { if (previousKey) await deps.credentials.write(previousKey, old?.endpoint); else await deps.credentials.clear() }
    throw e
  }
}
