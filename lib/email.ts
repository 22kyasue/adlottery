/**
 * Email notification utility.
 * Currently logs to console — replace with real email provider (SendGrid, Resend, etc.)
 *
 * Integration steps for production:
 * 1. Install SDK: npm install @sendgrid/mail  (or resend, nodemailer, etc.)
 * 2. Add SENDGRID_API_KEY (or equivalent) to env
 * 3. Replace sendEmail() with real API call
 */

interface EmailPayload {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
    // TODO: Replace with real email provider
    console.log(`[email] Would send to ${payload.to}: ${payload.subject}`);
    console.log(`[email] Body: ${payload.text}`);
    return true;
}

export async function sendWinnerNotification(email: string, weekId: string, amount: number): Promise<boolean> {
    return sendEmail({
        to: email,
        subject: `You won ¥${amount.toLocaleString()} in the LottoVibe draw!`,
        text: [
            `Congratulations! You won the Week ${weekId} draw!`,
            ``,
            `Prize: ¥${amount.toLocaleString()}`,
            ``,
            `Please set up your payout method within 14 days to claim your prize.`,
            `Log in to LottoVibe and go to Payout Settings in the profile menu.`,
            ``,
            `If you don't set up your payout method within 14 days, your prize will expire.`,
        ].join('\n'),
    });
}

export async function sendPayoutConfirmation(email: string, amount: number, method: string, transactionId: string): Promise<boolean> {
    return sendEmail({
        to: email,
        subject: `Your LottoVibe payout of ¥${amount.toLocaleString()} has been sent`,
        text: [
            `Your payout has been processed!`,
            ``,
            `Amount: ¥${amount.toLocaleString()}`,
            `Method: ${method}`,
            `Transaction ID: ${transactionId}`,
            ``,
            `Please allow 1-3 business days for the funds to arrive.`,
        ].join('\n'),
    });
}

export async function sendPayoutExpiryWarning(email: string, weekId: string, amount: number, daysLeft: number): Promise<boolean> {
    return sendEmail({
        to: email,
        subject: `Action required: ${daysLeft} days left to claim your ¥${amount.toLocaleString()} prize`,
        text: [
            `Your Week ${weekId} prize of ¥${amount.toLocaleString()} will expire in ${daysLeft} days.`,
            ``,
            `Please set up your payout method in LottoVibe to claim your prize.`,
            `Go to Profile > Payout Settings to add your PayPal or Wise email.`,
        ].join('\n'),
    });
}
