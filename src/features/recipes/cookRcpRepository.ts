import dataset from './data/cookRcpDataset.json'
import type { MealDetailRaw, MealSummary } from './types'

export type CookRcpRecord = typeof dataset[number]

const MANUAL_KEYS = Array.from({ length: 20 }, (_, index) => `MANUAL${String(index + 1).padStart(2, '0')}`)

const RECIPES: CookRcpRecord[] = dataset
const RECIPE_INDEX = new Map<string, CookRcpRecord>(RECIPES.map((recipe) => [recipe.RCP_SEQ, recipe]))

function normalizeWhitespace(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/\s+/g, ' ').trim()
}

function extractManualSteps(recipe: CookRcpRecord): string[] {
  return MANUAL_KEYS.map((key) => recipe[key as keyof CookRcpRecord])
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .map((step) => step.replace(/^\d+\.\s*/, ''))
    .filter(Boolean)
}

function splitIngredientTokens(recipe: CookRcpRecord): string[] {
  const parts = recipe.RCP_PARTS_DTLS ?? ''
  return parts
    .split(/\r?\n+/)
    .map((line) => line.split(':').slice(1).join(':').trim() || line.trim())
    .flatMap((line) => line.split(/[;,·]/))
    .map((item) => item.trim())
    .filter(Boolean)
}

function isMeasureCandidate(value: string): boolean {
  if (!value) return false
  if (/\d/.test(value)) return true
  return /약간|적당|기호|소량/.test(value)
}

function tokenizeIngredient(value: string): { name: string; measure?: string } {
  const trimmed = normalizeWhitespace(value)
  if (!trimmed) return { name: '' }

  const lastSpace = trimmed.lastIndexOf(' ')
  if (lastSpace > 0) {
    const name = trimmed.slice(0, lastSpace).trim()
    const measure = trimmed.slice(lastSpace + 1).trim()
    if (isMeasureCandidate(measure)) {
      return { name, measure }
    }
  }

  return { name: trimmed }
}

function buildDetailFromRecord(recipe: CookRcpRecord): MealDetailRaw {
  const detail: MealDetailRaw = {
    idMeal: recipe.RCP_SEQ,
    strMeal: recipe.RCP_NM,
    strMealThumb: recipe.ATT_FILE_NO_MAIN || recipe.ATT_FILE_NO_MK || '',
    strInstructions: extractManualSteps(recipe).join('\n'),
    strSource: null,
    strYoutube: null,
  }

  const tokens = splitIngredientTokens(recipe)
  tokens.forEach((token, index) => {
    const key = index + 1
    const { name, measure } = tokenizeIngredient(token)
    detail[`strIngredient${key}`] = name
    if (measure) {
      detail[`strMeasure${key}`] = measure
    }
  })

  const tip = normalizeWhitespace(recipe.RCP_NA_TIP)
  if (tip) {
    detail.strTip = tip
  }

  const nutritionKeys: Array<keyof CookRcpRecord> = ['INFO_ENG', 'INFO_CAR', 'INFO_PRO', 'INFO_FAT', 'INFO_NA', 'INFO_WGT']
  nutritionKeys.forEach((key) => {
    const value = recipe[key]
    if (typeof value === 'string' && value.trim()) {
      detail[key] = value
    }
  })

  return detail
}

function recipeIncludesAllIngredients(recipe: CookRcpRecord, ingredients: string[]): boolean {
  if (ingredients.length === 0) return true
  const lowerTokens = splitIngredientTokens(recipe).map((token) => token.toLowerCase())
  return ingredients.every((ingredient) =>
    lowerTokens.some((token) => token.includes(ingredient.toLowerCase())),
  )
}

export function listCookRcpSummaries(): MealSummary[] {
  return RECIPES.map((recipe) => ({
    idMeal: recipe.RCP_SEQ,
    strMeal: recipe.RCP_NM,
    strMealThumb: recipe.ATT_FILE_NO_MAIN || recipe.ATT_FILE_NO_MK || '',
  }))
}

export async function searchCookRcpByIngredients(
  ingredients: string[],
  signal?: AbortSignal,
): Promise<MealDetailRaw[]> {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError')
  }

  const unique = Array.from(new Set(ingredients.map((item) => item.trim()).filter(Boolean)))
  const records = unique.length === 0 ? RECIPES : RECIPES.filter((recipe) => recipeIncludesAllIngredients(recipe, unique))

  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError')
  }

  return records.map((recipe) => buildDetailFromRecord(recipe))
}

export function getCookRcpDetailById(id: string): MealDetailRaw | null {
  const record = RECIPE_INDEX.get(id)
  if (!record) return null
  return buildDetailFromRecord(record)
}
