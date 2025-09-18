import { create } from 'zustand'
import { filterByIngredients, lookupById } from './api'
import {
  fetchKoreanRecipes,
  intersectCookRcpRows,
  toMealDetailFromKorean,
  type CookRcpRow,
} from './koreanApi'
import { toRecipe } from './utils'
import type { MealDetailRaw, Recipe } from './types'

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

async function tryFetchKoreanDetail(
  ingredients: string[],
  signal: AbortSignal,
): Promise<MealDetailRaw | null> {
  const serviceKey = import.meta.env.VITE_KOREAN_RECIPES_SERVICE_KEY?.trim()
  if (!serviceKey) return null

  const unique = Array.from(new Set(ingredients.map((item) => item.trim()).filter(Boolean)))
  if (unique.length === 0) return null

  const lists: CookRcpRow[][] = []

  for (const ingredient of unique) {
    const rows = await fetchKoreanRecipes({
      serviceKey,
      parts: ingredient,
      signal,
    })

    if (rows.length === 0) {
      return null
    }

    lists.push(rows)
  }

  const intersection = intersectCookRcpRows(lists)
  if (intersection.length === 0) {
    return null
  }

  const selected = pickRandom(intersection)
  return toMealDetailFromKorean(selected)
}

async function tryFetchMealDbDetail(
  ingredients: string[],
  signal: AbortSignal,
): Promise<MealDetailRaw | null> {
  const list = await filterByIngredients(ingredients, signal)

  if (!list || list.length === 0) {
    return null
  }

  const picked = pickRandom(list)
  const detail = await lookupById(picked.idMeal, signal)
  if (!detail) {
    throw new Error('레시피 정보를 불러오지 못했어요.')
  }

  return detail
}

export const useRecipeStore = create<State>((set, get) => {
  let searchController: AbortController | null = null

  async function fetchRecipe(ingredients: string[]): Promise<void> {
    searchController?.abort()
    searchController = new AbortController()
    const { signal } = searchController

    set({ status: 'loadingList', error: null, recipe: null })

    try {
      let detail: MealDetailRaw | null = null

      try {
        detail = await tryFetchKoreanDetail(ingredients, signal)
      } catch (error) {
        if (isAbortError(error)) {
          throw error
        }
        console.warn('식약처 레시피 API 호출 실패, 해외 API로 폴백합니다.', error)
        detail = null
      }

      if (!detail) {
        detail = await tryFetchMealDbDetail(ingredients, signal)
      }

      if (!detail) {
        set({ status: 'empty', recipe: null })
        return
      }

      set({ status: 'success', recipe: toRecipe(detail) })
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
