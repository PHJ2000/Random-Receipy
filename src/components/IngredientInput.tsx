import type { FormEvent, RefObject } from 'react'

type IngredientInputProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  isLoading?: boolean
  inputRef?: RefObject<HTMLInputElement | null>
}

export function IngredientInput({ value, onChange, onSubmit, isLoading, inputRef }: IngredientInputProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(value)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label="재료 검색 폼">
      <div className="space-y-2">
        <label htmlFor="ingredients" className="block text-sm font-medium text-slate-700">
          냉장고에 있는 재료를 입력해 주세요
        </label>
        <input
          ref={inputRef}
          id="ingredients"
          name="ingredients"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="예) egg, tomato, onion"
          className="w-full rounded-2xl border border-orange-200 bg-white/80 px-4 py-3 text-base shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          disabled={isLoading}
          aria-disabled={isLoading}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span>쉼표(,)로 구분하면 여러 재료를 입력할 수 있어요.</span>
        <button type="submit" className="button-primary" disabled={isLoading}>
          {isLoading ? '검색 중…' : '재료로 찾기'}
        </button>
      </div>
    </form>
  )
}
