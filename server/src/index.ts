import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import './db/pool'
import authRoutes from './routes/auth'
import accountRoutes from './routes/accounts'
import transactionRoutes from './routes/transactions'
import categoryRoutes from './routes/categories'
import goalRoutes from './routes/goals'
import financedRoutes from './routes/financed'
import insightsRoutes from './routes/insights'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.CLIENT_URL }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/accounts', accountRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/goals', goalRoutes)
app.use('/api/financed', financedRoutes)
app.use('/api/insights', insightsRoutes)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})