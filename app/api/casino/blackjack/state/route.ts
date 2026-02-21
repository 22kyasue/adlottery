import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
            'blackjack_state',
            { p_user_id: user.id }
        );

        if (rpcError) {
            console.error('blackjack_state RPC error:', rpcError);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        const result = rpcResult as Record<string, unknown>;

        return NextResponse.json({
            active: result.active,
            sessionId: result.sessionId,
            bet: result.bet,
            playerHand: result.playerHand,
            dealerVisible: result.dealerVisible,
            playerValue: result.playerValue,
            status: result.status,
        });

    } catch (error) {
        console.error('Casino blackjack state API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
