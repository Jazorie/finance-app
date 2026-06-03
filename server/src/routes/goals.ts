import { Router, Response } from 'express'
import pool from '../db/pool'
import { authenticateToken, AuthRequest } from '../middleware/auth'

const router = Router()

// GET all goals for the logged in user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user?.userId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// POST create a new goal
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { name, target_amount, deadline, goal_type } = req.body

  if (!name || !target_amount) {
    return res.status(400).json({ error: 'Name and target amount are required' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO savings_goals (user_id, name, target_amount, deadline, goal_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.user?.userId,
        name,
        target_amount,
        deadline || null,
        goal_type || 'custom',
      ]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// PATCH contribute to a goal
router.patch('/:id/contribute', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { amount } = req.body

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'A positive amount is required' })
  }

  try {
    const result = await pool.query(
      `UPDATE savings_goals
       SET current_amount = current_amount + $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [amount, req.params.id, req.user?.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// PATCH update goal status
router.patch('/:id/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { status } = req.body

  try {
    const result = await pool.query(
      `UPDATE savings_goals SET status = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [status, req.params.id, req.user?.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// DELETE a goal
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'DELETE FROM savings_goals WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user?.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' })
    }

    res.json({ message: 'Goal deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

export default router