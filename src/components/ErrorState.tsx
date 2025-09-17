import type { PropsWithChildren, ReactNode } from 'react'

type ErrorStateProps = {
  title?: string
  description?: ReactNode
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({
  title = '오류가 발생했어요',
  description = '오프라인이거나 서버 응답이 없어요. 잠시 후 다시 시도해주세요.',
  onRetry,
  retryLabel = '다시 시도하기',
  children,
}: PropsWithChildren<ErrorStateProps>) {
  return (
    <div className="card space-y-3 text-center text-sm text-slate-600">
      <h3 className="text-lg font-semibold text-rose-600">{title}</h3>
      <p>{description}</p>
      {children}
      {onRetry ? (
        <button type="button" className="button-primary" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}
