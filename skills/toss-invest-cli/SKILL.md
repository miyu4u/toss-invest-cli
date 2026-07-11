---
name: toss-invest-cli
description: "Operate the compiled `toss-invest-cli` command for market, account, watchlist, and order tasks with parse-clean JSON handling and fail-closed live-order safety."
---

# Start

- This file is the complete operating contract. In this skill, `toss-invest-cli` is the compiled executable name. Before use, the caller must expose that executable on `PATH` under this name; this package intentionally does not prescribe an installation path or source-entry-point fallback.
- Before any request, confirm that the command is available and inspect its current surface:

  ```bash
  toss-invest-cli --help
  ```

- If that command fails, stop and report that the CLI command is unavailable. Do not rebuild it, call an alternate executable, or make an authenticated request.
- The runtime reads configuration in this order: explicit `process.env`, `$TOSS_INVEST_CLI_HOME/.env` (default `$HOME/.config/toss-invest-cli/.env`), the current working directory `.env`, then `$HOME/.env`. `TOSS_INVEST_CLI_HOME` must be exported or injected before starting the CLI; it is not discovered from a dotenv file.
- Credentials may come from root `--access-token <token>`, an encrypted `credentials.enc`, `TOSS_INVEST_ACCESS_TOKEN`, or a complete canonical `TOSS_INVEST_API_KEY`/`TOSS_INVEST_SECRET_KEY` pair from the same source. Never echo, log, or return a token, API key, secret, password, or local credential-cache content.
- Authentication precedence is: this-call `--access-token`, an unlockable store token or stored API credential, `TOSS_INVEST_ACCESS_TOKEN`, then the same-source API credential pair. A dotenv pair does not need `auth login`; it can issue a token for the request without creating or updating `credentials.enc`.
- Account-scoped commands accept `--account <accountNo-or-accountSeq>` before the command. The CLI resolves it to the OpenAPI account sequence and refuses ambiguous values. When omitted, only canonical `TOSS_INVEST_ACCOUNT` is used; legacy fallbacks are not supported.

# Workflow

Classify the request as a read-only query, local watchlist change, order-information query, dry-run order, or live order. Treat market data as information, never as an investment recommendation.

## 인증과 환경

- For repeated local use, run `toss-invest-cli auth login` in an interactive terminal. It stores the API credential in password-encrypted `credentials.enc` under the config home with owner-only permissions. `auth token` and `auth logout` are the other supported credential-store commands.
- In CI or a non-interactive shell, use `TOSS_INVEST_ACCESS_TOKEN`, a same-source canonical API credential pair, or `--access-token`. `TOSS_INVEST_CLI_KEYRING_PASSWORD` can unlock the encrypted store when no TTY is available.
- `auth login` skips the credential prompts only when both canonical API keys are complete in one source. If sources are mixed or the pair is incomplete, use the prompt fallback. Its JSON `credentialSource` contains only source metadata (`environment`, `dotenv` plus path, or `prompt`).
- `auth logout` removes the encrypted store and any legacy plaintext `auth-cache.json`; normal execution does not read or write the plaintext cache. Do not place real passwords or credentials in `.env`, documentation, fixtures, or logs.

## 조회

- Put root options before the command. Use `--json` when another program consumes the output: stdout is parse-clean JSON, and diagnostics or errors stay on stderr.
- Use the narrowest query that answers the request:

  ```bash
  toss-invest-cli --json market prices --symbols 005930,000660
  toss-invest-cli market orderbook --symbol 005930
  toss-invest-cli --account <accountNo-or-accountSeq> account holdings
  toss-invest-cli watchlist list
  toss-invest-cli watchlist prices
  ```

- Query domains:
  - `market`: current prices, order books, recent trades, price limits, candles, rankings, and indicators.
  - `stock`: stock metadata and investment-caution information.
  - `market-info`: exchange rates and market calendars.
  - `account` and `portfolio`: account list, holdings, assets, and portfolio summaries.
  - `order-info` and `orders`: buying power, sellable quantity, commissions, order history, and order detail.
  - `orders conditional`: conditional-order list, detail, and dry-run mutations.
  - `watchlist`: local symbol list and current prices. `watchlist add` and `watchlist remove` change local state.
- `hello` is a non-authenticated greeting/diagnostic command; do not treat it as proof that API credentials work.
- For an unlisted query or option, use `toss-invest-cli <group> --help`; never infer flags, enum values, market codes, or identifiers.

## 주문

- `orders create`, `orders modify`, `orders cancel`, and conditional-order mutations are write-capable commands. Their default behavior is dry-run, not a completed live trade.
- Inspect `toss-invest-cli orders --help` and the selected subcommand's help before preparing an order. `orders history` and `orders detail` are read-only order lookups.
- `LIMIT` sets a price: buys can execute only at or below it, and sells only at or above it. `MARKET` does not set a price and attempts immediate execution at the available market price.
- `DAY` keeps an order valid through the current trading day. `CLS` is a close-limit condition, allowed only for US `LIMIT` orders; never combine `CLS` with `MARKET`.
- Confirm these order items with the user before the dry-run:

  | 항목 | 확인 내용 |
  | --- | --- |
  | account | 대상 `accountNo` 또는 `accountSeq` |
  | symbol | 거래 대상 종목 코드 |
  | side | `BUY` 또는 `SELL` |
  | order type | `LIMIT` 또는 `MARKET` |
  | quantity | 주문 수량 |
  | price / amount | `LIMIT` 가격 또는 현재 명령이 요구하는 시장가 주문 금액 |
  | time in force | 시장가에는 `DAY` 또는 생략, `CLS`는 미국 주식 `LIMIT` 주문에만 사용 |
  | high-value confirmation | 명령이 요구하거나 금액이 큰 경우 `--confirm-high-value-order` |

`--confirm-high-value-order`는 API request body의 optional acknowledgement입니다. 명시하면 regular/conditional create·modify의 live request와 dry-run `result.summary`에 `confirmHighValueOrder=true`가 함께 나타납니다. 생략 시 `false`를 자동으로 넣지 않으며, CLI는 API threshold를 추정하거나 cancel 명령에 이 옵션을 추가하지 않습니다.

## 주문 단계

1. **입력 확인**: 사용자가 계좌, 종목, 매수·매도, 주문 유형, 수량, 가격 또는 금액을 명시했는지 확인하고, 빠진 옵션은 subcommand help로 확인한다.
2. **dry-run 실행**: 요청한 명령을 `--live` 없이 실행한다. 출력의 `mode`, `result.clientOrderId`, `result.summary`를 보존한다.
3. **주문 내용 검토**: dry-run의 `summary`가 사용자 요청의 계좌·종목·방향·수량·가격·유효기간 조건과 일치하는지 확인한다. 다르면 새 값으로 dry-run부터 다시 실행한다.
4. **명시적 live 승인**: 사용자가 그 exact order의 live 실행을 분명히 요청한 경우에만 다음 게이트를 확인한다.
   - 유효한 인증 정보
   - `TOSS_INVEST_ORDER_LIVE_APPROVED=yes`
   - `TOSS_INVEST_ORDER_KILL_SWITCH=open`
   - 대상 계좌가 `TOSS_INVEST_ACCOUNT_ALLOWLIST`에 포함됨
5. **동일 주문 재실행**: 원래 값, `--client-order-id <dry-run-client-order-id>`, `--live`, `--confirm "<dry-run-summary>"`를 함께 사용한다.

   ```bash
   toss-invest-cli --account <accountNo-or-accountSeq> orders create \
     --symbol <symbol> --side <BUY-or-SELL> --order-type <LIMIT-or-MARKET> \
     --quantity <quantity> [--price <limit-price>] \
     --client-order-id <dry-run-client-order-id> \
     --live --confirm "<dry-run-summary>"
   ```

6. **결과 확인**: live 성공은 CLI가 반환한 결과로만 판단한다. 오류, 특히 HTTP 422는 자동 재시도하지 말고 제출 조건과 최근 주문 내역을 확인한 뒤 새 dry-run부터 시작한다.

# Resources

- `toss-invest-cli --help` is the source of truth for the current root command surface.
- `toss-invest-cli <group> --help` is the source of truth for every subcommand's options and enum values.
- No external documentation or package-local reference is required to operate this skill.

# Gotchas

## 주의 사항

- `--json`, `--account`, and `--access-token` are root options and belong before the command, for example `toss-invest-cli --json market prices --symbols 005930`.
- `--live` alone cannot authorize an order. Never treat a vague “buy”, “sell”, “order”, or “trade” request as approval to execute a live mutation.
- Do not assume orderability, market session, price validity, account selection, or sufficient balance from stale data. Query the current values when they affect a requested order.
- `CLS` is a close-limit condition for US `LIMIT` orders; never send it with `MARKET`. `MARKET` orders omit `--price`; when the subcommand help requires a cash amount, pass `--order-amount <amount>`. US market orders may be rejected outside the regular session.
- Default order mutations are dry-runs. Dry-run and live responses use the shared `mode` and `result` envelope; read primary values from `result`.
- Do not add prose, prompts, warnings, or ANSI output to a `--json` stdout stream.
- Do not expose credentials, account identifiers, order IDs, or local cache contents in shared output unless the user needs that specific non-secret value.
- Do not automatically retry failed orders. A rejection may reflect current exchange-session or API conditions rather than a transient failure.
- A bearer `401` can trigger one credential-based token refresh and retry; a second `401` is propagated. This recovery does not authorize an order or justify retrying a rejected mutation.
- On HTTP `422`, inspect stderr for the `HttpException` message containing `HTTP 422`, record the submitted conditions, check market/session/order history for a duplicate, and create a new dry-run after changing the conditions. A US `MARKET` order before or after the regular session is a confirmed rejection scenario. Do not reuse the old `clientOrderId` or `summary`.

# Validation

- Run `toss-invest-cli --help` to prove the required command is executable and exposes the stated root command groups.
- Run `toss-invest-cli orders create --help` to confirm the dry-run, `--live`, `--client-order-id`, and `--confirm` option contract.
- Run `toss-invest-cli auth --help` when using credential-store operations to confirm the local auth command surface.
- Do not validate this skill by calling an authenticated endpoint or placing a live order. A 422 response is an operational error guide, not a reason to issue a test order.

# Output

- State the exact command invoked and keep stdout result data distinct from stderr diagnostics or failures.
- Preserve `--json` stdout as JSON without explanatory text in that stream.
- For a dry-run, report `mode`, `result.clientOrderId`, and `result.summary` so the user can decide whether to approve the exact live command.
- For a live mutation, report success only from the returned CLI result and include only non-secret identifiers that the user needs.