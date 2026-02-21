-- =============================================================================
-- Migration 007: Multi-bet roulette
-- New play_roulette_multi(p_user_id, p_bets) RPC
-- p_bets format: [{"color":"black","bet":100}, {"color":"red","bet":50}]
-- Old play_roulette left in place (not dropped).
-- =============================================================================

create or replace function play_roulette_multi(p_user_id uuid, p_bets jsonb)
returns jsonb as $$
declare
  v_chips int;
  v_roll float;
  v_result_color text;
  v_total_bet int := 0;
  v_total_payout int := 0;
  v_any_won boolean := false;
  v_bet_count int;
  v_entry jsonb;
  v_color text;
  v_bet int;
  v_multiplier int;
  v_won boolean;
  v_payout int;
  v_bets_result jsonb := '[]'::jsonb;
  v_seen_colors text[] := '{}';
  v_multipliers jsonb := '{"black":2,"red":3,"gold":10}'::jsonb;
begin
  -- Validate bets array
  if p_bets is null or jsonb_typeof(p_bets) != 'array' then
    return jsonb_build_object('error', 'invalid_bets', 'message', 'bets must be an array');
  end if;

  v_bet_count := jsonb_array_length(p_bets);

  if v_bet_count < 1 then
    return jsonb_build_object('error', 'invalid_bets', 'message', 'at least one bet required');
  end if;
  if v_bet_count > 3 then
    return jsonb_build_object('error', 'invalid_bets', 'message', 'maximum 3 bets per spin');
  end if;

  -- Validate each bet entry, sum total, check duplicates
  for i in 0 .. v_bet_count - 1 loop
    v_entry := p_bets -> i;
    v_color := v_entry ->> 'color';
    v_bet := (v_entry ->> 'bet')::int;

    -- Valid color
    if v_color not in ('black', 'red', 'gold') then
      return jsonb_build_object('error', 'invalid_color', 'message', 'color must be black, red, or gold');
    end if;

    -- No duplicate colors
    if v_color = any(v_seen_colors) then
      return jsonb_build_object('error', 'duplicate_color', 'message', 'cannot bet on the same color twice');
    end if;
    v_seen_colors := v_seen_colors || v_color;

    -- Valid bet amount
    if v_bet is null or v_bet <= 0 then
      return jsonb_build_object('error', 'invalid_bet', 'message', 'each bet must be a positive integer');
    end if;
    if v_bet > 500 then
      return jsonb_build_object('error', 'bet_too_high', 'max', 500, 'message', 'per-color max is 500 chips');
    end if;

    v_total_bet := v_total_bet + v_bet;
  end loop;

  -- Lock user row, check balance
  select vibe_chips into v_chips
  from users
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('error', 'user_not_found');
  end if;

  if v_chips < v_total_bet then
    return jsonb_build_object(
      'error', 'insufficient_chips',
      'have', v_chips,
      'need', v_total_bet
    );
  end if;

  -- Deduct total bet upfront
  v_chips := v_chips - v_total_bet;

  -- Single roll: 0-0.45=black(2x), 0.45-0.75=red(3x), 0.75-0.80=gold(10x), 0.80-1.00=green(house)
  v_roll := random();

  if v_roll < 0.45 then
    v_result_color := 'black';
  elsif v_roll < 0.75 then
    v_result_color := 'red';
  elsif v_roll < 0.80 then
    v_result_color := 'gold';
  else
    v_result_color := 'green';
  end if;

  -- Evaluate each bet against the roll
  for i in 0 .. v_bet_count - 1 loop
    v_entry := p_bets -> i;
    v_color := v_entry ->> 'color';
    v_bet := (v_entry ->> 'bet')::int;
    v_multiplier := (v_multipliers ->> v_color)::int;

    v_won := (v_result_color = v_color);

    if v_won then
      v_payout := v_bet * v_multiplier;
      v_total_payout := v_total_payout + v_payout;
      v_any_won := true;
    else
      v_payout := 0;
    end if;

    v_bets_result := v_bets_result || jsonb_build_object(
      'color', v_color,
      'bet', v_bet,
      'won', v_won,
      'multiplier', v_multiplier,
      'payout', v_payout,
      'net', v_payout - v_bet
    );
  end loop;

  -- Credit winnings
  v_chips := v_chips + v_total_payout;

  -- Update user balance
  update users
  set vibe_chips = v_chips,
      updated_at = now()
  where id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'result_color', v_result_color,
    'any_won', v_any_won,
    'total_bet', v_total_bet,
    'total_payout', v_total_payout,
    'net', v_total_payout - v_total_bet,
    'bets', v_bets_result,
    'new_chips', v_chips
  );
end;
$$ language plpgsql security definer;
