'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, LogIn } from 'lucide-react';

export default function AdminLoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const res = await fetch('/api/admin/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });

        if (res.ok) {
            router.push('/admin');
        } else {
            setError('Incorrect password.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-6">
                <div className="text-center space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/30">
                        <Shield className="h-6 w-6 text-red-400" />
                    </div>
                    <h1 className="text-xl font-black text-white">Admin Access</h1>
                    <p className="text-sm text-gray-500">LottoAds</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Admin password"
                        autoFocus
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-600 focus:border-red-500/40 focus:outline-none focus:ring-1 focus:ring-red-500/20 font-mono"
                    />
                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    <button
                        type="submit"
                        disabled={isLoading || !password}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/20 border border-red-500/30 py-3 font-bold text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-40"
                    >
                        <LogIn className="h-4 w-4" />
                        {isLoading ? 'Verifying…' : 'Enter'}
                    </button>
                </form>
            </div>
        </div>
    );
}
