'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ScratchOverlay } from './ScratchOverlay';
import { HiLoOverlay } from './HiLoOverlay';
import { BlackjackOverlay } from './BlackjackOverlay';
import { RouletteOverlay } from './RouletteOverlay';

export function CasinoTab() {
    const [showScratch, setShowScratch] = useState(false);
    const [showHiLo, setShowHiLo] = useState(false);
    const [showBlackjack, setShowBlackjack] = useState(false);
    const [showRoulette, setShowRoulette] = useState(false);
    const [showOdds, setShowOdds] = useState(false);

    return (
        <>
            <div className="space-y-6">
                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0f00] via-[#2a1a06] to-[#1a0f00] p-6 text-white shadow-lg border border-yellow-700/20">
                    {/* Gold accent line at top */}
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />

                    {/* Corner diamonds */}
                    <div className="absolute top-3 left-3 text-yellow-600/30 text-xs">&#x25C6;</div>
                    <div className="absolute top-3 right-3 text-yellow-600/30 text-xs">&#x25C6;</div>
                    <div className="absolute bottom-3 left-3 text-yellow-600/30 text-xs">&#x25C6;</div>
                    <div className="absolute bottom-3 right-3 text-yellow-600/30 text-xs">&#x25C6;</div>

                    {/* Decorative chip stack */}
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-20">
                        <div className="casino-chip casino-chip-lg casino-chip-gold">$</div>
                        <div className="casino-chip casino-chip-lg casino-chip-purple" style={{ marginTop: '-8px' }}>C</div>
                        <div className="casino-chip casino-chip-lg casino-chip-yellow" style={{ marginTop: '-8px' }}>T</div>
                    </div>

                    <h2 className="text-3xl font-black mb-2 relative z-10 gold-shimmer-text inline-block">Casino</h2>
                    <p className="text-yellow-200/70 relative z-10">Spend Vibe Chips for a chance to win big!</p>
                </div>

                {/* Game Cards Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                    {/* Scratch Card */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowScratch(true)}
                        className="casino-game-card group relative rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-900/20 to-black p-6 text-left transition-all hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10"
                    >
                        <div className="flex items-center justify-between mb-4 relative z-[2]">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/30 to-yellow-600/10 text-yellow-400 ring-1 ring-yellow-500/20 shadow-lg shadow-yellow-500/10 group-hover:shadow-yellow-500/20 transition-shadow">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                </svg>
                            </div>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/20 text-yellow-300 text-[10px] font-bold uppercase tracking-wider">
                                <span className="casino-chip casino-chip-sm casino-chip-purple" style={{ width: '14px', height: '14px', fontSize: '7px' }}>C</span>
                                10
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors relative z-[2]">
                            Instant Scratch
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 relative z-[2]">
                            Scratch and reveal instant prizes. Win chips or coins!
                        </p>
                        <p className="mt-4 text-xs font-semibold text-yellow-500 group-hover:underline underline-offset-4 relative z-[2]">
                            Play Now &rarr;
                        </p>
                    </motion.button>

                    {/* Hi-Lo Card */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowHiLo(true)}
                        className="casino-game-card group relative rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-black p-6 text-left transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10"
                    >
                        <div className="flex items-center justify-between mb-4 relative z-[2]">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-600/10 text-purple-400 ring-1 ring-purple-500/20 shadow-lg shadow-purple-500/10 group-hover:shadow-purple-500/20 transition-shadow">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                                </svg>
                            </div>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
                                <span className="casino-chip casino-chip-sm casino-chip-purple" style={{ width: '14px', height: '14px', fontSize: '7px' }}>C</span>
                                Custom
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors relative z-[2]">
                            Hi-Lo Cards
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 relative z-[2]">
                            Guess higher or lower. Riskier guesses pay more!
                        </p>
                        <p className="mt-4 text-xs font-semibold text-purple-500 group-hover:underline underline-offset-4 relative z-[2]">
                            Play Now &rarr;
                        </p>
                    </motion.button>

                    {/* Blackjack Card */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowBlackjack(true)}
                        className="casino-game-card group relative rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-black p-6 text-left transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10"
                    >
                        <div className="flex items-center justify-between mb-4 relative z-[2]">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 text-emerald-400 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/10 group-hover:shadow-emerald-500/20 transition-shadow">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
                                </svg>
                            </div>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                                <span className="casino-chip casino-chip-sm casino-chip-purple" style={{ width: '14px', height: '14px', fontSize: '7px' }}>C</span>
                                1-500
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors relative z-[2]">
                            Cyber Blackjack
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 relative z-[2]">
                            Beat the dealer to 21. Blackjack pays 2.5x!
                        </p>
                        <p className="mt-4 text-xs font-semibold text-emerald-500 group-hover:underline underline-offset-4 relative z-[2]">
                            Play Now &rarr;
                        </p>
                    </motion.button>

                    {/* Roulette Card */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowRoulette(true)}
                        className="casino-game-card group relative rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-900/20 to-black p-6 text-left transition-all hover:border-rose-500/50 hover:shadow-lg hover:shadow-rose-500/10"
                    >
                        <div className="flex items-center justify-between mb-4 relative z-[2]">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500/30 to-rose-600/10 text-rose-400 ring-1 ring-rose-500/20 shadow-lg shadow-rose-500/10 group-hover:shadow-rose-500/20 transition-shadow">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <circle cx="12" cy="12" r="9" />
                                    <circle cx="12" cy="12" r="3" />
                                    <path strokeLinecap="round" d="M12 3v3m0 12v3M3 12h3m12 0h3" />
                                </svg>
                            </div>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                                <span className="casino-chip casino-chip-sm casino-chip-purple" style={{ width: '14px', height: '14px', fontSize: '7px' }}>C</span>
                                1-500
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-white group-hover:text-rose-400 transition-colors relative z-[2]">
                            Cyber Roulette
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 relative z-[2]">
                            Bet on multiple colors per spin! Gold pays 10x.
                        </p>
                        <p className="mt-4 text-xs font-semibold text-rose-500 group-hover:underline underline-offset-4 relative z-[2]">
                            Play Now &rarr;
                        </p>
                    </motion.button>
                </div>

                {/* Payout Odds Transparency Section */}
                <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                    <button
                        onClick={() => setShowOdds(prev => !prev)}
                        className="flex items-center justify-between w-full p-4 text-left hover:bg-white/5 transition-colors"
                    >
                        <span className="text-sm font-bold text-gray-300">Payout Odds</span>
                        {showOdds
                            ? <ChevronUp className="h-4 w-4 text-gray-500" />
                            : <ChevronDown className="h-4 w-4 text-gray-500" />
                        }
                    </button>

                    {showOdds && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="px-4 pb-4 space-y-4"
                        >
                            {/* Scratch odds */}
                            <div>
                                <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2">
                                    Instant Scratch (Cost: 10 Chips)
                                </h4>
                                <div className="rounded-lg border border-white/5 overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-white/5 text-gray-500">
                                                <th className="text-left py-2 px-3 font-medium">Outcome</th>
                                                <th className="text-right py-2 px-3 font-medium">Reward</th>
                                                <th className="text-right py-2 px-3 font-medium">Chance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-gray-300">
                                            <tr className="border-b border-white/5">
                                                <td className="py-1.5 px-3">No Prize</td>
                                                <td className="py-1.5 px-3 text-right text-gray-500">&mdash;</td>
                                                <td className="py-1.5 px-3 text-right font-mono">60%</td>
                                            </tr>
                                            <tr className="border-b border-white/5">
                                                <td className="py-1.5 px-3">5 Coins</td>
                                                <td className="py-1.5 px-3 text-right text-amber-400">+5 coins</td>
                                                <td className="py-1.5 px-3 text-right font-mono">20%</td>
                                            </tr>
                                            <tr className="border-b border-white/5">
                                                <td className="py-1.5 px-3">15 Chips</td>
                                                <td className="py-1.5 px-3 text-right text-purple-400">+15 chips</td>
                                                <td className="py-1.5 px-3 text-right font-mono">10%</td>
                                            </tr>
                                            <tr className="border-b border-white/5">
                                                <td className="py-1.5 px-3">25 Coins</td>
                                                <td className="py-1.5 px-3 text-right text-amber-400">+25 coins</td>
                                                <td className="py-1.5 px-3 text-right font-mono">7%</td>
                                            </tr>
                                            <tr className="border-b border-white/5">
                                                <td className="py-1.5 px-3">50 Chips</td>
                                                <td className="py-1.5 px-3 text-right text-purple-400">+50 chips</td>
                                                <td className="py-1.5 px-3 text-right font-mono">2.5%</td>
                                            </tr>
                                            <tr>
                                                <td className="py-1.5 px-3 text-yellow-300">200 Coins</td>
                                                <td className="py-1.5 px-3 text-right text-yellow-300">+200 coins</td>
                                                <td className="py-1.5 px-3 text-right font-mono text-yellow-300">0.5%</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Hi-Lo odds */}
                            <div>
                                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                                    Hi-Lo Cards (Bet: 1-500 Chips)
                                </h4>
                                <div className="space-y-1.5 text-xs text-gray-400">
                                    <p>Two cards are drawn (Ace through King). Guess if the second is higher or lower.</p>
                                    <p>Multiplier = 13 / favorable outcomes (capped 1.2x&ndash;12.0x).</p>
                                    <p>If cards match: <span className="text-yellow-300">Push</span> &mdash; bet is refunded.</p>
                                    <div className="rounded-lg border border-white/5 overflow-hidden mt-2">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-white/5 text-gray-500">
                                                    <th className="text-left py-2 px-3 font-medium">First Card</th>
                                                    <th className="text-right py-2 px-3 font-medium">Higher Multi</th>
                                                    <th className="text-right py-2 px-3 font-medium">Lower Multi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-gray-300">
                                                {[
                                                    { card: 'Ace (1)', h: '1.2x', l: '\u2014' },
                                                    { card: '3', h: '1.3x', l: '6.5x' },
                                                    { card: '7', h: '2.2x', l: '2.2x' },
                                                    { card: '10', h: '4.3x', l: '1.4x' },
                                                    { card: 'King (13)', h: '\u2014', l: '1.2x' },
                                                ].map(row => (
                                                    <tr key={row.card} className="border-b border-white/5 last:border-0">
                                                        <td className="py-1.5 px-3">{row.card}</td>
                                                        <td className="py-1.5 px-3 text-right font-mono">{row.h}</td>
                                                        <td className="py-1.5 px-3 text-right font-mono">{row.l}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Blackjack odds */}
                            <div>
                                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                                    Cyber Blackjack (Bet: 1-500 Chips)
                                </h4>
                                <div className="space-y-1.5 text-xs text-gray-400">
                                    <p>Standard blackjack rules. Dealer stands on 17. No split or double.</p>
                                    <div className="rounded-lg border border-white/5 overflow-hidden mt-2">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-white/5 text-gray-500">
                                                    <th className="text-left py-2 px-3 font-medium">Outcome</th>
                                                    <th className="text-right py-2 px-3 font-medium">Payout</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-gray-300">
                                                <tr className="border-b border-white/5">
                                                    <td className="py-1.5 px-3 text-yellow-300">Natural Blackjack</td>
                                                    <td className="py-1.5 px-3 text-right font-mono text-yellow-300">2.5x</td>
                                                </tr>
                                                <tr className="border-b border-white/5">
                                                    <td className="py-1.5 px-3">Win</td>
                                                    <td className="py-1.5 px-3 text-right font-mono text-green-400">2x</td>
                                                </tr>
                                                <tr className="border-b border-white/5">
                                                    <td className="py-1.5 px-3">Push (tie)</td>
                                                    <td className="py-1.5 px-3 text-right font-mono text-yellow-300">1x (refund)</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-1.5 px-3">Lose / Bust</td>
                                                    <td className="py-1.5 px-3 text-right font-mono text-red-400">0x</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Roulette odds */}
                            <div>
                                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">
                                    Cyber Roulette (Bet: 1-500 Chips)
                                </h4>
                                <div className="space-y-1.5 text-xs text-gray-400">
                                    <p>Bet on one or more colors per spin (up to 500 each). Green is the house.</p>
                                    <div className="rounded-lg border border-white/5 overflow-hidden mt-2">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-white/5 text-gray-500">
                                                    <th className="text-left py-2 px-3 font-medium">Color</th>
                                                    <th className="text-right py-2 px-3 font-medium">Segments</th>
                                                    <th className="text-right py-2 px-3 font-medium">Chance</th>
                                                    <th className="text-right py-2 px-3 font-medium">Payout</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-gray-300">
                                                <tr className="border-b border-white/5">
                                                    <td className="py-1.5 px-3">Black</td>
                                                    <td className="py-1.5 px-3 text-right font-mono">9/20</td>
                                                    <td className="py-1.5 px-3 text-right font-mono">45%</td>
                                                    <td className="py-1.5 px-3 text-right font-mono text-green-400">2x</td>
                                                </tr>
                                                <tr className="border-b border-white/5">
                                                    <td className="py-1.5 px-3 text-red-400">Red</td>
                                                    <td className="py-1.5 px-3 text-right font-mono">6/20</td>
                                                    <td className="py-1.5 px-3 text-right font-mono">30%</td>
                                                    <td className="py-1.5 px-3 text-right font-mono text-red-400">3x</td>
                                                </tr>
                                                <tr className="border-b border-white/5">
                                                    <td className="py-1.5 px-3 text-yellow-300">Gold</td>
                                                    <td className="py-1.5 px-3 text-right font-mono">1/20</td>
                                                    <td className="py-1.5 px-3 text-right font-mono">5%</td>
                                                    <td className="py-1.5 px-3 text-right font-mono text-yellow-300">10x</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-1.5 px-3 text-green-400">Green (house)</td>
                                                    <td className="py-1.5 px-3 text-right font-mono">4/20</td>
                                                    <td className="py-1.5 px-3 text-right font-mono">20%</td>
                                                    <td className="py-1.5 px-3 text-right font-mono text-green-400">&mdash;</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-600 text-center pt-2">
                                All outcomes are determined server-side using cryptographic randomness before the client sees them.
                            </p>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <ScratchOverlay isOpen={showScratch} onClose={() => setShowScratch(false)} />
            <HiLoOverlay isOpen={showHiLo} onClose={() => setShowHiLo(false)} />
            <BlackjackOverlay isOpen={showBlackjack} onClose={() => setShowBlackjack(false)} />
            <RouletteOverlay isOpen={showRoulette} onClose={() => setShowRoulette(false)} />
        </>
    );
}
