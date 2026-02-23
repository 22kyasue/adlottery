'use client';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-4">
            <div className="max-w-md text-center space-y-4">
                <h2 className="text-2xl font-bold text-yellow-400">Something went wrong</h2>
                <p className="text-gray-400 text-sm">
                    {error.message || 'An unexpected error occurred.'}
                </p>
                <button
                    onClick={reset}
                    className="mt-4 rounded-lg bg-yellow-500 px-6 py-2.5 text-sm font-bold text-black transition-colors hover:bg-yellow-400"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
