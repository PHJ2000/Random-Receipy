import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchKoreanRecipes,
  intersectCookRcpRows,
  toMealDetailFromKorean,
  toMealSummaryFromKorean,
  type CookRcpRow,
} from './koreanApi'

const BASE_URL = 'https://openapi.foodsafetykorea.go.kr/api/'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('fetchKoreanRecipes', () => {
  it('builds the correct request URL with query parameters', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = typeof input === 'string' ? new URL(input) : new URL(input.toString())
      expect(url.toString()).toBe(
        `${BASE_URL}TEST_KEY/COOKRCP01/json/1/50?RCP_NM=%EB%B9%84%EB%B9%94%EB%B0%A5&RCP_PARTS_DTLS=%EA%B3%A0%EC%B6%94%EC%9E%A5`,
      )
      return {
        ok: true,
        json: async () => ({
          COOKRCP01: {
            RESULT: { CODE: 'INFO-000', MSG: '정상 처리되었습니다.' },
            row: [],
          },
        }),
      }
    })

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const rows = await fetchKoreanRecipes({
      serviceKey: 'TEST_KEY',
      name: '비빔밥',
      parts: '고추장',
      endIndex: 50,
    })

    expect(rows).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('intersectCookRcpRows', () => {
  it('returns only rows that are present in every list', () => {
    const a: CookRcpRow = { RCP_SEQ: '1', RCP_NM: 'A' }
    const b: CookRcpRow = { RCP_SEQ: '2', RCP_NM: 'B' }
    const c: CookRcpRow = { RCP_SEQ: '3', RCP_NM: 'C' }

    const result = intersectCookRcpRows([[a, b], [b, c], [b]])

    expect(result).toEqual([b])
  })
})

describe('toMealDetailFromKorean', () => {
  const baseRow: CookRcpRow = {
    RCP_SEQ: '100',
    RCP_NM: '비빔밥',
    RCP_PARTS_DTLS: '주재료: 밥 1공기, 고추장 1큰술\n양념: 참기름 약간',
    RCP_NA_TIP: '나트륨 줄이기 팁',
    ATT_FILE_NO_MAIN: 'https://example.com/thumb.jpg',
    MANUAL01: '1. 밥을 준비한다.',
    MANUAL02: '2. 재료를 섞는다.',
    INFO_ENG: '500',
    INFO_CAR: '60',
    INFO_PRO: '20',
    INFO_FAT: '10',
    INFO_NA: '800',
    INFO_WGT: '350',
  }

  it('maps manual steps, ingredients, and nutrition fields', () => {
    const detail = toMealDetailFromKorean(baseRow)

    expect(detail).toMatchObject({
      idMeal: '100',
      strMeal: '비빔밥',
      strMealThumb: 'https://example.com/thumb.jpg',
      strInstructions: '밥을 준비한다.\n재료를 섞는다.',
      strSource: null,
      strTip: '나트륨 줄이기 팁',
      INFO_ENG: '500',
      INFO_CAR: '60',
      INFO_PRO: '20',
      INFO_FAT: '10',
      INFO_NA: '800',
      INFO_WGT: '350',
    })

    expect(detail.strIngredient1).toBe('밥')
    expect(detail.strMeasure1).toBe('1공기')
    expect(detail.strIngredient2).toBe('고추장')
    expect(detail.strMeasure2).toBe('1큰술')
    expect(detail.strIngredient3).toBe('참기름')
    expect(detail.strMeasure3).toBe('약간')
  })

  it('provides a matching summary thumbnail', () => {
    const summary = toMealSummaryFromKorean(baseRow)
    expect(summary).toEqual({
      idMeal: '100',
      strMeal: '비빔밥',
      strMealThumb: 'https://example.com/thumb.jpg',
    })
  })
})
