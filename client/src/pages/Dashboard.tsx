import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

interface TopCategory {
  name: string
  total: string
}

interface BudgetStatus {
  id: string
  name: string
  monthly_budget: string
  spent: string
}

interface Goal {
  id: string
  name: string
  target_amount: string
  current_amount: string
  deadline: string | null
  status: string
}

interface Financed {
  id: string
  item_name: string
  total_payments: number
  payments_made: number
  monthly_payment: string
  status: string
}

interface Callout {
  name: string
  this_month: string
  last_month: string
}

interface InsightsData {
  netFlow: number
  topCategories: TopCategory[]
  budgetStatus: BudgetStatus[]
  goals: Goal[]
  financed: Financed[]
  callout: Callout | null
}

const CATEGORY_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  groceries:     { icon: 'ti-shopping-cart',   color: '#1D9E75', bg: '#E1F5EE' },
  dining:        { icon: 'ti-tools-kitchen-2', color: '#EF9F27', bg: '#FAEEDA' },
  food:          { icon: 'ti-tools-kitchen-2', color: '#EF9F27', bg: '#FAEEDA' },
  entertainment: { icon: 'ti-device-tv',       color: '#534AB7', bg: '#EEEDFE' },
  transport:     { icon: 'ti-car',             color: '#7a6e5f', bg: '#F1EFE8' },
  shopping:      { icon: 'ti-shopping-bag',    color: '#D4537E', bg: '#FBEAF0' },
  health:        { icon: 'ti-heart',           color: '#A32D2D', bg: '#FCEBEB' },
  subscriptions: { icon: 'ti-repeat',          color: '#3B6D11', bg: '#EAF3DE' },
  rent:          { icon: 'ti-home',            color: '#633806', bg: '#FAEEDA' },
  income:        { icon: 'ti-building-bank',   color: '#185FA5', bg: '#E6F1FB' },
}

function getCategoryStyle(name: string) {
  const key = name.toLowerCase()
  for (const k of Object.keys(CATEGORY_ICONS)) {
    if (key.includes(k)) return CATEGORY_ICONS[k]
  }
  return { icon: 'ti-tag', color: '#7a6e5f', bg: '#F1EFE8' }
}

function getBudgetBarColor(pct: number) {
  if (pct >= 100) return '#E24B4A'
  if (pct >= 80) return '#EF9F27'
  return '#1D9E75'
}

function getBudgetTextColor(pct: number) {
  if (pct >= 100) return '#A32D2D'
  if (pct >= 80) return '#BA7517'
  return '#3d3333'
}

function GoalRing({ pct, behind }: { pct: number; behind: boolean }) {
  const r = 14
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="18" cy="18" r={r} fill="none" stroke={behind ? '#FAEEDA' : '#E1F5EE'} strokeWidth="4" />
      <circle cx="18" cy="18" r={r} fill="none"
        stroke={behind ? '#EF9F27' : '#1D9E75'} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 18 18)"
      />
    </svg>
  )
}

const Dashboard = () => {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/insights', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (!res.ok) { setError(json.error); return }
        setData(json)
      } catch (err) {
        setError('Could not load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchInsights()
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.display_name
    ? user.display_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ME'

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#FDF0D8', maxWidth: 480, margin: '0 auto' }}>
      <style>{`
        @font-face {
          font-family: 'BPChildFatty';
          src: url('/fonts/BPchildfatty.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        .app-title {
          font-family: 'BPChildFatty', sans-serif !important;
          font-size: 18px;
          color: #5b4d4d;
          margin: 0;
          line-height: 1.1;
        }
        .dash-card {
          background: rgba(255,255,255,0.55);
          border: 0.5px solid rgba(91,77,77,0.15);
          border-radius: 12px;
          padding: 14px 16px;
        }
        .section-title {
          font-size: 11px;
          font-weight: 600;
          color: #5b4d4d;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin: 0;
        }
        .section-link {
          font-size: 12px;
          color: #1D9E75;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          font-family: inherit;
        }
        .bbar-track {
          background: rgba(91,77,77,0.12);
          border-radius: 4px;
          height: 7px;
          overflow: hidden;
        }
        .goal-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 0.5px solid rgba(91,77,77,0.12);
        }
        .goal-row:last-child { border-bottom: none; padding-bottom: 0; }
        .txn-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 0.5px solid rgba(91,77,77,0.12);
        }
        .txn-row:last-child { border-bottom: none; padding-bottom: 0; }
        .date-label {
          font-size: 11px;
          font-weight: 600;
          color: #7a6e5f;
          margin-bottom: 4px;
          letter-spacing: 0.04em;
        }
        .bottomnav {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 480px;
          background: rgba(253,240,216,0.95);
          border-top: 0.5px solid rgba(91,77,77,0.2);
          display: flex;
          padding: 8px 8px 12px;
          z-index: 10;
        }
        .nav-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          color: #9c9878;
          padding: 4px 0;
          cursor: pointer;
          border-radius: 8px;
          border: none;
          background: none;
          font-family: inherit;
          transition: color 0.15s;
        }
        .nav-btn.active { color: #5b4d4d; }
        .nav-btn i { font-size: 20px; }
        .tag-warn {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 20px;
          background: #FAEEDA;
          color: #854F0B;
        }
      `}</style>

      {/* Top bar */}
      <div style={{ padding: '14px 20px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <p className="app-title">Monkey See Monkey Do ✦</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 6 }}>
          <i className="ti ti-bell" aria-hidden="true" style={{ fontSize: 20, color: '#7a6e5f', cursor: 'pointer' }} />
          <div
            onClick={handleLogout}
            title="Logout"
            role="button"
            aria-label="Logout"
            style={{
              width: 18, height: 18, borderRadius: '50%',
              background: '#b8b48a', border: '1.5px solid #9c9878',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: '#5b4d4d', cursor: 'pointer',
            }}
          >
            {initials}
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ padding: '8px 14px 100px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {loading && (
          <div className="dash-card" style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: '#7a6e5f', fontSize: 13 }}>Loading your dashboard...</p>
          </div>
        )}

        {error && (
          <div style={{ borderLeft: '3px solid #E24B4A', background: 'rgba(252,235,235,0.85)', borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>
            <p style={{ fontSize: 13, color: '#A32D2D', fontWeight: 500 }}>{error}</p>
          </div>
        )}

        {data && <>

          {/* Hero */}
          <div className="dash-card" style={{ padding: '16px 18px' }}>
            <p style={{ fontSize: 11, color: '#7a6e5f', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Net cash flow · {monthLabel}
            </p>
            <p style={{
              fontSize: 36, fontWeight: 600, lineHeight: 1.1, margin: '4px 0 2px',
              color: data.netFlow >= 0 ? '#BBE5C4' : '#B98586',
            }}>
              {data.netFlow >= 0 ? '+' : '−'}${Math.abs(data.netFlow).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: data.netFlow >= 0 ? '#1D9E75' : '#A32D2D' }}>
              <i className={`ti ${data.netFlow >= 0 ? 'ti-trending-up' : 'ti-trending-down'}`} aria-hidden="true" style={{ fontSize: 13 }} />
              {data.netFlow >= 0 ? 'You are in the positive this month' : 'Spending more than you are earning'}
            </div>
          </div>

          {/* Callout */}
          {data.callout && (() => {
            const thisMonth = parseFloat(data.callout.this_month)
            const lastMonth = parseFloat(data.callout.last_month)
            const diff = thisMonth - lastMonth
            const isOver = diff > 0
            return (
              <div style={{
                borderLeft: `3px solid ${isOver ? '#EF9F27' : '#1D9E75'}`,
                background: isOver ? 'rgba(250,238,218,0.85)' : 'rgba(225,245,238,0.85)',
                borderRadius: '0 8px 8px 0',
                padding: '10px 14px',
              }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: isOver ? '#633806' : '#085041', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className={`ti ${isOver ? 'ti-alert-triangle' : 'ti-info-circle'}`} aria-hidden="true" style={{ fontSize: 13 }} />
                  {data.callout.name} spending {isOver ? 'is up' : 'looks good'}
                </p>
                <p style={{ fontSize: 12, color: isOver ? '#854F0B' : '#0F6E56' }}>
                  You spent ${thisMonth.toFixed(2)} this month —{' '}
                  {isOver ? `$${diff.toFixed(2)} more` : `$${Math.abs(diff).toFixed(2)} less`} than last month
                </p>
              </div>
            )
          })()}

          {/* Budget bars */}
          {data.budgetStatus.length > 0 && (
            <div className="dash-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p className="section-title">Budget this month</p>
                <button className="section-link" onClick={() => navigate('/settings')}>Edit budgets</button>
              </div>
              {data.budgetStatus.map((b) => {
                const spent = Math.abs(parseFloat(b.spent))
                const budget = parseFloat(b.monthly_budget)
                const rawPct = budget > 0 ? (spent / budget) * 100 : 0
                const pct = Math.min(rawPct, 100)
                const style = getCategoryStyle(b.name)
                return (
                  <div key={b.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12, color: '#5b4d4d' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className={`ti ${style.icon}`} aria-hidden="true" style={{ fontSize: 12, color: style.color }} />
                        <span style={{ color: getBudgetTextColor(rawPct) }}>{b.name}</span>
                      </span>
                      <span style={{ color: getBudgetTextColor(rawPct) }}>
                        ${spent.toFixed(2)} <span style={{ color: '#9c9878' }}>/ ${budget.toFixed(2)}</span>
                      </span>
                    </div>
                    <div className="bbar-track">
                      <div style={{
                        height: '100%', borderRadius: 4,
                        width: `${pct}%`,
                        background: getBudgetBarColor(rawPct),
                        transition: 'width 0.4s ease',
                      }}
                        role="progressbar"
                        aria-valuenow={Math.round(pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${b.name} ${Math.round(pct)}% used`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Savings goals */}
          <div className="dash-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p className="section-title">Savings goals</p>
              <button className="section-link" onClick={() => navigate('/goals')}>See all</button>
            </div>
            {data.goals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <i className="ti ti-target" aria-hidden="true" style={{ fontSize: 24, color: '#9c9878', display: 'block', marginBottom: 6 }} />
                <p style={{ fontSize: 13, color: '#5b4d4d', fontWeight: 500 }}>No active goals</p>
                <button className="section-link" style={{ fontSize: 12, marginTop: 4 }} onClick={() => navigate('/goals')}>Add your first goal</button>
              </div>
            ) : (
              data.goals.slice(0, 3).map((goal) => {
                const current = parseFloat(goal.current_amount)
                const target = parseFloat(goal.target_amount)
                const pct = Math.min((current / target) * 100, 100)
                const deadline = goal.deadline ? new Date(goal.deadline) : null
                const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : null
                const monthsLeft = daysLeft ? Math.max(1, Math.ceil(daysLeft / 30)) : null
                const remaining = target - current
                const monthlyNeeded = monthsLeft ? remaining / monthsLeft : null
                const behind = pct < 20 && daysLeft !== null && daysLeft < 30
                return (
                  <div key={goal.id} className="goal-row">
                    <GoalRing pct={pct} behind={behind} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#3d3333' }}>{goal.name}</p>
                      <p style={{ fontSize: 11, color: '#7a6e5f', marginTop: 1 }}>
                        ${current.toFixed(2)} of ${target.toFixed(2)}
                        {deadline && ` · due ${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: behind ? '#BA7517' : '#1D9E75' }}>{Math.round(pct)}%</p>
                      <p style={{ fontSize: 11, color: '#7a6e5f', marginTop: 1 }}>
                        {behind ? 'Behind pace' : monthlyNeeded ? `$${monthlyNeeded.toFixed(0)}/mo needed` : `$${remaining.toFixed(2)} left`}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Financed purchases */}
          {data.financed.length > 0 && (
            <div className="dash-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p className="section-title">Financed purchases</p>
                <button className="section-link" onClick={() => navigate('/goals')}>See all</button>
              </div>
              {data.financed.map((f) => {
                const pct = Math.round((f.payments_made / f.total_payments) * 100)
                const remaining = f.total_payments - f.payments_made
                return (
                  <div key={f.id} className="goal-row">
                    <GoalRing pct={pct} behind={false} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#3d3333' }}>{f.item_name}</p>
                      <p style={{ fontSize: 11, color: '#7a6e5f', marginTop: 1 }}>
                        {remaining} payment{remaining !== 1 ? 's' : ''} left · ${parseFloat(f.monthly_payment).toFixed(2)}/mo
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1D9E75' }}>{pct}%</p>
                      <p style={{ fontSize: 11, color: '#7a6e5f', marginTop: 1 }}>paid off</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Top spending categories */}
          {data.topCategories.length > 0 && (
            <div className="dash-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p className="section-title">Top spending</p>
                <button className="section-link" onClick={() => navigate('/transactions')}>See all</button>
              </div>
              {data.topCategories.map((cat) => {
                const style = getCategoryStyle(cat.name)
                const amt = Math.abs(parseFloat(cat.total))
                return (
                  <div key={cat.name} className="txn-row">
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${style.icon}`} aria-hidden="true" style={{ fontSize: 15, color: style.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#3d3333' }}>{cat.name}</p>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#A32D2D' }}>
                      −${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

        </>}
      </div>

      {/* Bottom nav */}
      <nav className="bottomnav" aria-label="Main navigation">
        {[
          { label: 'Dashboard', icon: 'ti-layout-dashboard', path: '/dashboard' },
          { label: 'Txns',      icon: 'ti-arrows-exchange',  path: '/transactions' },
          { label: 'Goals',     icon: 'ti-target',           path: '/goals' },
          { label: 'Accounts',  icon: 'ti-credit-card',      path: '/accounts' },
          { label: 'Settings',  icon: 'ti-settings',         path: '/settings' },
        ].map(({ label, icon, path }) => (
          <button
            key={path}
            className={`nav-btn${path === '/dashboard' ? ' active' : ''}`}
            onClick={() => navigate(path)}
            aria-label={label}
          >
            <i className={`ti ${icon}`} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

    </div>
  )
}

export default Dashboard