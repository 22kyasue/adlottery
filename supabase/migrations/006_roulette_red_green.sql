-- =============================================================================
-- Migration 006: Change roulette colors from purple/red to red/green
-- purple (bettable, 3x) → red (bettable, 3x)
-- red (house) → green (house)
-- =============================================================================

create or replace function play_roulette(p_user_id uuid, p_bet int, p_color text)
returns jsonb as $$
declare
  v_chips int;
  v_roll float;
  v_result_color text;
  v_multiplier int;
  v_won boolean;
  v_payout int;
begin
  -- Validate color
  if p_color not in ('black', 'red', 'gold') then
    return jsonb_build_object('error', 'invalid_color');
  end if;

  -- Validate bet
  if p_bet <= 0 then
    return jsonb_build_object('error', 'invalid_bet');
  end if;
  if p_bet > 500 then
    return jsonb_build_object('error', 'bet_too_high', 'max', 500);
  end if;

  -- Lock user row
  select vibe_chips into v_chips
  from users
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('error', 'user_not_found');
  end if;

  -- Check balance
  if v_chips < p_bet then
    return jsonb_build_object(
      'error', 'insufficient_chips',
      'have', v_chips,
      'need', p_bet
    );
  end if;

  -- Deduct bet
  v_chips := v_chips - p_bet;

  -- Roll: 0-0.45=black(2x), 0.45-0.75=red(3x), 0.75-0.80=gold(10x), 0.80-1.00=green(house)
  v_roll := random();

  if v_roll < 0.45 then
    v_result_color := 'black';
    v_multiplier := 2;
  elsif v_roll < 0.75 then
    v_result_color := 'red';
    v_multiplier := 3;
  elsif v_roll < 0.80 then
    v_result_color := 'gold';
    v_multiplier := 10;
  else
    v_result_color := 'green';
    v_multiplier := 0;
  end if;

  -- Check win
  v_won := (v_result_color = p_color);

  if v_won then
    v_payout := p_bet * v_multiplier;
    v_chips := v_chips + v_payout;
  else
    v_payout := 0;
  end if;

  -- Update user
  update users
  set vibe_chips = v_chips,
      updated_at = now()
  where id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'result_color', v_result_color,
    'chosen_color', p_color,
    'won', v_won,
    'multiplier', v_multiplier,
    'payout', v_payout,
    'net', v_payout - p_bet,
    'new_chips', v_chips
  );
end;
$$ language plpgsql security definer;
