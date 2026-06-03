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

  if (loading) return <p>Loading...</p>
  if (error) return <p>{error}</p>
  if (!data) return null

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome back, {user?.display_name}</p>
      <button onClick={handleLogout}>Logout</button>

      <h2>Net Cash Flow This Month</h2>
      <p>{data.netFlow >= 0 ? '+' : ''}${data.netFlow.toFixed(2)}</p>
      {data.netFlow < 0 && <p>You are spending more than you are earning this month</p>}
      {data.netFlow >= 0 && <p>You are in the positive this month</p>}

      {data.callout && (
        <div>
          <h2>Heads Up</h2>
          <p>
            You spent ${parseFloat(data.callout.this_month).toFixed(2)} on {data.callout.name} this month —
            that is ${(parseFloat(data.callout.this_month) - parseFloat(data.callout.last_month)).toFixed(2)} more than last month
          </p>
        </div>
      )}

      <h2>Top Spending Categories</h2>
      {data.topCategories.length === 0 ? (
        <p>No spending data yet</p>
      ) : (
        data.topCategories.map((cat) => (
          <div key={cat.name}>
            <p>{cat.name}: ${Math.abs(parseFloat(cat.total)).toFixed(2)}</p>
          </div>
        ))
      )}

      <h2>Budget Status</h2>
      {data.budgetStatus.length === 0 ? (
        <p>No budgets set yet. Go to Settings to add budgets.</p>
      ) : (
        data.budgetStatus.map((b) => {
          const spent = Math.abs(parseFloat(b.spent))
          const budget = parseFloat(b.monthly_budget)
          const pct = Math.min((spent / budget) * 100, 100).toFixed(0)
          return (
            <div key={b.id}>
              <p>{b.name}: ${spent.toFixed(2)} of ${budget.toFixed(2)} ({pct}%)</p>
              {spent >= budget && <p>Over budget</p>}
              {spent >= budget * 0.8 && spent < budget && <p>Almost at limit</p>}
            </div>
          )
        })
      )}

      <h2>Savings Goals</h2>
      {data.goals.length === 0 ? (
        <p>No active goals. Go to Goals to add one.</p>
      ) : (
        data.goals.map((goal) => {
          const progress = (parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100
          return (
            <div key={goal.id}>
              <p>{goal.name}: ${parseFloat(goal.current_amount).toFixed(2)} of ${parseFloat(goal.target_amount).toFixed(2)} ({progress.toFixed(0)}%)</p>
              {goal.deadline && <p>Due: {goal.deadline}</p>}
            </div>
          )
        })
      )}

      <h2>Financed Purchases</h2>
      {data.financed.length === 0 ? (
        <p>No active financed purchases</p>
      ) : (
        data.financed.map((f) => (
          <div key={f.id}>
            <p>{f.item_name}: {f.total_payments - f.payments_made} payments left at ${parseFloat(f.monthly_payment).toFixed(2)}/month</p>
          </div>
        ))
      )}
    </div>
  )
}

export default Dashboard