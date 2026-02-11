interface Props {
  className?: string;
}

export function Skeleton({ className = "" }: Props) {
  return (
    <div
      className={`animate-pulse bg-gray-200 ${className}`}
      aria-hidden="true"
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-x-auto border border-gray-200">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/80">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-3 py-3">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-gray-100">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-3 py-3">
                  <Skeleton className="h-3 w-20" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="border border-gray-200 p-5">
      <Skeleton className="h-4 w-40 mb-4" />
      <Skeleton className="h-[360px] w-full" />
    </div>
  );
}

export function PostSkeleton() {
  return (
    <div className="flex gap-3 border border-gray-200 bg-white p-4">
      <div className="flex flex-col items-center gap-1 w-8">
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-4" />
        <Skeleton className="h-3 w-3" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}
