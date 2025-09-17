import type { MealDetailRaw, MealSummary } from './types'

const BASE_URL = 'https://openapi.foodsafetykorea.go.kr/api/'
const DEFAULT_HEADERS: HeadersInit = {
  Accept: 'application/json',
}
const MANUAL_KEYS = Array.from({ length: 20 }, (_, index) => `MANUAL${String(index + 1).padStart(2, '0')}`)

export type CookRcpRow = {
  RCP_SEQ: string
  RCP_NM: string
  RCP_PARTS_DTLS?: string | null
  RCP_NA_TIP?: string | null
  ATT_FILE_NO_MAIN?: string | null
  ATT_FILE_NO_MK?: string | null
  [key: string]: string | null | undefined
}

type CookRcpApiResponse = {
  COOKRCP01?: {
    RESULT?: {
      CODE?: string
      MSG?: string
    }
    row?: CookRcpRow[]
  }
}

type FetchParams = {
  serviceKey: string
  startIndex?: number
  endIndex?: number
  name?: string
  parts?: string
  signal?: AbortSignal
}

function normalizeWhitespace(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/\s+/g, ' ').trim()
}

function extractManualSteps(row: CookRcpRow): string[] {
  return MANUAL_KEYS.map((key) => row[key])
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .map((step) => step.replace(/^\d+\.\s*/, ''))
    .filter(Boolean)
}

function splitIngredientTokens(row: CookRcpRow): string[] {
  const parts = row.RCP_PARTS_DTLS ?? ''
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

export async function fetchKoreanRecipes({
  serviceKey,
  startIndex = 1,
  endIndex = 100,
  name,
  parts,
  signal,
}: FetchParams): Promise<CookRcpRow[]> {
  const trimmedKey = serviceKey.trim()
  if (!trimmedKey) {
    throw new Error('식약처 레시피 API 인증키가 필요합니다.')
  }

  const url = new URL(`${trimmedKey}/COOKRCP01/json/${startIndex}/${endIndex}`, BASE_URL)

  if (name) {
    url.searchParams.set('RCP_NM', name)
  }

  if (parts) {
    url.searchParams.set('RCP_PARTS_DTLS', parts)
  }

  const res = await fetch(url.toString(), { headers: DEFAULT_HEADERS, signal })
  if (!res.ok) {
    throw new Error('식약처 레시피 API 호출에 실패했습니다.')
  }

  const payload = (await res.json()) as CookRcpApiResponse
  const root = payload.COOKRCP01
  if (!root) {
    throw new Error('식약처 레시피 API 응답 형식이 올바르지 않습니다.')
  }

  const result = root.RESULT
  if (result && result.CODE && result.CODE !== 'INFO-000') {
    throw new Error(result.MSG || '식약처 레시피 API 오류가 발생했습니다.')
  }

  return root.row ?? []
}

export function intersectCookRcpRows(lists: CookRcpRow[][]): CookRcpRow[] {
  if (lists.length === 0) return []
  const [first, ...rest] = lists
  const intersection = new Map(first.map((row) => [row.RCP_SEQ, row] as const))

  for (const rows of rest) {
    const ids = new Set(rows.map((row) => row.RCP_SEQ))
    for (const id of Array.from(intersection.keys())) {
      if (!ids.has(id)) {
        intersection.delete(id)
      }
    }
  }

  return Array.from(intersection.values())
}

export function toMealSummaryFromKorean(row: CookRcpRow): MealSummary {
  return {
    idMeal: row.RCP_SEQ,
    strMeal: row.RCP_NM,
    strMealThumb: row.ATT_FILE_NO_MAIN || row.ATT_FILE_NO_MK || '',
  }
}

export function toMealDetailFromKorean(row: CookRcpRow): MealDetailRaw {
  const detail: MealDetailRaw = {
    idMeal: row.RCP_SEQ,
    strMeal: row.RCP_NM,
    strMealThumb: row.ATT_FILE_NO_MAIN || row.ATT_FILE_NO_MK || '',
    strInstructions: extractManualSteps(row).join('\n'),
    strSource: null,
    strYoutube: null,
  }

  const tokens = splitIngredientTokens(row)
  tokens.forEach((token, index) => {
    const key = index + 1
    const { name, measure } = tokenizeIngredient(token)
    detail[`strIngredient${key}`] = name
    if (measure) {
      detail[`strMeasure${key}`] = measure
    }
  })

  const tip = normalizeWhitespace(row.RCP_NA_TIP)
  if (tip) {
    detail.strTip = tip
  }

  const nutritionKeys: Array<keyof CookRcpRow> = ['INFO_ENG', 'INFO_CAR', 'INFO_PRO', 'INFO_FAT', 'INFO_NA', 'INFO_WGT']
  nutritionKeys.forEach((key) => {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) {
      detail[key] = value
    }
  })

  return detail
}
