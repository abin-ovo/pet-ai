import { Hand, Soup, WandSparkles, MessageCircle } from 'lucide-react'
import type { Action } from '../../shared/types'
const actions = [{ action: 'pet' as const, label: '摸摸', Icon: Hand }, { action: 'feed' as const, label: '喂食', Icon: Soup }, { action: 'play' as const, label: '玩耍', Icon: WandSparkles }]
export function CareButtons({ onCare, onChat, compact = false }: { onCare(action: Action): void; onChat?: () => void; compact?: boolean }) {
  return <div className={`care-buttons ${compact ? 'compact' : ''}`}>
    {actions.map(({ action, label, Icon }) => <button key={action} onClick={() => onCare(action)}><Icon size={compact ? 20 : 26} strokeWidth={1.6} /><span>{label}</span></button>)}
    {onChat ? <button onClick={onChat}><MessageCircle size={20} strokeWidth={1.6}/><span>聊聊</span></button> : null}
  </div>
}
