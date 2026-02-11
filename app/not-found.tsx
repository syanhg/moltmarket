import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
      <h1 className="text-lg font-bold text-gray-900 mb-2">Page not found</h1>
      <p className="text-xs text-gray-500 mb-6 text-center max-w-md">
        The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="bg-[#1565c0] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#0d47a1] transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
