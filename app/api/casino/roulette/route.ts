import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const VALID_COLORS = ['black', 'red', 'gold'];

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const bets = body?.bets;

        // Validate bets array
        if (!Array.isArray(bets) || bets.length < 1) {
            return NextResponse.json({ error: 'At least one bet is required.' }, { status: 400 });
        }
        if (bets.length > 3) {
            return NextResponse.json({ error: 'Maximum 3 bets per spin.' }, { status: 400 });
        }

        // Validate each entry and check for duplicates
        const seenColors = new Set<string>();
        const sanitizedBets: Array<{ color: string; bet: number }> = [];

        for (const entry of bets) {
            const color = entry?.color;
            const bet = Math.floor(entry?.bet);

            if (!VALID_COLORS.includes(color)) {
                return NextResponse.json({ error: `Color must be "black", "red", or "gold".` }, { status: 400 });
            }
            if (seenColors.has(color)) {
                return NextResponse.json({ error: `Duplicate color: ${color}. One bet per color.` }, { status: 400 });
            }
            seenColors.add(color);

            if (!Number.isFinite(bet) || bet <= 0) {
                return NextResponse.json({ error: 'Each bet must be a positive integer.' }, { status: 400 });
            }
            if (bet > 500) {
                return NextResponse.json({ error: 'Maximum bet per color is 500 chips.' }, { status: 400 });
            }

            sanitizedBets.push({ color, bet });
        }

        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
            'play_roulette_multi',
            { p_user_id: user.id, p_bets: sanitizedBets }
        );

        if (rpcError) {
            console.error('play_roulette_multi RPC error:', rpcError);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        const result = rpcResult as Record<string, unknown>;

        if (result.error) {
            const errorCode = result.error as string;
            const errorMap: Record<string, { message: string; status: number }> = {
                insufficient_chips: { message: `Not enough Vibe Chips. You have ${result.have}, need ${result.need}.`, status: 400 },
                invalid_color: { message: result.message as string || 'Invalid color choice.', status: 400 },
                duplicate_color: { message: result.message as string || 'Duplicate color.', status: 400 },
                invalid_bet: { message: result.message as string || 'Invalid bet amount.', status: 400 },
                invalid_bets: { message: result.message as string || 'Invalid bets array.', status: 400 },
                bet_too_high: { message: `Maximum bet per color is ${result.max} chips.`, status: 400 },
                user_not_found: { message: 'User not found.', status: 404 },
            };
            const mapped = errorMap[errorCode] ?? { message: 'Internal Server Error', status: 500 };
            return NextResponse.json({ error: mapped.message }, { status: mapped.status });
        }

        const betsArray = result.bets as Array<Record<string, unknown>>;

        return NextResponse.json({
            success: true,
            resultColor: result.result_color,
            anyWon: result.any_won,
            totalBet: result.total_bet,
            totalPayout: result.total_payout,
            net: result.net,
            bets: betsArray.map(b => ({
                color: b.color,
                bet: b.bet,
                won: b.won,
                multiplier: b.multiplier,
                payout: b.payout,
                net: b.net,
            })),
            newChips: result.new_chips,
        });

    } catch (error) {
        console.error('Casino roulette API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
