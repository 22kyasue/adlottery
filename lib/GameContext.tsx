'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabaseClient } from './supabase-client';
import { useAuth } from './AuthContext';
import { getCurrentWeekId } from './utils';

interface GameState {
    organicTickets: number;
    convertedTickets: number;
    totalTickets: number;
    vibeChips: number;
    vibeCoins: number;
    isBoosterActive: boolean;
    boosterExpiresAt: string | null;
    poolBalance: number;
    clickedOfferIds: string[];
    completedOfferIds: string[];
    // Daily ad progress (from verify-ad response)
    dailyAdViews: number;
    currentTier: number;
    adsPerTicket: number;
    viewsUntilNextTicket: number;
}

interface ConvertChipsResult {
    success: boolean;
    error?: string;
    newChips?: number;
    newConverted?: number;
    remainingCap?: number;
}

export interface ScratchResult {
    success: boolean;
    error?: string;
    outcome?: string;
    rewardChips?: number;
    rewardCoins?: number;
    newChips?: number;
    newCoins?: number;
    cost?: number;
}

export interface HiLoResult {
    success: boolean;
    error?: string;
    outcome?: string;
    card?: number;
    drawnCard?: number;
    bet?: number;
    payout?: number;
    net?: number;
    multiplier?: number;
    newChips?: number;
}

export interface RouletteBetResult {
    color: string;
    bet: number;
    won: boolean;
    multiplier: number;
    payout: number;
    net: number;
}

export interface RouletteResult {
    success: boolean;
    error?: string;
    resultColor?: string;
    anyWon?: boolean;
    totalBet?: number;
    totalPayout?: number;
    net?: number;
    bets?: RouletteBetResult[];
    newChips?: number;
}

interface GameContextType {
    state: GameState;
    watchAd: () => Promise<{ ticketEarned: boolean } | null>;
    activateBooster: (file: File) => Promise<{ success: boolean; error?: string }>;
    clickOffer: (offerId: string, actionUrl: string) => Promise<void>;
    resetDraw: () => void;
    refreshGameState: () => Promise<void>;
    convertChips: (amount: number) => Promise<ConvertChipsResult>;
    playScratch: () => Promise<ScratchResult>;
    playHiLo: (bet: number, guess: 'higher' | 'lower') => Promise<HiLoResult>;
    playRoulette: (bets: Array<{ color: string; bet: number }>) => Promise<RouletteResult>;
    isLoading: boolean;
}

const defaultState: GameState = {
    organicTickets: 0,
    convertedTickets: 0,
    totalTickets: 0,
    vibeChips: 0,
    vibeCoins: 0,
    isBoosterActive: false,
    boosterExpiresAt: null,
    poolBalance: 1250000,
    clickedOfferIds: [],
    completedOfferIds: [],
    dailyAdViews: 0,
    currentTier: 1,
    adsPerTicket: 1,
    viewsUntilNextTicket: 1,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [state, setState] = useState<GameState>(defaultState);
    const [isLoading, setIsLoading] = useState(true);

    // One-time cleanup: nuke stale localStorage from pre-refactor code
    useEffect(() => {
        try { localStorage.removeItem('lotto-state-v1'); } catch { /* SSR safe */ }
    }, []);

    // Fetch all game state from Supabase (users table + weekly_tickets table)
    const fetchGameState = useCallback(async () => {
        if (!user) {
            setState(defaultState);
            setIsLoading(false);
            return;
        }

        try {
            const weekId = getCurrentWeekId();

            const [profileResult, ticketsResult, poolResult, clicksResult, completionsResult] = await Promise.all([
                supabaseClient
                    .from('users')
                    .select('vibe_chips, vibe_coins, is_booster_active, booster_expires_at')
                    .eq('id', user.id)
                    .single(),
                supabaseClient
                    .from('weekly_tickets')
                    .select('organic_tickets, converted_tickets')
                    .eq('user_id', user.id)
                    .eq('week_id', weekId)
                    .maybeSingle(),
                supabaseClient
                    .from('weekly_prize_pool')
                    .select('total_pool')
                    .eq('week_id', weekId)
                    .maybeSingle(),
                supabaseClient
                    .from('offer_clicks')
                    .select('offer_id')
                    .eq('user_id', user.id),
                supabaseClient
                    .from('offer_completions')
                    .select('offer_id')
                    .eq('user_id', user.id),
            ]);

            const profile = profileResult.data;
            const tickets = ticketsResult.data;
            // Read pool from DB — null means no row yet, preserve current state
            const dbPoolBalance = poolResult.data?.total_pool ?? null;

            const organicTickets = tickets?.organic_tickets ?? 0;
            const convertedTickets = tickets?.converted_tickets ?? 0;

            const boosterExpiresAt = profile?.booster_expires_at ?? null;
            const isBoosterActive = !!(profile?.is_booster_active && boosterExpiresAt
                && new Date(boosterExpiresAt) > new Date());

            const clickedOfferIds = (clicksResult.data ?? []).map(r => r.offer_id);
            const completedOfferIds = (completionsResult.data ?? []).map(r => r.offer_id);

            setState(prev => ({
                ...prev,
                organicTickets,
                convertedTickets,
                totalTickets: organicTickets + convertedTickets,
                vibeChips: profile?.vibe_chips ?? 0,
                vibeCoins: profile?.vibe_coins ?? 0,
                isBoosterActive,
                boosterExpiresAt,
                // Use DB value if available, otherwise keep current state (never reset to hardcoded default)
                poolBalance: dbPoolBalance ?? prev.poolBalance,
                clickedOfferIds,
                completedOfferIds,
            }));
        } catch (error) {
            console.error('Failed to fetch game state:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchGameState();
    }, [fetchGameState]);

    // AD_COMPLETE flow: POST to /api/verify-ad, update tier state, re-fetch if ticket earned
    const watchAd = async (): Promise<{ ticketEarned: boolean } | null> => {
        if (!user) return null;

        try {
            const response = await fetch('/api/verify-ad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (!response.ok || !data.success) return null;

            // Single atomic setState: pool balance + daily tier state
            setState(prev => ({
                ...prev,
                // Always update pool from response — parse flexibly (number or string)
                poolBalance: Number(data.newPoolTotal) > 0 ? Number(data.newPoolTotal) : prev.poolBalance,
                // Update tier info when present
                ...(data.dailyViews !== undefined && {
                    dailyAdViews: data.dailyViews,
                    currentTier: data.currentTier,
                    adsPerTicket: data.adsPerTicket,
                    viewsUntilNextTicket: data.viewsUntilNextTicket,
                }),
            }));

            // Re-fetch full state when a ticket was earned (pool already updated above,
            // fetchGameState will read the same or newer value from DB)
            if (data.ticketEarned && data.newTicketCount !== undefined) {
                await fetchGameState();
            }

            return { ticketEarned: !!data.ticketEarned };
        } catch (error) {
            console.error('Ad verification failed:', error);
            return null;
        }
    };

    // Convert vibe_chips to converted_tickets via /api/convert-chips
    const convertChips = async (amount: number): Promise<ConvertChipsResult> => {
        if (!user) return { success: false, error: 'Not authenticated' };

        try {
            const response = await fetch('/api/convert-chips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error ?? 'Conversion failed',
                    remainingCap: data.remainingCap,
                };
            }

            // Re-fetch full state to sync vibeChips and convertedTickets from DB
            await fetchGameState();

            return {
                success: true,
                newChips: data.newChips,
                newConverted: data.newConverted,
                remainingCap: data.remainingCap,
            };
        } catch (error) {
            console.error('Chip conversion failed:', error);
            return { success: false, error: 'Network error' };
        }
    };

    const activateBooster = async (file: File): Promise<{ success: boolean; error?: string }> => {
        if (!user) return { success: false, error: 'Not authenticated' };

        try {
            const formData = new FormData();
            formData.append('historyFile', file);

            const response = await fetch('/api/activate-booster', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error ?? 'Activation failed' };
            }

            // Sync booster state from DB
            await fetchGameState();
            return { success: true };
        } catch (error) {
            console.error('Booster activation failed:', error);
            return { success: false, error: 'Network error' };
        }
    };

    const clickOffer = async (offerId: string, actionUrl: string) => {
        if (state.completedOfferIds.includes(offerId)) return;

        // Open tracking URL synchronously with user gesture to avoid popup blocker
        if (actionUrl && actionUrl !== '#') {
            try {
                const url = new URL(actionUrl);
                url.searchParams.set('sub_id1', user?.id ?? '');
                window.open(url.toString(), '_blank');
            } catch {
                // Invalid URL — skip opening
            }
        }

        // Optimistic UI update
        setState(prev => ({
            ...prev,
            clickedOfferIds: prev.clickedOfferIds.includes(offerId)
                ? prev.clickedOfferIds
                : [...prev.clickedOfferIds, offerId],
        }));

        // Fire-and-forget click recording
        fetch('/api/offers/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ offerId }),
        }).catch(() => { /* non-blocking */ });
    };

    const playScratch = async (): Promise<ScratchResult> => {
        if (!user) return { success: false, error: 'Not authenticated' };

        try {
            const response = await fetch('/api/casino/scratch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error ?? 'Scratch failed' };
            }

            await fetchGameState();

            return {
                success: true,
                outcome: data.outcome,
                rewardChips: data.rewardChips,
                rewardCoins: data.rewardCoins,
                newChips: data.newChips,
                newCoins: data.newCoins,
                cost: data.cost,
            };
        } catch (error) {
            console.error('Scratch game failed:', error);
            return { success: false, error: 'Network error' };
        }
    };

    const playHiLo = async (bet: number, guess: 'higher' | 'lower'): Promise<HiLoResult> => {
        if (!user) return { success: false, error: 'Not authenticated' };

        try {
            const response = await fetch('/api/casino/hilo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bet, guess }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error ?? 'Hi-Lo failed' };
            }

            await fetchGameState();

            return {
                success: true,
                outcome: data.outcome,
                card: data.card,
                drawnCard: data.drawnCard,
                bet: data.bet,
                payout: data.payout,
                net: data.net,
                multiplier: data.multiplier,
                newChips: data.newChips,
            };
        } catch (error) {
            console.error('Hi-Lo game failed:', error);
            return { success: false, error: 'Network error' };
        }
    };

    const playRoulette = async (bets: Array<{ color: string; bet: number }>): Promise<RouletteResult> => {
        if (!user) return { success: false, error: 'Not authenticated' };

        try {
            const response = await fetch('/api/casino/roulette', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bets }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error ?? 'Roulette failed' };
            }

            await fetchGameState();

            return {
                success: true,
                resultColor: data.resultColor,
                anyWon: data.anyWon,
                totalBet: data.totalBet,
                totalPayout: data.totalPayout,
                net: data.net,
                bets: data.bets,
                newChips: data.newChips,
            };
        } catch (error) {
            console.error('Roulette game failed:', error);
            return { success: false, error: 'Network error' };
        }
    };

    const resetDraw = () => {
        alert('Weekly Draw Simulated! If you had the winning number, you\'d be rich!');
    };

    return (
        <GameContext.Provider value={{
            state,
            watchAd,
            activateBooster,
            clickOffer,
            resetDraw,
            refreshGameState: fetchGameState,
            convertChips,
            playScratch,
            playHiLo,
            playRoulette,
            isLoading,
        }}>
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    const context = useContext(GameContext);
    if (!context) throw new Error('useGame must be used within GameProvider');
    return context;
}
