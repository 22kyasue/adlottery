'use client';

import { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';

interface DrawResult {
    id: string;
    weekId: string;
    winningTicketNumber: number;
    totalTickets: number;
    prizeAmount: number;
    createdAt: string;
    winnerHint: string | null;
    isYou: boolean;
}

export function DrawHistory() {
    const [draws, setDraws] = useState<DrawResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/draw/results?limit=5')
            .then(r => r.json())
            .then(data => setDraws(data.results ?? []))
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) {
        return (
            <section className="space-y-3">
                <h3 className="text-xl font-bold text-white">Past Draws</h3>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-500/50 border-t-transparent inline-block" />
                </div>
            </section>
        );
    }

    if (draws.length === 0) {
        return (
            <section className="space-y-3">
                <h3 className="text-xl font-bold text-white">Past Draws</h3>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-gray-500">
                    No draws yet. The first draw happens Sunday at 20:00 JST!
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-3">
            <h3 className="text-xl font-bold text-white">Past Draws</h3>
            <div className="space-y-2">
                {draws.map(draw => (
                    <div
                        key={draw.id}
                        className={`rounded-xl border p-4 flex items-center justify-between ${
                            draw.isYou
                                ? 'border-yellow-500/30 bg-yellow-500/5'
                                : 'border-white/10 bg-white/5'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                draw.isYou ? 'bg-yellow-500/20' : 'bg-white/10'
                            }`}>
                                <Trophy className={`h-5 w-5 ${draw.isYou ? 'text-yellow-400' : 'text-gray-500'}`} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">
                                    {draw.weekId}
                                    {draw.isYou && (
                                        <span className="ml-2 text-xs font-bold text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                                            YOU WON
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Ticket #{draw.winningTicketNumber} of {draw.totalTickets.toLocaleString()}
                                    {' '}&middot; Winner: {draw.winnerHint}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`text-sm font-bold font-mono ${draw.isYou ? 'text-yellow-400' : 'text-white'}`}>
                                {'\u00A5'}{draw.prizeAmount.toLocaleString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
