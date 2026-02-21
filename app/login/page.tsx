'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { Trophy, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setIsSubmitting(false);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900/20 via-black to-black pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-panel p-8 space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-xl bg-yellow-500/20 p-3 ring-1 ring-yellow-500/30">
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">LottoVibe</h1>
            <p className="text-sm text-gray-400">Sign in to your account</p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-yellow-500/50 focus:bg-white/[0.12] focus:ring-2 focus:ring-yellow-500/20"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-200">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-yellow-500/50 focus:bg-white/[0.12] focus:ring-2 focus:ring-yellow-500/20"
                placeholder="Your password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 px-4 py-3.5 font-bold text-black transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20"
            >
              {isSubmitting ? (
                'Signing in...'
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Divider + Link to signup */}
          <div className="border-t border-white/10 pt-5">
            <p className="text-center text-sm text-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold text-yellow-500 hover:text-yellow-400 transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
