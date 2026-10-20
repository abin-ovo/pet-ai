import { expect, it } from 'vitest'
import { saveConnection } from '../../src/main/ai/connection'
import { createSnapshot } from '../../src/shared/defaults'
it('requires a new key when changing hosts and rolls back keys on persistence failure', async () => {
  const snapshot = createSnapshot(0)
  snapshot.connection = { endpoint: 'https://old.test/chat', model: 'old' }
  let key: string | null = 'old-key'
  const deps = { snapshot: () => snapshot, credentials: { read: async () => key, write: async (k: string) => { key = k }, clear: async () => { key = null } }, update: async () => { throw new Error('disk full') } }
  await expect(saveConnection(deps, { endpoint: 'https://new.test/chat', model: 'new' })).rejects.toThrow('重新填写')
  expect(key).toBe('old-key')
  await expect(saveConnection(deps, { endpoint: 'https://new.test/chat', model: 'new' }, 'new-key')).rejects.toThrow('disk full')
  expect(key).toBe('old-key')
})
