
export interface Ticket {
    id: string; // 7-digit number
    timestamp: string; // ISO date string
    source: 'normal' | 'booster' | 'bonus';
}

export type AdType = 'standard' | 'high_value' | 'affiliate_link';

export const POOL_PERCENTAGE = 0.8;
export const BASIC_AD_REVENUE = 10; // 10 Yen base revenue per ad
export const BOOSTER_MULTIPLIER = 1.5;

// ─── Diminishing Returns Tiers ────────────────────────────────────────────────
// Tier 1: views  1-10  → 1 ad = 1 ticket
// Tier 2: views 11-30  → 2 ads = 1 ticket
// Tier 3: views 31-70  → 4 ads = 1 ticket
// Tier 4: views 71+    → 10 ads = 1 ticket

export const DIMINISHING_TIERS = [
    { upTo: 10,       adsPerTicket: 1  },
    { upTo: 30,       adsPerTicket: 2  },
    { upTo: 70,       adsPerTicket: 4  },
    { upTo: Infinity, adsPerTicket: 10 },
] as const;

/**
 * Given N total valid views today, returns the total integer tickets earned.
 * Pure function — no side effects, fully deterministic.
 */
export function calculateTotalTickets(views: number): number {
    if (views <= 0) return 0;
    let tickets = 0;

    // Tier 1 (1-10): 1:1
    const t1 = Math.min(views, 10);
    tickets += t1;

    // Tier 2 (11-30): 2:1
    if (views > 10) {
        const t2 = Math.min(views, 30) - 10;
        tickets += Math.floor(t2 / 2);
    }

    // Tier 3 (31-70): 4:1
    if (views > 30) {
        const t3 = Math.min(views, 70) - 30;
        tickets += Math.floor(t3 / 4);
    }

    // Tier 4 (71+): 10:1
    if (views > 70) {
        const t4 = views - 70;
        tickets += Math.floor(t4 / 10);
    }

    return tickets;
}

/**
 * Returns tier metadata for the given daily view count.
 */
export function getDailyViewMeta(views: number): {
    currentTier: number;
    adsPerTicket: number;
    viewsUntilNextTicket: number;
} {
    const currentTickets = calculateTotalTickets(views);
    // Find how many more views until next ticket
    let nextViews = views + 1;
    while (calculateTotalTickets(nextViews) === currentTickets && nextViews < views + 11) {
        nextViews++;
    }

    // Determine which tier this view count falls into
    let currentTier = 1;
    let adsPerTicket = 1;
    if (views >= 70) { currentTier = 4; adsPerTicket = 10; }
    else if (views >= 30) { currentTier = 3; adsPerTicket = 4; }
    else if (views >= 10) { currentTier = 2; adsPerTicket = 2; }

    return {
        currentTier,
        adsPerTicket,
        viewsUntilNextTicket: nextViews - views,
    };
}

/** 
 * Simulates watching an ad and returns the rewards.
 * @param isBoosterActive bool
 */
export function simulateAdWatch(isBoosterActive: boolean): {
    tickets: Ticket[],
    revenueGenerated: number,
    isHighValue: boolean
} {
    // Determine Ad Type (Simulation)
    const rand = Math.random();
    let revenue = BASIC_AD_REVENUE;
    let isHighValue = false;
    let ticketCount = 1;

    // 5% chance for high value (e.g. 100-200 yen revenue)
    if (rand < 0.05) {
        isHighValue = true;
        revenue = 100 + Math.floor(Math.random() * 100); // 100-200 yen
        // User requested "10 or 20 tickets" for high value/affiliate
        ticketCount = 10;
    }

    // Apply Booster logic
    // "Efficiency 1.5x" logic:
    // Option A: Increase revenue by 1.5x? 
    // Option B: Increase tickets by 1.5x? (1 -> 1.5 average)
    if (isBoosterActive) {
        // 50% chance to get an extra ticket for normal ads
        if (!isHighValue && Math.random() < 0.5) {
            ticketCount += 1;
        }
        // For high value, maybe 1.5x tickets? 10 -> 15
        if (isHighValue) {
            ticketCount = Math.floor(ticketCount * BOOSTER_MULTIPLIER);
        }
    }

    // Generate Tickets
    const source = isHighValue ? 'bonus' : (isBoosterActive ? 'booster' : 'normal');
    const newTickets = generateTickets(ticketCount, source);

    return {
        tickets: newTickets,
        revenueGenerated: revenue,
        isHighValue
    };
}


export interface Offer {
    id: string;
    title: string;
    description: string;
    rewardTickets: number;
    icon: string; // Emoji or URL
    actionUrl?: string;
    category: 'app' | 'survey' | 'action';
    difficulty: 'Easy' | 'Medium' | 'Hard';
}

export const MOCK_OFFERS: Offer[] = [
    {
        id: 'offer-1',
        title: 'Mafia City',
        description: 'Reach 600k Power within 30 days.',
        rewardTickets: 500,
        icon: '🕴️',
        actionUrl: 'https://example.com/offer?offer_id=offer-1',
        category: 'app',
        difficulty: 'Hard'
    },
    {
        id: 'offer-2',
        title: 'Disney Solitaire',
        description: 'Clear Scene 3 within 10 days.',
        rewardTickets: 150,
        icon: '🧚',
        actionUrl: 'https://example.com/offer?offer_id=offer-2',
        category: 'app',
        difficulty: 'Medium'
    },
    {
        id: 'offer-3',
        title: 'PayPay Card',
        description: 'Issue a new card and spend ¥1000.',
        rewardTickets: 1000,
        icon: '💳',
        actionUrl: 'https://example.com/offer?offer_id=offer-3',
        category: 'action',
        difficulty: 'Hard'
    },
    {
        id: 'offer-4',
        title: 'NewsDaily Free Trial',
        description: 'Register for a free 7-day trial.',
        rewardTickets: 50,
        icon: '📰',
        actionUrl: 'https://example.com/offer?offer_id=offer-4',
        category: 'action',
        difficulty: 'Easy'
    },
    {
        id: 'offer-5',
        title: 'Watch "Hero Wars" Trailer',
        description: 'Watch the full 30s video.',
        rewardTickets: 10,
        icon: '🎬',
        actionUrl: 'https://example.com/offer?offer_id=offer-5',
        category: 'action',
        difficulty: 'Easy'
    },
    {
        id: 'offer-6',
        title: 'Complete User Survey',
        description: 'Tell us about your gaming preferences.',
        rewardTickets: 25,
        icon: '📝',
        actionUrl: 'https://example.com/offer?offer_id=offer-6',
        category: 'survey',
        difficulty: 'Easy'
    }
];

export function generateTickets(count: number, source: Ticket['source']): Ticket[] {
    const newTickets: Ticket[] = [];
    for (let i = 0; i < count; i++) {
        newTickets.push({
            id: generate7DigitNumber(),
            timestamp: new Date().toISOString(),
            source: source
        });
    }
    return newTickets;
}

function generate7DigitNumber(): string {
    // Ensure 7 digits with leading zeros if needed
    const num = Math.floor(Math.random() * 10000000);
    return num.toString().padStart(7, '0');
}
