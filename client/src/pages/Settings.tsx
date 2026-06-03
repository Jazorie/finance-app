import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

interface Category {
  id: string
  name: string
  monthly_budget: string
  color_hex: string
  is_system: boolean
}

const Settings = () => {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/categories', {
          headers,
        })
        const data = await res.json()
        setCategories(data)
        const initialBudgets: Record<string, string> = {}
        data.forEach((c: Category) => {
          initialBudgets[c.id] = parseFloat(c.monthly_budget).toFixed(2)
        })
        setBudgets(initialBudgets)
      } catch (err) {
        console.error(err)
      }
    }
    fetchCategories()
  }, [])

  const handleBudgetUpdate = async (categoryId: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `http://localhost:3001/api/categories/${categoryId}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            monthly_budget: parseFloat(budgets[categoryId]),
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        return
      }
      setCategories(categories.map((c) => (c.id === categoryId ? data : c)))
      setSaved({ ...saved, [categoryId]: true })
      setTimeout(() => setSaved({ ...saved, [categoryId]: false }), 2000)
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div>
      <h1>Settings</h1>

      <h2>Account</h2>
      <p>Name: {user?.display_name}</p>
      <p>Email: {user?.email}</p>
      <button onClick={handleLogout}>Logout</button>

      <h2>Monthly Budgets</h2>
      <p>
        Set a monthly spending limit for each category. The dashboard will
        warn you at 80% and 100%.
      </p>

      {error && <p>{error}</p>}

      {categories.length === 0 ? (
        <p>Loading categories...</p>
      ) : (
        categories.map((category) => (
          <div key={category.id}>
            <label>{category.name}</label>
            <input
              type="number"
              step="0.01"
              value={budgets[category.id] || ''}
              onChange={(e) =>
                setBudgets({ ...budgets, [category.id]: e.target.value })
              }
              placeholder="0.00"
            />
            <button
              onClick={() => handleBudgetUpdate(category.id)}
              disabled={loading}
            >
              {saved[category.id] ? 'Saved!' : 'Save'}
            </button>
          </div>
        ))
      )}
    </div>
  )
}

export default Settings