import { Router, Response } from 'express'
import pool from '../db/pool'
import { authenticateToken, AuthRequest } from '../middleware/auth'

const router = Router()

// GET all categories for the logged in user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE user_id = $1 ORDER BY name ASC',
      [req.user?.userId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// PATCH update a category budget
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { monthly_budget } = req.body

  try {
    const result = await pool.query(
      `UPDATE categories SET monthly_budget = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [monthly_budget, req.params.id, req.user?.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

export default router