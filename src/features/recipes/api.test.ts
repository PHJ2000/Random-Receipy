import { afterEach, describe, expect, it, vi } from 'vitest'
import { filterByIngredients } from './api'
import type { FilterResponse, MealSummary } from './types'

const FILTER_ENDPOINT = 'https://www.themealdb.com/api/json/v1/1/filter.php?i='

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
