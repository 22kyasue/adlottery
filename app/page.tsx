'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/lib/GameContext';
import { Button } from '@/components/ui/Button';
import { AdOverlay } from '@/components/AdOverlay';
import { BoosterOverlay } from '@/components/BoosterOverlay';
import { TicketList } from '@/components/TicketList';
import OfferList from '@/components/OfferList';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, Zap, History, Coins } from 'lucide-react';

export default function Home() {
  const { state, watchAd, activateBooster, isLoading } = useGame();
  const [showAd, setShowAd] = useState(false);
  const [showBooster, setShowBooster] = useState(false);
  const [currentTab, setCurrentTab] = useState<'home' | 'earn'>('home');

  // Countdown Logic
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      // Find next Sunday 8PM
      const now = new Date();
      const nextDraw = new Date();
      nextDraw.setDate(now.getDate() + (7 - now.getDay()) % 7);
      nextDraw.setHours(20, 0, 0, 0);
      if (nextDraw < now) nextDraw.setDate(nextDraw.getDate() + 7);

      const diff = nextDraw.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isBoosterActive = state.boosteractiveUntil && state.boosteractiveUntil > Date.now();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="animate-spin text-4xl">💎</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white selection:bg-yellow-500/30 pb-24">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900/20 via-black to-black pointer-events-none" />

      <div className="relative z-10 px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-yellow-500/20 p-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">LottoVibe</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm backdrop-blur-md">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="font-mono text-gray-200">{timeLeft}</span>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {currentTab === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Money Pool Hero */}
              <section className="relative overflow-hidden rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-yellow-900/10 via-black to-black p-8 text-center ring-1 ring-white/10 shadow-[0_0_50px_-12px_rgba(234,179,8,0.3)]">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Coins className="h-48 w-48 text-yellow-500 animate-pulse" />
                </div>

                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative z-10 space-y-2"
                >
                  <h2 className="text-sm font-medium text-yellow-500/80 uppercase tracking-widest">Current Prize Pool</h2>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl sm:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-yellow-600 drop-shadow-2xl">
                      ¥{state.poolBalance.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Next Draw: Sunday 20:00 JST
                  </p>
                  <div className="pt-6">
                    <Button
                      variant="gold"
                      size="xl"
                      onClick={() => setShowAd(true)}
                      className="w-full sm:w-auto min-w-[200px] animate-shimmer bg-[length:200%_100%] hover:scale-105 active:scale-95"
                    >
                      Watch Ad & Get Ticket
                    </Button>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => setCurrentTab('earn')}
                      className="text-yellow-500 text-sm font-bold hover:underline underline-offset-4 opacity-80 hover:opacity-100 transition-opacity"
                    >
                      Earn More Tickets →
                    </button>
                  </div>
                </motion.div>
              </section>

              {/* Booster Status */}
              <section className="grid gap-4 sm:grid-cols-2">
                <div
                  onClick={() => setShowBooster(true)}
                  className={`group cursor-pointer relative overflow-hidden rounded-2xl border p-6 transition-all hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10
                    ${isBoosterActive ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-white/10 bg-white/5'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${isBoosterActive ? 'bg-yellow-500 text-black' : 'bg-white/10 text-gray-400'}`}>
                      <Zap className="h-6 w-6" />
                    </div>
                    {isBoosterActive && (
                      <div className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 text-xs font-bold border border-yellow-500/20">
                        ACTIVE
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">Booster Mode</h3>
                  <p className="text-sm text-gray-400 mt-1">1.5x efficiency on earnings.</p>
                  {!isBoosterActive && (
                    <p className="mt-4 text-xs font-semibold text-yellow-500 underline underline-offset-4">Activate Now →</p>
                  )}
                  {isBoosterActive && (
                    <p className="mt-4 text-xs/relaxed text-gray-500">
                      Expires: {new Date(state.boosteractiveUntil!).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                      <History className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Your Tickets</h3>
                      <p className="text-xs text-purple-300 font-mono">Total: {state.userTickets.length}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">
                    Each ticket is a chance to win the pool.
                  </p>
                </div>
              </section>

              {/* Ticket List */}
              <section className="space-y-4">
                <h3 className="text-xl font-bold text-white">Your Numbers</h3>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-6 min-h-[200px]">
                  <TicketList tickets={state.userTickets} />
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="earn"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-r from-yellow-600 to-yellow-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <Coins className="absolute -right-4 -bottom-4 h-32 w-32 text-yellow-400/20" />
                <h2 className="text-3xl font-black mb-2 relative z-10">Task Center</h2>
                <p className="text-yellow-100 relative z-10">Complete tasks to earn massive ticket rewards!</p>
              </div>
              <div className="bg-white rounded-3xl p-6 text-gray-900">
                <OfferList />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 p-1.5 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl ring-1 ring-white/10">
          <button
            onClick={() => setCurrentTab('home')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${currentTab === 'home'
                ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <Trophy className="w-5 h-5" />
            <span>Lotto</span>
          </button>
          <button
            onClick={() => setCurrentTab('earn')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${currentTab === 'earn'
                ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <Coins className="w-5 h-5" />
            <span>Earn</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <AdOverlay
        isOpen={showAd}
        onClose={() => setShowAd(false)}
        onComplete={() => {
          watchAd();
        }}
      />

      <BoosterOverlay
        isOpen={showBooster}
        onClose={() => setShowBooster(false)}
        onActivate={activateBooster}
      />
    </main>
  );
}
