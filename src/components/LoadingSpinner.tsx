export function LoadingSpinner({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 rounded-2xl border border-orange-100 bg-white/70 px-5 py-4 shadow-sm">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden />
      <span className="text-sm font-medium text-slate-600">{label}</span>
    </div>
  )
}
