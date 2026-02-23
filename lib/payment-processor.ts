/**
 * Payment processor abstraction.
 * Currently a manual/stub implementation — replace with real PayPal/Wise API calls.
 *
 * Integration steps for production:
 * 1. Install PayPal SDK: npm install @paypal/payouts-sdk
 * 2. Install Wise API client or use fetch with their REST API
 * 3. Replace processPayment() with real API calls
 * 4. Add PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, WISE_API_TOKEN to env
 */

export interface PaymentRequest {
    payoutId: string;
    userId: string;
    amount: number;          // in JPY
    paypalEmail?: string;
    wiseEmail?: string;
}

export interface PaymentResult {
    success: boolean;
    method: 'paypal' | 'wise' | 'manual';
    transactionId?: string;
    error?: string;
}

/**
 * Process a payout to the user's configured payment method.
 * Tries PayPal first, then Wise, falls back to manual.
 */
export async function processPayment(req: PaymentRequest): Promise<PaymentResult> {
    // TODO: Replace with real PayPal Payouts API
    if (req.paypalEmail) {
        console.log(`[payment] PayPal payout: ¥${req.amount} → ${req.paypalEmail} (payout: ${req.payoutId})`);

        // Stub: In production, call PayPal Payouts API here
        // const paypalResult = await paypalClient.payouts.create({ ... });

        return {
            success: false,
            method: 'paypal',
            error: 'PayPal integration not configured — process manually',
        };
    }

    // TODO: Replace with real Wise API
    if (req.wiseEmail) {
        console.log(`[payment] Wise payout: ¥${req.amount} → ${req.wiseEmail} (payout: ${req.payoutId})`);

        // Stub: In production, call Wise Transfer API here
        // const wiseResult = await wiseClient.createTransfer({ ... });

        return {
            success: false,
            method: 'wise',
            error: 'Wise integration not configured — process manually',
        };
    }

    return {
        success: false,
        method: 'manual',
        error: 'No payment method configured for user',
    };
}
