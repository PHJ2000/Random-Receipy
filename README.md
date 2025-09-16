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
