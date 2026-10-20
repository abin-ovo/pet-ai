import type { Snapshot } from '../../shared/types'
import type { PetBridge } from '../../shared/bridge'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Cat } from './Cat'
import { CareButtons } from '../components/CareButtons'
import { Settings2 } from 'lucide-react'
import type { Action } from '../../shared/types'
import { playCareSound } from '../sound'
export function PetView({ snapshot, bridge, hidden }: { snapshot: Snapshot; bridge: PetBridge; hidden: boolean }) {
  const [toolbar, setToolbar] = useState(false)
  const [error, setError] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const pointer = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const { pet, settings } = snapshot
  useLayoutEffect(() => {
    const regions = [...(root.current?.querySelectorAll<HTMLElement>('[data-hit]') ?? [])].map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } })
    void bridge.setHitRegions(regions).catch(() => {})
  }, [toolbar, bridge])
  useEffect(() => {
    if (!toolbar) return
    const timer = setTimeout(() => setToolbar(false), 8000)
    const close = () => setToolbar(false)
    window.addEventListener('blur', close)
    return () => { clearTimeout(timer); window.removeEventListener('blur', close) }
  }, [toolbar])
  const care = async (action: Action) => {
    try { await bridge.dispatch({ type: 'care', action }); playCareSound(settings) }
    catch (e) { setError(e instanceof Error ? e.message : '暂时没有成功，请再试一次') }
  }
  return <div ref={root} className={`desktop-pet ${hidden ? 'pet-hidden' : ''} ${settings.reducedMotion ? 'reduce-motion' : ''}`}>
    {error ? <button className="pet-error" data-hit onClick={() => setError('')}>{error}</button> : null}
    {toolbar ? <div className="pet-toolbar" data-hit><CareButtons compact onCare={care} onChat={() => { setToolbar(false); void bridge.openPanel('chat') }} /><button className="toolbar-settings icon-button" aria-label="打开设置" onClick={() => { setToolbar(false); void bridge.openPanel('settings') }}><Settings2 size={17}/></button></div> : null}
    <div className="pet-home" aria-hidden="true"><div className="pet-bed"/><div className="home-ball"/></div>
    <button className="pet-character" data-hit aria-label={pet.name}
      onPointerDown={e => { if (e.button !== 0) return; pointer.current = { x: e.screenX, y: e.screenY, moved: false }; suppressClick.current = false; e.currentTarget.setPointerCapture?.(e.pointerId); void bridge.drag({ phase: 'start', screenX: e.screenX, screenY: e.screenY }).catch(() => {}) }}
      onPointerMove={e => { const p = pointer.current; if (!p) return; if (Math.hypot(e.screenX-p.x, e.screenY-p.y) > 5) { p.moved = true; setToolbar(false) }; if (p.moved) void bridge.drag({ phase: 'move', screenX: e.screenX, screenY: e.screenY }).catch(() => {}) }}
      onPointerUp={e => { if (!pointer.current) return; suppressClick.current = pointer.current.moved; pointer.current = null; void bridge.drag({ phase: 'end', screenX: e.screenX, screenY: e.screenY }).catch(() => {}) }}
      onPointerCancel={() => { pointer.current = null; suppressClick.current = true; void bridge.drag({ phase: 'end', screenX: 0, screenY: 0 }).catch(() => {}) }}
      onClick={() => { if (!suppressClick.current) setToolbar(v => !v); suppressClick.current = false }}>
      <Cat animation={pet.animation} stage={pet.stage} reducedMotion={settings.reducedMotion}/>
    </button>
  </div>
}
