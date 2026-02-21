
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    // This file should ONLY be imported in server contexts (API routes, Server Components/Actions)
    if (typeof window !== 'undefined') {
        throw new Error('supabase-admin.ts imported on client side! This exposes secrets!');
    }
}

// Admin client with Service Role Key for bypassing RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
