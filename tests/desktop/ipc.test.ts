import { describe, expect, it } from 'vitest'
import { validateCommand, validatePoint, assertTrusted } from '../../src/shared/validation'
describe('desktop trust boundary', () => {
  it('rejects unknown care actions before dispatch', () => {
    expect(() => validateCommand({ type: 'care', action: 'shell' })).toThrow()
    expect(validateCommand({ type: 'care', action: 'feed' })).toEqual({ type: 'care', action: 'feed' })
  })
  it('rejects non-finite or malformed desktop coordinates', () => {
    expect(() => validatePoint({ x: Infinity, y: 2 })).toThrow()
    expect(() => validatePoint({ x: 1, y: NaN })).toThrow()
    expect(validatePoint({ x: -1200, y: 40 })).toEqual({ x: -1200, y: 40 })
  })
  it('rejects subframes and windows not owned by the app', () => {
    expect(() => assertTrusted(3, 4, false)).toThrow()
    expect(() => assertTrusted(3, 3, false)).toThrow()
    expect(() => assertTrusted(3, 3, true)).not.toThrow()
  })
  it('rejects hidden credential fields and invalid settings', () => {
    expect(() => validateCommand({ type: 'settings', patch: { apiKey: 'secret' } })).toThrow()
    expect(() => validateCommand({ type: 'settings', patch: { quiet: 'yes' } })).toThrow()
  })
})
