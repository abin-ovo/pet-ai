import type { Settings } from '../shared/types'
let context: AudioContext | undefined
export function playCareSound(settings: Settings) {
  if (!settings.sound || settings.quiet) return
  context ??= new AudioContext()
  const oscillator = context.createOscillator(), gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(720, context.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(380, context.currentTime + 0.18)
  gain.gain.setValueAtTime(0.035, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.24)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(); oscillator.stop(context.currentTime + 0.25)
}
