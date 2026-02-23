import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
            <div className="space-y-6 max-w-sm">
                <p className="text-6xl">🎰</p>
                <div className="space-y-2">
                    <h1 className="text-6xl font-black text-yellow-400">404</h1>
                    <p className="text-xl font-bold text-white">Page not found</p>
                    <p className="text-sm text-gray-500">
                        This page doesn&apos;t exist. Maybe your lucky ticket is somewhere else.
                    </p>
                </div>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 px-6 py-3 font-bold text-black hover:brightness-110 transition-all shadow-lg shadow-yellow-500/20"
                >
                    Back to LottoAds
                </Link>
            </div>
        </div>
    );
}
