import { NextResponse } from 'next/server';
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

        // List all files in the user's folder within booster_uploads bucket
        const { data: files, error: listError } = await supabaseAdmin.storage
            .from('booster_uploads')
            .list(user.id, {
                sortBy: { column: 'created_at', order: 'desc' },
            });

        if (listError) {
            console.error('[booster-logs] Storage list error:', listError);
            return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
        }

        const logs = (files ?? [])
            .filter(f => f.name && !f.name.startsWith('.'))
            .map(f => ({
                filename: f.name,
                createdAt: f.created_at,
                size: f.metadata?.size ?? 0,
            }));

        return NextResponse.json({ logs });
    } catch (error) {
        console.error('[booster-logs] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
