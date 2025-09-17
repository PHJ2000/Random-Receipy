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
- 기본값으로는 TheMealDB만 사용하며, 한국어 공공 데이터 연동을 위해서는 추가 설정이 필요합니다.
- 브라우저 콘솔/네트워크 패널에서 요청 흐름을 확인할 수 있습니다.

### 환경 변수 설정

한국 농식품부 "한식 우수 레시피" API를 사용하려면 인증키를 발급받아 Vite 환경 변수로 주입해야 합니다.

1. [data.mafra.go.kr](https://data.mafra.go.kr/opendata/data/indexOpenDataDetail.do?data_id=20150827000000000464)에서 `농림축산식품부_한식우수레시피` 서비스를 신청하여 `serviceKey`를 발급받습니다.
2. 저장소 루트에 있는 `.env` 또는 `.env.local` 파일의 `VITE_KOREAN_RECIPES_SERVICE_KEY` 값에 발급받은 키를 입력합니다.
   - `.env`는 기본값을 제공하며, `.env.local`은 개발자가 개인 키를 덮어써서 사용할 수 있는 용도의 파일입니다.
   - 키가 비어 있으면 애플리케이션은 자동으로 TheMealDB로 폴백합니다.
3. 개발 서버를 재시작하여 `import.meta.env.VITE_KOREAN_RECIPES_SERVICE_KEY` 값이 주입되었는지 확인합니다.

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
=======
# Random Receipy — 랜덤 레시피 챌린저 MVP

이 저장소는 TheMealDB 공개 API를 기반으로 **입력한 재료로 만들 수 있는 랜덤 레시피를 추천**하는 프론트엔드 애플리케이션을 구축하기 위한 프로젝트입니다. 현재 단계에서는 설계 및 구현 가이드 문서를 바탕으로 개발 환경을 준비하고, MVP 목표를 빠르게 완수하는 것을 최우선으로 합니다.

## 프로젝트 개요

- 사용자가 쉼표로 구분한 재료 목록을 입력하면 브라우저에서 TheMealDB API를 호출합니다.
- API에서 반환된 후보 레시피 중 하나를 무작위로 선택해 상세 정보를 보여줍니다.
- 결과 화면은 재료/계량, 조리 순서, 원본 링크/영상, 다시 돌리기 및 링크 복사 기능을 포함합니다.
- 오류나 빈 결과가 발생했을 때 사용자 친화적인 안내 메시지를 제공합니다.
- 모바일 우선 레이아웃과 기본 접근성(키보드/스크린리더)을 보장합니다.

## 주요 기술 스택 (권장)

- **프론트엔드 프레임워크**: Vite + React + TypeScript
- **스타일링**: Tailwind CSS
- **상태 관리**: Zustand 또는 React Query
- **배포**: Netlify, Vercel 등 정적 호스팅 서비스
- **백엔드**: 별도 서버 없이 브라우저에서 TheMealDB 호출

## 개발을 시작하는 방법

1. `npm create vite@latest`를 실행하고 React + TypeScript 템플릿으로 프로젝트를 생성합니다.
2. Tailwind CSS를 설치하고 설정 파일을 구성합니다.
3. [`docs/IMPLEMENTATION_GUIDE.md`](docs/IMPLEMENTATION_GUIDE.md)에 정리된 구조와 상태 흐름을 참고하여 컴포넌트/피처 폴더를 구성합니다.
4. `npm run dev`로 개발 서버를 실행하고 브라우저에서 기능을 확인합니다.
5. Vercel 또는 Netlify를 사용해 정적 배포합니다.

## 문서

- [Codex 구현 지침 (TheMealDB 기반 MVP)](docs/IMPLEMENTATION_GUIDE.md): 폴더 구조, API 명세, 상태 관리 로직, UI 가이드라인, 테스트 체크리스트 등을 상세히 담고 있습니다. 모든 개발 작업은 해당 문서를 기준으로 진행하고, 변경 사항이 생기면 문서를 최신 상태로 유지하세요.

## 다음 단계

- 재료 입력 폼, 레시피 카드, 상태 컴포넌트를 설계하고 구현합니다.
- Zustand 스토어(또는 React Query)를 활용해 검색/다시 돌리기 흐름을 완성합니다.
- 반응형 UI 및 접근성 점검을 수행합니다.
- 테스트 및 배포 체크리스트를 모두 통과합니다.

Powered by [TheMealDB](https://www.themealdb.com/).
