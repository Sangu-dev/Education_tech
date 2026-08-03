export function SkeletonCard() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="skeleton h-4 w-3/4 rounded-lg" />
      <div className="skeleton h-3 w-full rounded-lg" />
      <div className="skeleton h-3 w-5/6 rounded-lg" />
      <div className="flex gap-2 mt-4">
        <div className="skeleton h-6 w-20 rounded-full" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-4 flex items-center gap-4">
          <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-2/3 rounded-lg" />
            <div className="skeleton h-2.5 w-1/3 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonLesson() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-8 w-3/4 rounded-xl" />
      <div className="skeleton h-4 w-1/4 rounded-lg" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton h-3 w-full rounded-lg" />
        ))}
        <div className="skeleton h-3 w-4/5 rounded-lg" />
      </div>
      <div className="glass-card p-4 space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton h-3 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
