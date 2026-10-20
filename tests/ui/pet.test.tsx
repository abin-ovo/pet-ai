// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PetView } from '../../src/renderer/pet/PetView'
import { Onboarding } from '../../src/renderer/panel/Onboarding'
import { createSnapshot } from '../../src/shared/defaults'
import type { PetBridge } from '../../src/shared/bridge'
import { reduceSnapshot } from '../../src/pet/commands'
import { useState } from 'react'
import { testBridge } from './bridge'
afterEach(cleanup)
it('opens only the toolbar on pet click, and chat only on explicit chat action', async () => {
  let opened = ''
  const s = createSnapshot(0); s.onboardingComplete = true
  const bridge = testBridge({ dispatch: async c => reduceSnapshot(s, c, 1), openPanel: async t => { opened = t } })
  render(<PetView snapshot={s} bridge={bridge} hidden={false} />)
  fireEvent.click(screen.getByRole('button', { name: '小团' }))
  expect(opened).toBe('')
  fireEvent.click(screen.getByRole('button', { name: '聊聊' }))
  await waitFor(() => expect(opened).toBe('chat'))
})
it('finishes introduction only after choosing a name, petting and feeding', async () => {
  let s = createSnapshot(0)
  function Harness() {
    const [snapshot, setSnapshot] = useState(s)
    const bridge = testBridge({ dispatch: async c => { s = reduceSnapshot(s, c, Date.now()); setSnapshot(s); return s } })
    return <Onboarding snapshot={snapshot} bridge={bridge} />
  }
  render(<Harness />)
  fireEvent.change(screen.getByLabelText('给它起个名字'), { target: { value: '年糕' } })
  fireEvent.click(screen.getByRole('button', { name: '认识一下' }))
  await screen.findByRole('button', { name: '摸摸它' })
  expect(s.onboardingComplete).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: '摸摸它' }))
  fireEvent.click(await screen.findByRole('button', { name: '喂它吃一点' }))
  await waitFor(() => expect(s.onboardingComplete).toBe(true))
  expect(s.pet.name).toBe('年糕')
  expect(s.pet.preferences.pet).toBe(1)
  expect(s.pet.preferences.feed).toBe(1)
})
