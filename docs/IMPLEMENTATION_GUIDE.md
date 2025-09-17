# 🍳 랜덤 레시피 챌린저 — 공공 API 연동 구현 지침

이 문서는 Random Receipy 프로젝트가 **식품안전나라 COOKRCP01 공공 API**를 우선적으로 활용하고, 필요할 경우 **TheMealDB**로 폴백하는 방식으로 동작하도록 구현하는 절차를 정리합니다.

---

## 0. 목표 및 요구사항 요약

- 사용자가 쉼표로 구분한 재료 목록을 입력하면, 그 재료를 모두 포함하는 레시피를 무작위로 추천합니다.
- 1순위 데이터 소스는 식품안전나라 COOKRCP01이며, 결과가 없거나 API 오류가 발생하면 TheMealDB 데이터를 사용합니다.
- 레시피 카드에는 썸네일, 재료/계량, 조리 단계, 영양 팁, 영양 정보(열량·탄수화물·단백질·지방·나트륨·1인분 중량)를 함께 표시합니다.
- 로딩/빈 결과/오류 상태를 명확히 구분하고, 접근성을 고려한 UI 컴포넌트를 제공합니다.

---

## 1. 시스템 구성 개요

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **상태 관리**: Zustand (`src/features/recipes/store.ts`)
- **API 클라이언트**
  - `src/features/recipes/koreanApi.ts`: COOKRCP01 호출 및 원본 스키마 정규화
  - `src/features/recipes/api.ts`: TheMealDB 필터/상세 조회
- **도메인 변환**: `src/features/recipes/utils.ts`에서 Meal → Recipe로 변환해 UI가 바로 사용할 수 있도록 구성합니다.
- **테스트**: Vitest로 API 어댑터와 교집합 로직을 단위 테스트합니다 (`api.test.ts`, `koreanApi.test.ts`).

폴더 구조 개요:

```
src/
  components/         # UI 컴포넌트 (입력 폼, 상태 UI, 레시피 카드 등)
  features/recipes/
    api.ts            # TheMealDB API 연동
    api.test.ts
    koreanApi.ts      # COOKRCP01 API 연동 및 매핑
    koreanApi.test.ts
    store.ts          # Zustand 스토어 (한국 API 우선, TheMealDB 폴백)
    types.ts          # API/도메인 타입 정의
    utils.ts          # Meal → Recipe 변환 유틸
  pages/Home.tsx      # 상태에 따른 페이지 렌더링
```

---

## 2. 환경 변수 및 인증키 준비

1. [data.go.kr](https://www.data.go.kr/)에서 **식품안전나라 COOKRCP01** API를 신청합니다.
2. 발급받은 인증키를 `.env` 또는 `.env.local`에 설정합니다.

   ```ini
   VITE_KOREAN_RECIPES_SERVICE_KEY=발급받은_인증키
   ```

   - `VITE_` 접두사는 Vite가 클라이언트에서 접근할 수 있도록 요구하는 규칙입니다.
   - 인증키가 비어 있으면 앱은 공공 API를 건너뛰고 TheMealDB만 사용합니다.

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

export type Recipe = {
  id: string
  title: string
  thumb: string
  instructions: string[]
  ingredients: { name: string; measure?: string }[]
  sourceUrl?: string
  youtubeUrl?: string
  tip?: string
  nutrition?: {
    weight?: number
    calories?: number
    carbohydrate?: number
    protein?: number
    fat?: number
    sodium?: number
  }
}
```

- `MealDetailRaw`는 공공 API/해외 API 응답을 통합해 다루기 위한 중간 형태입니다.
- `Recipe`는 UI에서 바로 사용할 수 있는 구조로, 조리 단계를 줄 단위 배열로 변환하고 영양 정보를 숫자로 파싱합니다.

---

## 4. COOKRCP01 연동 (`koreanApi.ts`)

핵심 역할:

1. 서비스 키와 필터 조건(`RCP_NM`, `RCP_PARTS_DTLS`)을 받아 `https://openapi.foodsafetykorea.go.kr/api/{KEY}/COOKRCP01/json/{start}/{end}` 엔드포인트를 호출합니다.
2. 응답의 `COOKRCP01.RESULT.CODE`가 `INFO-000`인지 확인해 오류를 판별합니다.
3. `row` 배열을 `CookRcpRow` 타입으로 받고, 다음과 같이 매핑합니다.
   - `MANUAL01~20` → 줄바꿈으로 연결해 `strInstructions` 구성.
   - `RCP_PARTS_DTLS` → 줄/쉼표/구분점 기준으로 토큰화해 재료/계량 분리.
   - `RCP_NA_TIP` → `strTip`(UI용 영양 팁)으로 보존.
   - `INFO_*` → `MealDetailRaw`의 동일한 키로 유지해 이후 숫자 파싱에 활용.
4. `intersectCookRcpRows` 유틸로 여러 재료 검색 결과의 교집합을 계산합니다.

테스트 포인트 (`koreanApi.test.ts`):

- 요청 URL이 올바르게 구성되는지 (쿼리 파라미터 인코딩 포함).
- 교집합 유틸이 모든 재료에 공통으로 등장하는 레시피만 남기는지.
- 매퍼가 영양 팁을 링크로 취급하지 않고, 재료/영양 정보를 정확히 변환하는지.

---

## 5. TheMealDB 연동 (`api.ts`)

- `filter.php?i=` 엔드포인트를 재료별로 호출해 교집합을 계산합니다.
- 각 재료는 개별적으로 URL 인코딩합니다.
- 최종적으로 선택된 레시피 ID로 `lookup.php?i=`를 호출해 상세 정보를 가져옵니다.
- 단위 테스트(`api.test.ts`)로 교집합 계산과 인코딩 처리를 검증합니다.

---

## 6. Zustand 스토어 (`store.ts`)

1. 검색 입력을 파싱해 소문자로 정리하고, 직전 검색어를 `lastIngredients`에 저장합니다.
2. 검색 시 먼저 COOKRCP01을 시도합니다.
   - 인증키가 없거나 검색 결과가 비어 있으면 `null` 반환.
   - 네트워크 오류가 발생하면 잡아서 경고만 출력하고, 이후 폴백을 진행합니다.
   - 정상적으로 레시피를 찾으면 즉시 `success` 상태로 업데이트합니다.
3. COOKRCP01 결과가 없으면 TheMealDB 흐름을 실행합니다.
   - 교집합 결과가 없으면 `empty` 상태로 마무리합니다.
   - 상세 조회 실패 시 오류를 던져 에러 상태로 전환합니다.
4. `search`/`reroll` 모두 같은 `fetchRecipe` 흐름을 재사용합니다. 새로운 검색이 시작되면 기존 요청을 `AbortController`로 중단합니다.

상태 값은 `idle`, `loadingList`, `success`, `empty`, `error`를 사용하며, UI는 `loadingList`일 때 스피너를 렌더링합니다.

---

## 7. 레시피 변환 (`utils.ts`)

- `normalizeIngredients`가 `MealDetailRaw`의 `strIngredientX`/`strMeasureX`를 순회해 빈 문자열을 제외하고 `Recipe.ingredients` 배열로 변환합니다.
- `splitInstructions`는 조리 단계를 줄바꿈 기준으로 쪼개어 공백을 제거합니다.
- `toRecipe`는 영양 정보를 숫자로 파싱하고(`parseNumber`), 값이 하나라도 존재할 때만 `nutrition` 객체를 노출합니다.

---

## 8. 테스트 & 품질 체크

1. `npm test` — Vitest 단위 테스트 실행.
2. `npm run lint` — ESLint 검사.
3. 필요 시 `npm run build`로 타입 체크 및 프로덕션 번들을 확인합니다.

테스트에서 `fetch`를 목킹하므로, 실행 전 전역 목을 해제(`vi.restoreAllMocks`, `vi.unstubAllGlobals`)하는 것을 잊지 마세요.

---

## 9. 배포 시 고려 사항

- 인증키는 `.env.production` 등 배포 환경에서 주입합니다.
- 공공 API 일일 쿼터가 있으므로, 캐싱 계층(예: 백엔드 프록시)이나 사전 배치를 추가로 도입할 수 있습니다.
- UI에는 **출처: 식품안전나라** 문구를 노출해 약관을 준수합니다.

이 가이드를 따르면 한국 공공 데이터와 해외 백업 데이터를 모두 활용하는 안정적인 랜덤 레시피 서비스를 구현할 수 있습니다.
