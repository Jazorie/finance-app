import { Router, Response } from 'express'
import pool from '../db/pool'
import { authenticateToken, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId

  try {
    // Net cash flow this month
    const cashFlowResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as net_flow
       FROM transactions
       WHERE user_id = $1
       AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE)`,
      [userId]
    )

    // Top spending categories this month
    const topCategoriesResult = await pool.query(
      `SELECT c.name, COALESCE(SUM(t.amount), 0) as total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1
       AND t.amount < 0
       AND date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE)
       GROUP BY c.name
       ORDER BY total ASC
       LIMIT 3`,
      [userId]
    )

    // Budget status per category
    const budgetResult = await pool.query(
      `SELECT 
         c.id,
         c.name,
         c.monthly_budget,
         COALESCE(SUM(t.amount), 0) as spent
       FROM categories c
       LEFT JOIN transactions t 
         ON t.category_id = c.id 
         AND t.user_id = c.user_id
         AND date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE)
         AND t.amount < 0
       WHERE c.user_id = $1
       AND c.monthly_budget > 0
       GROUP BY c.id, c.name, c.monthly_budget
       ORDER BY c.name ASC`,
      [userId]
    )

    // Savings goals progress
    const goalsResult = await pool.query(
      `SELECT id, name, target_amount, current_amount, deadline, status
       FROM savings_goals
       WHERE user_id = $1 AND status = 'active'
       ORDER BY deadline ASC NULLS LAST
       LIMIT 3`,
      [userId]
    )

    // Financed purchases countdown
    const financedResult = await pool.query(
      `SELECT id, item_name, total_payments, payments_made, monthly_payment, status
       FROM financed_purchases
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at ASC`,
      [userId]
    )

    // Callout — compare this month vs last month per category
    const calloutResult = await pool.query(
      `SELECT 
         c.name,
         COALESCE(SUM(CASE WHEN date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE) THEN ABS(t.amount) ELSE 0 END), 0) as this_month,
         COALESCE(SUM(CASE WHEN date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month') THEN ABS(t.amount) ELSE 0 END), 0) as last_month
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1
       AND t.amount < 0
       AND date_trunc('month', t.date) >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
       GROUP BY c.name
       HAVING SUM(CASE WHEN date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE) THEN ABS(t.amount) ELSE 0 END) >
              SUM(CASE WHEN date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month') THEN ABS(t.amount) ELSE 0 END)
       ORDER BY (
         SUM(CASE WHEN date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE) THEN ABS(t.amount) ELSE 0 END) -
         SUM(CASE WHEN date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month') THEN ABS(t.amount) ELSE 0 END)
       ) DESC
       LIMIT 1`,
      [userId]
    )

    res.json({
      netFlow: parseFloat(cashFlowResult.rows[0].net_flow),
      topCategories: topCategoriesResult.rows,
      budgetStatus: budgetResult.rows,
      goals: goalsResult.rows,
      financed: financedResult.rows,
      callout: calloutResult.rows[0] || null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

export default router