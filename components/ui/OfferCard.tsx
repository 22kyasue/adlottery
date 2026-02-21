import React from 'react';
import { Offer } from '@/lib/game-logic';
import { Ticket as TicketIcon } from 'lucide-react';

interface OfferCardProps {
    offer: Offer;
    onClick: (offerId: string, actionUrl: string) => void;
    status: 'available' | 'pending' | 'completed';
}

export default function OfferCard({ offer, onClick, status }: OfferCardProps) {
    return (
        <div className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
            status === 'completed'
                ? 'bg-gray-100 border-gray-300 opacity-75'
                : status === 'pending'
                    ? 'bg-blue-50 border-blue-300 shadow-md'
                    : 'bg-white border-yellow-400 shadow-lg hover:shadow-xl hover:-translate-y-1'
            }`}>
            <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center text-3xl shadow-inner">
                    {offer.icon}
                </div>

                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg text-gray-800 leading-tight">
                            {offer.title}
                        </h3>
                        {/* Difficulty Badge */}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${offer.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                            offer.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                            {offer.difficulty}
                        </span>
                    </div>

                    <p className="text-sm text-gray-600 mt-1 mb-3">
                        {offer.description}
                    </p>

                    <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-1.5 text-yellow-600">
                            <TicketIcon className="w-6 h-6" />
                            <span className="font-black text-xl">
                                +{offer.rewardTickets}
                            </span>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                            <button
                                onClick={() => onClick(offer.id, offer.actionUrl ?? '#')}
                                disabled={status === 'completed'}
                                className={`px-6 py-2 rounded-full font-bold text-sm transition-colors ${
                                    status === 'completed'
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : status === 'pending'
                                            ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-md active:scale-95'
                                            : 'bg-yellow-400 hover:bg-yellow-300 text-yellow-900 shadow-md active:scale-95'
                                    }`}
                            >
                                {status === 'completed' ? 'CLAIMED' : status === 'pending' ? 'PENDING' : 'GET'}
                            </button>
                            {status === 'pending' && (
                                <span className="text-[11px] text-blue-500 font-medium">
                                    Awaiting confirmation...
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Tag */}
            <div className="absolute -top-3 -right-3">
                {offer.category === 'app' && <span className="bg-blue-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow">App</span>}
                {offer.category === 'survey' && <span className="bg-purple-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow">Survey</span>}
                {offer.category === 'action' && <span className="bg-pink-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow">Action</span>}
            </div>
        </div>
    );
}
