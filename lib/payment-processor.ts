/**
 * Payment processor for PayPal Payouts API and Wise Transfer API.
 * Uses native fetch — no extra dependencies required.
 *
 * Required environment variables:
 *   PayPal: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
 *   Wise:   WISE_API_TOKEN, WISE_PROFILE_ID
 *
 * Both default to sandbox mode. Set PAYPAL_MODE=live / WISE_MODE=live for production.
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

// ---------------------------------------------------------------------------
// PayPal Payouts API
// ---------------------------------------------------------------------------

const PAYPAL_BASE_URL =
    process.env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken(): Promise<string> {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials not configured');
    }

    const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`PayPal auth failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    return data.access_token;
}

async function processPayPal(req: PaymentRequest): Promise<PaymentResult> {
    try {
        const accessToken = await getPayPalAccessToken();

        const senderBatchId = `payout_${req.payoutId}_${Date.now()}`;

        const res = await fetch(`${PAYPAL_BASE_URL}/v1/payments/payouts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sender_batch_header: {
                    sender_batch_id: senderBatchId,
                    email_subject: 'LottoAds Prize Payout',
                    email_message: 'Congratulations! Here is your LottoAds prize payout.',
                },
                items: [
                    {
                        recipient_type: 'EMAIL',
                        amount: {
                            value: req.amount.toString(),
                            currency: 'JPY',
                        },
                        receiver: req.paypalEmail,
                        note: `LottoAds payout ${req.payoutId}`,
                        sender_item_id: req.payoutId,
                    },
                ],
            }),
        });

        if (!res.ok) {
            const errorBody = await res.text();
            console.error(`[payment] PayPal API error (${res.status}):`, errorBody);
            return {
                success: false,
                method: 'paypal',
                error: `PayPal API error (${res.status}): ${errorBody}`,
            };
        }

        const data = await res.json();
        const batchId = data.batch_header?.payout_batch_id;

        console.log(`[payment] PayPal payout created: batch=${batchId}, amount=¥${req.amount}, to=${req.paypalEmail}`);

        return {
            success: true,
            method: 'paypal',
            transactionId: batchId,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[payment] PayPal error:', message);
        return {
            success: false,
            method: 'paypal',
            error: message,
        };
    }
}

// ---------------------------------------------------------------------------
// Wise Transfer API
// ---------------------------------------------------------------------------

const WISE_BASE_URL =
    process.env.WISE_MODE === 'live'
        ? 'https://api.transferwise.com'
        : 'https://api.sandbox.transferwise.com';

function getWiseHeaders(): Record<string, string> {
    const token = process.env.WISE_API_TOKEN;
    if (!token) {
        throw new Error('Wise API token not configured');
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

function getWiseProfileId(): string {
    const profileId = process.env.WISE_PROFILE_ID;
    if (!profileId) {
        throw new Error('WISE_PROFILE_ID not configured');
    }
    return profileId;
}

async function wiseCreateQuote(profileId: string, amount: number): Promise<string> {
    const res = await fetch(`${WISE_BASE_URL}/v3/profiles/${profileId}/quotes`, {
        method: 'POST',
        headers: getWiseHeaders(),
        body: JSON.stringify({
            sourceCurrency: 'JPY',
            targetCurrency: 'JPY',
            sourceAmount: amount,
            payOut: 'BALANCE',
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Wise quote failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    return data.id;
}

async function wiseCreateRecipient(profileId: string, email: string): Promise<string> {
    const res = await fetch(`${WISE_BASE_URL}/v1/accounts`, {
        method: 'POST',
        headers: getWiseHeaders(),
        body: JSON.stringify({
            profile: profileId,
            accountHolderName: email,
            currency: 'JPY',
            type: 'email',
            details: { email },
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Wise recipient creation failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    return data.id;
}

async function wiseCreateTransfer(profileId: string, recipientId: string, quoteId: string, payoutId: string): Promise<{ transferId: string }> {
    const res = await fetch(`${WISE_BASE_URL}/v1/transfers`, {
        method: 'POST',
        headers: getWiseHeaders(),
        body: JSON.stringify({
            targetAccount: recipientId,
            quoteUuid: quoteId,
            customerTransactionId: payoutId,
            details: {
                reference: `LottoAds payout ${payoutId}`,
            },
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Wise transfer creation failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    return { transferId: data.id };
}

async function wiseFundTransfer(profileId: string, transferId: string): Promise<void> {
    const res = await fetch(`${WISE_BASE_URL}/v3/profiles/${profileId}/transfers/${transferId}/payments`, {
        method: 'POST',
        headers: getWiseHeaders(),
        body: JSON.stringify({ type: 'BALANCE' }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Wise funding failed (${res.status}): ${text}`);
    }
}

async function processWise(req: PaymentRequest): Promise<PaymentResult> {
    try {
        const profileId = getWiseProfileId();

        // Step 1: Create quote
        const quoteId = await wiseCreateQuote(profileId, req.amount);

        // Step 2: Create recipient
        const recipientId = await wiseCreateRecipient(profileId, req.wiseEmail!);

        // Step 3: Create transfer
        const { transferId } = await wiseCreateTransfer(profileId, recipientId, quoteId, req.payoutId);

        // Step 4: Fund from balance
        await wiseFundTransfer(profileId, transferId.toString());

        console.log(`[payment] Wise transfer created: id=${transferId}, amount=¥${req.amount}, to=${req.wiseEmail}`);

        return {
            success: true,
            method: 'wise',
            transactionId: transferId.toString(),
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[payment] Wise error:', message);
        return {
            success: false,
            method: 'wise',
            error: message,
        };
    }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Process a payout to the user's configured payment method.
 * Tries PayPal first, then Wise, falls back to manual.
 */
export async function processPayment(req: PaymentRequest): Promise<PaymentResult> {
    if (req.paypalEmail) {
        return processPayPal(req);
    }

    if (req.wiseEmail) {
        return processWise(req);
    }

    return {
        success: false,
        method: 'manual',
        error: 'No payment method configured for user',
    };
}
