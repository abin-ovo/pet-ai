import { describe, expect, it } from 'vitest'
import { createPet, applyCare, creditConnection, tickPet, pickIdle } from '../../src/pet/engine'
const day = 86_400_000
describe('pet relationship', () => {
  it('starts healthy and allows an immediate first interaction', () => {
    const p = applyCare(createPet(0), 'feed', 0)
    expect(p.contentment).toBe(80)
    expect(p.bond).toBe(1)
    expect(p.animation).toBe('eat')
  })
  it('rejects repeated actions during cooldown and caps care plus chat together', () => {
    const p = applyCare(createPet(0), 'pet', 0)
    expect(applyCare(p, 'pet', 1000).contentment).toBe(75)
    expect(creditConnection(applyCare(p, 'feed', 3000), 4000).bond).toBe(1)
  })
  it('shows a visible stage change after multiple shared days', () => {
    let p = createPet(0)
    for (let i = 0; i < 3; i++) p = applyCare(p, 'play', i * day)
    expect(p.stage).toBe('familiar')
    for (let i = 3; i < 7; i++) p = creditConnection(p, i * day)
    expect(p.stage).toBe('close')
    expect(tickPet(p, 20 * day, false).bond).toBe(7)
  })
  it('does not reward clock rollback or returning to an already credited day', () => {
    let p = applyCare(createPet(0), 'feed', 0)
    p = applyCare(p, 'feed', 2 * day)
    p = creditConnection(p, day)
    expect(p.bond).toBe(2)
    expect(creditConnection(p, 2 * day + 1000).bond).toBe(2)
    expect(p.maxObservedAt).toBe(2 * day)
  })
  it('keeps state bounded after long sleep and time rollback', () => {
    const p = createPet(day)
    expect(tickPet(p, 0, true).energy).toBe(70)
    const wake = tickPet(p, 20 * day, true)
    expect(wake.energy).toBeGreaterThanOrEqual(70)
    expect(wake.energy).toBeLessThanOrEqual(73)
    expect(wake.animation).toBe('sleep')
    expect(pickIdle({ ...p, energy: 5 }, 0.9)).toBe('sleep')
  })
  it('allows manual care after clock rollback while keeping the two-second cooldown', () => {
    const future = applyCare(createPet(0), 'feed', day)
    const back = applyCare(future, 'feed', 10000)
    expect(back.contentment).toBe(90)
    expect(back.bond).toBe(1)
    expect(applyCare(back, 'feed', 11000).contentment).toBe(90)
    expect(applyCare(back, 'feed', 13000).contentment).toBe(100)
  })
})
