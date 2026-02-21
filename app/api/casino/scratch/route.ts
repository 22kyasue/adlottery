import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST() {
    try {
        // 1. Auth
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Call the atomic RPC (cost is fixed at 10)
        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
            'play_scratch',
            { p_user_id: user.id }
        );

        if (rpcError) {
            console.error('play_scratch RPC error:', rpcError);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        // 3. Interpret the RPC's JSONB return
        const result = rpcResult as Record<string, unknown>;

        if (result.error) {
            const errorCode = result.error as string;
            const errorMap: Record<string, { message: string; status: number }> = {
                insufficient_chips: {
                    message: `Not enough Vibe Chips. You have ${result.have}, need ${result.need}.`,
                    status: 400,
                },
                user_not_found: { message: 'User not found.', status: 404 },
            };

            const mapped = errorMap[errorCode] ?? { message: 'Internal Server Error', status: 500 };
            return NextResponse.json({ error: mapped.message }, { status: mapped.status });
        }

        // 4. Success
        return NextResponse.json({
            success: true,
            outcome: result.outcome,
            rewardChips: result.reward_chips,
            rewardCoins: result.reward_coins,
            newChips: result.new_chips,
            newCoins: result.new_coins,
            cost: result.cost,
        });

    } catch (error) {
        console.error('Casino scratch API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
