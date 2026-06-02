-- ============================================================
--  Personal Finance App — Database Schema
--  PostgreSQL 15+
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum Types
CREATE TYPE account_type AS ENUM ('checking', 'savings', 'credit');
CREATE TYPE transaction_source AS ENUM ('plaid', 'csv', 'receipt', 'manual');
CREATE TYPE goal_type AS ENUM ('rent', 'loan', 'emergency', 'custom');
CREATE TYPE goal_status AS ENUM ('active', 'completed', 'paused');
CREATE TYPE finance_status AS ENUM ('active', 'paid_off');

-- users
CREATE TABLE users (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  TEXT         NOT NULL,
    display_name   VARCHAR(100),
    monthly_income DECIMAL(12,2) DEFAULT 0.00,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- accounts
CREATE TABLE accounts (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plaid_account_id VARCHAR(255) UNIQUE,
    name             VARCHAR(150) NOT NULL,
    type             account_type NOT NULL,
    balance          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    is_manual        BOOLEAN      NOT NULL DEFAULT FALSE,
    last_synced_at   TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- categories
CREATE TABLE categories (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name           VARCHAR(100) NOT NULL,
    monthly_budget DECIMAL(12,2) DEFAULT 0.00,
    color_hex      VARCHAR(7)   DEFAULT '#888888',
    is_system      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);

-- financed_purchases
CREATE TABLE financed_purchases (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id      UUID           REFERENCES accounts(id) ON DELETE SET NULL,
    item_name       VARCHAR(200)   NOT NULL,
    total_price     DECIMAL(12,2)  NOT NULL,
    apr             DECIMAL(5,4)   NOT NULL DEFAULT 0.0000,
    monthly_payment DECIMAL(12,2)  NOT NULL,
    total_payments  INTEGER        NOT NULL,
    payments_made   INTEGER        NOT NULL DEFAULT 0,
    start_date      DATE           NOT NULL,
    status          finance_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT positive_price   CHECK (total_price > 0),
    CONSTRAINT positive_payment CHECK (monthly_payment > 0),
    CONSTRAINT valid_apr        CHECK (apr BETWEEN 0 AND 1),
    CONSTRAINT valid_payments   CHECK (total_payments > 0),
    CONSTRAINT payments_range   CHECK (payments_made >= 0 AND payments_made <= total_payments)
);

-- transactions
CREATE TABLE transactions (
    id                   UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID               NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id           UUID               NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_id          UUID               REFERENCES categories(id) ON DELETE SET NULL,
    financed_purchase_id UUID               REFERENCES financed_purchases(id) ON DELETE SET NULL,
    amount               DECIMAL(12,2)      NOT NULL,
    merchant_name        VARCHAR(200),
    date                 DATE               NOT NULL,
    source               transaction_source NOT NULL DEFAULT 'manual',
    plaid_txn_id         VARCHAR(255)       UNIQUE,
    receipt_image_url    TEXT,
    notes                TEXT,
    is_external_transfer BOOLEAN            NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- financed_payments
CREATE TABLE financed_payments (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    financed_purchase_id UUID          NOT NULL REFERENCES financed_purchases(id) ON DELETE CASCADE,
    transaction_id       UUID          NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    payment_number       INTEGER       NOT NULL,
    principal_portion    DECIMAL(12,2) NOT NULL,
    interest_portion     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    paid_on              DATE          NOT NULL,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (financed_purchase_id, payment_number),
    CONSTRAINT positive_principal CHECK (principal_portion >= 0),
    CONSTRAINT positive_interest  CHECK (interest_portion >= 0)
);

-- savings_goals
CREATE TABLE savings_goals (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name           VARCHAR(150) NOT NULL,
    target_amount  DECIMAL(12,2) NOT NULL,
    current_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    deadline       DATE,
    goal_type      goal_type   NOT NULL DEFAULT 'custom',
    status         goal_status NOT NULL DEFAULT 'active',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT positive_target  CHECK (target_amount > 0),
    CONSTRAINT positive_current CHECK (current_amount >= 0)
);

-- Indexes
CREATE INDEX idx_accounts_user   ON accounts (user_id);
CREATE INDEX idx_categories_user ON categories (user_id);
CREATE INDEX idx_txn_user        ON transactions (user_id);
CREATE INDEX idx_txn_account     ON transactions (account_id);
CREATE INDEX idx_txn_category    ON transactions (category_id);
CREATE INDEX idx_txn_date        ON transactions (user_id, date DESC);
CREATE INDEX idx_fp_user         ON financed_purchases (user_id);
CREATE INDEX idx_fpay_purchase   ON financed_payments (financed_purchase_id);
CREATE INDEX idx_goals_user      ON savings_goals (user_id);

-- Auto update updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_financed_purchases_updated_at
    BEFORE UPDATE ON financed_purchases
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_savings_goals_updated_at
    BEFORE UPDATE ON savings_goals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed default categories on signup
CREATE OR REPLACE FUNCTION seed_default_categories(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO categories (user_id, name, color_hex, is_system) VALUES
        (p_user_id, 'Housing',       '#6366f1', TRUE),
        (p_user_id, 'Food',          '#f97316', TRUE),
        (p_user_id, 'Transport',     '#0ea5e9', TRUE),
        (p_user_id, 'Subscriptions', '#a855f7', TRUE),
        (p_user_id, 'Health',        '#22c55e', TRUE),
        (p_user_id, 'Entertainment', '#ec4899', TRUE),
        (p_user_id, 'Shopping',      '#f59e0b', TRUE),
        (p_user_id, 'Education',     '#14b8a6', TRUE),
        (p_user_id, 'Savings',       '#84cc16', TRUE),
        (p_user_id, 'Uncategorized', '#6b7280', TRUE);
END;
$$ LANGUAGE plpgsql;