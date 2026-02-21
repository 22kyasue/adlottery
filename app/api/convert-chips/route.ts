import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getCurrentWeekId } from '@/lib/utils';

export async function POST(request: NextRequest) {
    try {
        // 1. Auth
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse and validate body
        const body = await request.json();
        const amount = Math.floor(body?.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json(
                { error: 'Invalid amount. Must be a positive integer.' },
                { status: 400 }
            );
        }

        if (amount > 1000) {
            return NextResponse.json(
                { error: 'Cannot convert more than 1000 chips at once.' },
                { status: 400 }
            );
        }

        // 3. Call the atomic RPC
        const weekId = getCurrentWeekId();
        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
            'convert_chips_to_tickets',
            { p_user_id: user.id, p_week_id: weekId, p_amount: amount }
        );

        if (rpcError) {
            console.error('convert_chips_to_tickets RPC error:', rpcError);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        // 4. Interpret the RPC's JSONB return
        const result = rpcResult as Record<string, unknown>;

        if (result.error) {
            const errorCode = result.error as string;
            const errorMap: Record<string, { message: string; status: number }> = {
                insufficient_chips: {
                    message: `Not enough Vibe Chips. You have ${result.have}, need ${result.need}.`,
                    status: 400,
                },
                cap_reached: {
                    message: 'Market conversion cap reached. Please wait for more organic ad views.',
                    status: 400,
                },
                exceeds_cap: {
                    message: `Amount exceeds remaining cap. You can convert at most ${result.remaining_cap} chips.`,
                    status: 400,
                },
                invalid_amount: { message: 'Invalid amount.', status: 400 },
                user_not_found: { message: 'User not found.', status: 404 },
            };

            const mapped = errorMap[errorCode] ?? { message: 'Internal Server Error', status: 500 };
            return NextResponse.json(
                { error: mapped.message, remainingCap: result.remaining_cap },
                { status: mapped.status }
            );
        }

        // 5. Success
        return NextResponse.json({
            success: true,
            chipsSpent: result.chips_spent,
            newChips: result.new_chips,
            newConverted: result.new_converted,
            remainingCap: result.remaining_cap,
            globalOrganic: result.global_organic,
            globalConverted: result.global_converted,
            capLimit: result.cap_limit,
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
