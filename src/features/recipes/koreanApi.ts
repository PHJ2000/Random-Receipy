import type { MealDetailRaw, MealSummary } from './types'

const BASE_URL = 'https://apis.data.go.kr/1390804/AgriFood/FdFood/getKoreanRecipe01'

const DEFAULT_HEADERS: HeadersInit = {
  Accept: 'application/json',
}

const MANUAL_KEYS = Array.from({ length: 20 }, (_, index) =>
  `MANUAL${String(index + 1).padStart(2, '0')}`,
)

function normalizeIngredientList(ingredients: string[]): string[] {
  return Array.from(
    new Set(
      ingredients
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

export type KoreanRecipeRaw = {
  RCP_SEQ: string
  RCP_NM: string
  RCP_PARTS_DTLS?: string | null
  ATT_FILE_NO_MAIN?: string | null
  ATT_FILE_NO_MK?: string | null
  RCP_NA_TIP?: string | null
  [key: string]: string | null | undefined
}

export type FetchKoreanRecipesParams = {
  serviceKey: string
  RCP_NM?: string
  RCP_PARTS_DTLS?: string
  pageNo?: number
  numOfRows?: number
  signal?: AbortSignal
}

type KoreanApiResponse = {
  data?: KoreanRecipeRaw[]
  currentCount?: number
  getKoreanRecipe01?: { item?: KoreanRecipeRaw[]; row?: KoreanRecipeRaw[] }
  body?: { items?: { item?: KoreanRecipeRaw | KoreanRecipeRaw[] } }
}

function buildUrl({
  serviceKey,
  RCP_NM,
  RCP_PARTS_DTLS,
  pageNo = 1,
  numOfRows = 100,
}: FetchKoreanRecipesParams): string {
  const params = new URLSearchParams({
    serviceKey,
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
    type: 'json',
  })

  if (RCP_NM) {
    params.set('RCP_NM', RCP_NM)
  }

  if (RCP_PARTS_DTLS) {
    params.set('RCP_PARTS_DTLS', RCP_PARTS_DTLS)
  }

  return `${BASE_URL}?${params.toString()}`
}

function extractRecipes(body: KoreanApiResponse): KoreanRecipeRaw[] {
  if (Array.isArray(body.data)) {
    return body.data
  }

  const getKoreanRecipe01 = body.getKoreanRecipe01
  if (getKoreanRecipe01) {
    if (Array.isArray(getKoreanRecipe01.item)) {
      return getKoreanRecipe01.item
    }
    if (Array.isArray(getKoreanRecipe01.row)) {
      return getKoreanRecipe01.row
    }
  }

  const items = body.body?.items?.item
  if (Array.isArray(items)) {
    return items
  }
  if (items) {
    return [items]
  }

  return []
}

export async function fetchKoreanRecipes({ signal, ...params }: FetchKoreanRecipesParams): Promise<KoreanRecipeRaw[]> {
  const url = buildUrl(params)
  const res = await fetch(url, { headers: DEFAULT_HEADERS, signal })

  if (!res.ok) {
    throw new Error('한식 레시피 정보를 불러올 수 없어요.')
  }

  const data = (await res.json()) as KoreanApiResponse
  return extractRecipes(data)
}

function parseParts(parts: string | null | undefined): string[] {
  if (!parts) return []

  return parts
    .split(/\r?\n+/)
    .map((line) => line.split(':').slice(1).join(':').trim() || line.trim())
    .flatMap((line) => line.split(/[;,]/))
    .map((item) => item.trim())
    .filter(Boolean)
}

function mergeManuals(recipe: KoreanRecipeRaw): string {
  return MANUAL_KEYS.map((key) => recipe[key])
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join('\n')
}

export function toMealSummaryFromKorean(recipe: KoreanRecipeRaw): MealSummary {
  return {
    idMeal: recipe.RCP_SEQ,
    strMeal: recipe.RCP_NM,
    strMealThumb: recipe.ATT_FILE_NO_MAIN || recipe.ATT_FILE_NO_MK || '',
  }
}

function extractSourceAndTip(value: string | null | undefined): {
  source: string | null
  tip: string | null
} {
  if (!value) {
    return { source: null, tip: null }
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return { source: null, tip: null }
  }

  try {
    const url = new URL(trimmed)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return { source: url.toString(), tip: null }
    }
  } catch (error) {
    void error
  }

  return { source: null, tip: trimmed }
}

function recipeIncludesAllIngredients(recipe: KoreanRecipeRaw, ingredients: string[]): boolean {
  if (ingredients.length === 0) return true

  const normalizedParts = parseParts(recipe.RCP_PARTS_DTLS).map((part) => part.toLowerCase())
  return ingredients.every((ingredient) =>
    normalizedParts.some((part) => part.includes(ingredient.toLowerCase())),
  )
}

export function toMealDetailFromKorean(recipe: KoreanRecipeRaw): MealDetailRaw {
  const { source, tip } = extractSourceAndTip(recipe.RCP_NA_TIP)
  const detail: MealDetailRaw = {
    idMeal: recipe.RCP_SEQ,
    strMeal: recipe.RCP_NM,
    strMealThumb: recipe.ATT_FILE_NO_MAIN || recipe.ATT_FILE_NO_MK || '',
    strInstructions: mergeManuals(recipe),
    strSource: source,
    strYoutube: null,
  }

  if (tip) {
    detail.strTip = tip
  }

  const ingredients = parseParts(recipe.RCP_PARTS_DTLS)
  ingredients.forEach((value, index) => {
    const key = index + 1
    detail[`strIngredient${key}`] = value
    detail[`strMeasure${key}`] = ''
  })

  return detail
}

export async function fetchKoreanRecipesByIngredients({
  serviceKey,
  ingredients,
  signal,
}: {
  serviceKey: string
  ingredients: string[]
  signal?: AbortSignal
}): Promise<KoreanRecipeRaw[]> {
  const uniqueIngredients = normalizeIngredientList(ingredients)
  if (uniqueIngredients.length === 0) {
    return []
  }

  const lists = await Promise.all(
    uniqueIngredients.map((ingredient) =>
      fetchKoreanRecipes({
        serviceKey,
        RCP_PARTS_DTLS: ingredient,
        signal,
      }),
    ),
  )

  if (lists.some((list) => list.length === 0)) {
    return []
  }

  const counts = new Map<string, number>()
  const recipeMap = new Map<string, KoreanRecipeRaw>()

  lists.forEach((list) => {
    const seen = new Set<string>()
    list.forEach((recipe) => {
      const id = recipe.RCP_SEQ
      if (!recipeMap.has(id)) {
        recipeMap.set(id, recipe)
      }
      if (!seen.has(id)) {
        seen.add(id)
        counts.set(id, (counts.get(id) ?? 0) + 1)
      }
    })
  })

  return Array.from(recipeMap.values()).filter(
    (recipe) =>
      counts.get(recipe.RCP_SEQ) === uniqueIngredients.length &&
      recipeIncludesAllIngredients(recipe, uniqueIngredients),
  )
}
