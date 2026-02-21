-- Migration 004: Casino RPCs (Scratch Card + Hi-Lo)
-- Both follow the convert_chips_to_tickets pattern:
-- FOR UPDATE lock → validate balance → deduct → determine outcome → award → return JSONB

-- =============================================================================
-- play_scratch: Scratch card game (fixed 10 chip cost)
-- =============================================================================
create or replace function play_scratch(p_user_id uuid)
returns jsonb as $$
declare
  v_chips int;
  v_coins int;
  v_roll float;
  v_outcome text;
  v_reward_chips int := 0;
  v_reward_coins int := 0;
begin
  -- Lock user row
  select vibe_chips, vibe_coins into v_chips, v_coins
  from users
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('error', 'user_not_found');
  end if;

  -- Check balance
  if v_chips < 10 then
    return jsonb_build_object(
      'error', 'insufficient_chips',
      'have', v_chips,
      'need', 10
    );
  end if;

  -- Deduct cost
  v_chips := v_chips - 10;

  -- Roll outcome
  v_roll := random();

  if v_roll < 0.600 then
    v_outcome := 'lose';
  elsif v_roll < 0.800 then
    v_outcome := 'win_5_coins';
    v_reward_coins := 5;
  elsif v_roll < 0.900 then
    v_outcome := 'win_15_chips';
    v_reward_chips := 15;
  elsif v_roll < 0.970 then
    v_outcome := 'win_25_coins';
    v_reward_coins := 25;
  elsif v_roll < 0.995 then
    v_outcome := 'win_50_chips';
    v_reward_chips := 50;
  else
    v_outcome := 'win_200_coins';
    v_reward_coins := 200;
  end if;

  -- Apply rewards
  v_chips := v_chips + v_reward_chips;
  v_coins := v_coins + v_reward_coins;

  -- Update user
  update users
  set vibe_chips = v_chips,
      vibe_coins = v_coins,
      updated_at = now()
  where id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'outcome', v_outcome,
    'reward_chips', v_reward_chips,
    'reward_coins', v_reward_coins,
    'new_chips', v_chips,
    'new_coins', v_coins,
    'cost', 10
  );
end;
$$ language plpgsql security definer;

-- =============================================================================
-- play_hilo: Hi-Lo card game (variable bet)
-- =============================================================================
create or replace function play_hilo(p_user_id uuid, p_bet int, p_guess text)
returns jsonb as $$
declare
  v_chips int;
  v_card int;
  v_drawn_card int;
  v_favorable int;
  v_multiplier float;
  v_won boolean;
  v_payout int;
  v_outcome text;
begin
  -- Validate inputs
  if p_guess not in ('higher', 'lower') then
    return jsonb_build_object('error', 'invalid_guess');
  end if;

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

  -- Draw two cards (1=Ace through 13=King)
  v_card := floor(random() * 13)::int + 1;
  v_drawn_card := floor(random() * 13)::int + 1;

  -- Push: cards are equal
  if v_card = v_drawn_card then
    -- Refund bet
    v_chips := v_chips + p_bet;

    update users
    set vibe_chips = v_chips,
        updated_at = now()
    where id = p_user_id;

    return jsonb_build_object(
      'success', true,
      'outcome', 'push',
      'card', v_card,
      'drawn_card', v_drawn_card,
      'bet', p_bet,
      'payout', 0,
      'net', 0,
      'multiplier', 0,
      'new_chips', v_chips
    );
  end if;

  -- Compute favorable outcomes and multiplier
  if p_guess = 'higher' then
    v_favorable := 13 - v_card;
    v_won := v_drawn_card > v_card;
  else
    v_favorable := v_card - 1;
    v_won := v_drawn_card < v_card;
  end if;

  v_multiplier := greatest(1.2, least(12.0, 13.0 / v_favorable));

  if v_won then
    v_outcome := 'win';
    v_payout := floor(p_bet * v_multiplier)::int;
    v_chips := v_chips + v_payout;
  else
    v_outcome := 'lose';
    v_payout := 0;
  end if;

  -- Update user
  update users
  set vibe_chips = v_chips,
      updated_at = now()
  where id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'outcome', v_outcome,
    'card', v_card,
    'drawn_card', v_drawn_card,
    'bet', p_bet,
    'payout', v_payout,
    'net', v_payout - p_bet,
    'multiplier', round(v_multiplier::numeric, 2),
    'new_chips', v_chips
  );
end;
$$ language plpgsql security definer;
