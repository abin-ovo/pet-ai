import { Cat } from '../pet/Cat'
import { CareButtons } from '../components/CareButtons'
import { Toggle } from '../components/Toggle'
import { Moon } from 'lucide-react'
import type { Snapshot, Action } from '../../shared/types'
export function Companion({ snapshot, onCare, onQuiet }: { snapshot: Snapshot; onCare(a: Action): void; onQuiet(v: boolean): void }) {
  const { pet, settings } = snapshot
  const days = Math.max(1, Math.floor((Date.now() - pet.createdAt) / 86400000) + 1)
  const description = { new: '有一点好奇，也有一点害羞。', familiar: '见到你，就忍不住靠近一点。', close: '这里，已经有了我们的小习惯。' }[pet.stage]
  return <section className="companion">
    <h1>今天，也一起慢慢来。</h1><p className="day-count">认识彼此的第 {days} 天</p>
    <div className="companion-cat"><Cat animation={pet.animation} stage={pet.stage} reducedMotion={settings.reducedMotion}/></div>
    <h2>{pet.name}</h2><p className="pet-description">{description}</p>
    <CareButtons onCare={onCare}/>
    <div className="quiet-control"><Moon size={18}/><Toggle label="安静陪伴" checked={settings.quiet} onChange={onQuiet}/></div>
  </section>
}
