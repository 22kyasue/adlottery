'use client';

import { Ticket as TicketIcon } from 'lucide-react';

interface TicketListProps {
    organicTickets: number;
    convertedTickets: number;
    isBoosterActive?: boolean;
}

export function TicketList({ organicTickets, convertedTickets, isBoosterActive }: TicketListProps) {
    const total = organicTickets + convertedTickets;

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                <TicketIcon className="h-12 w-12 mb-2 opacity-20" />
                <p>No tickets yet. Watch an ad!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Total count */}
            <div className={`flex items-center justify-center gap-3 rounded-xl border p-6 transition-all ${
                isBoosterActive
                    ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-yellow-900/5 shadow-lg shadow-yellow-500/10'
                    : 'border-yellow-500/30 bg-yellow-500/5'
            }`}>
                <TicketIcon className={`h-8 w-8 ${isBoosterActive ? 'text-yellow-400' : 'text-yellow-500'}`} />
                <span className={`text-4xl font-black font-mono ${
                    isBoosterActive
                        ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-500'
                        : 'text-yellow-300'
                }`}>
                    {total}
                </span>
                <span className="text-sm text-gray-400 self-end mb-1">
                    {isBoosterActive ? 'PREMIUM tickets this week' : 'tickets this week'}
                </span>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
                    <span className="text-sm text-gray-400">Ad Tickets</span>
                    <span className="font-mono font-bold text-white">{organicTickets}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
                    <span className="text-sm text-gray-400">Bonus Tickets</span>
                    <span className="font-mono font-bold text-purple-300">{convertedTickets}</span>
                </div>
            </div>
        </div>
    );
}
