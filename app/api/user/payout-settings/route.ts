import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from('users')
            .select('paypal_email, wise_email')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('[payout-settings] GET error:', error);
            return NextResponse.json({ error: 'Failed to fetch payout settings' }, { status: 500 });
        }

        return NextResponse.json({
            paypalEmail: data?.paypal_email ?? '',
            wiseEmail: data?.wise_email ?? '',
        });
    } catch (error) {
        console.error('[payout-settings] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { paypalEmail, wiseEmail } = body as {
            paypalEmail?: string;
            wiseEmail?: string;
        };

        // Validate email formats if provided and non-empty
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (paypalEmail && paypalEmail.trim() !== '') {
            if (!emailRegex.test(paypalEmail.trim())) {
                return NextResponse.json({ error: 'Invalid PayPal email format' }, { status: 400 });
            }
        }

        if (wiseEmail && wiseEmail.trim() !== '') {
            if (!emailRegex.test(wiseEmail.trim())) {
                return NextResponse.json({ error: 'Invalid Wise email format' }, { status: 400 });
            }
        }

        const { error } = await supabaseAdmin
            .from('users')
            .update({
                paypal_email: paypalEmail?.trim() || null,
                wise_email: wiseEmail?.trim() || null,
            })
            .eq('id', user.id);

        if (error) {
            console.error('[payout-settings] POST error:', error);
            return NextResponse.json({ error: 'Failed to save payout settings' }, { status: 500 });
        }

        // Promote any pending payouts to 'ready' now that payout info is set
        const hasPayoutMethod = (paypalEmail?.trim() || wiseEmail?.trim());
        if (hasPayoutMethod) {
            const { data: promoted, error: promoteError } = await supabaseAdmin
                .rpc('promote_pending_payouts', { p_user_id: user.id });

            if (promoteError) {
                console.error('[payout-settings] Promote pending payouts error:', promoteError);
            } else if (promoted && promoted > 0) {
                console.log(`[payout-settings] Promoted ${promoted} pending payout(s) to ready for user ${user.id}`);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[payout-settings] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
