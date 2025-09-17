# Random Receipy — 랜덤 레시피 챌린저

입력한 재료로 만들 수 있는 랜덤 레시피를 추천하는 웹 애플리케이션입니다. 브라우저에서 [TheMealDB](https://www.themealdb.com/) 공개 API를 호출하여 후보 레시피를 가져오고, 그중 하나를 무작위로 선택해 상세 정보를 보여줍니다.

> 🔎 모든 개발/운영 의사결정은 [`docs/IMPLEMENTATION_GUIDE.md`](docs/IMPLEMENTATION_GUIDE.md)에 정리된 Codex 구현 지침을 기준으로 진행합니다.

## 주요 기능

- 쉼표로 구분한 재료 목록을 입력하고 Enter/버튼으로 검색할 수 있습니다.
- 선택된 레시피의 썸네일, 재료/계량, 조리 단계, 원문 링크, 영상 링크를 함께 제공합니다.
- 동일한 재료로 다시 돌려보기 기능과 링크 복사(공유) 기능을 지원합니다.
- 로딩/빈 결과/오류 상태에 맞는 안내 메시지를 노출하고, 네트워크 오류 시 재시도 버튼을 제공합니다.
- Tailwind CSS 기반의 반응형 디자인과 키보드 접근성을 고려한 폼 구성 요소를 포함합니다.

## 빠른 시작

```bash
npm install
npm run dev
```

- 개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다.
- API 키 없이 바로 TheMealDB v1 엔드포인트를 호출합니다.
- 브라우저 콘솔/네트워크 패널에서 요청 흐름을 확인할 수 있습니다.

## 기술 스택

- **빌드 도구**: Vite + React + TypeScript
- **상태 관리**: Zustand (전역 스토어에서 검색/다시 돌리기 흐름 관리)
- **스타일링**: Tailwind CSS (모바일 우선 반응형 레이아웃)
- **데이터 소스**: TheMealDB Public API (`filter.php`, `lookup.php`)

## 프로젝트 구조

```
src/
  app.tsx               # 루트 컴포넌트
  main.tsx              # React 엔트리 + 글로벌 스타일
  styles.css            # Tailwind base/component/utilities 정의
  components/           # 입력 폼, 상태 UI, 레시피 카드
  pages/Home.tsx        # 메인 화면 구성
  features/recipes/     # API 래퍼, 타입, 변환 유틸, Zustand 스토어
```

## 상태 흐름 요약

1. 입력 문자열을 파싱하여 재료 배열을 생성합니다.
2. `filter.php?i=`로 후보 레시피 목록을 불러오고, 무작위 1건을 선택합니다.
3. 선택된 ID로 `lookup.php?i=` 상세 정보를 조회해 `Recipe` 도메인 모델로 정규화합니다.
4. 상태(`idle → loadingList → loadingDetail → success/empty/error`)를 기반으로 UI를 업데이트합니다.
5. `다시 돌리기`는 마지막 재료 목록을 재사용하여 동일한 흐름을 반복합니다.

## 문서

- [`docs/IMPLEMENTATION_GUIDE.md`](docs/IMPLEMENTATION_GUIDE.md) — 폴더 구조, API 명세, 상태 관리 로직, UI 가이드라인, 테스트 체크리스트 등 프로젝트 전반에 대한 상세 설명을 제공합니다.

## 테스트 & 품질

- `npm run lint` — ESLint(TypeScript + React Hooks 규칙) 검사
- `npm run build` — 타입 체크 및 프로덕션 번들 생성

버그/개선 사항은 이슈에 등록하거나 PR로 제안해 주세요. 🧑‍🍳

Powered by [TheMealDB](https://www.themealdb.com/).
