import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getCurrentWeekId } from '@/lib/utils';

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const weekId = getCurrentWeekId();

        // Aggregate global totals for the week (bypasses RLS via admin client)
        const { data, error } = await supabaseAdmin
            .from('weekly_tickets')
            .select('organic_tickets, converted_tickets')
            .eq('week_id', weekId);

        if (error) {
            console.error('Error fetching cap data:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        const globalOrganic = data.reduce((s, r) => s + (r.organic_tickets ?? 0), 0);
        const globalConverted = data.reduce((s, r) => s + (r.converted_tickets ?? 0), 0);
        const capLimit = Math.floor(globalOrganic * 0.30);
        const remainingCap = Math.max(0, capLimit - globalConverted);

        return NextResponse.json({
            weekId,
            globalOrganic,
            globalConverted,
            capLimit,
            remainingCap,
            capPercent: globalOrganic > 0
                ? Math.round((globalConverted / globalOrganic) * 100)
                : 0,
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
