import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
            'blackjack_hit',
            { p_user_id: user.id }
        );

        if (rpcError) {
            console.error('blackjack_hit RPC error:', rpcError);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        const result = rpcResult as Record<string, unknown>;

        if (result.error) {
            const errorCode = result.error as string;
            const errorMap: Record<string, { message: string; status: number }> = {
                no_active_session: { message: 'No active blackjack session.', status: 404 },
            };
            const mapped = errorMap[errorCode] ?? { message: 'Internal Server Error', status: 500 };
            return NextResponse.json({ error: mapped.message }, { status: mapped.status });
        }

        return NextResponse.json({
            success: true,
            playerHand: result.playerHand,
            dealerHand: result.dealerHand,
            dealerVisible: result.dealerVisible,
            playerValue: result.playerValue,
            dealerValue: result.dealerValue,
            status: result.status,
            result: result.result,
            payout: result.payout,
            newChips: result.newChips,
        });

    } catch (error) {
        console.error('Casino blackjack hit API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
