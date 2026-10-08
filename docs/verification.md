# 검증 기록

검증일: 2026-10-08 (KST). 증거 상태를 분리합니다.

## LOCAL — PASS

- Node 순수 모델 시험 4개 통과. 100개 seed의 판·카드 재현, 50개 20턴 게임의 행동 재생 일치 및 예산 비음수 확인. 잘못된 행동과 전력·인접 점수 검증.
- IAB 실제 조작: 주택·발전소 건설 후 인구·예산·전력·점수 반영, 물·사용된 땅 비활성 확인.
- 재로딩 후 진행 중 도시 계속을 눌러 같은 2턴 판 복구.
- 건물 선택·빈 땅 클릭으로 20턴 완주(207점), 완료 결과와 기기 내 기록 표시 확인.
- 새 판에서 건설 쉬기 후 2턴, 예산 12 확인.
- WebMCP: 정상 새 도시 반영; 허용하지 않는 seed 거부.
- 데스크톱 기본 뷰포트와 390×844, 320×720 모바일 뷰포트에서 확인. 문서 가로 넘침 없음(모바일 스크롤바 제외 콘텐츠 폭 375/305px). LIGHT ROUTE 단계 선택 줄은 의도적으로 내부 가로 스크롤.
- 확인한 브라우저 흐름의 warn/error 로그 0개. 배포 직전 npm test와 npm run check 재실행 PASS.
- UTF-8 유효성·BOM 없음·CRLF 정규화 확인. 환경 파일 없음, 일반적인 토큰/DB URL 패턴 검사에서 일치 없음(포괄적인 보안 감사는 아님).

## REMOTE_CI — PASS

- [GitHub Actions 시험·검사·배포 성공](https://github.com/HyungminYoon1/pocket-city/actions/runs/37790257179)
- 검증한 앱 소스 커밋: 9d30e63879d4dd1e4f792c03efa43f0dfc64e9ea. verify의 npm test/npm run check 및 deploy 모두 success 확인.
- 이 검증 기록의 후속 갱신은 문서만 변경하며 dist 앱 소스는 동일합니다.

## LIVE — PASS

- [공개 사이트](https://hyungminyoon1.github.io/pocket-city/) HTTPS 접속 확인.
- dist의 6개 파일(HTML/CSS/app/core/model 또는 questions/favicon) HTTP 200 및 로컬 SHA-256 바이트 일치.
- 코드 1wmm86u-7kxmzw에서 건설·휴식 포함 20턴을 실제 UI로 진행해 155점 완료와 기록 표시 확인.
- 확인한 공개 흐름의 warn/error 로그 0개. 기본 화면·전체 화면 JPEG 증거는 별도 로컬 QA 폴더에 저장했고 공개 저장소에 개인 PC 경로나 QA 기록을 올리지 않음.

## 범위와 한계

모든 가능한 생성 판이나 모든 문항 의미를 전수 증명한 것은 아닙니다. 자동 시험은 표본 생성과 규칙 검증이고 실제 브라우저 시험은 위에 명시한 흐름입니다. 전체 사용자 랭킹·서버·Neon DB·API 부하 시험은 NOT_IMPLEMENTED/NOT_RUN입니다. 기록 삭제 버튼은 확인 창과 구현을 검토했으나 이번 QA에서 실제 삭제하지 않았습니다.
