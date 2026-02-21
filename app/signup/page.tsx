'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { Trophy, CheckCircle, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await signUp(email, password, referralCode || undefined);
    if (error) {
      setError(error);
      setIsSubmitting(false);
    } else {
      setSuccess(true);
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-yellow-500/50 focus:bg-white/[0.12] focus:ring-2 focus:ring-yellow-500/20";

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
            <p className="text-sm text-gray-400">Create your account</p>
          </div>

          {/* Success State */}
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <div className="rounded-full bg-green-500/20 p-3 ring-1 ring-green-500/30">
                <CheckCircle className="h-10 w-10 text-green-400" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-lg font-bold text-white">Check your email</h2>
                <p className="text-sm text-gray-400">
                  We sent a confirmation link to <strong className="text-white">{email}</strong>.
                  Click the link to activate your account.
                </p>
              </div>
              <Link
                href="/login"
                className="mt-2 text-sm font-semibold text-yellow-500 hover:text-yellow-400 transition-colors"
              >
                Back to Sign In
              </Link>
            </motion.div>
          ) : (
            <>
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
                    className={inputClass}
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
                    className={inputClass}
                    placeholder="Min. 6 characters"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-200">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Re-enter your password"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="referralCode" className="text-sm font-medium text-gray-200">
                    Referral Code <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    id="referralCode"
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className={inputClass}
                    placeholder="Enter code"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 px-4 py-3.5 font-bold text-black transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20"
                >
                  {isSubmitting ? (
                    'Creating account...'
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Create Account
                    </>
                  )}
                </button>
              </form>

              {/* Divider + Link to login */}
              <div className="border-t border-white/10 pt-5">
                <p className="text-center text-sm text-gray-400">
                  Already have an account?{' '}
                  <Link href="/login" className="font-semibold text-yellow-500 hover:text-yellow-400 transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
