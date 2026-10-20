import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { ArrowUp, BookmarkPlus, MessageCircle, Square, Trash2 } from 'lucide-react'
import type { Snapshot, RuntimeStatus } from '../../shared/types'
import type { PetBridge } from '../../shared/bridge'
export function Chat({ snapshot, status, bridge, onSettings, draft, setDraft }: { snapshot: Snapshot; status: RuntimeStatus; bridge: PetBridge; onSettings(): void; draft: string; setDraft: Dispatch<SetStateAction<string>> }) {
  const [error, setError] = useState(''), [sending, setSending] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const busy = sending || status.busy
  useEffect(() => { list.current?.scrollTo?.({ top: list.current.scrollHeight, behavior: 'smooth' }) }, [snapshot.messages.length])
  const send = async () => {
    if (busy || !draft.trim()) return
    setSending(true); setError('')
    const submitted = draft
    try { const result = await bridge.sendChat(submitted); if (result.status === 'ok') setDraft(current => current === submitted ? '' : current); else setError(result.reason) }
    catch { setError('暂时没有连上，内容为你保留。') }
    finally { setSending(false) }
  }
  const remember = async (id: string, text: string) => {
    try { await bridge.dispatch({ type: 'memory-add', kind: 'moment', text: text.slice(0, 500), sourceMessageId: id }); setError('已放进回忆里，你随时可以整理。') }
    catch (e) { setError(e instanceof Error ? e.message : '还没有记住，请重试') }
  }
  return <section className="chat-tab">
    <div className="messages" ref={list} role="log" aria-label="聊天记录" aria-live="polite">
      {snapshot.messages.length ? <>{snapshot.messages.map(m => <article className={`message ${m.role}`} key={m.id}><span className="message-who">{m.role === 'user' ? '你' : snapshot.pet.name}</span><p>{m.text}</p><div className="message-actions"><button aria-label="记住这件事" title="记住这件事" onClick={() => void remember(m.id, m.text)}><BookmarkPlus size={13}/>记住</button><button aria-label="删除这条对话" title="删除这条对话" onClick={() => void bridge.dispatch({ type: 'message-delete', id: m.id }).catch(() => setError('删除失败，请重试'))}><Trash2 size={13}/></button></div></article>)}</> : <div className="chat-empty"><MessageCircle size={42} strokeWidth={1.2}/><h2>这里，留给你慢慢说。</h2><p>{status.connected ? '今天发生了什么？我在听。' : '聊天尚未连接'}</p>{!status.connected ? <button className="primary" onClick={onSettings}>去设置连接</button> : null}</div>}
    </div>
    {error ? <p className="chat-notice" role="status">{error}</p> : null}
    {busy ? <div className="thinking"><span className="thinking-dots">•••</span> 小团正在听你说<button onClick={() => void bridge.cancelChat()}>取消</button></div> : null}
    <form className="composer" onSubmit={e => { e.preventDefault(); void send() }}><textarea aria-label="想跟小团说点什么" placeholder="想跟小团说点什么？" maxLength={2000} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send() } }}/><button className="send-button" aria-label={busy ? '正在回复' : '发送'} disabled={busy || !draft.trim() || !status.connected}>{busy ? <Square size={16}/> : <ArrowUp size={19}/>}</button></form>
    <p className="composer-note">{status.connected ? '只在你发送消息时连接 AI' : '照顾和陪伴无需连接，也能使用'}</p>
  </section>
}
