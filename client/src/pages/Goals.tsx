import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

interface Goal {
  id: string
  name: string
  target_amount: string
  current_amount: string
  deadline: string | null
  goal_type: string
  status: string
}

interface FinancedPurchase {
  id: string
  item_name: string
  total_price: string
  apr: string
  monthly_payment: string
  total_payments: number
  payments_made: number
  start_date: string
  status: string
}

const Goals = () => {
  const { token } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [financed, setFinanced] = useState<FinancedPurchase[]>([])

  // goal form
  const [goalName, setGoalName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [goalType, setGoalType] = useState('custom')
  const [contributeAmounts, setContributeAmounts] = useState<Record<string, string>>({})

  // financed form
  const [itemName, setItemName] = useState('')
  const [totalPrice, setTotalPrice] = useState('')
  const [apr, setApr] = useState('0')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const [totalPayments, setTotalPayments] = useState('')
  const [startDate, setStartDate] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  const fetchAll = async () => {
    try {
      const [goalRes, financedRes] = await Promise.all([
        fetch('http://localhost:3001/api/goals', { headers }),
        fetch('http://localhost:3001/api/financed', { headers }),
      ])
      const [goalData, financedData] = await Promise.all([
        goalRes.json(),
        financedRes.json(),
      ])
      setGoals(goalData)
      setFinanced(financedData)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('http://localhost:3001/api/goals', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: goalName,
          target_amount: parseFloat(targetAmount),
          deadline: deadline || null,
          goal_type: goalType,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setGoals([data, ...goals])
      setGoalName('')
      setTargetAmount('')
      setDeadline('')
      setGoalType('custom')
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleContribute = async (goalId: string) => {
    const amount = contributeAmounts[goalId]
    if (!amount) return
    try {
      const res = await fetch(`http://localhost:3001/api/goals/${goalId}/contribute`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ amount: parseFloat(amount) }),
      })
      const data = await res.json()
      setGoals(goals.map((g) => g.id === goalId ? data : g))
      setContributeAmounts({ ...contributeAmounts, [goalId]: '' })
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteGoal = async (id: string) => {
    try {
      await fetch(`http://localhost:3001/api/goals/${id}`, {
        method: 'DELETE',
        headers,
      })
      setGoals(goals.filter((g) => g.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddFinanced = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('http://localhost:3001/api/financed', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          item_name: itemName,
          total_price: parseFloat(totalPrice),
          apr: parseFloat(apr) / 100,
          monthly_payment: parseFloat(monthlyPayment),
          total_payments: parseInt(totalPayments),
          start_date: startDate,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setFinanced([data, ...financed])
      setItemName('')
      setTotalPrice('')
      setApr('0')
      setMonthlyPayment('')
      setTotalPayments('')
      setStartDate('')
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleMakePayment = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/financed/${id}/payment`, {
        method: 'PATCH',
        headers,
      })
      const data = await res.json()
      setFinanced(financed.map((f) => f.id === id ? data : f))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteFinanced = async (id: string) => {
    try {
      await fetch(`http://localhost:3001/api/financed/${id}`, {
        method: 'DELETE',
        headers,
      })
      setFinanced(financed.filter((f) => f.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const getWeeksRemaining = (deadline: string | null) => {
    if (!deadline) return null
    const weeks = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))
    return weeks > 0 ? weeks : 0
  }

  const getRequiredWeekly = (goal: Goal) => {
    const weeks = getWeeksRemaining(goal.deadline)
    if (!weeks) return null
    const remaining = parseFloat(goal.target_amount) - parseFloat(goal.current_amount)
    return (remaining / weeks).toFixed(2)
  }

  const getRemainingBalance = (f: FinancedPurchase) => {
    const monthlyRate = parseFloat(f.apr) / 12
    let balance = parseFloat(f.total_price)
    for (let i = 0; i < f.payments_made; i++) {
      const interest = balance * monthlyRate
      const principal = parseFloat(f.monthly_payment) - interest
      balance -= principal
    }
    return Math.max(0, balance).toFixed(2)
  }

  return (
    <div>
      <h1>Goals</h1>

      <h2>Add Savings Goal</h2>
      <form onSubmit={handleAddGoal}>
        <div>
          <label>Goal Name</label>
          <input
            type="text"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            placeholder="e.g. Rent - July"
            required
          />
        </div>
        <div>
          <label>Target Amount</label>
          <input
            type="number"
            step="0.01"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="1200.00"
            required
          />
        </div>
        <div>
          <label>Deadline (optional)</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <div>
          <label>Type</label>
          <select value={goalType} onChange={(e) => setGoalType(e.target.value)}>
            <option value="custom">Custom</option>
            <option value="rent">Rent</option>
            <option value="loan">Loan</option>
            <option value="emergency">Emergency Fund</option>
          </select>
        </div>
        {error && <p>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Goal'}
        </button>
      </form>

      <h2>Your Savings Goals</h2>
      {goals.length === 0 ? (
        <p>No goals yet. Add one above.</p>
      ) : (
        goals.map((goal) => {
          const progress = (parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100
          const weeksLeft = getWeeksRemaining(goal.deadline)
          const weeklyNeeded = getRequiredWeekly(goal)
          return (
            <div key={goal.id}>
              <p>{goal.name} — {goal.goal_type} — {goal.status}</p>
              <p>${parseFloat(goal.current_amount).toFixed(2)} of ${parseFloat(goal.target_amount).toFixed(2)} ({progress.toFixed(0)}%)</p>
              {goal.deadline && <p>Deadline: {goal.deadline} — {weeksLeft} weeks left</p>}
              {weeklyNeeded && <p>Save ${weeklyNeeded}/week to reach your goal</p>}
              {weeksLeft === 0 && progress < 100 && <p>⚠ Deadline passed and goal not reached</p>}
              <div>
                <input
                  type="number"
                  placeholder="Amount to contribute"
                  value={contributeAmounts[goal.id] || ''}
                  onChange={(e) => setContributeAmounts({ ...contributeAmounts, [goal.id]: e.target.value })}
                />
                <button onClick={() => handleContribute(goal.id)}>Contribute</button>
              </div>
              <button onClick={() => handleDeleteGoal(goal.id)}>Delete</button>
            </div>
          )
        })
      )}

      <h2>Add Financed Purchase</h2>
      <form onSubmit={handleAddFinanced}>
        <div>
          <label>Item Name</label>
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. MacBook Pro"
            required
          />
        </div>
        <div>
          <label>Total Price</label>
          <input
            type="number"
            step="0.01"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value)}
            placeholder="1299.00"
            required
          />
        </div>
        <div>
          <label>APR % (enter 0 for interest free)</label>
          <input
            type="number"
            step="0.01"
            value={apr}
            onChange={(e) => setApr(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label>Monthly Payment</label>
          <input
            type="number"
            step="0.01"
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(e.target.value)}
            placeholder="108.25"
            required
          />
        </div>
        <div>
          <label>Total Number of Payments</label>
          <input
            type="number"
            value={totalPayments}
            onChange={(e) => setTotalPayments(e.target.value)}
            placeholder="12"
            required
          />
        </div>
        <div>
          <label>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        {error && <p>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Financed Purchase'}
        </button>
      </form>

      <h2>Your Financed Purchases</h2>
      {financed.length === 0 ? (
        <p>No financed purchases yet. Add one above.</p>
      ) : (
        financed.map((f) => {
          const paymentsLeft = f.total_payments - f.payments_made
          const remainingBalance = getRemainingBalance(f)
          const totalCost = (parseFloat(f.monthly_payment) * f.total_payments).toFixed(2)
          const totalInterest = (parseFloat(totalCost) - parseFloat(f.total_price)).toFixed(2)
          return (
            <div key={f.id}>
              <p>{f.item_name} — {f.status}</p>
              <p>Total Price: ${parseFloat(f.total_price).toFixed(2)}</p>
              <p>Monthly Payment: ${parseFloat(f.monthly_payment).toFixed(2)}</p>
              <p>Payments: {f.payments_made} of {f.total_payments} made — {paymentsLeft} left</p>
              <p>Remaining Balance: ${remainingBalance}</p>
              <p>True Total Cost: ${totalCost}</p>
              {parseFloat(totalInterest) > 0 && <p>Total Interest: ${totalInterest}</p>}
              {f.status === 'active' && (
                <button onClick={() => handleMakePayment(f.id)}>Mark Payment Made</button>
              )}
              {f.status === 'paid_off' && <p>Paid off</p>}
              <button onClick={() => handleDeleteFinanced(f.id)}>Delete</button>
            </div>
          )
        })
      )}
    </div>
  )
}

export default Goals