import { expect, it } from 'vitest'
import { reduceSnapshot } from '../../src/pet/commands'
import { createSnapshot } from '../../src/shared/defaults'
it('only stores memory when explicitly requested, with editable and removable contents', () => {
  let s = createSnapshot(0)
  s.messages = [{ id: 'hello', role: 'user', text: '我喜欢茶', createdAt: 0 }]
  s = reduceSnapshot(s, { type: 'memory-add', kind: 'preference', text: '我喜欢茶', sourceMessageId: 'hello' }, 1)
  expect(s.memories).toHaveLength(1)
  const id = s.memories[0].id
  s = reduceSnapshot(s, { type: 'memory-update', id, text: '我喜欢绿茶' }, 2)
  expect(s.memories[0].text).toBe('我喜欢绿茶')
  s = reduceSnapshot(s, { type: 'memory-delete', id }, 3)
  expect(s.memories).toHaveLength(0)
  expect(s.messages).toHaveLength(1)
  expect(reduceSnapshot(s, { type: 'message-delete', id: 'hello' }, 4).messages).toHaveLength(0)
})
it('changes quiet behavior and retains unrelated settings', () => {
  const s = reduceSnapshot(createSnapshot(0), { type: 'settings', patch: { quiet: true } }, 1)
  expect(s.settings.quiet).toBe(true)
  expect(s.settings.alwaysOnTop).toBe(true)
  expect(s.pet.animation).toBe('sleep')
})
