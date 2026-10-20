import { net } from 'electron'
import { connectionSchema, type Connection } from '../../shared/types'
import type { ProviderMessage } from './context'
// Chromium networking honors the operating system's proxy configuration.
// Node's global fetch can time out on a network that requires that proxy.
const fetchWithSystemProxy = (url: string, init?: RequestInit): Promise<Response> => net.fetch(url, init)
export async function requestReply(config: Connection, key: string, messages: ProviderMessage[], signal: AbortSignal, fetcher = fetchWithSystemProxy): Promise<{ text: string }> {
  connectionSchema.parse(config)
  const timeout = AbortSignal.timeout(30000)
  let response: Response
  try {
    response = await fetcher(config.endpoint, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: config.model, messages, stream: false }), signal: AbortSignal.any([signal, timeout]) })
  } catch {
    if (timeout.aborted) throw new Error('等待超过 30 秒，请稍后重试')
    if (signal.aborted) throw new Error('已取消')
    throw new Error('暂时没连上，请检查网络和服务地址')
  }
  if (response.status === 401 || response.status === 403) throw new Error('连接密钥未通过验证，请检查设置')
  if (response.status === 429) {
    // Inspect structured categories only. Provider messages can contain echoed
    // credentials or private request data and must never reach the renderer.
    const value = await response.json().catch(() => null) as { error?: { code?: unknown; type?: unknown } } | null
    const code = value?.error?.code, type = value?.error?.type
    if (code === 'credit_balance_exhausted') throw new Error('API 预付余额已耗尽，请到服务商控制台补充余额，或在设置中更换可用的模型服务。')
    if (code === 'project_spend_limit_exceeded') throw new Error('API 项目费用上限已达到，请在服务商控制台检查项目费用限制。')
    if (code === 'organization_spend_limit_exceeded') throw new Error('API 组织费用上限已达到，请在服务商控制台检查组织费用限制。')
    if (code === 'organization_usage_limit_exceeded') throw new Error('API 组织用量上限已达到，请在服务商控制台检查用量额度。')
    if (code === 'insufficient_quota' || type === 'insufficient_quota') throw new Error('API 可用额度不足，请在服务商控制台检查余额和用量限制。')
    if (code === 'rate_limit_exceeded' || code === 'slow_down' || type === 'rate_limit_error') {
      const retry = response.headers.get('Retry-After')
      const seconds = retry ? (/^\d+(\.\d+)?$/.test(retry) ? Math.ceil(Number(retry)) : Math.ceil((Date.parse(retry) - Date.now()) / 1000)) : NaN
      throw new Error(Number.isFinite(seconds) && seconds > 0 && seconds <= 86400 ? `模型服务暂时限流，请在 ${seconds} 秒后手动重试。` : '模型服务暂时限流，请稍后手动重试。')
    }
    throw new Error('模型服务拒绝了请求（429），请检查服务商的 API 额度和限流设置。')
  }
  if (!response.ok) throw new Error(`模型服务暂不可用（${response.status}），请稍后重试`)
  let value: unknown
  try { value = await response.json() } catch { throw new Error('模型返回了无法识别的回复') }
  const text = (value as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim() || text.length > 12000) throw new Error('模型回复为空或超出长度限制')
  return { text: text.trim() }
}
