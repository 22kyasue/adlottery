import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy — LottoAds',
    description: 'Privacy Policy for LottoAds. Learn how we collect and use your data.',
};

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-black text-white">
            <div className="mx-auto max-w-2xl px-6 py-12">
                <div className="mb-10">
                    <Link href="/" className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors">
                        ← Back to LottoAds
                    </Link>
                    <h1 className="mt-6 text-3xl font-black text-white">Privacy Policy</h1>
                    <p className="mt-2 text-sm text-gray-500">Effective date: February 25, 2026</p>
                </div>

                <div className="space-y-8 text-sm leading-relaxed text-gray-300">

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">1. Overview</h2>
                        <p>LottoAds (&quot;we&quot;, &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">2. Information We Collect</h2>
                        <ul className="list-disc space-y-2 pl-5">
                            <li><strong className="text-white">Account information:</strong> Email address used for authentication.</li>
                            <li><strong className="text-white">Usage data:</strong> Ad watch logs, ticket earnings, game activity, and draw participation.</li>
                            <li><strong className="text-white">Payout information:</strong> PayPal or Wise email address, provided voluntarily when claiming a prize.</li>
                            <li><strong className="text-white">Referral data:</strong> Referral codes used at signup, to attribute rewards correctly.</li>
                            <li><strong className="text-white">Browser history (optional):</strong> Voluntarily uploaded to activate Booster Mode. We check URL count and date range only — this data is not stored permanently.</li>
                            <li><strong className="text-white">Technical data:</strong> IP address, browser type, and device information for security and fraud prevention.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">3. How We Use Your Information</h2>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>To operate the lottery and process prize payouts</li>
                            <li>To send transactional emails (winner notifications, payout confirmations)</li>
                            <li>To detect and prevent fraud and bot activity</li>
                            <li>To calculate and attribute referral rewards</li>
                            <li>To improve the service and user experience</li>
                        </ul>
                        <p>We do not sell your personal information to third parties.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">4. Third-Party Services</h2>
                        <ul className="list-disc space-y-2 pl-5">
                            <li><strong className="text-white">Supabase:</strong> Authentication and data storage</li>
                            <li><strong className="text-white">Google IMA SDK / Ad Manager:</strong> Ad delivery</li>
                            <li><strong className="text-white">Resend:</strong> Transactional email delivery</li>
                            <li><strong className="text-white">PayPal / Wise:</strong> Prize payout processing</li>
                            <li><strong className="text-white">Offerwall providers:</strong> Task-based reward offers</li>
                        </ul>
                        <p>These services have their own privacy policies. We share only the minimum information necessary for them to function.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">5. Advertising</h2>
                        <p>
                            Third-party ad networks may use cookies and similar tracking technologies to serve relevant ads and measure performance. You can opt out of personalized advertising at{' '}
                            <a href="https://optout.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 transition-colors">optout.aboutads.info</a>.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">6. Data Retention</h2>
                        <p>Account data is retained as long as your account is active. Ad watch logs and game activity are retained for up to 1 year. Payout records are kept for compliance purposes. You can request account deletion by contacting support.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">7. Data Security</h2>
                        <p>We use HTTPS encryption, Row Level Security (RLS) on the database, and server-side validation. No system is 100% secure, but we follow industry best practices.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">8. Your Rights</h2>
                        <p>You may have the right to access, correct, or delete your personal data. To exercise these rights, contact us at <a href="mailto:support@burilar.com" className="text-yellow-400 hover:text-yellow-300 transition-colors">support@burilar.com</a>.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">9. Cookies</h2>
                        <p>We use essential cookies for authentication session management only. Ad providers may set their own cookies during ad playback.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">10. Children&apos;s Privacy</h2>
                        <p>LottoAds is not directed at anyone under 18. We do not knowingly collect data from minors. Contact us if you believe a minor has registered.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">11. Changes to This Policy</h2>
                        <p>We may update this policy periodically. Changes will be posted on this page with an updated effective date.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">12. Contact</h2>
                        <p>Privacy questions: <a href="mailto:support@burilar.com" className="text-yellow-400 hover:text-yellow-300 transition-colors">support@burilar.com</a></p>
                    </section>

                </div>

                <div className="mt-12 border-t border-white/10 pt-8 text-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 px-6 py-3 font-bold text-black hover:brightness-110 transition-all shadow-lg shadow-yellow-500/20"
                    >
                        Back to LottoAds
                    </Link>
                </div>
            </div>
        </div>
    );
}
