import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

interface Account {
  id: string
  name: string
  type: string
  balance: string
  is_manual: boolean
}

const Accounts = () => {
  const { token } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState('checking')
  const [balance, setBalance] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchAccounts = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setAccounts(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:3001/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, type, balance: parseFloat(balance) }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      setAccounts([...accounts, data])
      setName('')
      setType('checking')
      setBalance('')
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://localhost:3001/api/accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setAccounts(accounts.filter((a) => a.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <h1>Accounts</h1>

      <h2>Add Account</h2>
      <form onSubmit={handleAdd}>
        <div>
          <label>Account Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chase Checking"
            required
          />
        </div>
        <div>
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="credit">Credit</option>
          </select>
        </div>
        <div>
          <label>Current Balance</label>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        {error && <p>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Account'}
        </button>
      </form>

      <h2>Your Accounts</h2>
      {accounts.length === 0 ? (
        <p>No accounts yet. Add one above.</p>
      ) : (
        accounts.map((account) => (
          <div key={account.id}>
            <p>{account.name}</p>
            <p>{account.type}</p>
            <p>${parseFloat(account.balance).toFixed(2)}</p>
            <button onClick={() => handleDelete(account.id)}>Delete</button>
          </div>
        ))
      )}
    </div>
  )
}

export default Accounts