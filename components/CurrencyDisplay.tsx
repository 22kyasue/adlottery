'use client';

import { useGame } from '@/lib/GameContext';

export function CurrencyDisplay() {
    const { state, isLoading } = useGame();

    if (isLoading) {
        return (
            <div className="flex gap-3 animate-pulse">
                <div className="h-12 w-36 rounded-xl bg-white/5" />
                <div className="h-12 w-36 rounded-xl bg-white/5" />
                <div className="h-12 w-36 rounded-xl bg-white/5" />
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-3">
            {/* Raffle Tickets */}
            <div className="flex items-center gap-2.5 rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 px-4 py-2.5 backdrop-blur-sm shadow-[0_0_15px_-3px_rgba(234,179,8,0.15)]">
                <div className="casino-chip casino-chip-sm casino-chip-yellow">T</div>
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] font-bold text-yellow-400/80 uppercase tracking-widest">
                        Raffle Tickets
                    </span>
                    <span className="text-lg font-black tabular-nums text-yellow-200">
                        {state.totalTickets.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Vibe Chips */}
            <div className="flex items-center gap-2.5 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-purple-500/5 px-4 py-2.5 backdrop-blur-sm shadow-[0_0_15px_-3px_rgba(139,92,246,0.15)]">
                <div className="casino-chip casino-chip-sm casino-chip-purple">C</div>
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] font-bold text-purple-400/80 uppercase tracking-widest">
                        Vibe Chips
                    </span>
                    <span className="text-lg font-black tabular-nums text-purple-200">
                        {state.vibeChips.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Vibe Coins */}
            <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-500/5 px-4 py-2.5 backdrop-blur-sm shadow-[0_0_15px_-3px_rgba(217,119,6,0.15)]">
                <div className="casino-chip casino-chip-sm casino-chip-gold">$</div>
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">
                        Vibe Coins
                    </span>
                    <span className="text-lg font-black tabular-nums text-amber-200">
                        {state.vibeCoins.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
}
