import { useState } from 'react'
import { X } from 'lucide-react'
import type { Snapshot, RuntimeStatus, Tab, Action } from '../../shared/types'
import type { PetBridge } from '../../shared/bridge'
import { Cat } from '../pet/Cat'
import { Onboarding } from './Onboarding'
import { Companion } from './Companion'
import { Chat } from './Chat'
import { Memories } from './Memories'
import { Settings } from './Settings'
import { playCareSound } from '../sound'
const tabs: { id: Tab; label: string }[] = [{ id: 'pet', label: '陪伴' }, { id: 'chat', label: '聊天' }, { id: 'memories', label: '回忆' }, { id: 'settings', label: '设置' }]
export function Panel({ snapshot, status, tab, setTab, bridge }: { snapshot: Snapshot; status: RuntimeStatus; tab: Tab; setTab(tab: Tab): void; bridge: PetBridge }) {
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const care = async (action: Action) => { setError(''); try { await bridge.dispatch({ type: 'care', action }); playCareSound(snapshot.settings) } catch (e) { setError(e instanceof Error ? e.message : '暂时没能保存，请重试') } }
  return <main className={`panel-shell ${status.hidden ? 'app-hidden' : ''}`} onKeyDown={e => { if (e.key === 'Escape') void bridge.closePanel() }}>
    <header className="panel-header"><div className="brand-cat"><Cat reducedMotion/></div><div className="brand-copy"><strong>{snapshot.pet.name}</strong><span>你的桌面小伙伴</span></div><button className="icon-button close-button" aria-label="关闭面板" onClick={() => void bridge.closePanel()}><X size={20}/></button></header>
    {snapshot.onboardingComplete ? <nav className="panel-tabs" aria-label="宠物面板">{tabs.map(t => <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}</nav> : null}
    {status.recovered ? <p role="status" className="banner">已恢复可用存档；损坏文件已保留在本机。</p> : null}{status.storageError ? <p role="alert" className="banner error-text">暂时无法保存，请检查磁盘空间或访问权限。</p> : null}{error ? <p role="alert" className="banner error-text">{error}</p> : null}
    {!snapshot.onboardingComplete ? <Onboarding snapshot={snapshot} bridge={bridge}/> : <div className="panel-content" key={tab}>
      {tab === 'pet' ? <Companion snapshot={snapshot} onCare={care} onQuiet={v => { void bridge.dispatch({ type: 'settings', patch: { quiet: v } }).catch(() => setError('安静模式尚未保存，请重试')) }}/>: null}
      {tab === 'chat' ? <Chat snapshot={snapshot} status={status} bridge={bridge} draft={draft} setDraft={setDraft} onSettings={() => setTab('settings')}/>: null}
      {tab === 'memories' ? <Memories snapshot={snapshot} dispatch={bridge.dispatch}/>: null}
      {tab === 'settings' ? <Settings snapshot={snapshot} status={status} bridge={bridge}/>: null}
    </div>}
  </main>
}
