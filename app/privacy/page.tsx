export default function PrivacyPolicy() {
    return (
        <main className="min-h-screen bg-black text-white px-4 py-12 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-yellow-400 mb-8">Privacy Policy</h1>

            <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300">
                <p><strong>Last updated:</strong> February 2026</p>

                <section>
                    <h2 className="text-lg font-semibold text-white">1. Information We Collect</h2>
                    <p>We collect the following information:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li><strong>Account information:</strong> Email address used for authentication</li>
                        <li><strong>Usage data:</strong> Ad watch logs, ticket earnings, game activity</li>
                        <li><strong>Payout information:</strong> PayPal or Wise email for prize delivery</li>
                        <li><strong>Browser history (optional):</strong> Only if you voluntarily upload it
                            for Booster Mode activation. We check URL count and date range only.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-white">2. How We Use Your Information</h2>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>To operate the lottery and process prize payouts</li>
                        <li>To detect and prevent fraud and bot activity</li>
                        <li>To improve the service and user experience</li>
                        <li>To send prize notifications and service updates</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-white">3. Third-Party Services</h2>
                    <p>We use the following third-party services:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li><strong>Supabase:</strong> Authentication and data storage</li>
                        <li><strong>Google IMA SDK:</strong> Ad delivery</li>
                        <li><strong>PayPal/Wise:</strong> Prize payout processing</li>
                        <li><strong>Offerwall providers:</strong> Task-based reward offers</li>
                    </ul>
                    <p>
                        These services have their own privacy policies. We share only the minimum
                        information necessary for them to function.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-white">4. Data Retention</h2>
                    <p>
                        Account data is retained as long as your account is active. Ad watch logs and
                        game activity are retained for up to 1 year. Payout records are retained for
                        tax and compliance purposes. You can request account deletion by contacting support.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-white">5. Data Security</h2>
                    <p>
                        We use industry-standard security measures including encrypted connections (HTTPS),
                        Row Level Security (RLS) on the database, and server-side validation. However,
                        no system is 100% secure.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-white">6. Your Rights</h2>
                    <p>You have the right to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Access your personal data</li>
                        <li>Request correction of inaccurate data</li>
                        <li>Request deletion of your account and data</li>
                        <li>Opt out of non-essential data collection</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-white">7. Cookies</h2>
                    <p>
                        We use essential cookies for authentication session management. We do not use
                        third-party tracking cookies. Ad providers may set their own cookies during
                        ad playback.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-white">8. Changes to This Policy</h2>
                    <p>
                        We may update this privacy policy periodically. Changes will be posted on this page
                        with an updated revision date.
                    </p>
                </section>
            </div>
        </main>
    );
}
