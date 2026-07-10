# BOARD

현재 상태는 활성 구현 트리와 테스트 소스, 빌드 설정을 기준으로 정리한다. `[x]`는 구현과 적절한 검증 증거가 있는 완료 항목이며, `[ ]`는 현재 트리에서 확인된 후속 정합화 작업이다.

- [x] `CLI.QUERY_TRADE` 조회 및 거래 CLI 표면
  - [x] `CLI.QUERY_TRADE.RUNTIME` `toss-invest-cli` 실행 파일과 Commander 부트스트랩, 루트 도움말, 명세 도메인 명령 등록, 전역 `--json`·인증·계좌 옵션, 설정·인증 캐시, 출력·오류 마스킹, 서비스 레지스트리를 구현
  - [x] `CLI.QUERY_TRADE.QUERY_CONTRACT` 모든 조회 명령 등록자가 공통 `IQueryCommand.register(program, runtime)` 계약을 사용하도록 연결
  - [x] `CLI.QUERY_TRADE.ACCOUNT_SEQUENCE` `--account`과 기본 계좌에 `accountNo` 또는 `accountSeq`를 받아 인증된 계좌 목록으로 OpenAPI header용 `accountSeq`를 정규화하고, 미확인·모호한 입력은 명시적으로 거부
  - [x] `CLI.QUERY_TRADE.QUERY` `market`, `stock`, `market-info`, `account`, `order-info`, `orders`, `portfolio`, `watchlist` 조회 명령을 런타임·서비스에 연결
  - [x] `CLI.QUERY_TRADE.TRADE` 일반·조건부 주문 생성·수정·취소를 기본 dry-run 및 fail-closed live 안전 정책으로 구현
    - [x] `CLI.QUERY_TRADE.TRADE.MARKET_TIF_GUARD` `src/schema/api/requests.ts`에서 시장가 `MARKET` 주문의 `CLS` 유효기간을 로컬 거부하고, `src/commands/trade/orders.ts`의 dry-run 승인 요약에 `timeInForce`를 포함해 확인 조건을 고정; `src/schema/schema.spec.ts`, `src/commands/trade/trade.spec.ts`로 검증
  - [x] `CLI.QUERY_TRADE.TRADE_EXECUTOR` dry-run 결과와 승인된 live 콜백을 런타임 안전 정책에서 분리하는 공통 거래 실행 경계를 유지
  - [x] `CLI.QUERY_TRADE.TRADE_OUTPUT_CONTRACT` dry-run·live 주문 결과를 `mode`와 `result` 공통 envelope로 정규화해 자동화 소비자가 단일 JSON 경로를 사용하도록 유지
  - [x] `CLI.QUERY_TRADE.TRADE_GATE_CUTOVER` live 주문에서 `--live`·확인 요약·환경 승인·kill switch·계좌 allowlist·생성 주문 ID 안전 게이트를 유지
  - [x] `CLI.QUERY_TRADE.TEST` CLI 도움말·parse-clean JSON·거래 거부와 결정적 HTTP echo 계약을 검증
    - [x] `CLI.QUERY_TRADE.TEST.CONTRACT` 필수 옵션 오류와 JSON stdout 분리 계약을 검증
  - [x] `CLI.QUERY_TRADE.CLASS_SWEEP` 런타임과 명령 등록자를 클래스 기반 표면으로 정리하면서 얇은 라우팅과 서비스 레지스트리 동작을 유지
  - [x] `CLI.QUERY_TRADE.TEST_EXPANSION` 인증·출력·명령 런타임·관심종목 단위 회귀와 결정적 CLI 프로세스 계약을 확장
  - [x] `CLI.QUERY_TRADE.LIVE_QUERY_E2E` 자격 증명이 있을 때 계좌 탐색과 사용 가능한 주문 식별자 기반 상세 조회를 수행하는 읽기 전용 live E2E를 제공
  - [x] `CLI.QUERY_TRADE.AUTH_401_RECOVERY` bearer 401 뒤 OAuth2 자격 증명을 한 번만 재발급·재시도하고, dotenv autoload 없이 scoped precedence를 기반으로 인증 설정을 읽는다
  - [x] `CLI.QUERY_TRADE.SCOPED_DOTENV_CREDENTIALS`
  - [x] `CLI.QUERY_TRADE.ENCRYPTED_CREDENTIAL_STORE`

- [x] `API.OPENAPI` Toss Invest OpenAPI 작업 래퍼
  - [x] `API.OPENAPI.IMPLEMENT` 인증, 시세, 종목·시장 정보, 랭킹·지표, 계좌·자산, 일반·조건부 주문, 주문 정보를 위한 타입드 API 메서드를 제공
  - [x] `API.OPENAPI.PROOF` 폼 인증, bearer·계좌 헤더, 주문 POST, 경로 인코딩, 대표 오류 경로를 검증
    - [x] `API.OPENAPI.PROOF.CONTRACT` API 브리지의 요청·오류 계약을 회귀 테스트