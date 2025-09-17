import { describe, expect, it } from 'vitest'
import { getCookRcpDetailById, listCookRcpSummaries, searchCookRcpByIngredients } from './cookRcpRepository'
import { toRecipe } from './utils'

describe('searchCookRcpByIngredients', () => {
  it('returns all recipes when no ingredients are provided', async () => {
    const results = await searchCookRcpByIngredients([])
    expect(results).toHaveLength(listCookRcpSummaries().length)
  })

  it('filters recipes to those that contain every ingredient token', async () => {
    const results = await searchCookRcpByIngredients(['김치', '대파'])
    expect(results).toHaveLength(1)
    expect(results[0].strMeal).toBe('김치볶음밥')
  })

  it('supports partial matches within the ingredient description', async () => {
    const results = await searchCookRcpByIngredients(['육수'])
    expect(results).toHaveLength(1)
    expect(results[0].strMeal).toBe('된장찌개')
  })
})

describe('getCookRcpDetailById', () => {
  it('returns a normalized detail object with instructions and ingredients', () => {
    const detail = getCookRcpDetailById('100')
    expect(detail).not.toBeNull()
    if (!detail) return

    expect(detail.strMeal).toBe('비빔밥')
    expect(detail.strInstructions.split('\n')).toHaveLength(5)
    expect(detail.strTip).toBe('나트륨 섭취를 줄이고 싶다면 고추장 양을 줄이고, 소고기는 살코기를 사용하세요.')

    expect(detail.strIngredient1).toBe('밥')
    expect(detail.strMeasure1).toBe('2공기')
  })
})

describe('toRecipe', () => {
  it('maps the cook recipe detail into the domain recipe structure with nutrition', () => {
    const detail = getCookRcpDetailById('101')
    expect(detail).not.toBeNull()
    if (!detail) return

    const recipe = toRecipe(detail)

    expect(recipe.title).toBe('된장찌개')
    expect(recipe.instructions).toHaveLength(5)
    expect(recipe.ingredients[0]).toEqual({ name: '두부', measure: '1모' })
    expect(recipe.nutrition).toMatchObject({
      calories: 230,
      carbohydrate: 15,
      protein: 16,
      fat: 12,
      sodium: 950,
    })
  })
})
