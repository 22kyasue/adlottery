import { NextRequest, NextResponse } from 'next/server';
import { safeCompare } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
    const { password } = await request.json().catch(() => ({ password: '' }));
    const expected = process.env.ADMIN_API_KEY?.trim();

    if (!expected || !safeCompare(password, expected)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set('admin_auth', expected, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 8, // 8 hours
        path: '/admin',
    });
    return res;
}
