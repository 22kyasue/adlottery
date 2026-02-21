'use client';

import React, { useState } from 'react';
import { MOCK_OFFERS } from '@/lib/game-logic';
import { useGame } from '@/lib/GameContext';
import OfferCard from './ui/OfferCard';

export default function OfferList() {
    const { state, clickOffer } = useGame();
    const [filter, setFilter] = useState<'All' | 'Easy' | 'HighReward'>('All');

    const filteredOffers = MOCK_OFFERS.filter(offer => {
        if (filter === 'Easy') return offer.difficulty === 'Easy';
        if (filter === 'HighReward') return offer.rewardTickets >= 50;
        return true;
    });

    const getOfferStatus = (offerId: string): 'available' | 'pending' | 'completed' => {
        if (state.completedOfferIds.includes(offerId)) return 'completed';
        if (state.clickedOfferIds.includes(offerId)) return 'pending';
        return 'available';
    };

    const pendingCount = MOCK_OFFERS.filter(o => getOfferStatus(o.id) === 'pending').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">
                        Top Offers
                    </h2>
                    <p className="text-gray-500 text-sm">
                        Complete tasks to earn massive ticket rewards
                    </p>
                </div>
            </div>

            {pendingCount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    {pendingCount} offer{pendingCount > 1 ? 's' : ''} pending confirmation.
                    Rewards are granted once the provider verifies completion.
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {['All', 'Easy', 'HighReward'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filter === f
                                ? 'bg-gray-800 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {f === 'HighReward' ? 'High Reward' : f}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="space-y-4">
                {filteredOffers.map((offer) => (
                    <OfferCard
                        key={offer.id}
                        offer={offer}
                        onClick={clickOffer}
                        status={getOfferStatus(offer.id)}
                    />
                ))}
            </div>

            {filteredOffers.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                    No offers found for this category.
                </div>
            )}
        </div>
    );
}
