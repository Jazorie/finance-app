import { Router, Response } from 'express'
import pool from '../db/pool'
import { authenticateToken, AuthRequest } from '../middleware/auth'

const router = Router()

// GET all financed purchases for the logged in user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM financed_purchases WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user?.userId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// POST create a new financed purchase
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { item_name, total_price, apr, monthly_payment, total_payments, start_date } = req.body

  if (!item_name || !total_price || !monthly_payment || !total_payments || !start_date) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO financed_purchases 
        (user_id, item_name, total_price, apr, monthly_payment, total_payments, start_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user?.userId,
        item_name,
        total_price,
        apr || 0,
        monthly_payment,
        total_payments,
        start_date,
      ]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// PATCH mark a payment as made
router.patch('/:id/payment', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `UPDATE financed_purchases
       SET payments_made = payments_made + 1,
           status = CASE 
             WHEN payments_made + 1 >= total_payments THEN 'paid_off'::finance_status
             ELSE 'active'::finance_status
           END
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user?.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Financed purchase not found' })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// DELETE a financed purchase
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'DELETE FROM financed_purchases WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user?.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Financed purchase not found' })
    }

    res.json({ message: 'Financed purchase deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

export default router