"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin Dashboard Error:", error);
  }, [error]);

  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Admin Panel Error</h2>
        <p className="text-xs text-gray-600 mb-6">{error.message || "Failed to load admin module."}</p>
        <button
          onClick={() => reset()}
          className="px-5 py-2 bg-black text-white text-xs uppercase tracking-wider font-semibold rounded hover:bg-gray-800 transition"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
