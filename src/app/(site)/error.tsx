"use client";

import { useEffect } from "react";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Site Application Error:", error);
  }, [error]);

  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
          !
        </div>
        <h2 className="text-xl font-serif font-semibold text-neutral-900 mb-2">
          Unable to Load Content
        </h2>
        <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
          {error?.message ||
            "An unexpected error occurred while loading this page. Please try again or return home."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-black text-white text-xs uppercase tracking-widest font-medium hover:bg-neutral-800 transition rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-6 py-2.5 bg-neutral-100 text-neutral-800 text-xs uppercase tracking-widest font-medium hover:bg-neutral-200 transition rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 inline-block"
          >
            Return Home
          </a>
        </div>
      </div>
    </div>
  );
}
