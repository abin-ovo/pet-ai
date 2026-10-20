// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Settings } from '../../src/renderer/panel/Settings'
import { createSnapshot } from '../../src/shared/defaults'
import { testBridge } from './bridge'
const snapshot = { ...createSnapshot(0), connection: { endpoint: 'https://example.test/chat', model: 'pet' } }
const status = { connected: true, busy: false, recovered: false, hidden: false, storageError: false }
afterEach(cleanup)
it('shows the saved connection check result and keeps configuration fields intact', async () => {
  render(<Settings snapshot={snapshot} status={status} bridge={testBridge({ checkConnection: async () => ({ status: 'error', reason: 'API 预付余额已耗尽，请检查服务商账户。' }) })}/> )
  fireEvent.click(screen.getByRole('button', { name: '检测连接' }))
  await screen.findByText('API 预付余额已耗尽，请检查服务商账户。')
  expect((screen.getByLabelText('服务地址') as HTMLInputElement).value).toBe('https://example.test/chat')
  expect((screen.getByLabelText('模型名称') as HTMLInputElement).value).toBe('pet')
})
it('requires unsaved connection changes to be saved before testing', () => {
  render(<Settings snapshot={snapshot} status={status} bridge={testBridge()}/> )
  fireEvent.change(screen.getByLabelText('模型名称'), { target: { value: 'other-model' } })
  expect((screen.getByRole('button', { name: '检测连接' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('模型名称'), { target: { value: 'pet' } })
  expect((screen.getByRole('button', { name: '检测连接' }) as HTMLButtonElement).disabled).toBe(false)
})
