export default function SiteLoading() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-12 h-12 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mb-6" />
      <div className="space-y-3 w-full max-w-sm text-center">
        <div className="h-4 bg-neutral-200 rounded animate-pulse w-3/4 mx-auto" />
        <div className="h-3 bg-neutral-100 rounded animate-pulse w-1/2 mx-auto" />
      </div>
    </div>
  );
}
