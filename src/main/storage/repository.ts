import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { snapshotSchema, type Snapshot } from '../../shared/types'
import { createSnapshot } from '../../shared/defaults'
const missing = (e: unknown) => (e as NodeJS.ErrnoException).code === 'ENOENT'
export class Repository {
  private queue: Promise<void> = Promise.resolve()
  constructor(private dir: string, private write: (path: string, data: string) => Promise<void> = (p, d) => writeFile(p, d, { mode: 0o600 })) {}
  private decode(text: string): Snapshot {
    const value = JSON.parse(text)
    if (typeof value?.version === 'number' && value.version > 1) throw new Error('此存档由较新版本创建，请升级小团后打开')
    return snapshotSchema.parse(value)
  }
  async load(): Promise<{ snapshot: Snapshot; recovered: boolean }> {
    await mkdir(this.dir, { recursive: true })
    let recovered = false
    for (const name of ['pet.json', 'pet.backup.json']) {
      const path = join(this.dir, name)
      try { return { snapshot: this.decode(await readFile(path, 'utf8')), recovered: recovered || name !== 'pet.json' } }
      catch (e) {
        if (e instanceof Error && e.message.includes('较新版本')) throw e
        if (missing(e)) continue
        if ((e as NodeJS.ErrnoException).code) throw e
        recovered = true
        await rename(path, `${path}.corrupt-${Date.now()}`)
      }
    }
    return { snapshot: createSnapshot(), recovered }
  }
  save(s: Snapshot): Promise<void> {
    const text = JSON.stringify(snapshotSchema.parse(s))
    const operation = this.queue.then(async () => {
      await mkdir(this.dir, { recursive: true })
      const path = join(this.dir, 'pet.json')
      let previous: string | null = null
      try { const raw = await readFile(path, 'utf8'); this.decode(raw); previous = raw }
      catch (e) {
        if (e instanceof Error && e.message.includes('较新版本')) throw e
        if ((e as NodeJS.ErrnoException).code && !missing(e)) throw e
      }
      await this.write(`${path}.tmp`, text)
      if (previous) {
        const backup = join(this.dir, 'pet.backup.json')
        await this.write(`${backup}.tmp`, previous)
        await rename(`${backup}.tmp`, backup)
      }
      await rename(`${path}.tmp`, path)
    })
    this.queue = operation.catch(() => {})
    return operation
  }
}
