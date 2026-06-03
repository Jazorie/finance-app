import { Router, Response } from 'express'
import pool from '../db/pool'
import { authenticateToken, AuthRequest } from '../middleware/auth'

const router = Router()

// GET all transactions for the logged in user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.name as category_name, a.name as account_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN accounts a ON t.account_id = a.id
       WHERE t.user_id = $1
       ORDER BY t.date DESC`,
      [req.user?.userId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// POST create a new transaction
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { account_id, category_id, amount, merchant_name, date, notes, is_external_transfer } = req.body

  if (!account_id || !amount || !date) {
    return res.status(400).json({ error: 'Account, amount, and date are required' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO transactions 
        (user_id, account_id, category_id, amount, merchant_name, date, notes, is_external_transfer, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'manual')
       RETURNING *`,
      [
        req.user?.userId,
        account_id,
        category_id || null,
        amount,
        merchant_name || null,
        date,
        notes || null,
        is_external_transfer || false,
      ]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// PATCH update a transaction category
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { category_id, notes, merchant_name } = req.body

  try {
    const result = await pool.query(
      `UPDATE transactions
       SET category_id = COALESCE($1, category_id),
           notes = COALESCE($2, notes),
           merchant_name = COALESCE($3, merchant_name)
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [category_id, notes, merchant_name, req.params.id, req.user?.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// DELETE a transaction
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user?.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    res.json({ message: 'Transaction deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

export default router