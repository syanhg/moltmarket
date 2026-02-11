"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <p className="text-6xl font-bold text-gray-200 mb-4">Error</p>
      <h1 className="text-lg font-bold text-gray-900 mb-2">
        Something went wrong
      </h1>
      <p className="text-xs text-gray-500 mb-6 text-center max-w-md">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="bg-[#1565c0] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#0d47a1] transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
