import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { IngredientInput } from '@/components/IngredientInput'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { RecipeCard } from '@/components/RecipeCard'
import { useRecipeStore } from '@/features/recipes/store'

function useRecipeSelectors() {
  const status = useRecipeStore((state) => state.status)
  const recipe = useRecipeStore((state) => state.recipe)
  const error = useRecipeStore((state) => state.error)
  const search = useRecipeStore((state) => state.search)
  const reroll = useRecipeStore((state) => state.reroll)
  const hasHistory = useRecipeStore((state) => state.lastIngredients.length > 0)
  return { status, recipe, error, search, reroll, hasHistory }
}

export default function Home() {
  const { status, recipe, error, search, reroll, hasHistory } = useRecipeSelectors()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [bootstrapped, setBootstrapped] = useState(false)

  const isLoading = status === 'loadingList' || status === 'loadingDetail'

  const loadingLabel = useMemo(() => {
    if (status === 'loadingDetail') return '레시피 정보를 불러오는 중…'
    if (status === 'loadingList') return '레시피 후보를 찾는 중…'
    return '불러오는 중…'
  }, [status])

  useEffect(() => {
    if (bootstrapped) return
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const initial = params.get('i')

    if (initial) {
      setValue(initial)
      search(initial)
    }

    setBootstrapped(true)
  }, [bootstrapped, search])

  const handleSubmit = async (nextValue: string) => {
    setValue(nextValue)

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (nextValue.trim()) {
        url.searchParams.set('i', nextValue.trim())
      } else {
        url.searchParams.delete('i')
      }
      const searchString = url.searchParams.toString()
      const hashString = url.hash
      window.history.replaceState(
        null,
        '',
        `${url.pathname}${searchString ? `?${searchString}` : ''}${hashString ?? ''}`,
      )
    }

    await search(nextValue)
  }

  const handleFocusInput = () => {
    inputRef.current?.focus()
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10">
      <div className="flex-1 space-y-8">
        <header className="space-y-3 text-center sm:text-left">
          <p className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand shadow-sm">
            오늘 뭐 먹지?
          </p>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            랜덤 레시피 챌린저
          </h1>
          <p className="text-sm text-slate-600">
            집에 있는 재료를 입력하면, 그 재료로 만들 수 있는 레시피를 무작위로 추천해 드려요.
          </p>
        </header>

        <IngredientInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          inputRef={inputRef}
        />

        <section className="min-h-[200px] space-y-6" aria-live="polite">
          {isLoading ? <LoadingSpinner label={loadingLabel} /> : null}

          {status === 'empty' ? (
            <EmptyState actionLabel="재료 다시 입력하기" onAction={handleFocusInput}>
              <p>다른 조합을 시도하거나 재료 순서를 바꿔보면 새로운 레시피를 만날 수 있어요.</p>
            </EmptyState>
          ) : null}

          {status === 'error' ? (
            <ErrorState
              description={error ?? '오프라인이거나 서버 응답이 없어요. 잠시 후 다시 시도해주세요.'}
              onRetry={hasHistory ? reroll : undefined}
              retryLabel={hasHistory ? '다시 시도하기' : undefined}
            >
              {!hasHistory ? <p>재료를 다시 입력하거나 인터넷 연결을 확인해 주세요.</p> : null}
            </ErrorState>
          ) : null}

          {status === 'success' && recipe ? (
            <RecipeCard recipe={recipe} onReroll={reroll} isLoading={isLoading} />
          ) : null}

          {status === 'idle' ? (
            <div className="rounded-2xl border border-dashed border-orange-200 bg-white/60 px-6 py-10 text-center text-sm text-slate-500">
              <p>재료를 입력하고 <strong className="text-brand">재료로 찾기</strong> 버튼을 눌러 랜덤 레시피를 받아보세요!</p>
            </div>
          ) : null}
        </section>
      </div>

      <footer className="mt-12 flex flex-col items-center gap-2 pb-6 text-xs text-slate-500 sm:flex-row sm:justify-between">
        <span>
          Powered by&nbsp;
          <a
            href="https://www.themealdb.com/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand hover:text-brand-dark"
          >
            TheMealDB
          </a>
        </span>
        <a
          href="https://github.com/your-org/random-receipy"
          target="_blank"
          rel="noreferrer"
          className="hover:text-brand"
        >
          GitHub 저장소 바로가기
        </a>
      </footer>
    </main>
  )
}
