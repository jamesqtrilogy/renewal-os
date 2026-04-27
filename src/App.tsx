import { useState } from 'react'
import AgentInsertionMap from './components/AgentInsertionMap'
import RenewalProcessMap from './components/RenewalProcessMap'
import Gate1EvaluationLogic from './components/Gate1EvaluationLogic'
import Gate2EvaluationLogic from './components/Gate2EvaluationLogic'

type View = 'agents' | 'roles' | 'gate1' | 'gate2'

const NAV: { key: View; label: string; sub: string }[] = [
  { key: 'agents',  label: 'Agent map',          sub: '10 agents · 4 phases'       },
  { key: 'roles',   label: 'Role responsibilities', sub: 'RACI · ERM / ISR split'  },
  { key: 'gate1',   label: 'Gate 1 logic',        sub: 'T-140 · customer engagement' },
  { key: 'gate2',   label: 'Gate 2 logic',        sub: 'T-90 · quote sent'          },
]

export default function App() {
  const [view, setView] = useState<View>('agents')

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA' }}>

      {/* ── Sticky nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
        padding: '0 24px',
        display: 'flex', alignItems: 'stretch', gap: 0,
      }}>
        {/* Brand */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          paddingRight: 24, marginRight: 8,
          borderRight: '1px solid #E2E8F0',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: '#F0EFFE', border: '1px solid #C5BFF7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="2.5" fill="#6B5CE7"/>
              <circle cx="1.5" cy="3.5" r="1.5" fill="#16A05A"/>
              <circle cx="12.5" cy="3.5" r="1.5" fill="#D07400"/>
              <circle cx="1.5" cy="10.5" r="1.5" fill="#E03A2A"/>
              <circle cx="12.5" cy="10.5" r="1.5" fill="#C0306A"/>
              <line x1="1.5" y1="3.5" x2="7" y2="7" stroke="#CBD5E1" strokeWidth="0.8"/>
              <line x1="12.5" y1="3.5" x2="7" y2="7" stroke="#CBD5E1" strokeWidth="0.8"/>
              <line x1="1.5" y1="10.5" x2="7" y2="7" stroke="#CBD5E1" strokeWidth="0.8"/>
              <line x1="12.5" y1="10.5" x2="7" y2="7" stroke="#CBD5E1" strokeWidth="0.8"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1A202C', lineHeight: 1.2 }}>
              Renewal OS
            </div>
            <div style={{ fontSize: 10, color: '#94A3B8' }}>T-220 → T+1</div>
          </div>
        </div>

        {/* Nav items */}
        {NAV.map(n => (
          <button
            key={n.key}
            onClick={() => setView(n.key)}
            style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              padding: '12px 16px', border: 'none', background: 'transparent',
              borderBottom: `2px solid ${view === n.key ? '#6B5CE7' : 'transparent'}`,
              cursor: 'pointer', transition: 'border-color 0.15s',
            }}
          >
            <span style={{
              fontSize: 13, fontWeight: view === n.key ? 700 : 500,
              color: view === n.key ? '#3D2FB3' : '#64748B',
            }}>
              {n.label}
            </span>
            <span style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{n.sub}</span>
          </button>
        ))}

        {/* Status pill */}
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            background: '#E8F8EF', border: '1px solid #A8DFBC', color: '#0D6B3A',
          }}>
            Milestone 1 of 3
          </span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>27 Apr 2026</span>
        </div>
      </nav>

      {/* ── View content ── */}
      {view === 'agents' && <AgentInsertionMap onNavigate={setView} />}
      {view === 'roles'  && <RenewalProcessMap onNavigate={setView} />}
      {view === 'gate1'  && <Gate1EvaluationLogic />}
      {view === 'gate2'  && <Gate2EvaluationLogic />}
    </div>
  )
}
