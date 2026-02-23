-- Migration 016: Webhook failure retry queue
-- Stores failed offerwall webhook completions for manual or automated retry.

CREATE TABLE IF NOT EXISTS webhook_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'generic',
    transaction_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    error_message TEXT,
    retries INT NOT NULL DEFAULT 0,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_webhook_failures_unresolved
    ON webhook_failures(created_at)
    WHERE resolved = FALSE;

-- RLS: admin-only (no RLS policies for authenticated users)
ALTER TABLE webhook_failures ENABLE ROW LEVEL SECURITY;
