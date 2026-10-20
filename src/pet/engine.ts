import type { Action, Animation, PetState } from '../shared/types'
export function createPet(now: number): PetState { return { name: '小团', energy: 70, contentment: 70, bond: 0, stage: 'new', animation: 'idle', preferences: { pet: 0, feed: 0, play: 0 }, lastSeenAt: now, maxObservedAt: now, createdAt: now, creditedDays: [], lastActionAt: {} } }
const clamp = (n: number) => Math.max(0, Math.min(100, n))
export function applyCare(p: PetState, action: Action, now: number): PetState {
  const last = p.lastActionAt[action]
  if (last !== undefined && now >= last && now - last < 2000) return p
  const animation: Record<Action, Animation> = { pet: 'petted', feed: 'eat', play: 'play' }
  const gain: Record<Action, number> = { pet: 5, feed: 10, play: 8 }
  return creditConnection({ ...p, contentment: clamp(p.contentment + gain[action]), energy: clamp(p.energy - (action === 'play' ? 5 : 0)), animation: animation[action], preferences: { ...p.preferences, [action]: p.preferences[action] + 1 }, lastActionAt: { ...p.lastActionAt, [action]: now } }, now)
}
export function creditConnection(p: PetState, now: number): PetState {
  if (!Number.isFinite(now) || now < p.maxObservedAt) return p
  const date = new Date(now).toISOString().slice(0, 10)
  if (p.creditedDays.includes(date)) return { ...p, maxObservedAt: now }
  const bond = p.bond + 1
  return { ...p, bond, stage: bond >= 7 ? 'close' : bond >= 3 ? 'familiar' : 'new', creditedDays: [...p.creditedDays, date], maxObservedAt: now }
}
export function tickPet(p: PetState, now: number, quiet: boolean): PetState {
  if (now < p.maxObservedAt) return quiet ? { ...p, animation: 'sleep' } : p
  const steps = Math.min(3, Math.max(0, Math.floor(now / 600000) - Math.floor(p.lastSeenAt / 600000)))
  const resting = quiet || p.animation === 'sleep' || now - p.lastSeenAt > 1800000
  return { ...p, lastSeenAt: now, maxObservedAt: now, energy: clamp(p.energy + (resting ? steps : -steps)), contentment: clamp(p.contentment - steps), animation: quiet ? 'sleep' : p.animation }
}
export function pickIdle(p: PetState, random: number): Animation {
  if (p.energy < 25) return 'sleep'
  const choices: Animation[] = ['idle','stretch','groom','look','walk','sleep']
  if (p.preferences.play > p.preferences.pet) choices.push('play', 'look')
  if (p.stage !== 'new') choices.push('greet')
  return choices[Math.min(choices.length - 1, Math.max(0, Math.floor(random * choices.length)))]
}
