import type { MealDetailRaw, Recipe } from './types'

export function normalizeIngredients(raw: MealDetailRaw): Recipe['ingredients'] {
  const items: Recipe['ingredients'] = []
  for (let i = 1; i <= 20; i += 1) {
    const nameKey = `strIngredient${i}`
    const measureKey = `strMeasure${i}`
    const name = (raw[nameKey] ?? '').trim()
    const measure = (raw[measureKey] ?? '').trim()
    if (!name) continue
    items.push({ name, measure: measure || undefined })
  }
  return items
}

export function splitInstructions(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function toRecipe(raw: MealDetailRaw): Recipe {
  return {
    id: raw.idMeal,
    title: raw.strMeal,
    thumb: raw.strMealThumb,
    instructions: splitInstructions(raw.strInstructions),
    ingredients: normalizeIngredients(raw),
    sourceUrl: raw.strSource || undefined,
    youtubeUrl: raw.strYoutube || undefined,
    tip: raw.strTip?.trim() ? raw.strTip.trim() : undefined,
  }
}
