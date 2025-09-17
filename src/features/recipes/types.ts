export type MealSummary = {
  idMeal: string
  strMeal: string
  strMealThumb: string
}

export type FilterResponse = {
  meals: MealSummary[] | null
}

export type MealDetailRaw = {
  idMeal: string
  strMeal: string
  strMealThumb: string
  strInstructions: string
  strSource: string | null
  strYoutube: string | null
  strTip?: string | null
  [key: string]: string | null
}

export type LookupResponse = {
  meals: MealDetailRaw[]
}

export type Ingredient = {
  name: string
  measure?: string
}

export type Recipe = {
  id: string
  title: string
  thumb: string
  instructions: string[]
  ingredients: Ingredient[]
  sourceUrl?: string
  youtubeUrl?: string
  tip?: string
}
