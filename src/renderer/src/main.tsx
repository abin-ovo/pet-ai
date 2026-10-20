import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import type { Snapshot, RuntimeStatus, Tab } from '../../shared/types'
import { PetView } from '../pet/PetView'
import { Panel } from '../panel/Panel'
import '../styles.css'
const bridge = window.xiaotuan
function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [status, setStatus] = useState<RuntimeStatus>({ connected: false, busy: false, recovered: false, storageError: false, hidden: false }), [tab, setTab] = useState<Tab>('pet'), [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    const unstate = bridge.subscribe(s => { if (alive) setSnapshot(s) })
    const unstatus = bridge.subscribeStatus(s => { if (alive) setStatus(s) })
    const untab = bridge.onTab(t => { if (alive) setTab(t) })
    void Promise.all([bridge.getSnapshot(), bridge.status()]).then(([s, r]) => { if (alive) { setSnapshot(s); setStatus(r) } }).catch(() => { if (alive) setError('小团还没准备好，请关闭后重新启动。') })
    return () => { alive = false; unstate(); unstatus(); untab() }
  }, [])
  const pet = new URLSearchParams(location.search).get('view') === 'pet'
  useEffect(() => { document.body.classList.toggle('pet-window', pet) }, [pet])
  useEffect(() => {
    const visibility = () => document.body.classList.toggle('window-hidden', document.hidden)
    visibility()
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [])
  if (!snapshot) return <p className="loading">{error || '小团正在醒来…'}</p>
  return pet ? <PetView snapshot={snapshot} bridge={bridge} hidden={status.hidden}/> : <Panel snapshot={snapshot} status={status} tab={tab} setTab={setTab} bridge={bridge}/>
}
createRoot(document.getElementById('root')!).render(<App/> )
