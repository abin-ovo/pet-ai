import type { Snapshot } from '../../shared/types'
import type { PetBridge } from '../../shared/bridge'
import { useState } from 'react'
import { Cat } from '../pet/Cat'
export function Onboarding({ snapshot, bridge }: { snapshot: Snapshot; bridge: PetBridge }) {
  const [step, setStep] = useState(0), [name, setName] = useState(snapshot.pet.name), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const next = async () => {
    setBusy(true); setError('')
    try {
      if (step === 0) await bridge.dispatch({ type: 'rename', name: name.trim() || '小团' })
      else await bridge.dispatch({ type: 'care', action: step === 1 ? 'pet' : 'feed' })
      if (step === 2) await bridge.dispatch({ type: 'complete-onboarding' })
      else setStep(step + 1)
    } catch (e) { setError(e instanceof Error ? e.message : '还没有保存成功，请重试') }
    finally { setBusy(false) }
  }
  return <section className="onboarding">
    <div className="intro-dots" aria-label={`第 ${step + 1} 步，共 3 步`}>{[0,1,2].map(i => <i key={i} className={step === i ? 'active' : ''}/>)}</div>
    <h1>{['嗨，以后就一起啦。','先从一个摸摸开始。','分享一点小幸福。'][step]}</h1>
    <p>{['给这位新朋友起个名字吧。','它还有点害羞，轻轻摸摸它。','喂它吃一点，然后慢慢认识彼此。'][step]}</p>
    <div className="intro-cat"><Cat animation={snapshot.pet.animation} reducedMotion={snapshot.settings.reducedMotion}/></div>
    {step === 0 ? <label className="field">给它起个名字<input maxLength={20} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void next() }}/></label> : null}
    {error ? <p role="alert" className="error-text">{error}</p> : null}
    <button className="primary intro-next" disabled={busy} onClick={next}>{['认识一下','摸摸它','喂它吃一点'][step]}</button>
    <p className="quiet-note">不用时刻照顾，按你的节奏就好。</p>
  </section>
}
