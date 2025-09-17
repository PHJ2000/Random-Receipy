import { afterEach, describe, expect, it, vi } from 'vitest'
import { filterByIngredients } from './api'
import { fetchKoreanRecipes, toMealDetailFromKorean, toMealSummaryFromKorean } from './koreanApi'
import { toRecipe } from './utils'
import type { FilterResponse, MealSummary } from './types'
import type { KoreanRecipeRaw } from './koreanApi'

const FILTER_ENDPOINT = 'https://www.themealdb.com/api/json/v1/1/filter.php?i='
const KOREAN_ENDPOINT = 'https://apis.data.go.kr/1390804/AgriFood/FdFood/getKoreanRecipe01'

type ResponseMap = Record<string, FilterResponse>
type MockResponse = {
  ok: boolean
  status?: number
  json: () => Promise<unknown>
}

function createFetchMock(responses: ResponseMap) {
  return vi.fn(async (input: string | URL, init?: { signal?: AbortSignal }) => {
    void init
    const url = typeof input === 'string' ? input : input.toString()
    const key = url.replace(FILTER_ENDPOINT, '')
    const body = responses[key]

    if (!body) {
      return {
        ok: false,
        status: 404,
        json: async () => ({}),
      } as MockResponse
    }

    return {
      ok: true,
      json: async () => body,
    } as MockResponse
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('filterByIngredients', () => {
  it('intersects results from multiple ingredient filters', async () => {
    const meals: MealSummary[] = [
      { idMeal: '1', strMeal: 'Chicken Parm', strMealThumb: 'thumb-1' },
      { idMeal: '2', strMeal: 'Chicken Curry', strMealThumb: 'thumb-2' },
    ]

    const responses: ResponseMap = {
      chicken: { meals },
      onion: { meals: [meals[1]] },
    }

    const fetchMock = createFetchMock(responses)
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await filterByIngredients(['chicken', 'onion'])

    expect(result).toEqual([meals[1]])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${FILTER_ENDPOINT}chicken`,
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${FILTER_ENDPOINT}onion`,
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    )
  })

  it('encodes each ingredient individually before requesting', async () => {
    const responses: ResponseMap = {
      'chicken%20breast': {
        meals: [{ idMeal: '10', strMeal: 'Roasted Chicken', strMealThumb: 'thumb-10' }],
      },
      onion: {
        meals: [
          { idMeal: '10', strMeal: 'Roasted Chicken', strMealThumb: 'thumb-10' },
          { idMeal: '11', strMeal: 'Onion Soup', strMealThumb: 'thumb-11' },
        ],
      },
    }

    const fetchMock = createFetchMock(responses)
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await filterByIngredients(['chicken breast', 'onion'])

    expect(result).toEqual([
      { idMeal: '10', strMeal: 'Roasted Chicken', strMealThumb: 'thumb-10' },
    ])
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${FILTER_ENDPOINT}chicken%20breast`,
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    )
  })

  it('returns null when any ingredient has no matching meals', async () => {
    const responses: ResponseMap = {
      chicken: {
        meals: [{ idMeal: '20', strMeal: 'Chicken Soup', strMealThumb: 'thumb-20' }],
      },
      onion: { meals: null },
    }

    const fetchMock = createFetchMock(responses)
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await filterByIngredients(['chicken', 'onion'])

    expect(result).toBeNull()
  })
})

describe('fetchKoreanRecipes', () => {
  const sampleRecipe: KoreanRecipeRaw = {
    RCP_SEQ: '100',
    RCP_NM: '비빔밥',
    ATT_FILE_NO_MAIN: 'https://example.com/thumb.jpg',
    RCP_PARTS_DTLS: '주재료: 쌀 1컵, 고사리 50g\n양념: 고추장 2큰술',
    MANUAL01: '1. 재료를 손질한다.',
    MANUAL02: '2. 비빔밥을 완성한다.',
  }

  it('builds the API request with the provided search parameters', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [sampleRecipe] }),
    }))

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const signal = new AbortController().signal
    const result = await fetchKoreanRecipes({
      serviceKey: 'test-key',
      RCP_NM: '비빔밥',
      RCP_PARTS_DTLS: '고사리,고추장',
      pageNo: 2,
      numOfRows: 5,
      signal,
    })

    expect(result).toEqual([sampleRecipe])
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [requestedUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init?.headers).toEqual({ Accept: 'application/json' })
    expect(init?.signal).toBe(signal)

    const url = new URL(requestedUrl)
    expect(url.origin + url.pathname).toBe(KOREAN_ENDPOINT)
    expect(url.searchParams.get('serviceKey')).toBe('test-key')
    expect(url.searchParams.get('RCP_NM')).toBe('비빔밥')
    expect(url.searchParams.get('RCP_PARTS_DTLS')).toBe('고사리,고추장')
    expect(url.searchParams.get('pageNo')).toBe('2')
    expect(url.searchParams.get('numOfRows')).toBe('5')
    expect(url.searchParams.get('type')).toBe('json')
  })

  it('extracts recipes from nested body payloads', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ body: { items: { item: sampleRecipe } } }),
    }))

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await fetchKoreanRecipes({ serviceKey: 'test-key' })
    expect(result).toEqual([sampleRecipe])
  })

  it('normalizes nested API responses and maps to Meal types', () => {
    const detail = toMealDetailFromKorean(sampleRecipe)
    const summary = toMealSummaryFromKorean(sampleRecipe)

    expect(summary).toEqual({
      idMeal: '100',
      strMeal: '비빔밥',
      strMealThumb: 'https://example.com/thumb.jpg',
    })

    expect(detail).toMatchObject({
      idMeal: '100',
      strMeal: '비빔밥',
      strInstructions: '1. 재료를 손질한다.\n2. 비빔밥을 완성한다.',
    })
    expect(detail.strIngredient1).toBe('쌀 1컵')
    expect(detail.strIngredient2).toBe('고사리 50g')
    expect(detail.strIngredient3).toBe('고추장 2큰술')

    const recipe = toRecipe(detail)
    expect(recipe.ingredients.map((item) => item.name)).toEqual([
      '쌀 1컵',
      '고사리 50g',
      '고추장 2큰술',
    ])
    expect(recipe.instructions).toEqual(['1. 재료를 손질한다.', '2. 비빔밥을 완성한다.'])
  })
})
