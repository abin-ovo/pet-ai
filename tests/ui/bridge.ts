import type { PetBridge } from '../../src/shared/bridge'
import { createSnapshot } from '../../src/shared/defaults'
export function testBridge(overrides: Partial<PetBridge> = {}): PetBridge {
  return {
    getSnapshot: async () => createSnapshot(0), dispatch: async () => createSnapshot(0), subscribe: () => () => {},
    status: async () => ({ connected: false, busy: false, hidden: false, recovered: false, storageError: false }),
    subscribeStatus: () => () => {}, onTab: () => () => {}, openPanel: async () => {}, closePanel: async () => {},
    hide: async () => {}, sendChat: async () => ({ status: 'error', reason: 'not connected' }), cancelChat: async () => {},
    checkConnection: async () => ({ status: 'error', reason: 'not connected' }),
    saveConnection: async () => {}, removeConnection: async () => {}, setHitRegions: async () => {}, drag: async () => {}, ...overrides
  }
}
