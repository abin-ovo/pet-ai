import type { Snapshot, PetCommand } from '../shared/types'
import { applyCare } from './engine'
export function reduceSnapshot(s: Snapshot, command: PetCommand, now: number): Snapshot {
  switch (command.type) {
    case 'care': return { ...s, pet: applyCare(s.pet, command.action, now) }
    case 'rename': return { ...s, pet: { ...s.pet, name: command.name } }
    case 'settings': {
      const settings = { ...s.settings, ...command.patch }
      return { ...s, settings, pet: { ...s.pet, animation: settings.quiet ? 'sleep' : 'idle' } }
    }
    case 'complete-onboarding': return { ...s, onboardingComplete: true }
    case 'memory-add': {
      if (s.memories.length >= 100) throw new Error('回忆已满，先整理一些再记住新的吧')
      return { ...s, memories: [...s.memories, { id: crypto.randomUUID(), kind: command.kind, text: command.text, sourceMessageId: command.sourceMessageId, createdAt: now }] }
    }
    case 'memory-update': return { ...s, memories: s.memories.map(m => m.id === command.id ? { ...m, text: command.text } : m) }
    case 'memory-delete': return { ...s, memories: s.memories.filter(m => m.id !== command.id) }
    case 'message-delete': return { ...s, messages: s.messages.filter(m => m.id !== command.id) }
    case 'messages-clear': return { ...s, messages: [] }
  }
}
