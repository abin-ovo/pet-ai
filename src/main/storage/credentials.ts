import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises'
import { join } from 'node:path'
export type Encryption = { available(): boolean; encrypt(text: string): Promise<Buffer>; decrypt(data: Buffer): Promise<string> }
export class CredentialStore {
  constructor(private dir: string, private encryption: Encryption) {}
  async read(endpoint?: string): Promise<string | null> {
    let bytes: Buffer
    try { bytes = await readFile(join(this.dir, 'connection.key')) }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e }
    if (!this.encryption.available()) throw new Error('系统加密暂不可用，请重新连接')
    let value: { version?: unknown; key?: unknown; endpoint?: unknown }
    try { value = JSON.parse(await this.encryption.decrypt(bytes)) } catch { throw new Error('已保存的连接密钥无法读取，请移除连接后重新配置') }
    if (value.version !== 1 || typeof value.key !== 'string') throw new Error('连接密钥格式无效，请移除连接后重新配置')
    if (value.endpoint !== (endpoint ?? null)) return null
    return value.key
  }
  async write(key: string, endpoint?: string): Promise<void> {
    if (!this.encryption.available()) throw new Error('系统加密不可用，无法安全保存连接')
    const bytes = await this.encryption.encrypt(JSON.stringify({ version: 1, endpoint: endpoint ?? null, key }))
    await mkdir(this.dir, { recursive: true })
    const file = join(this.dir, 'connection.key')
    await writeFile(`${file}.tmp`, bytes, { mode: 0o600 })
    await rename(`${file}.tmp`, file)
  }
  async clear(): Promise<void> {
    try { await unlink(join(this.dir, 'connection.key')) }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e }
  }
}
