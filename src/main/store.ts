import { snapshotSchema, type Snapshot } from '../shared/types'
import type { Repository } from './storage/repository'
export class Store {
  private queue = Promise.resolve()
  constructor(public snapshot: Snapshot, private repo: Pick<Repository, 'save'>, private publish: (s: Snapshot) => void, private onError: (failed: boolean) => void) {}
  update(change: (s: Snapshot) => Snapshot, persist = true): Promise<void> {
    const operation = this.queue.then(async () => {
      const next = snapshotSchema.parse(change(this.snapshot))
      if (persist) {
        try { await this.repo.save(next); this.onError(false) }
        catch { this.onError(true); throw new Error('暂时无法保存，原有存档仍保留。请检查磁盘空间和访问权限。') }
      }
      this.snapshot = next
      this.publish(next)
    })
    this.queue = operation.catch(() => {})
    return operation
  }
  flush(): Promise<void> { return this.update(s => s) }
}
