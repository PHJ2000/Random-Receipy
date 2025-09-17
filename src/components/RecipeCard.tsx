import { useState } from 'react'
import type { Recipe } from '@/features/recipes/types'

type RecipeCardProps = {
  recipe: Recipe
  onReroll: () => void
  isLoading?: boolean
}

type CopyState = 'idle' | 'copied' | 'error'

function getShareLink(recipe: Recipe): string {
  if (recipe.sourceUrl) return recipe.sourceUrl
  if (recipe.youtubeUrl) return recipe.youtubeUrl
  if (typeof window !== 'undefined') return window.location.href
  return ''
}

export function RecipeCard({ recipe, onReroll, isLoading }: RecipeCardProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle')

  const handleCopy = async () => {
    try {
      const link = getShareLink(recipe)
      if (!link) throw new Error('복사할 링크가 없어요.')
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea')
        textarea.value = link
        textarea.style.position = 'fixed'
        textarea.style.top = '0'
        textarea.style.left = '0'
        textarea.style.width = '1px'
        textarea.style.height = '1px'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch (error) {
      console.error(error)
      setCopyState('error')
      setTimeout(() => setCopyState('idle'), 2500)
    }
  }

  return (
    <article className="card space-y-6" aria-live="polite">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900">{recipe.title}</h2>
          <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            랜덤 추천
          </span>
        </div>
        <img
          src={recipe.thumb}
          alt={`${recipe.title} 썸네일`}
          className="h-56 w-full rounded-2xl object-cover shadow-md"
          loading="lazy"
        />
      </header>

      <section aria-labelledby="ingredients-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 id="ingredients-heading" className="text-lg font-semibold text-slate-800">
            재료
          </h3>
          <span className="text-sm text-slate-500">총 {recipe.ingredients.length}가지</span>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {recipe.ingredients.map((ingredient) => (
            <li key={`${ingredient.name}-${ingredient.measure ?? 'none'}`} className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-brand" aria-hidden />
              <span className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">{ingredient.name}</span>
                {ingredient.measure ? <span className="text-slate-500"> — {ingredient.measure}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="instructions-heading" className="space-y-3">
        <h3 id="instructions-heading" className="text-lg font-semibold text-slate-800">
          조리 순서
        </h3>
        {recipe.instructions.length > 0 ? (
          <ol className="space-y-3">
            {recipe.instructions.map((step, index) => (
              <li key={`${index}-${step}`} className="relative rounded-xl bg-orange-50/80 p-4 text-sm leading-relaxed text-slate-700">
                <span className="absolute -left-3 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-md">
                  {index + 1}
                </span>
                <span className="block pl-6">{step}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl bg-orange-50/80 p-4 text-sm text-slate-600">
            상세 조리 설명이 제공되지 않은 레시피예요. 원문 링크를 참고해 주세요.
          </p>
        )}
      </section>

      <footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <button type="button" className="button-primary" onClick={onReroll} disabled={isLoading}>
            {isLoading ? '다시 돌리는 중…' : '다시 돌리기'}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
            disabled={copyState === 'copied'}
          >
            {copyState === 'copied' ? '복사 완료!' : copyState === 'error' ? '다시 시도하기' : '링크 복사'}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          {recipe.sourceUrl ? (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand hover:text-brand-dark"
            >
              원문 레시피 보기
            </a>
          ) : null}
          {recipe.youtubeUrl ? (
            <a
              href={recipe.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-rose-500 hover:text-rose-600"
            >
              영상으로 보기
            </a>
          ) : null}
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          {copyState === 'copied'
            ? '링크가 복사되었습니다.'
            : copyState === 'error'
              ? '링크 복사에 실패했어요. 다시 시도해 주세요.'
              : ''}
        </span>
      </footer>
    </article>
  )
}
