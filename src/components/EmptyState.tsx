import type { PropsWithChildren, ReactNode } from 'react'

type EmptyStateProps = {
  title?: string
  description?: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  title = '레시피를 찾지 못했어요',
  description = '해당 재료로 찾은 레시피가 없어요. 재료를 바꿔보세요!',
  actionLabel,
  onAction,
  children,
}: PropsWithChildren<EmptyStateProps>) {
  return (
    <div className="card space-y-3 text-center text-sm text-slate-600">
      <h3 className="text-lg font-semibold text-amber-600">{title}</h3>
      <p>{description}</p>
      {children}
      {onAction && actionLabel ? (
        <button type="button" className="button-primary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
