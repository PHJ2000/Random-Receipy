import type { FilterResponse, MealDetailRaw, MealSummary, LookupResponse } from './types'

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1'

const DEFAULT_HEADERS: HeadersInit = {
  Accept: 'application/json',
}

function buildIngredientQuery(ingredients: string[]): string {
  return ingredients.map((item) => encodeURIComponent(item)).join(',')
}

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { headers: DEFAULT_HEADERS, signal })
  if (!res.ok) {
    throw new Error('해외 레시피 API 응답이 올바르지 않습니다.')
  }
  return (await res.json()) as T
}

async function filterSingleIngredient(
  ingredient: string,
  signal?: AbortSignal,
): Promise<FilterResponse> {
  const query = buildIngredientQuery([ingredient])
  return request<FilterResponse>(`${BASE_URL}/filter.php?i=${query}`, signal)
}

export async function filterByIngredients(
  ingredients: string[],
  signal?: AbortSignal,
): Promise<MealSummary[] | null> {
  if (!ingredients.length) return []

  const [first, ...rest] = ingredients
  const firstResponse = await filterSingleIngredient(first, signal)

  if (!firstResponse.meals || firstResponse.meals.length === 0) {
    return null
  }

  if (rest.length === 0) {
    return firstResponse.meals
  }

  const intersected = new Map(firstResponse.meals.map((meal) => [meal.idMeal, meal] as const))

  for (const ingredient of rest) {
    const response = await filterSingleIngredient(ingredient, signal)
    const meals = response.meals

    if (!meals || meals.length === 0) {
      return null
    }

    const validIds = new Set(meals.map((meal) => meal.idMeal))

    for (const id of Array.from(intersected.keys())) {
      if (!validIds.has(id)) {
        intersected.delete(id)
      }
    }

    if (intersected.size === 0) {
      return null
    }
  }

  return Array.from(intersected.values())
}

export async function lookupById(id: string, signal?: AbortSignal): Promise<MealDetailRaw | null> {
  if (!id) return null
  const data = await request<LookupResponse>(`${BASE_URL}/lookup.php?i=${id}`, signal)
  return data.meals?.[0] ?? null
}
