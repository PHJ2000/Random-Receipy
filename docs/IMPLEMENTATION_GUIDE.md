# 🍳 랜덤 레시피 챌린저 — COOKRCP01 기반 구현 지침

이 문서는 Random Receipy 프로젝트가 **식약처 COOKRCP01 공공데이터**를 내부 DB로 적재한 뒤, 프런트엔드에서만 해당 데이터를 조회해 레시피를 추천하도록 구현하는 방법을 정리합니다. TheMealDB를 사용하던 초기 MVP에서 전환된 아키텍처를 기준으로 작성되었습니다.

---

## 0. 목표 및 요구사항 요약

- 사용자가 쉼표로 구분한 재료 목록을 입력하면, 그 재료를 모두 포함하는 한식 레시피를 찾아 무작위 1개를 추천합니다.
- 데이터는 식약처 COOKRCP01 API에서 내려받아 **사전 적재된 내부 DB(JSON)** 로 관리합니다. 런타임에는 외부 API를 호출하지 않습니다.
- 레시피 카드에는 썸네일, 재료/계량, 조리 단계, 영양 팁, 영양 정보(열량·탄수화물·단백질·지방·나트륨·1인분 중량)를 함께 표시합니다.
- 로딩/빈 결과/오류 상태를 명확히 구분하고, 접근성을 고려한 UI 컴포넌트를 제공합니다.

---

## 1. 시스템 구성 개요

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **상태 관리**: Zustand (`src/features/recipes/store.ts`)
- **데이터 소스**: `src/features/recipes/data/cookRcpDataset.json` (COOKRCP01 전처리 결과)
- **API 레이어**: `cookRcpRepository.ts`에서 내부 DB를 조회하고 Meal/Recipe 타입으로 매핑합니다.
- **테스트**: Vitest + Testing Library (UI) — 레시피 데이터 로직은 `cookRcpRepository.test.ts`에서 단위 테스트로 검증합니다.

폴더 구조 개요:

```
src/
  components/         # UI 컴포넌트 (입력 폼, 상태 UI, 레시피 카드 등)
  features/recipes/
    data/
      cookRcpDataset.json  # 사전 적재된 COOKRCP01 데이터
    cookRcpRepository.ts   # 데이터 조회 및 정규화
    cookRcpRepository.test.ts
    store.ts               # Zustand 스토어
    types.ts               # API/도메인 타입 정의
    utils.ts               # Meal → Recipe 변환 유틸
  pages/Home.tsx           # 상태에 따른 페이지 렌더링
```

---

## 2. COOKRCP01 데이터 전처리 & 적재

1. 식품안전나라 Open API에서 COOKRCP01 데이터를 요청합니다. (예: `https://openapi.foodsafetykorea.go.kr/api/{KEY}/COOKRCP01/json/1/1000`)
2. 응답 구조는 `COOKRCP01 -> row` 배열에 레시피가 담깁니다. 다음 필드를 선별합니다.
   - 기본 정보: `RCP_SEQ`, `RCP_NM`, `RCP_PAT2`, `RCP_WAY2`
   - 이미지: `ATT_FILE_NO_MAIN`, `ATT_FILE_NO_MK`
   - 재료: `RCP_PARTS_DTLS`
   - 조리 단계: `MANUAL01` ~ `MANUAL20`, `MANUAL_IMG01` ~ `MANUAL_IMG20`
   - 영양 정보: `INFO_WGT`, `INFO_ENG`, `INFO_CAR`, `INFO_PRO`, `INFO_FAT`, `INFO_NA`
   - 영양 팁: `RCP_NA_TIP`
3. 불필요한 필드를 제거하고, JSON 배열로 저장합니다. (예시는 `src/features/recipes/data/cookRcpDataset.json` 참고)
4. 데이터 변경 후에는 `npm test`로 변환 로직이 문제없이 동작하는지 확인합니다.

전처리 스크립트를 별도로 관리한다면, 동일한 스키마를 유지하도록 주의합니다. 문자열 트리밍, 줄바꿈 정리, 단위 표준화 등을 진행하면 UI가 안정적으로 표현됩니다.

---

## 3. 타입 정의

`src/features/recipes/types.ts`는 두 가지 레이어를 분리합니다.

```ts
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

export type Ingredient = {
  name: string
  measure?: string
}

export type NutritionInfo = {
  weight?: number
  calories?: number
  carbohydrate?: number
  protein?: number
  fat?: number
  sodium?: number
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
  nutrition?: NutritionInfo
}
```

- `MealDetailRaw`는 식약처 원본 스키마를 앱이 이해할 수 있는 구조로 정규화한 형태입니다.
- `Recipe`는 UI가 바로 사용할 수 있는 도메인 모델로, instructions를 줄 단위로 쪼개고, 영양 정보는 숫자로 변환합니다.

---

## 4. 내부 DB 조회 로직 (`cookRcpRepository.ts`)

핵심 역할:

1. `cookRcpDataset.json`을 로드해 메모리에 유지합니다.
2. 재료 문자열을 줄/쉼표/구분점 기준으로 분리해 토큰화합니다.
3. 사용자가 입력한 재료 목록과 비교해 모든 재료가 포함된 레시피만 필터링합니다.
4. 선택된 레시피를 `MealDetailRaw`로 변환해 반환합니다.

주요 함수:

```ts
export async function searchCookRcpByIngredients(
  ingredients: string[],
  signal?: AbortSignal,
): Promise<MealDetailRaw[]>
```

- `ingredients`는 소문자/공백 트리밍이 선행되어 들어옵니다.
- 입력이 비어 있으면 전체 레시피를 반환합니다.
- `AbortSignal`이 중간에 중단되면 `AbortError`를 던집니다.

```ts
export function getCookRcpDetailById(id: string): MealDetailRaw | null
```

- 이미 로드된 Map에서 RCP_SEQ 기준으로 조회합니다.

```ts
export function listCookRcpSummaries(): MealSummary[]
```

- 썸네일/이름만 필요한 경우를 위해 요약 목록을 제공합니다.

토큰화 및 변환 시 고려 사항:

- `RCP_PARTS_DTLS`는 줄바꿈과 구분 기호가 혼재합니다. `주재료:` 라벨을 제거하고 `,`, `·`, `;` 등으로 분리합니다.
- 계량 정보는 마지막 공백 뒤의 문자열을 계량으로 간주하되, 숫자/“약간” 등의 단어가 포함된 경우에만 분리합니다.
- 조리 단계 `MANUAL##`는 숫자 접두사를 제거하고 `\n`으로 연결합니다.
- 영양 팁(`RCP_NA_TIP`)은 텍스트 그대로 `strTip`에 저장합니다. 실제 URL일 경우에만 `strSource`를 채웁니다(현재 데이터셋은 텍스트 기준).

---

## 5. 변환 유틸 (`utils.ts`)

- `normalizeIngredients` — `strIngredient{N}`/`strMeasure{N}` 쌍을 순회하여 UI에서 사용하기 쉬운 배열로 반환합니다.
- `splitInstructions` — 줄바꿈으로 조리 단계를 나누고 공백을 제거합니다.
- `toRecipe` — `MealDetailRaw`를 받아 도메인 모델 `Recipe`로 변환합니다. 여기서 영양 정보(문자열)를 숫자로 파싱해 `nutrition` 객체를 생성합니다.

숫자 파싱 시에는 단위 문자를 제거하고, 값이 없거나 NaN이면 `undefined`로 처리합니다.

---

## 6. 상태 관리 (`store.ts`)

Zustand 스토어는 다음 상태를 관리합니다.

- `status`: `'idle' | 'loadingList' | 'success' | 'empty' | 'error'`
- `lastIngredients`: 마지막으로 검색한 재료 배열
- `recipe`: 현재 표시 중인 레시피 (`Recipe | null`)
- `error`: 사용자에게 보여 줄 오류 메시지

검색 흐름:

1. 입력 문자열을 쉼표 기준으로 분리, 트리밍, 소문자 변환 후 `ingredients` 배열을 생성합니다.
2. `searchCookRcpByIngredients`를 호출해 조건에 맞는 레시피 목록을 조회합니다.
3. 결과가 없으면 `status = 'empty'`, 있으면 무작위로 1건을 선택해 `toRecipe`로 변환 후 `status = 'success'`로 설정합니다.
4. AbortController를 사용해 연속 입력 시 이전 검색을 취소합니다.
5. 오류 발생 시(Abort 제외) `status = 'error'`와 메시지를 갱신합니다.

"다시 돌리기"는 `lastIngredients`를 재사용해 동일 로직을 실행합니다.

---

## 7. UI 상태 (`pages/Home.tsx`)

- 로딩 중(`loadingList`): 로딩 스피너 및 진행 메시지 표시.
- 빈 결과(`empty`): 입력을 유도하는 EmptyState.
- 오류(`error`): 네트워크/파싱 오류 메시지와 재시도 버튼(가능 시) 노출.
- 성공(`success`): `RecipeCard`로 레시피를 표시, "다시 돌리기" 버튼 활성화.
- 초기(`idle`): 안내 박스로 입력을 유도.

`RecipeCard`는 다음 정보를 보여 줍니다.

- 썸네일과 레시피명
- 재료/계량 리스트
- 조리 단계 (번호/배경 강조)
- 영양 팁(있을 경우)
- 영양 정보 (열량, 탄수화물, 단백질, 지방, 나트륨, 1인분 중량)
- 원문/영상 링크는 현재 데이터셋에 URL이 없으므로 표시되지 않습니다.

---

## 8. 테스트 전략

- `cookRcpRepository.test.ts`
  - 입력 재료에 따라 올바른 레시피가 필터링되는지 검증.
  - `getCookRcpDetailById`가 재료/계량, 조리 단계를 기대대로 정규화했는지 확인.
  - `toRecipe`가 영양 정보를 숫자로 파싱하고 `Recipe`로 변환하는지 확인.
- UI 테스트는 필요에 따라 추가(예: 상태별 렌더링)하지만 본 문서에서는 데이터/스토어 로직에 집중합니다.

테스트 실행 명령:

```bash
npm test          # Vitest
npm run lint      # ESLint
npm run build     # Vite 빌드 + 타입 체크
```

---

## 9. 배포 및 운영 시 고려 사항

- 데이터셋이 커질수록 번들 크기가 증가하므로, 실제 운영에서는 정기 배치/정적 파일 캐싱 전략을 고려합니다.
- 데이터 갱신 주기에 맞춰 자동 전처리 파이프라인(CI/CD)을 구성하면 수동 실수를 줄일 수 있습니다.
- 레시피 출처 표기는 필수입니다. UI/README/푸터 등에 식품안전나라 출처를 명시하세요.

---

## 10. 향후 확장 아이디어

- 재료 유사도/대체재 추천을 위한 토큰 매핑 테이블 구축
- 영양 기준(예: 칼로리, 나트륨) 필터 추가
- 조리 도구/시간에 따른 추천 강화
- 서비스 다국어화(레시피 요약 번역, 단위 변환)

---

이 문서를 기준으로 프로젝트 구조와 코드 스타일을 유지하면, COOKRCP01 단일 데이터 소스 기반의 안정적인 레시피 추천 경험을 제공할 수 있습니다.🧑‍🍳
