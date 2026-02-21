-- Migration 005: Blackjack (multi-step) + Roulette (atomic spin)
-- Blackjack uses server-side session storage for anti-cheat.
-- Roulette is a single atomic RPC like Scratch.

-- =============================================================================
-- Casino Sessions table (for multi-step games like Blackjack)
-- =============================================================================
create table casino_sessions (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references users(id) not null,
  game_type     text not null default 'blackjack',
  bet           int not null,
  deck          int[] not null,           -- shuffled 1..52
  deck_position int not null default 0,   -- next card index
  player_hand   int[] not null default '{}',
  dealer_hand   int[] not null default '{}',
  status        text not null default 'player_turn',  -- player_turn | complete
  result        text,                     -- win | lose | push | blackjack | forfeit
  payout        int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Only ONE active session per user (partial unique index)
create unique index idx_casino_sessions_active
  on casino_sessions (user_id) where status = 'player_turn';

alter table casino_sessions enable row level security;
create policy "Users can view own sessions"
  on casino_sessions for select using (auth.uid() = user_id);

-- =============================================================================
-- Helper: blackjack_hand_value(hand int[]) → int
-- Card encoding: 1-52. rank = ((card-1) % 13) + 1 (1=A..13=K). suit = floor((card-1)/13).
-- Ace=11 (downgrades to 1 when busting), J/Q/K=10.
-- =============================================================================
create or replace function blackjack_hand_value(hand int[])
returns int as $$
declare
  v_total int := 0;
  v_aces int := 0;
  v_rank int;
  v_card int;
begin
  foreach v_card in array hand loop
    v_rank := ((v_card - 1) % 13) + 1;
    if v_rank = 1 then
      v_aces := v_aces + 1;
      v_total := v_total + 11;
    elsif v_rank >= 11 then
      v_total := v_total + 10;
    else
      v_total := v_total + v_rank;
    end if;
  end loop;

  -- Downgrade aces from 11 to 1 as needed
  while v_total > 21 and v_aces > 0 loop
    v_total := v_total - 10;
    v_aces := v_aces - 1;
  end loop;

  return v_total;
end;
$$ language plpgsql immutable;

-- =============================================================================
-- Helper: cards_to_jsonb(hand int[]) → jsonb
-- Converts int[] to [{rank, suit}, ...] for client display.
-- =============================================================================
create or replace function cards_to_jsonb(hand int[])
returns jsonb as $$
declare
  v_result jsonb := '[]'::jsonb;
  v_card int;
begin
  foreach v_card in array hand loop
    v_result := v_result || jsonb_build_object(
      'rank', ((v_card - 1) % 13) + 1,
      'suit', floor((v_card - 1) / 13)::int
    );
  end loop;
  return v_result;
end;
$$ language plpgsql immutable;

-- =============================================================================
-- blackjack_deal(p_user_id, p_bet) — Start a new blackjack game
-- =============================================================================
create or replace function blackjack_deal(p_user_id uuid, p_bet int)
returns jsonb as $$
declare
  v_chips int;
  v_deck int[];
  v_player_hand int[];
  v_dealer_hand int[];
  v_player_val int;
  v_dealer_val int;
  v_session_id uuid;
  v_payout int;
  v_active_exists boolean;
begin
  -- Validate bet
  if p_bet <= 0 then
    return jsonb_build_object('error', 'invalid_bet');
  end if;
  if p_bet > 500 then
    return jsonb_build_object('error', 'bet_too_high', 'max', 500);
  end if;

  -- Check no active session
  select exists(
    select 1 from casino_sessions
    where user_id = p_user_id and status = 'player_turn'
  ) into v_active_exists;

  if v_active_exists then
    return jsonb_build_object('error', 'active_session_exists');
  end if;

  -- Lock user row, check balance
  select vibe_chips into v_chips
  from users
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('error', 'user_not_found');
  end if;

  if v_chips < p_bet then
    return jsonb_build_object(
      'error', 'insufficient_chips',
      'have', v_chips,
      'need', p_bet
    );
  end if;

  -- Deduct bet
  v_chips := v_chips - p_bet;
  update users set vibe_chips = v_chips, updated_at = now() where id = p_user_id;

  -- Shuffle deck
  select array_agg(n order by random())
  into v_deck
  from generate_series(1, 52) as n;

  -- Deal: player=[1,3], dealer=[2,4], next position=5
  v_player_hand := array[v_deck[1], v_deck[3]];
  v_dealer_hand := array[v_deck[2], v_deck[4]];

  v_player_val := blackjack_hand_value(v_player_hand);
  v_dealer_val := blackjack_hand_value(v_dealer_hand);

  -- Check naturals (both get 21)
  if v_player_val = 21 and v_dealer_val = 21 then
    -- Push: refund
    v_chips := v_chips + p_bet;
    update users set vibe_chips = v_chips, updated_at = now() where id = p_user_id;

    insert into casino_sessions (user_id, game_type, bet, deck, deck_position, player_hand, dealer_hand, status, result, payout)
    values (p_user_id, 'blackjack', p_bet, v_deck, 5, v_player_hand, v_dealer_hand, 'complete', 'push', p_bet);

    return jsonb_build_object(
      'success', true,
      'playerHand', cards_to_jsonb(v_player_hand),
      'dealerHand', cards_to_jsonb(v_dealer_hand),
      'playerValue', v_player_val,
      'dealerValue', v_dealer_val,
      'status', 'complete',
      'result', 'push',
      'payout', p_bet,
      'newChips', v_chips
    );
  end if;

  -- Player natural blackjack (2.5x)
  if v_player_val = 21 then
    v_payout := floor(p_bet * 2.5)::int;
    v_chips := v_chips + v_payout;
    update users set vibe_chips = v_chips, updated_at = now() where id = p_user_id;

    insert into casino_sessions (user_id, game_type, bet, deck, deck_position, player_hand, dealer_hand, status, result, payout)
    values (p_user_id, 'blackjack', p_bet, v_deck, 5, v_player_hand, v_dealer_hand, 'complete', 'blackjack', v_payout);

    return jsonb_build_object(
      'success', true,
      'playerHand', cards_to_jsonb(v_player_hand),
      'dealerHand', cards_to_jsonb(v_dealer_hand),
      'playerValue', v_player_val,
      'dealerValue', v_dealer_val,
      'status', 'complete',
      'result', 'blackjack',
      'payout', v_payout,
      'newChips', v_chips
    );
  end if;

  -- Dealer natural 21 → player loses
  if v_dealer_val = 21 then
    insert into casino_sessions (user_id, game_type, bet, deck, deck_position, player_hand, dealer_hand, status, result, payout)
    values (p_user_id, 'blackjack', p_bet, v_deck, 5, v_player_hand, v_dealer_hand, 'complete', 'lose', 0);

    return jsonb_build_object(
      'success', true,
      'playerHand', cards_to_jsonb(v_player_hand),
      'dealerHand', cards_to_jsonb(v_dealer_hand),
      'playerValue', v_player_val,
      'dealerValue', v_dealer_val,
      'status', 'complete',
      'result', 'lose',
      'payout', 0,
      'newChips', v_chips
    );
  end if;

  -- Normal deal: create active session
  insert into casino_sessions (user_id, game_type, bet, deck, deck_position, player_hand, dealer_hand, status)
  values (p_user_id, 'blackjack', p_bet, v_deck, 5, v_player_hand, v_dealer_hand, 'player_turn')
  returning id into v_session_id;

  return jsonb_build_object(
    'success', true,
    'sessionId', v_session_id,
    'playerHand', cards_to_jsonb(v_player_hand),
    'dealerVisible', cards_to_jsonb(v_dealer_hand[1:1]),
    'playerValue', v_player_val,
    'status', 'player_turn',
    'newChips', v_chips
  );
end;
$$ language plpgsql security definer;

-- =============================================================================
-- blackjack_hit(p_user_id) — Draw a card during player turn
-- =============================================================================
create or replace function blackjack_hit(p_user_id uuid)
returns jsonb as $$
declare
  v_session casino_sessions%rowtype;
  v_new_card int;
  v_player_val int;
  v_dealer_val int;
  v_chips int;
  v_payout int;
  v_result text;
  v_deck_pos int;
  v_dealer_hand int[];
begin
  -- Lock active session
  select * into v_session
  from casino_sessions
  where user_id = p_user_id and status = 'player_turn'
  for update;

  if not found then
    return jsonb_build_object('error', 'no_active_session');
  end if;

  -- Draw next card
  v_new_card := v_session.deck[v_session.deck_position];
  v_session.player_hand := v_session.player_hand || v_new_card;
  v_deck_pos := v_session.deck_position + 1;
  v_player_val := blackjack_hand_value(v_session.player_hand);

  -- Bust: player > 21
  if v_player_val > 21 then
    update casino_sessions
    set player_hand = v_session.player_hand,
        deck_position = v_deck_pos,
        status = 'complete',
        result = 'lose',
        payout = 0,
        updated_at = now()
    where id = v_session.id;

    return jsonb_build_object(
      'success', true,
      'playerHand', cards_to_jsonb(v_session.player_hand),
      'dealerHand', cards_to_jsonb(v_session.dealer_hand),
      'playerValue', v_player_val,
      'dealerValue', blackjack_hand_value(v_session.dealer_hand),
      'status', 'complete',
      'result', 'lose',
      'payout', 0
    );
  end if;

  -- Exactly 21: auto-stand — run dealer logic inline
  if v_player_val = 21 then
    -- Dealer hits until >= 17
    v_dealer_hand := v_session.dealer_hand;
    v_dealer_val := blackjack_hand_value(v_dealer_hand);

    while v_dealer_val < 17 loop
      v_dealer_hand := v_dealer_hand || v_session.deck[v_deck_pos];
      v_deck_pos := v_deck_pos + 1;
      v_dealer_val := blackjack_hand_value(v_dealer_hand);
    end loop;

    -- Compare
    if v_dealer_val > 21 or v_player_val > v_dealer_val then
      v_result := 'win';
      v_payout := v_session.bet * 2;
    elsif v_player_val = v_dealer_val then
      v_result := 'push';
      v_payout := v_session.bet;
    else
      v_result := 'lose';
      v_payout := 0;
    end if;

    -- Settle chips
    if v_payout > 0 then
      select vibe_chips into v_chips from users where id = p_user_id for update;
      v_chips := v_chips + v_payout;
      update users set vibe_chips = v_chips, updated_at = now() where id = p_user_id;
    end if;

    update casino_sessions
    set player_hand = v_session.player_hand,
        dealer_hand = v_dealer_hand,
        deck_position = v_deck_pos,
        status = 'complete',
        result = v_result,
        payout = v_payout,
        updated_at = now()
    where id = v_session.id;

    select vibe_chips into v_chips from users where id = p_user_id;

    return jsonb_build_object(
      'success', true,
      'playerHand', cards_to_jsonb(v_session.player_hand),
      'dealerHand', cards_to_jsonb(v_dealer_hand),
      'playerValue', v_player_val,
      'dealerValue', v_dealer_val,
      'status', 'complete',
      'result', v_result,
      'payout', v_payout,
      'newChips', v_chips
    );
  end if;

  -- Still in play: update session
  update casino_sessions
  set player_hand = v_session.player_hand,
      deck_position = v_deck_pos,
      updated_at = now()
  where id = v_session.id;

  return jsonb_build_object(
    'success', true,
    'playerHand', cards_to_jsonb(v_session.player_hand),
    'dealerVisible', cards_to_jsonb(v_session.dealer_hand[1:1]),
    'playerValue', v_player_val,
    'status', 'player_turn'
  );
end;
$$ language plpgsql security definer;

-- =============================================================================
-- blackjack_stand(p_user_id) — End player turn, dealer plays
-- =============================================================================
create or replace function blackjack_stand(p_user_id uuid)
returns jsonb as $$
declare
  v_session casino_sessions%rowtype;
  v_dealer_hand int[];
  v_dealer_val int;
  v_player_val int;
  v_deck_pos int;
  v_result text;
  v_payout int;
  v_chips int;
begin
  -- Lock active session
  select * into v_session
  from casino_sessions
  where user_id = p_user_id and status = 'player_turn'
  for update;

  if not found then
    return jsonb_build_object('error', 'no_active_session');
  end if;

  v_player_val := blackjack_hand_value(v_session.player_hand);
  v_dealer_hand := v_session.dealer_hand;
  v_dealer_val := blackjack_hand_value(v_dealer_hand);
  v_deck_pos := v_session.deck_position;

  -- Dealer hits until >= 17
  while v_dealer_val < 17 loop
    v_dealer_hand := v_dealer_hand || v_session.deck[v_deck_pos];
    v_deck_pos := v_deck_pos + 1;
    v_dealer_val := blackjack_hand_value(v_dealer_hand);
  end loop;

  -- Compare
  if v_dealer_val > 21 or v_player_val > v_dealer_val then
    v_result := 'win';
    v_payout := v_session.bet * 2;
  elsif v_player_val = v_dealer_val then
    v_result := 'push';
    v_payout := v_session.bet;
  else
    v_result := 'lose';
    v_payout := 0;
  end if;

  -- Settle chips
  if v_payout > 0 then
    select vibe_chips into v_chips from users where id = p_user_id for update;
    v_chips := v_chips + v_payout;
    update users set vibe_chips = v_chips, updated_at = now() where id = p_user_id;
  end if;

  -- Update session
  update casino_sessions
  set dealer_hand = v_dealer_hand,
      deck_position = v_deck_pos,
      status = 'complete',
      result = v_result,
      payout = v_payout,
      updated_at = now()
  where id = v_session.id;

  select vibe_chips into v_chips from users where id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'playerHand', cards_to_jsonb(v_session.player_hand),
    'dealerHand', cards_to_jsonb(v_dealer_hand),
    'playerValue', v_player_val,
    'dealerValue', v_dealer_val,
    'status', 'complete',
    'result', v_result,
    'payout', v_payout,
    'newChips', v_chips
  );
end;
$$ language plpgsql security definer;

-- =============================================================================
-- blackjack_state(p_user_id) — Check for active session (resume on refresh)
-- =============================================================================
create or replace function blackjack_state(p_user_id uuid)
returns jsonb as $$
declare
  v_session casino_sessions%rowtype;
begin
  select * into v_session
  from casino_sessions
  where user_id = p_user_id and status = 'player_turn'
  limit 1;

  if not found then
    return jsonb_build_object('active', false);
  end if;

  return jsonb_build_object(
    'active', true,
    'sessionId', v_session.id,
    'bet', v_session.bet,
    'playerHand', cards_to_jsonb(v_session.player_hand),
    'dealerVisible', cards_to_jsonb(v_session.dealer_hand[1:1]),
    'playerValue', blackjack_hand_value(v_session.player_hand),
    'status', 'player_turn'
  );
end;
$$ language plpgsql security definer;

-- =============================================================================
-- blackjack_forfeit(p_user_id) — Abandon active game, lose bet
-- =============================================================================
create or replace function blackjack_forfeit(p_user_id uuid)
returns jsonb as $$
declare
  v_session casino_sessions%rowtype;
  v_chips int;
begin
  select * into v_session
  from casino_sessions
  where user_id = p_user_id and status = 'player_turn'
  for update;

  if not found then
    return jsonb_build_object('error', 'no_active_session');
  end if;

  update casino_sessions
  set status = 'complete',
      result = 'forfeit',
      payout = 0,
      updated_at = now()
  where id = v_session.id;

  select vibe_chips into v_chips from users where id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'result', 'forfeit',
    'bet', v_session.bet,
    'payout', 0,
    'newChips', v_chips
  );
end;
$$ language plpgsql security definer;

-- =============================================================================
-- play_roulette(p_user_id, p_bet, p_color) — Atomic roulette spin
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
  if p_color not in ('black', 'purple', 'gold') then
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

  -- Roll: 0-0.45=black(2x), 0.45-0.75=purple(3x), 0.75-0.80=gold(10x), 0.80-1.00=red(house)
  v_roll := random();

  if v_roll < 0.45 then
    v_result_color := 'black';
    v_multiplier := 2;
  elsif v_roll < 0.75 then
    v_result_color := 'purple';
    v_multiplier := 3;
  elsif v_roll < 0.80 then
    v_result_color := 'gold';
    v_multiplier := 10;
  else
    v_result_color := 'red';
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
