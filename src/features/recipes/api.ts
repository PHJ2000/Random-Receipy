import type { FilterResponse, MealDetailRaw, MealSummary, LookupResponse } from './types'

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1'

const DEFAULT_HEADERS: HeadersInit = {
  Accept: 'application/json',
}

/**
 * Encode ingredient values individually while preserving comma separators required by the API.
 */
function buildIngredientQuery(ingredients: string[]): string {
  return ingredients.map((item) => encodeURIComponent(item)).join(',')
}

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { headers: DEFAULT_HEADERS, signal })
  if (!res.ok) {
    throw new Error('서버 응답이 올바르지 않습니다.')
  }
  return (await res.json()) as T
}

export async function filterByIngredients(
  ingredients: string[],
  signal?: AbortSignal,
): Promise<MealSummary[] | null> {
  if (!ingredients.length) return []
  const query = buildIngredientQuery(ingredients)
  const data = await request<FilterResponse>(`${BASE_URL}/filter.php?i=${query}`, signal)
  return data.meals ?? null
}

export async function lookupById(id: string, signal?: AbortSignal): Promise<MealDetailRaw | null> {
  if (!id) return null
  const data = await request<LookupResponse>(`${BASE_URL}/lookup.php?i=${id}`, signal)
  return data.meals?.[0] ?? null
}
