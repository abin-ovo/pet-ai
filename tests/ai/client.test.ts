import { expect, it, vi } from 'vitest'
import { requestReply } from '../../src/main/ai/client'
const chromium = vi.hoisted(() => ({ fetch: vi.fn<typeof fetch>() }))
vi.mock('electron', () => ({ net: chromium }))
const config = { endpoint: 'https://example.test/chat', model: 'pet' }
it('uses Chromium networking for configured chat when Node cannot reach the provider', async () => {
  const nodeFetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'))
  chromium.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '通过系统代理收到回复。' } }] })))
  const reply = await requestReply(config, 'private-test-key', [{ role: 'user', content: '你好' }], new AbortController().signal)
  expect(reply.text).toBe('通过系统代理收到回复。')
  expect(nodeFetch).not.toHaveBeenCalled()
  const [url, request] = chromium.fetch.mock.calls[0]
  expect(url).toBe(config.endpoint)
  expect(request?.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer private-test-key' })
  expect(JSON.parse(request?.body as string)).toEqual({ model: 'pet', messages: [{ role: 'user', content: '你好' }], stream: false })
  expect(request?.redirect).toBe('error')
  expect(request?.signal).toBeInstanceOf(AbortSignal)
})
it('sends the chosen model and returns a real provider reply', async () => {
  let request: RequestInit | undefined
  const reply = await requestReply(config, 'private-test-key', [{ role: 'user', content: '你好' }], new AbortController().signal, async (_url, init) => { request = init; return new Response(JSON.stringify({ choices: [{ message: { content: '你好呀。' } }] })) })
  expect(reply.text).toBe('你好呀。')
  expect(JSON.parse(request?.body as string).model).toBe('pet')
  expect(request?.redirect).toBe('error')
})
it('reports authorization and unknown 429 errors without exposing provider bodies', async () => {
  for (const status of [401, 429]) {
    const result = requestReply(config, 'private-test-key', [], new AbortController().signal, async () => new Response('private-test-key reflected error', { status }))
    await expect(result).rejects.toThrow(status === 401 ? '密钥' : '429')
  }
})
it.each([
  ['credit_balance_exhausted', 'insufficient_quota', '预付余额已耗尽'],
  ['insufficient_quota', 'insufficient_quota', '可用额度不足'],
  ['project_spend_limit_exceeded', 'insufficient_quota', '项目费用上限'],
  ['organization_spend_limit_exceeded', 'insufficient_quota', '组织费用上限'],
  ['organization_usage_limit_exceeded', 'insufficient_quota', '组织用量上限']
])('identifies 429 billing errors by code: %s', async (code, type, expected) => {
  let attempts = 0
  const result = requestReply(config, 'private-test-key', [], new AbortController().signal, async () => {
    attempts++
    return new Response(JSON.stringify({ error: { code, type, message: 'private-test-key reflected by provider' } }), { status: 429 })
  })
  await expect(result).rejects.toThrow(expected)
  await expect(result).rejects.not.toThrow('private-test-key')
  expect(attempts).toBe(1)
})
it('uses the quota type when a compatible service has no specific error code', async () => {
  const result = requestReply(config, 'key', [], new AbortController().signal, async () => new Response(JSON.stringify({ error: { type: 'insufficient_quota' } }), { status: 429 }))
  await expect(result).rejects.toThrow('可用额度不足')
})
it('distinguishes rate limiting and reports the server retry delay without auto retrying', async () => {
  let attempts = 0
  const result = requestReply(config, 'key', [], new AbortController().signal, async () => {
    attempts++
    return new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded', type: 'rate_limit_error' } }), { status: 429, headers: { 'Retry-After': '12' } })
  })
  await expect(result).rejects.toThrow('12 秒后')
  expect(attempts).toBe(1)
})
it('rejects empty or malformed successful responses', async () => {
  await expect(requestReply(config, 'key', [], new AbortController().signal, async () => new Response('{}'))).rejects.toThrow('回复')
})
it('reports request timeout instead of a successful empty reply', async () => {
  // Replace only the external native clock; the HTTP adapter's timeout mapping stays real.
  vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
    const timer = new AbortController()
    setTimeout(() => timer.abort(new DOMException('Timed out', 'TimeoutError')), 0)
    return timer.signal
  })
  const stalled: typeof fetch = async (_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), { once: true })
  })
  await expect(requestReply(config, 'key', [], new AbortController().signal, stalled)).rejects.toThrow('超过 30 秒')
})
