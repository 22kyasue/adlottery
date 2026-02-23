import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? 'LottoAds <noreply@lottoads.app>';

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
        const { error } = await resend.emails.send({ from: FROM, to, subject, html });
        if (error) {
            console.error('[email] Resend error:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('[email] Unexpected error:', err);
        return false;
    }
}

export async function sendWinnerNotification(email: string, weekId: string, amount: number): Promise<boolean> {
    const subject = `You won ¥${amount.toLocaleString()} in the LottoAds draw!`;
    const html = `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
  <h1 style="color:#f59e0b">🎉 Congratulations!</h1>
  <p>You won the <strong>Week ${weekId}</strong> draw!</p>
  <p style="font-size:2rem;font-weight:900;color:#f59e0b">¥${amount.toLocaleString()}</p>
  <p>Please set up your payout method within <strong>14 days</strong> to claim your prize.</p>
  <p>Log in to LottoAds and go to <strong>Payout Settings</strong> in the profile menu.</p>
  <p style="color:#9ca3af;font-size:0.85rem">If you don't set up your payout method within 14 days, your prize will expire.</p>
</div>`;
    return sendEmail(email, subject, html);
}

export async function sendPayoutConfirmation(email: string, amount: number, method: string, transactionId: string): Promise<boolean> {
    const subject = `Your LottoAds payout of ¥${amount.toLocaleString()} has been sent`;
    const html = `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
  <h1 style="color:#22c55e">✅ Payout Processed</h1>
  <p><strong>Amount:</strong> ¥${amount.toLocaleString()}</p>
  <p><strong>Method:</strong> ${method}</p>
  <p><strong>Transaction ID:</strong> ${transactionId}</p>
  <p style="color:#9ca3af;font-size:0.85rem">Please allow 1–3 business days for the funds to arrive.</p>
</div>`;
    return sendEmail(email, subject, html);
}

export async function sendPayoutExpiryWarning(email: string, weekId: string, amount: number, daysLeft: number): Promise<boolean> {
    const subject = `Action required: ${daysLeft} days left to claim your ¥${amount.toLocaleString()} prize`;
    const html = `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
  <h1 style="color:#f97316">⏰ Prize Expiring Soon</h1>
  <p>Your Week ${weekId} prize of <strong>¥${amount.toLocaleString()}</strong> will expire in <strong>${daysLeft} days</strong>.</p>
  <p>Please set up your payout method in LottoAds to claim your prize.</p>
  <p>Go to <strong>Profile &gt; Payout Settings</strong> to add your PayPal or Wise email.</p>
</div>`;
    return sendEmail(email, subject, html);
}
