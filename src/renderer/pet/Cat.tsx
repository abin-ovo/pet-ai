import type { Animation, Stage } from '../../shared/types'
export function Cat({ animation = 'idle', stage = 'new', reducedMotion = false }: { animation?: Animation; stage?: Stage; reducedMotion?: boolean }) {
  const sleeping = animation === 'sleep'
  return <div className={`cat-motion anim-${animation} ${reducedMotion ? 'still' : ''}`} data-animation={animation}>
    <svg viewBox="0 0 260 190" className="cat-art" aria-hidden="true">
      <ellipse cx="130" cy="169" rx="109" ry="12" fill="#edece2" opacity=".75" />
      <g className="cat-body" fill="#fff5e5" stroke="#725444" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path className="cat-tail" d="M199 148 C237 143 244 114 230 104 C219 97 206 107 214 119 C222 132 207 140 193 139" />
        <path d="M62 117 C45 132 49 155 62 164 C72 170 94 168 104 166 L176 166 C193 166 205 156 199 139 C195 121 180 111 163 110 Z" />
        <path className="cat-head" d="M63 122 C51 112 49 98 53 83 C50 67 48 42 56 36 C61 33 79 42 91 48 C107 42 126 40 139 42 C149 29 167 15 174 18 C183 23 188 46 185 65 C198 82 196 101 187 115 C176 133 157 139 130 139 C102 140 77 135 63 122 Z" />
        <path d="M61 46 L65 68 L79 54 Z" fill="#f7b7a0" stroke="none" />
        <path d="M168 29 L153 45 L177 51 Z" fill="#f7b7a0" stroke="none" />
        <path d="M103 44 l5 -6 m2 5 l6 -5" fill="none" />
        <g className="cat-face" stroke="none">
          <ellipse cx="79" cy="109" rx="10" ry="7" fill="#ffb69d" /><ellipse cx="166" cy="104" rx="10" ry="7" fill="#ffb69d" />
          {sleeping ? <g fill="none" stroke="#725444" strokeWidth="3"><path d="M88 91 q7 7 14 -1"/><path d="M145 87 q7 7 14 -1"/></g> : <g className="cat-eyes" fill="#2e2925"><ellipse cx="97" cy="91" rx="6.5" ry="9"/><ellipse cx="153" cy="87" rx="6.5" ry="9"/><circle cx="95" cy="88" r="2" fill="white"/><circle cx="151" cy="84" r="2" fill="white"/></g>}
          <path d="M120 105 q5 -4 10 -1 q-2 6 -5 6 Z" fill="#725444" />
          <path d="M125 109 q-3 8 -9 3 m9 -3 q3 6 9 2" fill="none" stroke="#725444" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <path d="M54 106 l-20 -3 m22 12 l-18 4 M182 98 l18 -6 m-15 16 l18 -1" fill="none" strokeWidth="2" />
        <path d="M90 145 C76 143 66 153 72 162 C77 169 100 171 109 164 C113 155 104 147 90 145 Z" />
        <path d="M159 143 C145 144 135 152 142 162 C149 169 171 168 179 160" />
        <path d="M94 157 l1 8 m7 -8 l1 7 m53 -8 l1 8 m7 -8 l1 7" strokeWidth="1.5" />
      </g>
      {sleeping ? <text x="205" y="69" fill="#97a795" fontSize="17" fontFamily="sans-serif">z z</text> : null}
      {animation === 'petted' || (animation === 'greet' && stage !== 'new') ? <g className="affection" fill="#e9a58d"><path d="M205 54 C191 42 202 31 209 40 C218 26 230 40 205 54"/><path d="M45 78 C34 69 42 62 48 68 C55 59 62 69 45 78"/></g> : null}
      {animation === 'eat' ? <g stroke="#725444" strokeWidth="2"><path d="M94 164 L101 181 L142 181 L149 164 Z" fill="#b4c0a7"/><ellipse cx="121" cy="164" rx="27" ry="5" fill="#d9c3a2"/></g> : null}
      {animation === 'play' ? <circle className="play-ball" cx="217" cy="164" r="13" fill="#a7b69a" stroke="#647c68" strokeWidth="2" /> : null}
    </svg>
  </div>
}
