import type { MealDetailRaw, Recipe } from './types'

function parseNumber(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const normalized = value.replace(/[^0-9.-]/g, '')
  if (!normalized) return undefined
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

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
  const nutrition = {
    weight: parseNumber(raw.INFO_WGT),
    calories: parseNumber(raw.INFO_ENG),
    carbohydrate: parseNumber(raw.INFO_CAR),
    protein: parseNumber(raw.INFO_PRO),
    fat: parseNumber(raw.INFO_FAT),
    sodium: parseNumber(raw.INFO_NA),
  }

  const hasNutrition = Object.values(nutrition).some((value) => value !== undefined)

  return {
    id: raw.idMeal,
    title: raw.strMeal,
    thumb: raw.strMealThumb,
    instructions: splitInstructions(raw.strInstructions),
    ingredients: normalizeIngredients(raw),
    sourceUrl: raw.strSource || undefined,
    youtubeUrl: raw.strYoutube || undefined,
  }
}
