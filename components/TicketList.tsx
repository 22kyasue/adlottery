'use client';

import { Ticket } from '@/lib/game-logic';

import { Ticket as TicketIcon } from 'lucide-react';

export function TicketList({ tickets }: { tickets: Ticket[] }) {
    if (tickets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                <TicketIcon className="h-12 w-12 mb-2 opacity-20" />
                <p>No tickets yet. Watch an ad!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tickets.slice().reverse().map((ticket, i) => (
                <div
                    key={i}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-3 font-mono text-lg font-bold shadow-sm transition-all hover:scale-105
            ${ticket.source === 'booster' ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300' :
                            ticket.source === 'bonus' ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' :
                                'border-white/10 bg-white/5 text-white'}`}
                >
                    <TicketIcon className="h-4 w-4 opacity-50" />
                    {ticket.id}
                </div>
            ))}
        </div>
    );
}
