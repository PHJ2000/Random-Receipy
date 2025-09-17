import { create } from 'zustand'
import { filterByIngredients, lookupById } from './api'
import { toRecipe } from './utils'
import type { Recipe } from './types'

type Status = 'idle' | 'loadingList' | 'success' | 'empty' | 'error'

type State = {
  status: Status
  lastIngredients: string[]
  recipe: Recipe | null
  error: string | null
  search: (input: string) => Promise<void>
  reroll: () => Promise<void>
}

function parseInput(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

const KOREAN_SERVICE_KEY = import.meta.env.VITE_KOREAN_RECIPES_SERVICE_KEY

export const useRecipeStore = create<State>((set, get) => {
  let searchController: AbortController | null = null

  async function fetchRecipe(ingredients: string[]): Promise<void> {
    searchController?.abort()
    searchController = new AbortController()
    set({ status: 'loadingList', error: null, recipe: null })

    try {
      const list = await filterByIngredients(ingredients, listController.signal)

      if (!list || list.length === 0) {
        set({ status: 'empty', recipe: null })
        return
      }

      const selected = pickRandom(details)
      set({ status: 'success', recipe: toRecipe(selected) })
    } finally {
      searchController = null
    }
  }

  async function tryFetchKoreanRecipe(
    ingredients: string[],
    signal: AbortSignal,
  ): Promise<Recipe | null> {
    if (!KOREAN_SERVICE_KEY) {
      return null
    }


      if (isAbortError(error)) {
        throw error
      }
      return null

  }

  function handleError(error: unknown) {
    if (isAbortError(error)) {
      return
    }
    const message =
      error instanceof Error ? error.message : '오프라인이거나 서버 응답이 없어요. 잠시 후 다시 시도해주세요.'
    set({ status: 'error', error: message, recipe: null })
  }

  return {
    status: 'idle',
    lastIngredients: [],
    recipe: null,
    error: null,

    async search(input) {
      const ingredients = parseInput(input)

      if (ingredients.length === 0) {
        set({ status: 'error', error: '재료를 한 개 이상 입력하세요.', recipe: null })
        return
      }

      set({ lastIngredients: ingredients })

      try {
        await fetchRecipe(ingredients)
      } catch (error) {
        handleError(error)
      }
    },

    async reroll() {
      const ingredients = get().lastIngredients
      if (ingredients.length === 0) return

      try {
        await fetchRecipe(ingredients)
      } catch (error) {
        handleError(error)
      }
    },
  }
})
