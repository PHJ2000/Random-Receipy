# Random Receipy — 식약처 COOKRCP01 기반 랜덤 레시피 추천

입력한 재료로 만들 수 있는 한식 레시피를 무작위로 추천하는 React 애플리케이션입니다. 식품안전나라에서 제공하는 **식약처 COOKRCP01 공공데이터**를 사전에 내부 DB로 적재해 두고, 서비스는 이 데이터셋만 조회해 일관된 한국어 레시피 경험을 제공합니다.

> 📚 프로젝트 전반의 세부 구현 지침과 품질 기준은 [`docs/IMPLEMENTATION_GUIDE.md`](docs/IMPLEMENTATION_GUIDE.md)에 정리되어 있습니다.

## 아키텍처 요약

- **데이터 소스**: 식약처 COOKRCP01 API(foodsafetykorea.go.kr).
- **적재 방식**: 공공 API에서 내려받은 JSON을 전처리하여 `src/features/recipes/data/cookRcpDataset.json`에 저장합니다.
- **서비스 흐름**: 프런트엔드가 사전 적재된 DB(JSON)를 조회 → 재료 교집합 필터링 → 무작위 1건을 선택 → UI에 표시합니다.
- **외부 호출**: 런타임에는 외부 API를 호출하지 않습니다. 네트워크 연결이 불안정해도 일관된 응답을 제공합니다.

## 주요 기능

- 쉼표로 구분한 재료 목록을 입력하면 해당 재료를 모두 포함하는 레시피만 교집합으로 필터링합니다.
- 레시피 썸네일, 조리 단계, 재료/계량, 영양 팁, 영양 정보(열량/탄수화물/단백질/지방/나트륨/1인분 중량)를 함께 제공합니다.
- 동일한 재료로 다시 추천받는 "다시 돌리기"와 링크 복사 기능을 제공합니다.
- 로딩/빈 결과/오류 상태에 따른 피드백을 제공하고, 접근성을 고려한 UI 컴포넌트로 구성되어 있습니다.

## 빠른 시작

```bash
npm install
npm run dev
```

- 개발 서버는 `http://localhost:5173`에서 실행됩니다.
- 현재 구조에서는 **환경 변수나 API 키가 필요하지 않습니다.** `.env`와 `.env.local` 파일은 참고용 주석만 포함합니다.
- 데이터셋을 갱신하려면 COOKRCP01 API에서 내려받은 JSON을 동일한 스키마로 변환해 `src/features/recipes/data/cookRcpDataset.json`을 교체하면 됩니다.

## 프로젝트 구조

```
src/
  components/            # UI 컴포넌트 (레시피 카드, 입력 폼 등)
  features/recipes/
    cookRcpRepository.ts # COOKRCP01 내부 DB 조회 및 변환 로직
    cookRcpRepository.test.ts
    data/
      cookRcpDataset.json
    store.ts             # Zustand 스토어 (검색/상태 전환)
    types.ts             # 도메인/원본 데이터 타입 정의
    utils.ts             # Meal → Recipe 변환, 영양 정보 파싱
  pages/Home.tsx         # 메인 페이지 (상태별 UI 렌더링)
```

## 데이터 갱신 가이드

1. 식품안전나라(Open API)에서 COOKRCP01 데이터를 요청합니다. (예: `https://openapi.foodsafetykorea.go.kr/api/{KEY}/COOKRCP01/json`)
2. 응답 JSON의 `row` 배열을 기반으로 필요한 필드를 추출하고, 프로젝트에서 사용하는 스키마(`RCP_SEQ`, `RCP_NM`, `RCP_PARTS_DTLS`, `MANUAL01~20`, `INFO_*`, `ATT_FILE_NO_*`, `RCP_NA_TIP`)만 남깁니다.
3. 정제한 결과를 `src/features/recipes/data/cookRcpDataset.json`에 덮어씁니다.
4. `npm test` 및 `npm run lint`를 실행해 파싱/표시 로직이 정상 동작하는지 확인합니다.

## 테스트 & 품질

- `npm test` — Vitest로 저장소 전용 내부 DB 로직과 변환 유틸을 검증합니다.
- `npm run lint` — ESLint(TypeScript + React Hooks 규칙) 검사.
- `npm run build` — Vite 프로덕션 번들 및 타입 체크.

## 데이터 출처

본 서비스는 식품안전나라에서 제공하는 **COOKRCP01 (한식 레시피)** 데이터를 바탕으로 구축되었습니다. 레시피 저작권과 영양 정보는 식약처에 있으며, 서비스 내에서 출처를 명시합니다.
