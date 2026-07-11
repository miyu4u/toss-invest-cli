# toss-invest-cli

Toss Invest OpenAPI를 터미널에서 사용 할 수 있는 CLI입니다.

## 설치

### Homebrew 사용

Homebrew와 Bun(빌드에 사용됨)이 필요합니다.

custom tap을 등록한 뒤 formula를 설치합니다.

```bash
brew tap miyu4u/tap https://github.com/miyu4u/homebrew-tap
brew install miyu4u/tap/toss-invest-cli
```


설치가 끝나면 다음 명령으로 CLI를 확인할 수 있습니다.

```bash
toss-invest-cli --help
```

> 현재 formula는 설치 과정에서 `bun`으로 소스를 빌드하므로 별도로 바이너리를 내려받지 않습니다.

### 직접 빌드

Git과 Bun을 준비한 뒤 repository를 clone하고 의존성을 설치합니다.

```bash
git clone https://github.com/miyu4u/toss-invest-cli.git
cd toss-invest-cli
bun install --frozen-lockfile
bun run build
```

빌드된 실행 파일은 `dist/toss-invest-cli`에 생성됩니다.

```bash
./dist/toss-invest-cli --help
```


## 실행

### QuickStart

환경변수 설정이 필요합니다.

```sh
touch .env
vi .env
```

```dotenv
# Client Id
TOSS_INVEST_API_KEY= 

# Client Secret
TOSS_INVEST_SECRET_KEY=

# 암호화에 사용할 키는 openssl로 생성할 수 있습니다.
# 예시 (32바이트 랜덤 키, base64로 저장):
# openssl rand -base64 32
# openssl rand -base64 32 | pbcopy

# 예시 실행:
# $ openssl rand -base64 32
# oJw3b3hC1y9mHKw8eoQWtA5nZq6YzG1bLqwNnVHbDaY=

# 생성된 값을 .env의 TOSS_INVEST_CLI_KEYRING_PASSWORD에 복사해서 사용하세요.
# 암복호화를 위한 키 페어링
TOSS_INVEST_CLI_KEYRING_PASSWORD=
```

`auth login`을 사용하여 CLI 인증 보관소에 키를 등록합니다.

```sh
toss-invest-cli auth login
toss-invest-cli auth token
toss-invest-cli account list
```

다음 값이 뜨면 성공입니다.

```json
{
  "result": [
    {
      "accountNo": "<number>",
      "accountSeq": 0,
      "accountType": "<string>"
    }
  ]
}
```

---

로컬 기본 흐름은 `auth login`으로 API credential을 password-encrypted store에 저장하는 것입니다.

CI·비대화식 실행에서는 환경 변수 credential 또는 access token fallback을 사용할 수 있습니다.

런타임은 다음 순서로만 dotenv를 읽습니다.

1. 명시적 `process.env`
2. `$TOSS_INVEST_CLI_HOME/.env` (기본: `~/.config/toss-invest-cli/.env`)
3. 현재 작업 디렉터리 `.env`
4. `$HOME/.env`

> `TOSS_INVEST_CLI_HOME`은 변경이 가능합니다. 다만 `TOSS_INVEST_CLI_HOME`은 `.env` 파일에서 정의되지 않으며, CLI 실행 전에 환경에서 export/inject되어 있어야 합니다.


값이 설정되면 `$TOSS_INVEST_CLI_HOME/.env`로 탐색할 config-home 경로가 결정됩니다.

```bash
export TOSS_INVEST_CLI_HOME="$HOME/.config/my-custom-toss-invest-cli"
toss-invest-cli --help
```

또는 실행 명령에 한 번에 주입할 수도 있습니다.

```bash
TOSS_INVEST_CLI_HOME="$HOME/.config/my-custom-toss-invest-cli" toss-invest-cli --help
```

대화형 터미널에서 다음 명령으로 API credential(`TOSS_INVEST_API_KEY`/`TOSS_INVEST_SECRET_KEY`)과 store password를 숨김 입력으로 저장합니다. `credentials.enc`는 기본 config home(`~/.config/toss-invest-cli`)에 owner-only 권한으로 생성되며, password나 credential은 출력하지 않습니다.

```bash
toss-invest-cli auth login
toss-invest-cli auth token
toss-invest-cli auth logout
```

`TOSS_INVEST_CLI_KEYRING_PASSWORD`는 TTY가 없는 자동화에서 encrypted store를 unlock하는 bridge입니다.

scoped dotenv(`$TOSS_INVEST_CLI_HOME/.env`, `./.env`, `$HOME/.env`)에서 읽을 수 있으며, 비밀번호는 민감정보이므로 `.env`/문서/로그에 실제 값을 저장하지 마세요.  
`TOSS_INVEST_CLI_HOME`은 변경되는 경우 dotenv 파일이 아닌 실행 환경에서만 주입되어야 합니다.



### 인증 우선순위와 저장 방식

`account list` 같은 API 조회가 성공했다는 것은 CLI가 유효한 OAuth access token을 얻었다는 뜻입니다.

출력만으로 credential source를 단정할 수는 없으며, 인증은 다음 순서로 선택됩니다.

1. 이번 호출의 `--access-token`
2. password로 unlock 가능한 `credentials.enc`의 유효한 OAuth token 또는 저장된 API credential
3. `TOSS_INVEST_ACCESS_TOKEN`
4. 같은 source에서 완전한 쌍으로 제공된 `TOSS_INVEST_API_KEY`와 `TOSS_INVEST_SECRET_KEY`

따라서 `credentials.enc`를 unlock할 수 있으면 dotenv의 `TOSS_INVEST_API_KEY`/`TOSS_INVEST_SECRET_KEY` 쌍보다 encrypted store가 우선합니다. store가 없거나 사용할 수 없을 때에는 scoped dotenv의 완전한 canonical API credential pair로 OAuth token을 발급해 요청을 수행할 수 있으므로, 이 경로에서는 `auth login`이 필수는 아닙니다.

`auth login`은 `TOSS_INVEST_API_KEY`/`TOSS_INVEST_SECRET_KEY`를 password-encrypted `credentials.enc`에 저장합니다. 반면 dotenv에서 동일 source 내 canonical pair만으로 요청한 경우에는 새 `credentials.enc`를 만들거나 OAuth token을 저장하지 않습니다. 자동화에서는 dotenv pair 또는 access token을, 반복적인 로컬 사용에서는 `auth login`으로 만든 encrypted store를 선택할 수 있습니다.

도움말과 시세 조회 예시는 다음과 같습니다.

```bash
toss-invest-cli --help
toss-invest-cli --json market prices --symbols 005930
```


## 빌드

다음 명령으로 컴파일합니다. 빌드된 바이너리도 동일한 scoped dotenv 규칙을 사용하며, 기본 `.env` 자동 로드는 없습니다.

```bash
bun run build
./dist/toss-invest-cli --help
```



## Usage

기본 호출 형식은 다음과 같습니다.

```text
toss-invest-cli [--access-token <token>] [--account <accountNo-or-accountSeq>] [--json] <command> [options]
```

- `--access-token <token>`: 이번 호출에만 사용할 OAuth access token입니다. `TOSS_INVEST_ACCESS_TOKEN` 환경 변수도 사용할 수 있습니다.
- `--account <accountNo-or-accountSeq>`: `account list`가 반환한 `accountNo` 또는 `accountSeq`를 지정합니다. CLI는 둘 중 어느 값을 받아도 OpenAPI header에 필요한 `accountSeq`로 변환합니다. 하나의 입력이 서로 다른 계좌와 충돌하면 `ACCOUNT_AMBIGUOUS`로 중단하므로 임의의 계좌를 선택하지 않습니다. 기본 계좌값은 `TOSS_INVEST_ACCOUNT`를 사용합니다.
- `--json`: 결과 데이터만 parse-clean JSON으로 stdout에 출력합니다. 오류와 진단 메시지는 stderr로 분리됩니다.
- `--help`: 루트 또는 하위 명령의 도움말을 표시합니다. 예: `toss-invest orders --help`



대표적인 명령은 다음과 같습니다.

```bash
# 단일 종목 호가
toss-invest-cli market orderbook --symbol 005930

# 여러 종목 현재가를 JSON으로 조회
toss-invest-cli --json market prices --symbols 005930,000660

# 계좌 보유 종목 조회
toss-invest-cli account holdings --account <accountNo-or-accountSeq>

# TSLL 지정가 매수 주문 dry-run
toss-invest-cli orders create --account <accountNo-or-accountSeq> --symbol TSLL --side BUY --order-type LIMIT --quantity 1 --price 10

# 로컬 관심 종목 관리 및 현재가 조회
toss-invest-cli watchlist add --symbols 005930,000660
toss-invest-cli watchlist prices
```

`orders create`, `orders modify`, `orders cancel`과 조건부 주문의 생성·수정·취소는 기본적으로 dry-run입니다.

실주문 승인 절차는 아래를 따릅니다. 주문 명령의 전체 옵션은 실행 전 `toss-invest orders create --help`로 확인해야 합니다.

### 실주문 승인 절차

`--live`만으로는 실제 주문이 생성되지 않습니다.

1. **dry-run으로** `clientOrderId`**와 승인 요약을 생성합니다.** 아래 명령은 실제 주문을 만들지 않습니다. 출력 JSON의 `result.clientOrderId`와 `result.summary`를 다음 단계에 사용합니다.

```bash
toss-invest-cli orders create \
  --account <accountNo-or-accountSeq> \
  --symbol TSLL \
  --side BUY \
  --order-type LIMIT \
  --quantity 1 \
  --price 10
```



출력 예시는 다음과 같습니다. `<generated-uuid>`는 CLI가 생성한 값입니다.



```json
{
  "mode": "dry-run",
  "result": {
    "clientOrderId": "<generated-uuid>",
    "summary": "action=orders.create|account=<accountSeq>|clientOrderId=<generated-uuid>|orderType=LIMIT|price=10|quantity=1|side=BUY|symbol=TSLL"
  }
}
```

1. **실주문 환경 게이트를 설정합니다.** 유효한 인증 정보와 함께 대상 계좌를 allowlist에 등록하고, 다음 환경 값을 설정해야 합니다.

```dotenv
TOSS_INVEST_ORDER_LIVE_APPROVED=yes
TOSS_INVEST_ORDER_KILL_SWITCH=open
TOSS_INVEST_ACCOUNT_ALLOWLIST=<accountSeq>
```

1. **주문 조건과** `summary`**를 검토한 뒤, 동일한 주문 값으로 다시 실행합니다.**

```bash
toss-invest-cli orders create \
  --account <accountNo-or-accountSeq> \
  --symbol TSLL \
  --side BUY \
  --order-type LIMIT \
  --quantity 1 \
  --price 10 \
  --client-order-id <dry-run-client-order-id> \
  --live \
  --confirm "<dry-run-summary>"
```

live 주문 생성 응답은 다음 구조로 stdout에 출력됩니다. 기본 출력은 들여쓴 JSON이고, `--json`을 지정하면 한 줄 JSON입니다.

```json
{
  "mode": "live",
  "result": {
    "orderId": "<order-id>",
    "clientOrderId": "<dry-run-client-order-id>"
  }
}
```

`orderId`는 생성된 주문의 서버 식별자입니다. 서버 응답에 따라 `clientOrderId`는 생략되거나 `null`일 수 있습니다.

dry-run과 live 모두 primary data는 `result` 아래에 있습니다.

`--client-order-id`에는 직전 dry-run의 `result.clientOrderId`를 전달합니다.

`--confirm`에는 같은 `clientOrderId`와 주문 조건으로 생성된 dry-run의 `result.summary` 전체를 변경 없이 전달해야 합니다.

현재 주문 입력과 `summary`가 다르면 CLI가 주문을 차단합니다.



### 주문 유형과 유효기간

- `LIMIT`은 가격을 지정합니다. 매수는 지정가 이하, 매도는 지정가 이상에서만 체결됩니다. 조건을 만족하지 않은 주문은 유효기간까지 미체결 상태로 남을 수 있습니다.
- `MARKET`은 가격을 지정하지 않고 현재 시장의 호가로 즉시 체결을 시도합니다.
- `DAY`는 주문을 해당 거래일 동안 유효하게 둡니다. `CLS`는 종가 조건으로, 미국 주식 `LIMIT` 주문에만 사용할 수 있습니다. `MARKET + CLS`는 유효하지 않으므로 시장가 주문에는 `DAY`를 사용하거나 유효기간을 생략합니다.



## HTTP 422 주문 거부 가이드

OpenAPI가 2xx가 아닌 응답을 반환하면 CLI는 `HttpException`으로 전파하고 비정상 종료합니다. HTTP `422`는 요청 형식 자체보다 현재 주문 조건이 거래소 또는 API의 실행 조건을 충족하지 않아 거부되었음을 뜻합니다. **자동으로 재시도하지 마세요.**

확인된 사례는 **미국 주식의 시장가(**`MARKET`**) 주문을 정규장 시작 전에 제출하는 경우**입니다. 이 조합은 `422`로 거부될 수 있으므로, 정규장에 다시 실행하거나 해당 시점에 허용되는 주문 유형과 가격 조건으로 바꿔야 합니다.

`--json`을 사용한 경우 결과 데이터는 stdout에 쓰지 않고, 오류는 stderr에 다음과 같이 출력됩니다. 현재 `HttpException`의 JSON 상세 정보는 오류 종류만 포함하므로, HTTP 상태는 `message`의 `HTTP 422` 부분으로 확인합니다.

```text
error_kind=HttpException {"error":{"code":"HttpException","details":{"name":"HttpException"},"message":"HTTP 422 <status text>"}}
```

422를 받으면 다음 순서로 처리합니다.

1. stderr의 `HTTP 422` 메시지를 확인하고, 제출한 주문 조건을 기록합니다.
2. 주문 시장, 주문 유형, 가격 조건, 현재 거래 세션을 점검합니다. 미국 주식 시장가 주문은 정규장 전·후에는 제출하지 않습니다.
3. 실주문을 다시 시도하기 전 최근 주문 내역을 조회해 중복 주문이 없는지 확인합니다.
4. 조건을 수정한 뒤 dry-run을 새로 만들고, 새 `clientOrderId`와 `summary`로 live 승인 절차를 다시 진행합니다.


## 고액 주문의 경우

고액 주문은 고액 주문 사항에 대한 명시적 동의를 파라미터로 전달해야하는 의무가 있습니다. 이는 토스 증권쪽에서 서술하는 의무사항이며, 기준 가격은 공개되어 있지 않습니다.

해당 조건에 해당되는 경우, 고액 주문 사항에 대한 동의 플래그가 없다면 토스 증권쪽에서 해당 주문 요청을 거부합니다. API내에 기능은 구현되어있으나, 현재 주문 안전 게이트에서 이를 지원하지 않고 있습니다. (구현 예정)


## 기능

- **인증과 실행 환경**
  - `auth login`은 `TOSS_INVEST_API_KEY`/`TOSS_INVEST_SECRET_KEY`및 암호화 정보를 KEYRING pair 를 사용하여 암호화 상태로 보관합니다. login 이후에는 .env 없이 CLI 사용이 가능합니다.
  - `auth login` JSON 응답의 `credentialSource`는 민감한 값 없이 출처 메타데이터만 반환합니다 (`environment`, `dotenv + path`, `prompt`).
  - `auth logout`은 encrypted store를 제거합니다.
  - 401 응답 시 자격 증명이 있으면 token을 한 번 재발급하고 재시도합니다.
  - `--json` 모드에서 stdout을 자동화 가능한 JSON 데이터로 유지하고, 오류·진단은 stderr로 분리하며 민감정보를 마스킹합니다.
- **시장과 종목 조회**
  - 호가, 현재가, 체결, 가격 제한, 캔들, 시장 랭킹을 조회합니다.
  - 지표 가격·캔들·투자자 거래 동향, 종목 메타데이터와 투자 유의 종목, 환율과 시장 일정을 조회합니다.
- **계좌와 포트폴리오 조회**
  - 계좌 목록, 보유 종목, 포트폴리오 요약을 조회합니다.
  - 통화별 주문 가능 금액, 매도 가능 수량, 수수료와 일반·조건부 주문 내역 및 상세 정보를 조회합니다.
- **주문과 관심 종목**
  - 일반 주문과 조건부 주문의 생성·수정·취소를 지원하며, 실거래 전에는 fail-closed 안전 정책을 적용합니다.
  - 로컬 관심 종목을 추가·삭제·조회하고, 등록 종목의 현재가를 조회합니다.



## 한계

- 이 CLI는 구현된 Toss Invest OpenAPI endpoint와 권한 범위만 다룹니다. API의 모든 기능이나 향후 변경 사항을 포괄하지 않습니다.
- Toss Invest OpenAPI는 현재 HTTPS 를 사용한 거래만 지원합니다. (WS 미지원). 실시간 거래가 필요한 경우 다른 HTS API를 권장합니다.
- 네트워크 상태, OpenAPI 접근 권한, rate limit, 응답 데이터의 정확성 및 가용성은 외부 서비스에 좌우됩니다.
- 계좌·주문 관련 명령은 유효한 자격 증명과 계좌 정보가 필요합니다. 로컬 관심 종목과 encrypted credential store는 기본적으로 `~/.config/toss-invest-cli` 아래에 저장됩니다.
- 주문 명령의 dry-run과 live 안전 게이트는 오주문 위험을 줄이기 위한 장치일 뿐, 투자 판단·체결·손실을 보장하지 않습니다. 실제 주문 전에는 출력된 조건과 주문 내용을 토스 증권 앱에서 독립적으로 확인해야 합니다.
- 사고 및 여러가지의 문제를 막기 위한 번잡한 과정 및 조치, 보호 수단들이 적용 되어 있지만 AI와 같이 사용하는 경우, `사용자의 관심어린 관리 감독`과 **실 제 주 문 작 동 여 부**, SECRET 관리(아주 매우 중요)가 필요합니다. 대표적인 실수 사례는 TSLL을 5$를 살 계획만 수립하라고 했더니, 5$를 이미 사버렸거나, 이미 TSLL을 5$를 샀는데, TSLL 5$를 또 사는 등의 케이스가 있습니다.



## 라이센스, 면책 조건

이 프로젝트는 MIT License 조건에 따라 `AS IS` 상태로 제공됩니다. 개인적인 사용을 위해 개발되었으며, 기본적으로는 연구 목적으로 공개합니다.

이 소프트웨어의 사용, 사용 불능, 투자 판단 또는 주문 실행으로 발생하는 직접적·간접적 손해와 문제에 대해 저작자와 기여자는 어떠한 책임도 지지 않습니다.

이 프로젝트는 토스 또는 토스증권과 관련이 없으며, 제휴 또는 보증되지 않습니다. `toss`, `toss-invest` 및 관련 용어는 **주식회사 비바리퍼블리카의 소유**입니다.