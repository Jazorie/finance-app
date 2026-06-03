import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import './db/pool'
import authRoutes from './routes/auth'
import accountRoutes from './routes/accounts'

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})