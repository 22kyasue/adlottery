

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
    try {
        // 1. Create a random test user email/password
        const email = `test-${Date.now()}@example.com`;
        const password = 'test-password-123';

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (authError || !authData.user) {
            return NextResponse.json({ error: 'Auth Create Failed', details: authError }, { status: 500 });
        }

        const userId = authData.user.id;

        // 2. Create public user record (trigger might do this in real app, but we do it manually here to be sure)
        const { error: userError } = await supabaseAdmin.from('users').insert({
            id: userId,
            vibe_chips: 0,
            vibe_coins: 0,
            is_shadowbanned: false
        });

        if (userError) {
            return NextResponse.json({ error: 'User Record Create Failed', details: userError }, { status: 500 });
        }

        // 3. Helper to call the verify-ad endpoint logic
        // We will invoke the logic by calling the POST function directly if we imported it, 
        // but to avoid export mess, let's just use `fetch`.
        // We need the absolute URL. Assuming localhost:3001 based on user state, but better to use relative if possible? 
        // fetch only works with absolute URLs in server components.

        // Easier way: Extract logic or just replicate the test logic here ensuring we use the same DB.
        // Actually, calling the endpoint acts as a true integration test.
        const baseUrl = 'http://localhost:3001';

        // TEST 1: First Watch (Should Succeed)
        const res1 = await fetch(`${baseUrl}/api/verify-ad`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, sessionToken: 'token-1' })
        });
        const data1 = await res1.json();

        // TEST 2: Second Watch Immediately (Should Shadowban)
        const res2 = await fetch(`${baseUrl}/api/verify-ad`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, sessionToken: 'token-2' })
        });
        const data2 = await res2.json();

        // TEST 3: Watch while Shadowbanned (Should return success but no ticket increment)
        // Wait 1 second just to be sure it's distinct log
        await new Promise(r => setTimeout(r, 1000));
        const res3 = await fetch(`${baseUrl}/api/verify-ad`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, sessionToken: 'token-3' })
        });
        const data3 = await res3.json();

        // Cleanup: Delete the test user (clean up auth and user data)
        // Note: cascade delete should handle public user and logs if configured, otherwise we delete manually
        // We'll just delete the auth user for now, assuming cascade. If not, we might leave trash.
        await supabaseAdmin.auth.admin.deleteUser(userId);

        return NextResponse.json({
            setup: { userId, email },
            test1: { description: "Legit Watch", response: data1, passed: data1.newTicketCount === 1 },
            test2: { description: "Speeding Bot", response: data2, passed: data2.success && !data2.newTicketCount },
            test3: { description: "Shadowbanned User", response: data3, passed: data3.success && !data3.newTicketCount }
        });

    } catch (error) {
        return NextResponse.json({ error: 'Test Runner Failed', details: String(error) }, { status: 500 });
    }
}
