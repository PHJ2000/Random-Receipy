# 🍳 랜덤 레시피 챌린저 — Codex 구현 지침 (TheMealDB 기반 MVP)

이 문서는 Codex가 최소 기능 제품(MVP)을 빠르게 구현할 수 있도록 돕는 상세 지침입니다. 목표는 **집에 있는 재료를 입력하면 해당 재료로 만들 수 있는 랜덤 레시피 1개를 추천**하는 프론트엔드 단독 웹앱을 완성하는 것입니다.

---

## 0. 목표 및 요구사항 요약

- 사용자는 쉼표로 구분한 **재료 목록**을 입력한다. (예: `egg, tomato, onion`)
- 앱은 TheMealDB Public API를 호출하여 **재료 기반 후보 레시피**를 가져온 후, 그중 **무작위 1개**를 선택한다.
- 선택된 레시피의 **상세 정보**(이름, 썸네일, 재료/용량 리스트, 조리 순서, 원문 링크/영상)를 표시한다.
- **랜덤 돌리기 애니메이션/버튼**과 **결과 공유 버튼(링크 복사)** 를 제공한다.
- **오류/빈 결과**에 대한 사용자 친화적 메시지를 제공한다.
- 반응형(UI: 모바일 우선)과 접근성(키보드/스크린리더 기본 호환)을 고려한다.

---

## 1. 시스템 구성 개요

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **State**: Zustand (간단 Global state) 또는 React Query(선호 시)
- **배포**: Vercel/Netlify (정적 호스팅)
- **백엔드**: 없음 (브라우저에서 TheMealDB 직접 호출)

폴더 구조 개요:

```
src/
  components/
    IngredientInput.tsx
    RecipeCard.tsx
    LoadingSpinner.tsx
    ErrorState.tsx
  features/
    recipes/
      api.ts       // TheMealDB 호출 래퍼
      types.ts     // API 응답 -> 앱 도메인 타입
      utils.ts     // 재료 파싱, 상세 변환 헬퍼
      store.ts     // Zustand 스토어(선택)
  pages/
    Home.tsx
  app.tsx
  main.tsx
  styles.css
```

---

## 2. API 레퍼런스 (TheMealDB)

**Base**: `https://www.themealdb.com/api/json/v1/1`

필수 사용 엔드포인트

- **재료로 필터**: `/filter.php?i={commaSeparatedIngredients}`
  - 예: `/filter.php?i=tomato,onion`
  - 반환: `{ meals: [{ idMeal, strMeal, strMealThumb }] | null }`
- **상세 조회**: `/lookup.php?i={mealId}`
  - 반환: `{ meals: [MealDetail] }`
- **랜덤(대체/테스트용)**: `/random.php`

선택(확장)

- **이름 검색**: `/search.php?s={query}`
- **재료 목록**: `/list.php?i=list` (오토컴플리트용)

> CORS는 직접 호출 가능하며 API Key는 불필요(무료 공개 v1). 과도한 요청은 피하고 디바운스나 단일 클릭 처리를 권장한다.

---

## 3. UX 플로우

1. 사용자가 재료 입력 → `재료로 찾기` 클릭
2. `filter.php?i=`로 후보 목록 요청
3. 후보가 없으면 **빈 상태 메시지** 표시
4. 후보가 있으면 **클라이언트에서 무작위 1개 선택**
5. `lookup.php?i=`로 상세 정보 요청 → 결과 표시
6. 버튼: `다시 돌리기`(동일 재료로 재시도) / `재료 바꾸기`

### 상태 정의

- `idle`: 초기 상태
- `loadingList`: 후보 검색 로딩
- `loadingDetail`: 상세 조회 로딩
- `success`: 레시피 표시
- `empty`: 후보 없음
- `error`: 네트워크/파싱 오류

---

## 3. 타입 정의

`src/features/recipes/types.ts`는 두 가지 레이어를 분리합니다.

```ts
export type MealDetailRaw = {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strInstructions: string; // 여러 줄 텍스트
  strSource: string | null;
  strYoutube: string | null;
  // 재료/용량 컬럼은 strIngredient1..20, strMeasure1..20 형태
  [k: string]: string | null;
};

export type LookupResponse = {
  meals: MealDetailRaw[];
};

export type Ingredient = { name: string; measure?: string };

export type Recipe = {
  id: string;
  title: string;
  thumb: string;
  instructions: string[]; // 줄 단위로 분해/정제
  ingredients: Ingredient[];
  sourceUrl?: string;
  youtubeUrl?: string;
};
```

---

## 5. API 래퍼 및 데이터 변환

```ts
const BASE = 'https://www.themealdb.com/api/json/v1/1';

export async function filterByIngredients(ings: string[]): Promise<MealSummary[] | null> {
  const q = encodeURIComponent(ings.join(','));
  const res = await fetch(`${BASE}/filter.php?i=${q}`);
  if (!res.ok) throw new Error('Failed to fetch filter results');
  const data = (await res.json()) as FilterResponse;
  return data.meals ?? null;
}

export async function lookupById(id: string): Promise<MealDetailRaw | null> {
  const res = await fetch(`${BASE}/lookup.php?i=${id}`);
  if (!res.ok) throw new Error('Failed to fetch meal detail');
  const data = (await res.json()) as LookupResponse;
  return data.meals?.[0] ?? null;
}
```

```ts
import { MealDetailRaw, Recipe } from './types';

export function normalizeIngredients(raw: MealDetailRaw): Recipe['ingredients'] {
  const list: Recipe['ingredients'] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (raw as any)[`strIngredient${i}`]?.trim();
    const measure = (raw as any)[`strMeasure${i}`]?.trim();
    if (name) list.push({ name, measure: measure || undefined });
  }
  return list;
}

export function splitInstructions(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function toRecipe(raw: MealDetailRaw): Recipe {
  return {
    id: raw.idMeal,
    title: raw.strMeal,
    thumb: raw.strMealThumb,
    instructions: splitInstructions(raw.strInstructions),
    ingredients: normalizeIngredients(raw),
    sourceUrl: raw.strSource || undefined,
    youtubeUrl: raw.strYoutube || undefined,
  };
}
```

---

## 6. 상태 관리(Zustand 예시)

```ts
import { create } from 'zustand';
import { filterByIngredients, lookupById } from './api';
import { toRecipe } from './utils';
import type { Recipe } from './types';

type Status = 'idle' | 'loadingList' | 'loadingDetail' | 'success' | 'empty' | 'error';

type State = {
  status: Status;
  lastIngredients: string[];
  recipe: Recipe | null;
  error: string | null;
  search: (input: string) => Promise<void>;
  reroll: () => Promise<void>;
};

export const useRecipeStore = create<State>((set, get) => ({
  status: 'idle',
  lastIngredients: [],
  recipe: null,
  error: null,

  async search(input) {
    const ings = input
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    if (ings.length === 0) {
      set({ status: 'error', error: '재료를 한 개 이상 입력하세요.' });
      return;
    }

    try {
      set({ status: 'loadingList', error: null, recipe: null, lastIngredients: ings });
      const list = await filterByIngredients(ings);
      if (!list || list.length === 0) {
        set({ status: 'empty' });
        return;
      }
      const pick = list[Math.floor(Math.random() * list.length)];
      set({ status: 'loadingDetail' });
      const detail = await lookupById(pick.idMeal);
      if (!detail) throw new Error('상세 정보를 찾을 수 없습니다.');
      set({ status: 'success', recipe: toRecipe(detail) });
    } catch (e: any) {
      set({ status: 'error', error: e.message ?? '알 수 없는 오류' });
    }
  },

  async reroll() {
    const ings = get().lastIngredients;
    if (!ings.length) return;
    try {
      set({ status: 'loadingList', error: null });
      const list = await filterByIngredients(ings);
      if (!list || list.length === 0) {
        set({ status: 'empty' });
        return;
      }
      const pick = list[Math.floor(Math.random() * list.length)];
      set({ status: 'loadingDetail' });
      const detail = await lookupById(pick.idMeal);
      if (!detail) throw new Error('상세 정보를 찾을 수 없습니다.');
      set({ status: 'success', recipe: toRecipe(detail) });
    } catch (e: any) {
      set({ status: 'error', error: e.message ?? '알 수 없는 오류' });
    }
  },
}));
```

---

## 7. 컴포넌트 스펙

### IngredientInput

- **Props**: `onSubmit(input: string)`
- **기능**: 텍스트 입력 + 엔터/버튼으로 submit, placeholder 예: `예) egg, tomato, onion`
- **검증**: 공백/중복/한글 입력 허용 (영문으로 변환 권장 X, API는 영어 재료명 기반)

### RecipeCard

- **Props**: `recipe: Recipe`
- **UI**: 썸네일, 제목, 재료(불릿 리스트), 조리 단계(번호 리스트), 소스/유튜브 링크, `다시 돌리기` 버튼, `링크 복사` 버튼

### ErrorState / EmptyState / LoadingSpinner

- 사용자 친화 문구 + 재시도 버튼

---

## 8. 페이지 및 레이아웃

### Home.tsx (핵심 화면)

- 상단: 타이틀(`오늘 뭐 먹지? 랜덤 레시피 챌린저`), 서브텍스트
- 재료 입력 폼(IngredientInput)
- 상태별 렌더링: Loading / Empty / Error / RecipeCard
- 푸터: 간단 크레딧(`Powered by TheMealDB`), 깃허브 링크(선택)

---

## 9. UI 및 스타일 가이드 (Tailwind)

- 컨테이너: `max-w-xl mx-auto px-4 py-8`
- 버튼: 기본 `rounded-xl px-4 py-2 font-medium shadow-sm active:scale-[0.98]`
- 카드: `rounded-2xl border p-4 shadow-sm bg-white/60 backdrop-blur`
- 애니메이션: `animate-pulse`(로딩), `transition-all duration-200`

---

## 10. 오류 및 예외 처리

- 네트워크 오류: `오프라인이거나 서버 응답이 없어요. 잠시 후 다시 시도해주세요.`
- 빈 결과: `해당 재료로 찾은 레시피가 없어요. 재료를 바꿔보세요!`
- 상세 변환 실패: `레시피 정보를 불러오지 못했어요.`
- 버튼 다중 클릭 방지: 로딩 중 버튼 disabled 처리

---

## 11. 유틸 및 공유 기능

- **링크 복사**: `navigator.clipboard.writeText(recipe.sourceUrl || recipe.youtubeUrl || window.location.href)`
- **URL 쿼리로 재료 유지(선택)**: `?i=egg,tomato` → 첫 로드 시 자동 검색
- **랜덤 연출(선택)**: 300~600ms 딜레이로 `돌리고 있습니다…` 애니메이션

---

## 12. 테스트 및 수용 기준 (Acceptance Criteria)

- [ ] `egg` 단일 재료로 검색 시 최소 1개 레시피 표시
- [ ] `egg, tomato`로 검색 시 결과가 없으면 빈 상태 표시
- [ ] 로딩/빈/오류 상태에서 사용자 메시지 확인 가능
- [ ] `다시 돌리기` 클릭 시 **동일 재료**로 새 레시피 노출
- [ ] 모바일(375px), 태블릿(768px), 데스크탑(1280px)에서 기본 레이아웃 유지
- [ ] 키보드로 입력 후 Enter로 검색 가능

---

## 13. 확장 아이디어 (추후 고려)

- **오토컴플리트**: `/list.php?i=list` 활용하여 재료 제안
- **필터**: 조리시간, 난이도(태그로 의사 처리)
- **즐겨찾기/최근 기록(LocalStorage)**
- **디스코드 공유**: 웹훅으로 `title/thumbnail/ingredients` embed 전송
- **국문화**: 한글 레시피 소스 매핑(외부 DB/크롤링 필요)

---

## 14. 실행 스니펫 (페이지 통합 예시)

```tsx
import { useRecipeStore } from '@/features/recipes/store';
import { RecipeCard } from '@/components/RecipeCard';
import { IngredientInput } from '@/components/IngredientInput';

export default function Home() {
  const { status, recipe, error, search, reroll } = useRecipeStore();

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">오늘 뭐 먹지? 🍳 랜덤 레시피 챌린저</h1>
      <p className="text-sm text-gray-600 mb-6">냉장고 재료를 입력하고 레시피를 뽑아보세요!</p>

      <IngredientInput onSubmit={search} />

      {(status === 'loadingList' || status === 'loadingDetail') && (
        <div className="mt-6 animate-pulse">레시피를 찾는 중…</div>
      )}

      {status === 'empty' && (
        <div className="mt-6 text-rose-600">해당 재료로 찾은 레시피가 없어요. 재료를 바꿔보세요!</div>
      )}

      {status === 'error' && (
        <div className="mt-6 text-rose-600">오류: {error}</div>
      )}

      {status === 'success' && recipe && (
        <div className="mt-6">
          <RecipeCard recipe={recipe} onReroll={reroll} />
        </div>
      )}
    </main>
  );
}
```

---

## 15. 빌드 및 배포 체크리스트

- [ ] `npm create vite@latest` → React + TS 템플릿 선택
- [ ] Tailwind 설치 및 세팅 완료
- [ ] 위 구조대로 파일 생성
- [ ] 로컬에서 `npm run dev`로 동작 확인
- [ ] Vercel/Netlify에 배포

---

> 위 지침을 항상 참조하여 구현을 진행하고, 변경 사항이 생기면 본 문서를 최신 상태로 유지하세요.
