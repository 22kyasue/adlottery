import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service — LottoAds',
    description: 'Terms of Service for LottoAds. Read our terms before using the service.',
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            <div className="mx-auto max-w-2xl px-6 py-12">
                {/* Header */}
                <div className="mb-10">
                    <Link
                        href="/"
                        className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
                    >
                        ← Back to LottoAds
                    </Link>
                    <h1 className="mt-6 text-3xl font-black text-white">Terms of Service</h1>
                    <p className="mt-2 text-sm text-gray-500">Effective date: February 25, 2026</p>
                </div>

                <div className="space-y-8 text-sm leading-relaxed text-gray-300">

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">1. About LottoAds</h2>
                        <p>
                            LottoAds (&quot;the Service&quot;, &quot;we&quot;, &quot;us&quot;) is an online platform that allows registered users to earn lottery entries by watching advertisements. Entries are pooled into a weekly prize draw. By accessing or using the Service, you agree to these Terms of Service (&quot;Terms&quot;).
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">2. Eligibility</h2>
                        <p>You must be at least <strong className="text-white">18 years old</strong> to use LottoAds. By registering, you confirm that you meet this requirement. We reserve the right to terminate accounts found to be in violation of this requirement.</p>
                        <p>The Service is available to individual users for personal, non-commercial use only. One account per person is permitted.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">3. How the Service Works</h2>
                        <ul className="list-disc space-y-2 pl-5">
                            <li><strong className="text-white">Ad Watching:</strong> Users earn Vibe Chips and lottery tickets by watching video advertisements to completion.</li>
                            <li><strong className="text-white">Tickets:</strong> Lottery tickets are accumulated each week. More tickets increase your chances in the weekly draw.</li>
                            <li><strong className="text-white">Weekly Draw:</strong> One winner is selected every week from the pool of all ticket holders. The draw is conducted automatically and the result is final.</li>
                            <li><strong className="text-white">Vibe Chips:</strong> An in-app currency earned through ad views and other activities, usable in casino-style mini-games. Vibe Chips have no cash value.</li>
                            <li><strong className="text-white">Booster:</strong> A temporary multiplier that increases ticket earnings. Activated through specific in-app actions.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">4. No Purchase Necessary</h2>
                        <p>
                            No purchase is required to participate in the weekly draw. Tickets are earned solely through ad watching and other free in-app activities.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">5. Prizes and Payouts</h2>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>The prize pool for each weekly draw is determined by ad revenue collected during that week.</li>
                            <li>Winners are notified by email and via an in-app notification.</li>
                            <li>Winners must set up a valid payout method (PayPal or Wise) within <strong className="text-white">14 days</strong> of winning. Unclaimed prizes expire after 14 days and are forfeited.</li>
                            <li>We reserve the right to verify winner identity before processing payouts.</li>
                            <li>Prize amounts are subject to applicable taxes in the winner&apos;s jurisdiction. Winners are responsible for reporting and paying any taxes owed.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">6. Referral Program</h2>
                        <p>
                            Users may invite others via a referral link. Rewards are granted only when the referred user creates a new account. Abuse of the referral system (e.g. self-referral, fake accounts) will result in forfeiture of rewards and potential account suspension.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">7. Prohibited Conduct</h2>
                        <p>You agree not to:</p>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>Use bots, scripts, or automated tools to watch ads or earn tickets</li>
                            <li>Create multiple accounts</li>
                            <li>Attempt to manipulate or cheat the draw or casino games</li>
                            <li>Interfere with the Service or its infrastructure</li>
                            <li>Use the Service for any unlawful purpose</li>
                        </ul>
                        <p>Violations may result in immediate account suspension and forfeiture of all earned rewards.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">8. Account Termination</h2>
                        <p>
                            We reserve the right to suspend or terminate any account at our discretion, with or without notice, for violation of these Terms or for any other reason. Upon termination, all accumulated tickets, Vibe Chips, and pending rewards are forfeited.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">9. Disclaimers</h2>
                        <p>
                            The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uninterrupted access, specific prize amounts, or any particular draw outcomes. Ad availability and prize pools may vary week to week.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">10. Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by law, LottoAds shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability to you shall not exceed the prize amount (if any) you were entitled to receive.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">11. Changes to These Terms</h2>
                        <p>
                            We may update these Terms at any time. Continued use of the Service after changes are posted constitutes acceptance of the revised Terms. We will notify users of material changes via email or in-app notice.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-bold text-white">12. Contact</h2>
                        <p>
                            Questions about these Terms? Contact us at{' '}
                            <a href="mailto:support@burilar.com" className="text-yellow-400 hover:text-yellow-300 transition-colors">
                                support@burilar.com
                            </a>
                        </p>
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
