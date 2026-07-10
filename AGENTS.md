# Toss Invest CLI and Toss Invest skills

## STRUCTURE

- `__test__` : 테스트 관련 디렉토리
    - `__e2e__` : e2e 테스트
    - `utils` : 테스트 관련 유틸
    - `fixtures` : fixture
- `src` : Source Code
    - `bridge` : Toss Invest OpenAPI HTTP/API bridge and Zod schemas
    - `schema` : API Bridge 및 CLI Surface에서 공통으로 사용되는 스키마, 타입
      - `enum.ts` : 공통 enum, literal types, `*_ITEMS`
      - `helper-schema.ts` : 재사용되는 헬퍼 스키마
      - `schema/cli` : CLI Surface에서 공통으로 사용되는 스키마, 타입. CLI 고유하게 사용되는 타입 및 스키마는 `src/cli` 에 작성
      - `schema/api` : API Surface에서 공통으로 사용되는 스키마, 타입. API 고유하게 사용되는 타입 및 스키마는 `src/bridge` 에 작성
    - `runtime` : shared CLI runtime such as config, auth, output, error, redaction, and safety policy
    - `cli` : parser/bootstrap/command registry boundary
    - `commands` : user-facing command feature modules
    - `config.ts` : config variable, constants
    - `exceptions.ts` : error classes
    - `service-registry.ts` : class instance singleton entrypoint
- `artifact` : 기타 static file (ex: skills body)
- `Formula` : Homebrew private tap formula
- `dist` : build destination
- `.env.example` : env 예시

---

## GUIDELINES

### module boundary

- `src/bridge/**`는 OpenAPI wrapper, HTTP wrapper, Zod schema의 ownership을 가진다.
- `src/runtime/**`는 config/env/auth, output/error/redaction, retry policy, live order safety처럼 여러 command가 공유하는 동작을 둔다.
- `src/cli/**`는 parser/bootstrap/command registry까지만 맡고, business logic을 직접 품지 않는다.
- CLI 표면은 controller/router로 간주한다. option parsing, validation boundary, service dispatch, output routing에 집중한다.
- `src/commands/**`는 command option을 `*.service.ts` method call로 연결하는 얇은 route layer로 유지한다.
- 각 기능 동작은 기본적으로 `*.service.ts` class method에서 수행한다.
- 새 기능은 runtime-first로 공통 바닥을 만들고, 각 command는 vertical slice로 동작과 테스트를 닫는다.

### command extension

- 기존 rewrite spec의 domain command group을 기본 표면으로 유지한다: `market`, `stock`, `market-info`, `account`, `order-info`, `orders`, `portfolio`, `watchlist`.
- “조회”와 “거래” 구분은 help, docs, 내부 module grouping에서 표현하고, public command taxonomy는 임의로 바꾸지 않는다.
- `--json` stdout은 parse-clean JSON만 출력한다. prompt, warning, diagnostic, error는 stderr로 보낸다.
- live mutation command는 기본 dry-run/refusal로 두고, 명시적 live gate를 통과한 경우에만 API mutation을 호출한다.
- command option과 enum은 `src/schema/enum.ts`의 Zod schema와 `*_ITEMS`를 재사용하고, API data contract는 `src/schema/api/**`의 owner module을 직접 import한다.
- CLI handler는 service method를 호출하고 결과를 renderer로 넘긴다. API 호출, 상태 변경, 계산 로직은 handler 안에 오래 두지 않는다.

### api bridge style

- Service는 class 구성 style을 우선한다. 공개 계약은 `interface`로 작성하고 class가 `implements`로 구현하는 방식을 선호한다.
- 특별한 케이스가 아니면 constructor injection을 사용하지 않는다. service method는 `src/service-registry.ts`의 `SERVICE` 상수를 직접 참조한다.
- API service methods는 HTTP 호출을 `src/service-registry.ts`의 `SERVICE.httpService` 경유로 수행한다.
- API service endpoint methods에는 per-call `options?: TossInvestRequestOptions`를 노출하지 않는다. access token, account header, signal 같은 metadata는 service instance state로 관리한다.
- `HttpService`는 options-object constructor와 class-private helper 중심 style을 선호한다.
- 순수 함수와 순수 메소드 단위로 decompose하되, file-level helper function을 과하게 늘려 파일 밖으로 logic이 퍼지게 하지 않는다.
- 재사용되는 로직이 생기면 먼저 추상화와 분리 단위를 잡고 그 뒤에 재사용한다.
- type은 바로 작성하지 말고 Zod schema를 먼저 만들고 `z.infer`로 변환해 사용한다.
- `src/schema/api/**`의 `z.object`와 `.extend`에 직접 선언하는 각 property 바로 위에는 필드 의미를 설명하는 multiline 한글 JSDoc을 작성한다.
- Zod validation은 CLI/input boundary에서만 수행한다. 내부 service, class, helper method 안에서는 같은 값을 반복 validate하지 않는다.

### test / release

- 변경 후 기본 project-local gate는 아래 순서다.
  - `bun run check`
  - `bun run test`
- CLI command 구현은 parser/help/output contract test와 대표 command invocation smoke를 포함한다.
- 분기가 있거나 입력 값이 바뀌거나 재사용되는 로직은 unit test를 작성한다.
- 각 service method는 항상 happy-path 또는 smoke test를 가진다.
- trading/live safety는 live API 없이 refusal, dry-run summary, confirmation, redaction을 먼저 검증한다.

### anti-patterns

- parser handler 안에서 API 호출, auth, output formatting, safety gate를 모두 처리하지 않는다.
- command 편의를 이유로 `src/bridge/**` method signature를 흔들지 않는다.
- `--json` stdout에 banner, progress, ANSI color, prompt, warning을 섞지 않는다.
- live order mutation을 `--live` 없이 가능하게 만들지 않는다.
- secret-bearing env/cache 값을 fixture, docs, error message, test snapshot에 기록하지 않는다.
- reusable logic을 발견하고도 copy-paste로 여러 service에 흩뿌리지 않는다.

---
