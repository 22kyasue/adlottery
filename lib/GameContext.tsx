'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Ticket, simulateAdWatch, POOL_PERCENTAGE, generateTickets } from './game-logic';

interface GameState {
    poolBalance: number;
    userTickets: Ticket[];
    boosteractiveUntil: number | null; // Timestamp
    totalAdsWatched: number;
    completedOfferIds: string[];
}

interface GameContextType {
    state: GameState;
    watchAd: () => Promise<void>;
    activateBooster: (type: 'payment' | 'history') => Promise<void>;
    completeOffer: (offerId: string, rewardTickets: number) => Promise<void>;
    resetDraw: () => void;
    isLoading: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<GameState>({
        poolBalance: 1250000, // Start with a juicy mock pool
        userTickets: [],
        boosteractiveUntil: null,
        totalAdsWatched: 0,
        completedOfferIds: [],
    });
    const [isLoading, setIsLoading] = useState(true);

    // Load state from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('lotto-state-v1');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge loaded state with defaults to ensure new fields (like completedOfferIds) exist
                setState(prev => ({
                    ...prev,
                    ...parsed,
                    completedOfferIds: parsed.completedOfferIds || []
                }));
            } catch (e) {
                console.error("Failed to load state", e);
            }
        }
        setIsLoading(false);
    }, []);

    // Persist state
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('lotto-state-v1', JSON.stringify(state));
        }
    }, [state, isLoading]);

    const watchAd = async () => {
        // Simulate network delay for ad
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const isBooster = !!(state.boosteractiveUntil && state.boosteractiveUntil > Date.now());
        const result = simulateAdWatch(isBooster);

        const poolContribution = result.revenueGenerated * POOL_PERCENTAGE;

        setState((prev) => ({
            ...prev,
            poolBalance: prev.poolBalance + poolContribution,
            userTickets: [...prev.userTickets, ...result.tickets],
            totalAdsWatched: prev.totalAdsWatched + 1
        }));
    };

    const completeOffer = async (offerId: string, rewardTickets: number) => {
        if (state.completedOfferIds.includes(offerId)) return;

        // Simulate verification delay
        setIsLoading(true); // Maybe local loading state is better?
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsLoading(false);

        const newTickets = generateTickets(rewardTickets, 'bonus');

        setState((prev) => ({
            ...prev,
            userTickets: [...prev.userTickets, ...newTickets],
            completedOfferIds: [...prev.completedOfferIds, offerId]
        }));
    };

    const activateBooster = async (type: 'payment' | 'history') => {
        // Simulate verification
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Set booster active for 24 hours
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
        setState((prev) => ({
            ...prev,
            boosteractiveUntil: expiresAt
        }));
    };

    const resetDraw = () => {
        // Determine winner logic would go here (or purely backend)
        // For now, reset pool to base and clear tickets?
        // Or just "Simulate Draw"
        alert("Weekly Draw Simulated! If you had the winning number, you'd be rich!");
        setState(prev => ({
            ...prev,
            poolBalance: 1000000, // Reset to base
            userTickets: [] // Clear tickets for next round
        }));
    };

    return (
        <GameContext.Provider value={{ state, watchAd, activateBooster, completeOffer, resetDraw, isLoading }}>
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    const context = useContext(GameContext);
    if (!context) throw new Error("useGame must be used within GameProvider");
    return context;
}
