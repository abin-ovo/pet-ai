// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { Panel } from '../../src/renderer/panel/Panel'
import { Chat } from '../../src/renderer/panel/Chat'
import { createSnapshot } from '../../src/shared/defaults'
import type { ChatResult, RuntimeStatus, Tab } from '../../src/shared/types'
import { testBridge } from './bridge'
afterEach(cleanup)
const snapshot = { ...createSnapshot(0), onboardingComplete: true }
const status: RuntimeStatus = { connected: true, busy: false, recovered: false, hidden: false, storageError: false }
it('retains an unsent draft across companion and settings navigation', () => {
  function Harness() { const [tab, setTab] = useState<Tab>('chat'); return <Panel snapshot={snapshot} status={status} tab={tab} setTab={setTab} bridge={testBridge()}/> }
  render(<Harness/> )
  fireEvent.change(screen.getByLabelText('想跟小团说点什么'), { target: { value: '还没说完的事' } })
  fireEvent.click(screen.getByRole('button', { name: '设置' }))
  fireEvent.click(screen.getByRole('button', { name: '聊天' }))
  expect((screen.getByLabelText('想跟小团说点什么') as HTMLTextAreaElement).value).toBe('还没说完的事')
})
it('does not erase new draft edits when the previous reply completes', async () => {
  let finish!: (r: ChatResult) => void
  const bridge = testBridge({ sendChat: () => new Promise(resolve => { finish = resolve }) })
  function Harness() { const [draft, setDraft] = useState(''); return <Chat {...{ snapshot, status, bridge, draft, setDraft, onSettings: () => {} }}/> }
  render(<Harness/> )
  fireEvent.change(screen.getByLabelText('想跟小团说点什么'), { target: { value: '第一件事' } })
  fireEvent.click(screen.getByRole('button', { name: '发送' }))
  fireEvent.change(screen.getByLabelText('想跟小团说点什么'), { target: { value: '接下来想说的话' } })
  finish({ status: 'ok', message: { id: 'reply', role: 'assistant', text: '我在听', createdAt: 1 } })
  await waitFor(() => expect(screen.queryByText('小团正在听你说')).toBeNull())
  expect((screen.getByLabelText('想跟小团说点什么') as HTMLTextAreaElement).value).toBe('接下来想说的话')
})
it('keeps the submitted text when a request fails', async () => {
  const bridge = testBridge({ sendChat: async () => ({ status: 'error', reason: '连接失败' }) })
  function Harness() { const [draft, setDraft] = useState(''); return <Chat {...{ snapshot, status, bridge, draft, setDraft, onSettings: () => {} }}/> }
  render(<Harness/> )
  fireEvent.change(screen.getByLabelText('想跟小团说点什么'), { target: { value: '保留这段话' } })
  fireEvent.click(screen.getByRole('button', { name: '发送' }))
  await screen.findByText('连接失败')
  expect((screen.getByLabelText('想跟小团说点什么') as HTMLTextAreaElement).value).toBe('保留这段话')
})
