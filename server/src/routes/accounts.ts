import { Router, Response } from 'express'
import pool from '../db/pool'
import { authenticateToken, AuthRequest } from '../middleware/auth'

const router = Router()

// GET all accounts for the logged in user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at ASC',
      [req.user?.userId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// POST create a new account
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { name, type, balance } = req.body

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO accounts (user_id, name, type, balance, is_manual)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [req.user?.userId, name, type, balance || 0]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// DELETE an account
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'DELETE FROM accounts WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user?.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' })
    }

    res.json({ message: 'Account deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

export default router