import type { Snapshot } from './types'
import { createPet } from '../pet/engine'
export function createSnapshot(now = Date.now()): Snapshot {
  return { version: 1, pet: createPet(now), settings: { quiet: false, sound: false, reducedMotion: false, alwaysOnTop: true, launchAtLogin: false }, messages: [], memories: [], connection: null, position: null, onboardingComplete: false }
}
