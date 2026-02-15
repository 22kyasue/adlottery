
export interface Ticket {
    id: string; // 7-digit number
    timestamp: string; // ISO date string
    source: 'normal' | 'booster' | 'bonus';
}

export type AdType = 'standard' | 'high_value' | 'affiliate_link';

export const POOL_PERCENTAGE = 0.8;
export const BASIC_AD_REVENUE = 10; // 10 Yen base revenue per ad
export const BOOSTER_MULTIPLIER = 1.5;

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
        category: 'app',
        difficulty: 'Hard'
    },
    {
        id: 'offer-2',
        title: 'Disney Solitaire',
        description: 'Clear Scene 3 within 10 days.',
        rewardTickets: 150,
        icon: '🧚',
        category: 'app',
        difficulty: 'Medium'
    },
    {
        id: 'offer-3',
        title: 'PayPay Card',
        description: 'Issue a new card and spend ¥1000.',
        rewardTickets: 1000,
        icon: '💳',
        category: 'action',
        difficulty: 'Hard'
    },
    {
        id: 'offer-4',
        title: 'NewsDaily Free Trial',
        description: 'Register for a free 7-day trial.',
        rewardTickets: 50,
        icon: '📰',
        category: 'action',
        difficulty: 'Easy'
    },
    {
        id: 'offer-5',
        title: 'Watch "Hero Wars" Trailer',
        description: 'Watch the full 30s video.',
        rewardTickets: 10,
        icon: '🎬',
        category: 'action',
        difficulty: 'Easy'
    },
    {
        id: 'offer-6',
        title: 'Complete User Survey',
        description: 'Tell us about your gaming preferences.',
        rewardTickets: 25,
        icon: '📝',
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
