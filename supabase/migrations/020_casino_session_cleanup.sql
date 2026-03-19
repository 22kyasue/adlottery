-- Cleanup stale casino sessions older than 24 hours.
-- Sessions left in 'player_turn' status indefinitely block new games
-- due to the unique partial index on (user_id) WHERE status = 'player_turn'.

-- Function: forfeit and clean up stale sessions
CREATE OR REPLACE FUNCTION cleanup_stale_casino_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleaned integer;
BEGIN
  UPDATE casino_sessions
  SET status   = 'complete',
      result   = 'timeout',
      payout   = 0,
      ended_at = now()
  WHERE status = 'player_turn'
    AND created_at < now() - interval '24 hours';

  GET DIAGNOSTICS cleaned = ROW_COUNT;
  RETURN cleaned;
END;
$$;
