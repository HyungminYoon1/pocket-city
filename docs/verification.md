# 검증 기록

## 2026-10-09 — 독립 캠페인 업적·갤러리 요약·모바일 정리

### LOCAL — PASS (이번 작업자)

- Node.js v22.23.2 / npm 11.12.0. `npm test`: 34개 통과(모델 13, 캠페인/개인 storage 7, 공유 요약 4, 실제 앱 콜백 DOM 대역·대비 10). 기존 17개 시험을 유지하고, 세 승리의 기존 점수/예산/신뢰를 명시적으로 고정했습니다. 기존 승리 행동은 그대로 `test/fixtures/victories.json`으로 옮겼습니다.
- 실제 합법 `lesson` 승리 후 12개 미달 기록을 추가해 최근 10개에서 승리 메타데이터가 없어져도 업적과 다음 추천이 남는지 확인했습니다. 세 임무의 독립 승리와 중복 승리, 최근 10개·최대 업적 3개·19행동 진행 판의 저장/재로딩과 보존량 상한도 확인했습니다.
- `garden`의 실제 11턴 행동 저장·로딩·재생 전체 상태 일치. v1, 행동 없는 v2 성공 메타데이터, 실패를 성공으로 표기한 판, 미완료·초과/불법 행동·다른 임무 증거로는 업적을 얻지 못합니다. 저장한 점수/보드가 아닌 재생 결과를 사용합니다.
- 공유 요약은 15개 허용 ID와 정수·ISO 날짜·정확한 필드·8,192자 상한을 검사합니다. 다른 14개 앱 항목 보존, own 삭제, 잘못된 날짜·unknown/prototype ID·개인 필드·깨진/과도한 JSON 거부, storage getter/read/write 실패를 확인했습니다. 개인 저장 성공 없이 요약을 게시하지 않습니다.
- 실제 app.js 콜백을 Node vm과 DOM/storage 대역에서 실행하여 초기 보기·미리보기·재로딩·실패에는 요약을 쓰지 않는 것, 성공 후 완료 수 반영, 12회 실패 후 독립 업적 유지, 실제 이어하기·초기화와 다른 앱 데이터 보존, 저장/삭제 실패 안내를 확인했습니다. 브라우저·실제 localStorage·레이아웃 시험은 아닙니다.
- 실제 목표 부족량·해결 시설의 피드백과 기존 모델 입력 불변을 확인했습니다. 세 합법 승리의 점수/예산/신뢰: 동네 330/62/100, 정원 326/51/100, 통근 310/34/98. 규칙 v2·목표·경제·카드·승리 해법은 유지합니다.
- `npm run check`: JS 문법과 정적 자산/메타데이터 PASS. 최종 `git diff --check`, 변경 텍스트 16개 UTF-8 BOM 없음·CRLF, app.js의 HTML id 참조 36개 존재·중복 없음 PASS. CSP의 `connect-src 'none'`를 유지합니다.

### BROWSER / REMOTE_CI / LIVE — NOT_RUN (이번 변경)

- 이번 작업자는 브라우저, 실제 모바일 렌더링, 원격 CI, 공개 배포를 실행하거나 확인하지 않았습니다. 아래 과거 검증은 이번 변경의 공개 반영 증거가 아닙니다.
- 커밋·푸시·프로비저닝·계정 접근·랭킹·다른 저장소 수정·다른 에이전트 생성 없음. 이번 변경은 로컬 작업 트리에 있습니다.

### 메인 담당자 브라우저 조작·캡처 인계

1. 저장소에서 `npm run dev -- 0` 실행 후 표시된 loopback URL을 엽니다. 공유 요약과 갤러리 연동은 **같은 origin**에서 검증해야 합니다. 서로 다른 포트/호스트에는 localStorage가 공유되지 않습니다.
2. 임무 `2 · 폭염 속 정원 도시` 선택 → 하단 도시 코드 `lesson` 입력 → ‘같은 도시 시작’. 초기 화면에서 11턴 폭염/전력 수요 +2가 접힌 상세 일정과 별도로 보이는지 확인합니다. 초기 보기와 빈 칸 미리보기만으로 aggregate가 생성되지 않아야 합니다.
3. `test/fixtures/victories.json`의 `garden` 배열 순서대로 UI를 조작합니다. 각 `[index,offer]`는 **0부터 시작**한 지도 칸과 카드 번호입니다. 지도 행은 `floor(index/5)+1`, 열은 `index%5+1`; 카드 offer 0/1/2는 화면의 첫째/둘째/셋째 버튼입니다. null은 ‘건설 쉬기’입니다. 매 턴 카드를 클릭한 뒤 해당 빈 땅을 클릭합니다. 상태·예산·점수를 직접 설정하지 않습니다.
4. 11개 행동 후 실제 도시 화면을 캡처합니다. 적용 중 폭염, 실제 건물/서비스 배지, 선택 카드·배치판·미리보기·정산 표시를 포함합니다. 새로고침 → ‘진행 중 도시 계속’으로 같은 보드·턴·예산·신뢰를 확인합니다. 나머지 9개 행동 후 정원 임무 성공 326점/예산 51/신뢰 100과 내 기기 캠페인 1/3을 캡처합니다. 요약에는 completed 1/total 3/실제 ISO 시각만 있어야 합니다.
5. 320×720, 390×844와 데스크톱에서 확인합니다. 모바일 건물 카드 → 지도 → 미리보기·휴식의 근접 배치, 선택 카드 효과를 보여주는 미리보기, 가로 넘침, 카드/칸의 터치 영역, 실제 스크롤·포커스를 확인합니다. 점검 상세를 열면 조건과 통과/미달 결과가 줄로 나뉘어야 합니다.
6. 새 도시에서 ‘건설 쉬기’를 20회 누르면 최종 미달입니다. 미달 목표의 실제 부족량과 재도전 버튼을 캡처합니다. 이 미달 판을 12회 완료해 최근 완료 10개에서 최초 승리가 밀려도 정원 업적·캠페인 1/3이 남고 aggregate 시각은 실패로 갱신되지 않는지 확인합니다.
7. 갤러리/다른 앱에 실제 완료 요약이 있는 테스트 프로필에서 ‘내 기록 초기화’ 확인 후 pocket-city 개인 키와 own aggregate 항목만 지워지는지 확인합니다. 다른 앱의 summary/private key는 보존되어야 합니다. v1 기록·storage 차단·저장/초기화 부분 실패도 별도 테스트 프로필에서 확인합니다.
8. 기존 포커스/스크롤 race 회귀: 카드 클릭 → 빈 칸 포커스 → pointerleave 후 미리보기 유지. 완료 버튼 기본/hover/focus 대비와 재도전·다음 임무 클릭도 재확인합니다. 공개 배포 후 검증은 메인이 별도로 기록합니다.

### 변경 경로와 소스 검사 범위

- 수정: `architecture.md`, `README.md`, `docs/decisions.md`, `docs/verification.md`, `dist/index.html`, `dist/styles.css`, `dist/src/app.js`, `dist/src/model.js`, `test/model.test.js`, `test/ui.test.js`.
- 추가: `dist/src/campaign.js`, `dist/src/storage.js`, `dist/src/progress.js`, `test/campaign.test.js`, `test/progress.test.js`, `test/fixtures/victories.json`.
- VERIFIED (전체 읽기): architecture.md → README.md → docs/decisions.md; api-spec.md와 requirements.md는 없음. .gitattributes, package.json, 기존 관련 dist/src/ 3개·index.html·styles.css, test/ 2개, docs/verification.md, tools/check.mjs·serve.mjs, .github/workflows/pages.yml을 읽었습니다. 새 파일 6개를 작성·검사했으며 새 런타임 모듈 3개는 최종 전체 읽기로 재확인했습니다.
- 명시한 pocket-city 저장소: PARTIAL. 파일을 inventory한 뒤 위 관련 소스를 선택했습니다. tools/balance.mjs, favicon.svg, .git 내부와 node_modules는 이번 기능/저장 경계에 변경이 없어 전체 검토에서 제외했습니다. 최초 git status는 깨끗했습니다. 형제 디렉터리 이름만 15개 whitelist 확인에 사용했으며 형제 저장소 내용은 NOT_INSPECTED/NOT_MODIFIED입니다.

## 2026-10-09 — 키보드 미리보기·완료 버튼 QA 후속

### LOCAL — PASS (이번 작업자)

- 메인이 보고한 미리보기 race와 버튼 대비 문제를 실제 app.js·styles.css에서 확인했습니다. leave/blur의 무조건 초기화와 흰 패널 글자색 상속이 원인이었습니다.
- 새로운 `test/ui.test.js`의 5개 시험을 수정 전에 실행해 모두 실패함을 확인하고, UI 수정 후 모두 통과했습니다. 실제 앱 소스를 Node vm에서 실제 모델과 최소 DOM 대역으로 실행하며 브라우저를 실행하지 않습니다.
- 회귀 범위: 카드 클릭 → 7번 칸 포커스 → pointerleave 후 정산 미리보기 유지, 호버 중 blur 유지와 양쪽 종료 시 초기화, 다른 칸의 지연 이벤트, 렌더 교체 후 이전 칸 이벤트와 새 카드 계산. 버튼 기본/hover/focus 텍스트 대비 4.5:1 이상 및 파란 패널 위 포커스 외곽선 대비 3:1 이상을 CSS 색상에서 계산합니다.
- 최종 `npm test`: 기존 모델 12개 + UI/스타일 5개 = 17개 통과. `npm run check`, `git diff --check`, UTF-8 BOM 없음·CRLF 확인 통과.
- dist/src/model.js, dist/src/core.js, test/model.test.js의 작업 전/후 SHA-256 동일 확인. 규칙·승리 행동·점수·저장 구현은 수정하지 않았습니다. 이번 후속 변경 파일은 app.js, styles.css, test/ui.test.js, decisions.md, verification.md입니다.

### 메인 담당자의 브라우저 보고 — PASS (수정 전, 직접 재실행하지 않음)

- 사용자 전달 근거: `lesson` 세 승리 기록을 실제 브라우저에서 진행하여 점수 330/326/310, 예산 62/51/34, 신뢰 100/100/98 확인. 빈 도시 최종 실패와 320px 모바일 확인도 PASS로 전달받았습니다.
- 이 작업자는 해당 브라우저 흐름을 직접 실행하지 않았습니다. `pocket-city-final-desktop.jpg`는 작업 저장소의 일반·무시 파일 목록에서 찾지 못해 NOT_INSPECTED이며, 흰 버튼 관찰은 메인의 보고로 구분합니다. 실제 스타일의 상속 문제는 로컬 소스에서 확인했습니다.

### 수정 후 실제 브라우저·화면 — NOT_RUN (이번 작업자)

- 메인의 기존 브라우저 세션을 사용하지 않았으며 별도 브라우저도 실행하지 않았습니다. 메인은 카드 클릭 후 칸 포커스·스크롤·pointerleave, 호버 중 blur, 포커스/호버 모두 종료, 완료 버튼 기본/hover/focus와 재도전 클릭을 재확인해야 합니다.
- 원격 CI·공개 배포 검증은 NOT_RUN. 커밋·푸시·배포·외부 상태 변경 없음. 메인 보고의 기존 플레이 PASS와 이번 UI 수정 후 브라우저 재검증은 별도 상태입니다.

## 2026-10-09 — 규칙 v2 로컬 구현

이 절은 이번 변경의 검증입니다. 아래 2026-10-08의 브라우저·CI·공개 사이트 증거는 v1의 과거 기록이며 v2 검증을 뜻하지 않습니다.

### LOCAL — PASS

- Node.js v22.23.2 / npm 11.12.0 / PowerShell 7.6.6 환경에서 `npm test`: 순수 모델 12개 시험 통과.
- 각 임무 100개 코드(합계 300개 생성 조건)에서 재현성·물 3칸·보호된 중앙 통로·3턴 이내 카드 전체 등장 확인.
- 임무별 50회, 합계 150회 합법 행동 시뮬레이션: 입력 불변, 예산 비음수, 신뢰 0–100, 최대 20턴, 행동 재생 완전 일치 확인. 조기 종료/최종 종료 이후 행동 차단 확인.
- 단절 발전소의 전력 미공급, 중앙 도로 연결, 행 경계, 상점 수입 중단, 단절 시설 유지비, 공원·진료소 서비스와 오염, 물 인접 환경, 11턴 변화, 8턴 점검, 유예 기간, 미지급 비용과 신뢰 0, 목표 미달 종료 시험.
- 코드 `lesson`에서 세 임무의 합법적인 20턴 승리 기록을 고정 테스트로 재생. 각 최종 목표 전체 충족 확인. 신뢰/예산: 동네 100/62, 정원 100/51, 통근 98/34.
- `node tools/balance.mjs lesson`, `node tools/balance.mjs city-0`, `node tools/balance.mjs city-1` 로컬 제한 탐색 실행. 9개 조건 중 7개에서 승리 기록을 찾음. `city-1`의 동네·통근은 폭 600 탐색에서 찾지 못함. 해법 부재 또는 모델 오류로 판정할 수 없으며 전체 생성 조건의 승리 가능성을 증명하지 않음.
- `npm run check`: JS 문법, HTML 정적 자산 경로, 한국어·viewport 메타데이터 통과.
- 최종 `git diff --check` 통과. app.js가 참조하는 32개 HTML id의 존재와 중복 없음 확인. `node --check tools/balance.mjs` 통과. 이는 정적 검사이며 실제 DOM 조작 시험은 아닙니다.
- 수정 텍스트에 UTF-8 유효성, BOM 없음, CRLF 확인. CSP `connect-src 'none'`와 정적 진입점 유지. 외부 에셋·서비스·백엔드·Neon 추가 없음.

### BROWSER / REMOTE_CI / LIVE — NOT_RUN (이번 v2)

- 실제 브라우저 조작·화면 렌더링·localStorage 지속/삭제·WebMCP·모바일·키보드 QA는 이번 작업자가 실행하지 않았습니다. DOM 코드 정적 검사나 Node 모델 테스트는 브라우저 검증이 아닙니다.
- 메인 담당자가 프리뷰와 브라우저 QA를 수행합니다. 이번 변경은 커밋·푸시·배포·원격 상태 변경 없이 작업 폴더에만 있습니다.
- 사람 플레이 밸런스, 모든 코드의 해법, 접근성 전수 검증은 NOT_RUN입니다. 초기 유예 이후 급격한 확장·정전·단절의 신뢰 손실과 회복 감각을 확인해야 합니다.

### 메인 담당자 QA 인계

- 코드 `lesson`과 각 임무를 선택하고 목표·8/14턴 점검·11턴 변화 표시, 카드 선택/배치와 정산 미리보기를 확인합니다. 합법 승리 행동은 `test/model.test.js`의 `victories`에 있습니다.
- 카드의 다음 3턴 예고와 실제 카드 일치, 단절/서비스 배지, 건물 클릭·키보드 포커스 설명, 건설·쉬기의 실제 예산/신뢰 반영을 확인합니다.
- 신뢰 0 조기 실패와 20턴 성공/미달 결과, 같은 조건 재도전·다음 임무, 임무 선택 변경의 새 판 적용과 취소 확인을 시험합니다.
- v2 진행 재로딩/이어하기, v1 진행의 버전 안내, 이전 완료 점수 구분, 저장 차단 알림, 완료 최대 10개/진행 1개, 실제 삭제를 확인합니다.
- 320px/390px와 데스크톱에서 카드·목표·예고·지도·완료 화면 넘침과 포커스, 브라우저 오류 로그를 확인합니다.

### 명시된 소스 검사 범위

- VERIFIED (전체 읽기): architecture.md, README.md, docs/decisions.md, .gitattributes, package.json, dist/src/model.js·core.js·app.js, dist/index.html·styles.css·favicon.svg, test/model.test.js, tools/check.mjs·serve.mjs, docs/verification.md, .gitignore, .github/workflows/pages.yml.
- 저장소 전체: PARTIAL. 소스 목록을 확인하고 위 관련 파일을 읽었습니다. .git 내부·node_modules 의존성 내부는 작업 관련 구현 검토에서 제외했습니다. 디렉터리 목록 확인을 파일 전체 검토로 간주하지 않습니다. 형제 저장소는 NOT_INSPECTED/NOT_MODIFIED입니다.

## 2026-10-08 — 이전 규칙 v1의 검증 기록

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
