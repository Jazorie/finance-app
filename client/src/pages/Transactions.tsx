import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

interface Transaction {
  id: string
  account_id: string
  category_id: string | null
  category_name: string | null
  account_name: string
  amount: string
  merchant_name: string | null
  date: string
  notes: string | null
  is_external_transfer: boolean
}

interface Account {
  id: string
  name: string
  type: string
}

interface Category {
  id: string
  name: string
}

const Transactions = () => {
  const { token } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [merchantName, setMerchantName] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isExternal, setIsExternal] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  const fetchAll = async () => {
    try {
      const [txRes, accRes, catRes] = await Promise.all([
        fetch('http://localhost:3001/api/transactions', { headers }),
        fetch('http://localhost:3001/api/accounts', { headers }),
        fetch('http://localhost:3001/api/categories', { headers }),
      ])
      const [txData, accData, catData] = await Promise.all([
        txRes.json(),
        accRes.json(),
        catRes.json(),
      ])
      setTransactions(txData)
      setAccounts(accData)
      setCategories(catData)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:3001/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          account_id: accountId,
          category_id: categoryId || null,
          amount: parseFloat(amount),
          merchant_name: merchantName,
          date,
          notes,
          is_external_transfer: isExternal,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      setTransactions([data, ...transactions])
      setAmount('')
      setMerchantName('')
      setDate('')
      setNotes('')
      setCategoryId('')
      setIsExternal(false)
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://localhost:3001/api/transactions/${id}`, {
        method: 'DELETE',
        headers,
      })
      setTransactions(transactions.filter((t) => t.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleCategoryChange = async (id: string, categoryId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/transactions/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ category_id: categoryId }),
      })
      const data = await res.json()
      setTransactions(transactions.map((t) => t.id === id ? { ...t, category_id: data.category_id, category_name: categories.find(c => c.id === categoryId)?.name || null } : t))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <h1>Transactions</h1>

      <h2>Add Transaction</h2>
      <form onSubmit={handleAdd}>
        <div>
          <label>Account</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
            <option value="">Select account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Amount (use negative for expenses e.g. -45.00)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="-45.00"
            required
          />
        </div>
        <div>
          <label>Merchant</label>
          <input
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="e.g. Starbucks"
          />
        </div>
        <div>
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional note"
          />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={isExternal}
              onChange={(e) => setIsExternal(e.target.checked)}
            />
            External transfer (Zelle, Venmo, Cash App)
          </label>
        </div>
        {error && <p>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Transaction'}
        </button>
      </form>

      <h2>Your Transactions</h2>
      {transactions.length === 0 ? (
        <p>No transactions yet. Add one above.</p>
      ) : (
        transactions.map((t) => (
          <div key={t.id}>
            <p>{t.date} — {t.merchant_name || 'No merchant'}</p>
            <p>${parseFloat(t.amount).toFixed(2)}</p>
            <p>Account: {t.account_name}</p>
            <div>
              <label>Category: </label>
              <select
                value={t.category_id || ''}
                onChange={(e) => handleCategoryChange(t.id, e.target.value)}
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {t.notes && <p>Note: {t.notes}</p>}
            {t.is_external_transfer && <p>⚠ External transfer — please categorize</p>}
            <button onClick={() => handleDelete(t.id)}>Delete</button>
          </div>
        ))
      )}
    </div>
  )
}

export default Transactions