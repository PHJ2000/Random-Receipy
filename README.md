# Random Receipy — 식약처 API + TheMealDB 폴백 랜덤 레시피 추천

입력한 재료로 만들 수 있는 레시피를 무작위로 추천하는 React 애플리케이션입니다. 기본적으로 **식품안전나라 COOKRCP01 공공 API**를 호출해 한식 레시피를 가져오며, 결과가 없거나 오류가 발생하면 **TheMealDB**로 폴백합니다.

> 📚 프로젝트 전반의 구현 지침과 품질 기준은 [`docs/IMPLEMENTATION_GUIDE.md`](docs/IMPLEMENTATION_GUIDE.md)에 정리되어 있습니다.

## 아키텍처 요약

- **데이터 소스 우선순위**
  1. 식품안전나라 COOKRCP01 (`https://openapi.foodsafetykorea.go.kr/api`) — 재료/조리과정/영양정보를 모두 제공.
  2. TheMealDB (`https://www.themealdb.com/api/json/v1/1`) — 한국 API 결과가 없을 때 백업용으로 호출.
- **상태 관리**: Zustand (`src/features/recipes/store.ts`).
- **API 레이어**
  - `koreanApi.ts`: 공공 API 요청 및 COOKRCP01 → Meal 구조 매핑.
  - `api.ts`: TheMealDB 필터/상세 조회.
- **도메인 변환**: `utils.ts`가 Meal → Recipe 변환, 영양 정보 파싱 담당.
- **UI**: `RecipeCard`, `IngredientInput` 등 Tailwind 기반 컴포넌트.

## 주요 기능

- 쉼표로 구분한 재료 목록을 입력하면 각 재료별 공공 API 검색 결과를 교집합하여 모든 재료를 포함하는 레시피만 추천합니다.
- COOKRCP01 레시피에는 영양 팁과 열량/탄수화물/단백질/지방/나트륨/1인분 중량 정보를 함께 노출합니다.
- 결과가 없거나 공공 API 호출이 실패하면 자동으로 TheMealDB를 사용해 가능한 레시피를 찾아줍니다.
- 로딩/빈 결과/오류 상태를 구분해 접근성 있는 피드백을 제공합니다.

## 환경 변수 설정

1. [data.go.kr](https://www.data.go.kr/)에서 **식품안전나라 COOKRCP01** API를 신청해 인증키를 발급받습니다.
2. 프로젝트 루트에 있는 `.env`(또는 `.env.local`)에 아래 항목을 설정합니다.

   ```ini
   VITE_KOREAN_RECIPES_SERVICE_KEY=발급받은_인증키
   ```

   - Vite는 `VITE_` 접두사가 붙은 변수만 클라이언트로 노출합니다.
   - 인증키가 비어 있으면 앱은 TheMealDB만 사용합니다.

## 빠른 시작

```bash
npm install
npm run dev
```

- 개발 서버는 `http://localhost:5173`에서 실행됩니다.
- `.env.local`을 사용하면 개인 인증키를 안전하게 관리할 수 있습니다. (Git에 커밋되지 않습니다.)
- 프로덕션 번들: `npm run build`

## 프로젝트 구조

```
src/
  components/            # UI 컴포넌트 (레시피 카드, 입력 폼 등)
  features/recipes/
    api.ts               # TheMealDB API 클라이언트
    api.test.ts
    koreanApi.ts         # COOKRCP01 API 클라이언트 & 변환기
    koreanApi.test.ts
    store.ts             # Zustand 스토어 (검색/폴백 로직)
    types.ts             # 도메인/원본 데이터 타입 정의
    utils.ts             # Meal → Recipe 변환, 영양 정보 파싱
  pages/Home.tsx         # 메인 페이지 (상태별 UI 렌더링)
```

## 테스트 & 품질

- `npm test` — Vitest로 API 어댑터와 변환 로직을 검증합니다.
- `npm run lint` — ESLint(TypeScript + React Hooks 규칙) 검사.
- `npm run build` — Vite 프로덕션 번들 및 타입 체크.

## 데이터 출처

본 서비스는 식품안전나라에서 제공하는 **COOKRCP01 (한식 레시피)** 공공데이터와 TheMealDB를 활용합니다. 레시피 및 영양 정보의 저작권은 각 제공처에 있으며, 서비스 내에서 출처를 명시합니다.
