import z from "zod";

import {
	AccountTypeSchema,
	CurrencySchema,
	MarketCountrySchema,
} from "../enum";
import {
	ClientOrderIDSchema,
	ConditionalOrderIDSchema,
	OrderIDSchema,
} from "./identifier";

/**
 * 계좌 조회 응답 객체.
 * 계좌 번호, 계좌 일련번호, 계좌 타입을 필수로 갖는 기본 account 도메인 모델이다.
 */
export const AccountSchema = z.object({
	/**
	 * 계좌 번호를 나타내는 필수 문자열입니다.
	 */
	accountNo: z.string(),
	/**
	 * 계좌의 내부 일련번호를 나타내는 필수 숫자입니다.
	 */
	accountSeq: z.number(),
	/**
	 * 계좌 타입 코드를 나타내는 필수 enum 값입니다.
	 */
	accountType: AccountTypeSchema,
});
export type Account = z.infer<typeof AccountSchema>;

/**
 * 주문 생성 응답 기본 형태.
 * 서버가 반환하는 주문 식별자(orderId)와 clientOrderId(nullable/optional)를 정의한다.
 */
export const OrderResponseSchema = z.object({
	/**
	 * 주문 고유 식별자입니다.
	 */
	orderId: OrderIDSchema,
	/**
	 * 주문 생성 시 클라이언트가 관리하는 주문 ID입니다.
	 * 값이 없을 수도 있고, 값이 있을 때 null일 수도 있습니다.
	 */
	clientOrderId: ClientOrderIDSchema.nullable().optional(),
});
export type OrderResponse = z.infer<typeof OrderResponseSchema>;

/**
 * 주문 취소/수정 등 단일 주문 조작의 응답 스키마.
 * orderId만 포함한다.
 */
export const OrderOperationResponseSchema = z.object({
	/**
	 * 주문 조작 대상의 주문 고유 식별자입니다.
	 */
	orderId: OrderIDSchema,
});
export type OrderOperationResponse = z.infer<typeof OrderOperationResponseSchema>;

/**
 * 조건부 주문 기본 응답 스키마.
 * 조건부 주문 식별자만 필수로 반환되는 케이스를 표현한다.
 */
export const ConditionalOrderResponseSchema = z.object({
	/**
	 * 조건부 주문의 고유 식별자입니다.
	 */
	conditionalOrderId: ConditionalOrderIDSchema,
});
export type ConditionalOrderResponse = z.infer<typeof ConditionalOrderResponseSchema>;

/**
 * 조건부 주문 생성 응답 스키마.
 * 기본 조건부 주문 응답에 clientOrderId가 nullable/optional로 추가된다.
 */
export const ConditionalOrderCreateResponseSchema =
	ConditionalOrderResponseSchema.extend({
	/**
	 * 조건부 주문의 클라이언트 주문 ID입니다.
	 * 값이 없거나(null) 명시되지 않을 수 있습니다.
	 */
		clientOrderId: ClientOrderIDSchema.nullable().optional(),
	});
export type ConditionalOrderCreateResponse = z.infer<
	typeof ConditionalOrderCreateResponseSchema
>;

/**
 * 매수력 조회 응답.
 * 통화 단위와 현금 매수 가능 금액 문자열을 필수로 갖는다.
 */
export const BuyingPowerResponseSchema = z.object({
	/**
	 * 매수력 금액의 통화 코드입니다.
	 */
	currency: CurrencySchema,
	/**
	 * 예수금 기준으로 계산된 현금 매수 가능 금액 문자열입니다.
	 */
	cashBuyingPower: z.string(),
});
export type BuyingPowerResponse = z.infer<typeof BuyingPowerResponseSchema>;

/**
 * 매도 가능 수량 조회 응답.
 * sellableQuantity 문자열 필드만 필수로 노출한다.
 */
export const SellableQuantityResponseSchema = z.object({
	/**
	 * 잔고에서 매도 가능한 수량 문자열입니다.
	 */
	sellableQuantity: z.string(),
});
export type SellableQuantityResponse = z.infer<typeof SellableQuantityResponseSchema>;

/**
 * 수수료 정책 응답 스키마.
 * 시장/수수료율과 시작/종료일(둘 다 null/omit 가능)을 가진다.
 */
export const CommissionSchema = z.object({
	/**
	 * 적용 대상 국가 코드를 나타내는 필수 enum 값입니다.
	 */
	marketCountry: MarketCountrySchema,
	/**
	 * 해당 수수료 정책의 수수료율 문자열입니다.
	 */
	commissionRate: z.string(),
	/**
	 * 수수료 정책의 시작일입니다.
	 * 문자열이거나 null일 수 있으며, 필드가 생략될 수도 있습니다.
	 */
	startDate: z.string().nullable().optional(),
	/**
	 * 수수료 정책의 종료일입니다.
	 * 문자열이거나 null일 수 있으며, 필드가 생략될 수도 있습니다.
	 */
	endDate: z.string().nullable().optional(),
});
export type Commission = z.infer<typeof CommissionSchema>;


/**
 * OrderbookEntry 응답 값입니다.
 */
export const OrderbookEntrySchema = z.object({
	/**
	 * 호가
	 */
	price: z.string(),
	/**
	 * 잔량
	 */
	volume: z.string(),
});
export type OrderbookEntry = z.infer<typeof OrderbookEntrySchema>;

/**
 * OrderbookResponse 응답 값입니다.
 */
export const OrderbookResponseSchema = z.object({
	/**
	 * 데이터 시각. 데이터 미제공 시 null
	 */
	timestamp: z.string().nullable().optional(),
	/**
	 * currency 필드입니다.
	 */
	currency: CurrencySchema,
	/**
	 * 매도호가 목록 (낮은 가격순)
	 */
	asks: z.array(OrderbookEntrySchema),
	/**
	 * 매수호가 목록 (높은 가격순)
	 */
	bids: z.array(OrderbookEntrySchema),
});
export type OrderbookResponse = z.infer<typeof OrderbookResponseSchema>;

/**
 * PriceResponse 응답 값입니다.
 */
export const PriceResponseSchema = z.object({
	/**
	 * 종목 심볼
	 */
	symbol: z.string(),
	/**
	 * 데이터 시각. 체결 미발생 등으로 시각이 없을 경우 null
	 */
	timestamp: z.string().nullable().optional(),
	/**
	 * 현재가
	 */
	lastPrice: z.string(),
	/**
	 * currency 필드입니다.
	 */
	currency: CurrencySchema,
});
export type PriceResponse = z.infer<typeof PriceResponseSchema>;

/**
 * Trade 응답 값입니다.
 */
export const TradeSchema = z.object({
	/**
	 * 체결가
	 */
	price: z.string(),
	/**
	 * 체결 수량
	 */
	volume: z.string(),
	/**
	 * 체결 시각
	 */
	timestamp: z.string(),
	/**
	 * currency 필드입니다.
	 */
	currency: CurrencySchema,
});
export type Trade = z.infer<typeof TradeSchema>;

/**
 * PriceLimitResponse 응답 값입니다.
 */
export const PriceLimitResponseSchema = z.object({
	/**
	 * 데이터 시각
	 */
	timestamp: z.string(),
	/**
	 * 상한가. 미국 주식 등 가격제한이 없는 시장에서는 null
	 */
	upperLimitPrice: z.string().nullable().optional(),
	/**
	 * 하한가. 미국 주식 등 가격제한이 없는 시장에서는 null
	 */
	lowerLimitPrice: z.string().nullable().optional(),
	/**
	 * currency 필드입니다.
	 */
	currency: CurrencySchema,
});
export type PriceLimitResponse = z.infer<typeof PriceLimitResponseSchema>;

/**
 * Candle 응답 값입니다.
 */
export const CandleSchema = z.object({
	/**
	 * 봉 시작 시각
	 */
	timestamp: z.string(),
	/**
	 * 시가
	 */
	openPrice: z.string(),
	/**
	 * 고가
	 */
	highPrice: z.string(),
	/**
	 * 저가
	 */
	lowPrice: z.string(),
	/**
	 * 종가
	 */
	closePrice: z.string(),
	/**
	 * 거래량
	 */
	volume: z.string(),
	/**
	 * currency 필드입니다.
	 */
	currency: CurrencySchema,
});
export type Candle = z.infer<typeof CandleSchema>;

/**
 * CandlePageResponse 응답 값입니다.
 */
export const CandlePageResponseSchema = z.object({
	/**
	 * 캔들 목록
	 */
	candles: z.array(CandleSchema),
	/**
	 * 다음 페이지 조회 시 `before` 쿼리 파라미터에 그대로 전달. 마지막 페이지면 null.
	 */
	nextBefore: z.string().nullable().optional(),
});
export type CandlePageResponse = z.infer<typeof CandlePageResponseSchema>;

/**
 * KrMarketDetail 응답 값입니다.
 */
export const KrMarketDetailSchema = z.object({
	/**
	 * 정리매매 여부 (상장폐지 절차 진행 중).
	 */
	liquidationTrading: z.boolean(),
	/**
	 * NXT 대체거래소 지원 여부
	 */
	nxtSupported: z.boolean(),
	/**
	 * KRX 거래정지 여부
	 */
	krxTradingSuspended: z.boolean(),
	/**
	 * NXT 거래정지 여부. NXT 미지원 종목(nxtSupported=false)은 null
	 */
	nxtTradingSuspended: z.boolean().nullable().optional(),
});
export type KrMarketDetail = z.infer<typeof KrMarketDetailSchema>;

/**
 * StockInfo 응답 값입니다.
 */
export const StockInfoSchema = z.object({
	/**
	 * 종목 심볼.
	 */
	symbol: z.string(),
	/**
	 * 종목명 (한글)
	 */
	name: z.string(),
	/**
	 * 영문 종목명
	 */
	englishName: z.string(),
	/**
	 * 국제증권식별번호 (ISO 6166)
	 */
	isinCode: z.string(),
	/**
	 * 상장 시장. warnings API의 exchange(거래소 단위)와 달리 시장 세그먼트 단위로 구분
	 */
	market: z.enum(["KOSPI","KOSDAQ","NYSE","NASDAQ","AMEX","KR_ETC","US_ETC"]),
	/**
	 * 종목 유형
	 */
	securityType: z.enum(["STOCK","FOREIGN_STOCK","DEPOSITARY_RECEIPT","INFRASTRUCTURE_FUND","REIT","ETF","FOREIGN_ETF","ETN","STOCK_WARRANTS"]),
	/**
	 * 보통주 여부. 우선주인 경우 false
	 */
	isCommonShare: z.boolean(),
	/**
	 * 상장 상태
	 */
	status: z.enum(["SCHEDULED","ACTIVE","DELISTED"]),
	/**
	 * currency 필드입니다.
	 */
	currency: CurrencySchema,
	/**
	 * 상장일 (YYYY-MM-DD, KST 기준). 정보 미제공 시 null
	 */
	listDate: z.string().nullable().optional(),
	/**
	 * 상장폐지일 (YYYY-MM-DD, KST 기준). 활성 종목은 null
	 */
	delistDate: z.string().nullable().optional(),
	/**
	 * 발행주식수
	 */
	sharesOutstanding: z.string(),
	/**
	 * 레버리지 배수. ETF/ETN에만 적용 (1.0, 2.0, -1.0 등). 일반 주식 등 해당 없는 종목은 null
	 */
	leverageFactor: z.string().nullable().optional(),
	/**
	 * 국내 시장 상세 정보. 국내 종목(KOSPI, KOSDAQ, KR_ETC)에만 제공되며, 해외 종목은 null
	 */
	koreanMarketDetail: KrMarketDetailSchema.nullable().optional(),
});
export type StockInfo = z.infer<typeof StockInfoSchema>;

/**
 * StockWarning 응답 값입니다.
 */
export const StockWarningSchema = z.object({
	/**
	 * 유의사항 유형. 클라이언트는 unknown code 를 허용하도록 구현해야 합니다. | 값 | 의미 | |------|------| | `LIQUIDATION_TRADING` | 정리매매 (상장폐지 절차 진행 중) | | `OVERHEATED` | 단기과열종목 지정 | | `INVESTMENT_WARNING` | 투자경고종목 지정 | | `INVESTMENT_RISK` | 투자위험종목 지정 | | `VI_STATIC_AND_DYNAMIC` | 변동성 완화장치(VI) 정적 + 동적 동시 발동 | | `VI_STATIC` | 변동성 완화장치(VI) 정적 발동 | | `VI_DYNAMIC` | 변동성 완화장치(VI) 동적 발동 | | `STOCK_WARRANTS` | 신주인수권증서/증권 |
	 */
	warningType: z.enum(["LIQUIDATION_TRADING","OVERHEATED","INVESTMENT_WARNING","INVESTMENT_RISK","VI_STATIC_AND_DYNAMIC","VI_STATIC","VI_DYNAMIC","STOCK_WARRANTS"]),
	/**
	 * 거래소 코드 (KRX, NXT 등 물리적 거래소 단위). stocks API의 market(상장 시장 단위)과 추상화 수준이 다름. 거래소 무관 경고는 null
	 */
	exchange: z.string().nullable().optional(),
	/**
	 * 적용 시작일 (inclusive, YYYY-MM-DD, KST 기준). 시작일 미정 시 null
	 */
	startDate: z.string().nullable().optional(),
	/**
	 * 적용 종료일 (inclusive, YYYY-MM-DD, KST 기준). 진행 중이거나 미정 시 null
	 */
	endDate: z.string().nullable().optional(),
});
export type StockWarning = z.infer<typeof StockWarningSchema>;

/**
 * ExchangeRateResponse 응답 값입니다.
 */
export const ExchangeRateResponseSchema = z.object({
	/**
	 * 기준 통화
	 */
	baseCurrency: CurrencySchema,
	/**
	 * 표시 통화 (quote currency)
	 */
	quoteCurrency: CurrencySchema,
	/**
	 * 매수 환율 (1 baseCurrency = ? quoteCurrency)
	 */
	rate: z.string(),
	/**
	 * 매매기준율 (은행간 mid rate)
	 */
	midRate: z.string(),
	/**
	 * 매매기준율(midRate) 대비 basis points. (rate - midRate) / midRate * 10000
	 */
	basisPoint: z.string(),
	/**
	 * 등락 구분
	 */
	rateChangeType: z.enum(["UP","EQUAL","DOWN"]),
	/**
	 * 환율 유효 시작 시각
	 */
	validFrom: z.string(),
	/**
	 * 환율 유효 종료 시각
	 */
	validUntil: z.string(),
});
export type ExchangeRateResponse = z.infer<typeof ExchangeRateResponseSchema>;

/**
 * 프리마켓 세션
 */
export const PreMarketSessionSchema = z.object({
	/**
	 * 프리마켓 시작
	 */
	startTime: z.string(),
	/**
	 * 프리마켓 내 시가단일가 구간 시작 (NXT 프리마켓 접속매매 종료). 단일가 정보 결손 시 null
	 */
	singlePriceAuctionStartTime: z.string().nullable().optional(),
	/**
	 * 프리마켓 종료 (시가단일가 종료)
	 */
	endTime: z.string(),
});
export type PreMarketSession = z.infer<typeof PreMarketSessionSchema>;

/**
 * 정규장 세션. KRX·NXT 정규장의 합집합(가장 이른 시작 ~ 가장 늦은 종료). 종가단일가 구간을 포함
 */
export const RegularMarketSessionSchema = z.object({
	/**
	 * 정규장 시작. 가장 이른 KRX/NXT 정규장 시작 시각
	 */
	startTime: z.string(),
	/**
	 * 정규장 내 종가단일가 구간 시작 (KRX 기준). KRX 휴장이면 null
	 */
	singlePriceAuctionStartTime: z.string().nullable().optional(),
	/**
	 * 정규장 종료 (종가단일가 종료)
	 */
	endTime: z.string(),
});
export type RegularMarketSession = z.infer<typeof RegularMarketSessionSchema>;

/**
 * 애프터마켓 세션 (NXT)
 */
export const AfterMarketSessionSchema = z.object({
	/**
	 * 애프터마켓 시작
	 */
	startTime: z.string(),
	/**
	 * 애프터마켓 내 시가단일가 구간 종료.
	 */
	singlePriceAuctionEndTime: z.string().nullable().optional(),
	/**
	 * 애프터마켓 전체 종료
	 */
	endTime: z.string(),
});
export type AfterMarketSession = z.infer<typeof AfterMarketSessionSchema>;

/**
 * 거래 가능 시간. 특수장(시간외종가/시간외단일가) 제외, 통합 모드 (KRX+NXT) 기준. 세 세션(`preMarket`, `regularMarket`, `afterMarket`) 각각 nullable. 해당 세션이 휴장이면 null, 세 세션 모두 null 이면 상위 `integrated` 자체가 null.
 */
export const IntegratedHourSchema = z.object({
	/**
	 * 프리마켓 (NXT 접속매매). NXT 프리마켓이 휴장이면 null
	 */
	preMarket: PreMarketSessionSchema.nullable().optional(),
	/**
	 * 정규장. KRX·NXT 정규장의 합집합. 둘 다 휴장이면 null
	 */
	regularMarket: RegularMarketSessionSchema.nullable().optional(),
	/**
	 * 애프터마켓 (NXT). NXT 애프터마켓이 휴장이면 null
	 */
	afterMarket: AfterMarketSessionSchema.nullable().optional(),
});
export type IntegratedHour = z.infer<typeof IntegratedHourSchema>;

/**
 * KrMarketDay 응답 값입니다.
 */
export const KrMarketDaySchema = z.object({
	/**
	 * 영업일 (KST 기준)
	 */
	date: z.string(),
	/**
	 * 거래 가능 시간 (통합 모드 (KRX+NXT) 기준). 둘 다 휴장이면 null
	 */
	integrated: IntegratedHourSchema.nullable().optional(),
});
export type KrMarketDay = z.infer<typeof KrMarketDaySchema>;

/**
 * KrMarketCalendarResponse 응답 값입니다.
 */
export const KrMarketCalendarResponseSchema = z.object({
	/**
	 * today 필드입니다.
	 */
	today: KrMarketDaySchema,
	/**
	 * previousBusinessDay 필드입니다.
	 */
	previousBusinessDay: KrMarketDaySchema,
	/**
	 * nextBusinessDay 필드입니다.
	 */
	nextBusinessDay: KrMarketDaySchema,
});
export type KrMarketCalendarResponse = z.infer<typeof KrMarketCalendarResponseSchema>;

/**
 * 데이마켓 세션 (토스증권)
 */
export const UsDayMarketSessionSchema = z.object({
	/**
	 * 데이마켓 시작
	 */
	startTime: z.string(),
	/**
	 * 데이마켓 종료
	 */
	endTime: z.string(),
});
export type UsDayMarketSession = z.infer<typeof UsDayMarketSessionSchema>;

/**
 * 프리마켓 세션
 */
export const UsPreMarketSessionSchema = z.object({
	/**
	 * 프리마켓 시작
	 */
	startTime: z.string(),
	/**
	 * 프리마켓 종료
	 */
	endTime: z.string(),
});
export type UsPreMarketSession = z.infer<typeof UsPreMarketSessionSchema>;

/**
 * 정규장 세션
 */
export const UsRegularMarketSessionSchema = z.object({
	/**
	 * 정규장 시작
	 */
	startTime: z.string(),
	/**
	 * 정규장 종료
	 */
	endTime: z.string(),
});
export type UsRegularMarketSession = z.infer<typeof UsRegularMarketSessionSchema>;

/**
 * 애프터마켓 세션
 */
export const UsAfterMarketSessionSchema = z.object({
	/**
	 * 애프터마켓 시작
	 */
	startTime: z.string(),
	/**
	 * 애프터마켓 종료
	 */
	endTime: z.string(),
});
export type UsAfterMarketSession = z.infer<typeof UsAfterMarketSessionSchema>;

/**
 * 미국 시장 영업일 정보. 4 세션(`dayMarket`, `preMarket`, `regularMarket`, `afterMarket`) 각각 nullable. 휴장일이면 4 세션 모두 null.
 */
export const UsMarketDaySchema = z.object({
	/**
	 * 영업일 (미국 현지 기준)
	 */
	date: z.string(),
	/**
	 * 데이마켓 세션 (토스증권). 휴장이면 null
	 */
	dayMarket: UsDayMarketSessionSchema.nullable().optional(),
	/**
	 * 프리마켓 세션. 휴장이면 null
	 */
	preMarket: UsPreMarketSessionSchema.nullable().optional(),
	/**
	 * 정규장 세션. 휴장이면 null
	 */
	regularMarket: UsRegularMarketSessionSchema.nullable().optional(),
	/**
	 * 애프터마켓 세션. 휴장이면 null
	 */
	afterMarket: UsAfterMarketSessionSchema.nullable().optional(),
});
export type UsMarketDay = z.infer<typeof UsMarketDaySchema>;

/**
 * UsMarketCalendarResponse 응답 값입니다.
 */
export const UsMarketCalendarResponseSchema = z.object({
	/**
	 * today 필드입니다.
	 */
	today: UsMarketDaySchema,
	/**
	 * previousBusinessDay 필드입니다.
	 */
	previousBusinessDay: UsMarketDaySchema,
	/**
	 * nextBusinessDay 필드입니다.
	 */
	nextBusinessDay: UsMarketDaySchema,
});
export type UsMarketCalendarResponse = z.infer<typeof UsMarketCalendarResponseSchema>;

/**
 * RankingPrice 응답 값입니다.
 */
export const RankingPriceSchema = z.object({
	/**
	 * 현재가
	 */
	lastPrice: z.string(),
	/**
	 * 기준가. `TOP_GAINERS` / `TOP_LOSERS` 는 `duration` 시작 시점 기준가, 나머지 타입은 `duration` 과 무관하게 항상 전일 기준가.
	 */
	basePrice: z.string(),
	/**
	 * 등락률, 소수비율 (`0.0125` = 1.25%). `(lastPrice - basePrice) / basePrice`. `basePrice` 가 0 이면 null. `basePrice` 의 의미를 따라 `TOP_GAINERS` / `TOP_LOSERS` 는 기간 등락률, 나머지 타입은 전일 대비 등락률입니다.
	 */
	changeRate: z.string().nullable().optional(),
});
export type RankingPrice = z.infer<typeof RankingPriceSchema>;

/**
 * RankingItem 응답 값입니다.
 */
export const RankingItemSchema = z.object({
	/**
	 * 순위. 1부터 시작
	 */
	rank: z.number().int(),
	/**
	 * 종목 심볼. KR: 6자리 숫자 (예: 005930), US: 영문 티커 (예: AAPL)
	 */
	symbol: z.string(),
	/**
	 * currency 필드입니다.
	 */
	currency: CurrencySchema,
	/**
	 * price 필드입니다.
	 */
	price: RankingPriceSchema,
	/**
	 * 거래량 (`duration` 누적). 집계 기준은 `type` 이 결정합니다 — `TOSS_SECURITIES_*` 는 토스증권 체결 기준, 그 외(`MARKET_*` / `TOP_*`)는 시장 전체 기준.
	 */
	tradingVolume: z.string(),
	/**
	 * 거래대금 (`duration` 누적). 집계 기준은 `tradingVolume` 과 동일합니다.
	 */
	tradingAmount: z.string(),
});
export type RankingItem = z.infer<typeof RankingItemSchema>;

/**
 * RankingResponse 응답 값입니다.
 */
export const RankingResponseSchema = z.object({
	/**
	 * 랭킹 집계 기준 시각. `rankings` 가 빈 배열이면 null
	 */
	rankedAt: z.string().nullable().optional(),
	/**
	 * 랭킹 종목 목록 (순위 오름차순). 집계 데이터가 없으면 빈 배열. 항목 수는 `count` 이하일 수 있습니다.
	 */
	rankings: z.array(RankingItemSchema),
});
export type RankingResponse = z.infer<typeof RankingResponseSchema>;

/**
 * MarketIndicatorPriceResponse 응답 값입니다.
 */
export const MarketIndicatorPriceResponseSchema = z.object({
	/**
	 * 시장 지표 심볼. `GET /api/v1/market-indicators/prices` 의 심볼 카탈로그 참조
	 */
	symbol: z.string(),
	/**
	 * 데이터 시각. 데이터 미제공 시 null
	 */
	timestamp: z.string().nullable().optional(),
	/**
	 * 현재가. 시장 호가 그대로이며, 통화·단위는 심볼 카탈로그를 따릅니다
	 */
	lastPrice: z.string(),
});
export type MarketIndicatorPriceResponse = z.infer<typeof MarketIndicatorPriceResponseSchema>;

/**
 * MarketIndicatorCandle 응답 값입니다.
 */
export const MarketIndicatorCandleSchema = z.object({
	/**
	 * 봉 시작 시각
	 */
	timestamp: z.string(),
	/**
	 * 시가
	 */
	openPrice: z.string(),
	/**
	 * 고가
	 */
	highPrice: z.string(),
	/**
	 * 저가
	 */
	lowPrice: z.string(),
	/**
	 * 종가
	 */
	closePrice: z.string(),
	/**
	 * 거래량
	 */
	volume: z.string(),
});
export type MarketIndicatorCandle = z.infer<typeof MarketIndicatorCandleSchema>;

/**
 * MarketIndicatorCandlePageResponse 응답 값입니다.
 */
export const MarketIndicatorCandlePageResponseSchema = z.object({
	/**
	 * 캔들 목록
	 */
	candles: z.array(MarketIndicatorCandleSchema),
	/**
	 * 다음 페이지 조회 시 `before` 쿼리 파라미터에 그대로 전달. 마지막 페이지면 null.
	 */
	nextBefore: z.string().nullable().optional(),
});
export type MarketIndicatorCandlePageResponse = z.infer<typeof MarketIndicatorCandlePageResponseSchema>;

/**
 * InvestorTradingAmount 응답 값입니다.
 */
export const InvestorTradingAmountSchema = z.object({
	/**
	 * 매수 거래대금 (KRW, 정수)
	 */
	buyAmount: z.string(),
	/**
	 * 매도 거래대금 (KRW, 정수)
	 */
	sellAmount: z.string(),
});
export type InvestorTradingAmount = z.infer<typeof InvestorTradingAmountSchema>;

/**
 * 기관 세부 7개 분류별 매매대금
 */
export const InstitutionTradingBreakdownSchema = z.object({
	/**
	 * 금융투자
	 */
	financialInvestment: InvestorTradingAmountSchema,
	/**
	 * 보험
	 */
	insurance: InvestorTradingAmountSchema,
	/**
	 * 투신
	 */
	trust: InvestorTradingAmountSchema,
	/**
	 * 사모펀드
	 */
	privateEquityFund: InvestorTradingAmountSchema,
	/**
	 * 은행
	 */
	bank: InvestorTradingAmountSchema,
	/**
	 * 기타금융
	 */
	otherFinancialInstitution: InvestorTradingAmountSchema,
	/**
	 * 연기금
	 */
	pensionFund: InvestorTradingAmountSchema,
});
export type InstitutionTradingBreakdown = z.infer<typeof InstitutionTradingBreakdownSchema>;

/**
 * InstitutionTradingAmount 응답 값입니다.
 */
export const InstitutionTradingAmountSchema = z.object({
	/**
	 * 기관 합계 매수 거래대금 (KRW, 정수). `breakdown` 7개 항목의 `buyAmount` 합과 일치
	 */
	buyAmount: z.string(),
	/**
	 * 기관 합계 매도 거래대금 (KRW, 정수). `breakdown` 7개 항목의 `sellAmount` 합과 일치
	 */
	sellAmount: z.string(),
	/**
	 * breakdown 필드입니다.
	 */
	breakdown: InstitutionTradingBreakdownSchema,
});
export type InstitutionTradingAmount = z.infer<typeof InstitutionTradingAmountSchema>;

/**
 * InvestorTradingRecord 응답 값입니다.
 */
export const InvestorTradingRecordSchema = z.object({
	/**
	 * 집계 기준일. `interval` 이 나타내는 집계 기간의 대표 일자
	 */
	date: z.string(),
	/**
	 * 해당 기록의 마지막 갱신 시각. 당일 기록은 장 종료 전까지 갱신될 수 있으므로, 이 값으로 확정치·잠정치 여부를 판단할 수 있습니다.
	 */
	updatedAt: z.string(),
	/**
	 * 개인
	 */
	individual: InvestorTradingAmountSchema,
	/**
	 * 외국인 합계 (등록·미등록 외국인 포함)
	 */
	foreigner: InvestorTradingAmountSchema,
	/**
	 * 기관 합계. `buyAmount`/`sellAmount` 는 `breakdown` 7개 항목의 합과 일치합니다
	 */
	institution: InstitutionTradingAmountSchema,
	/**
	 * 기타법인
	 */
	otherCorporation: InvestorTradingAmountSchema,
});
export type InvestorTradingRecord = z.infer<typeof InvestorTradingRecordSchema>;

/**
 * InvestorTradingResponse 응답 값입니다.
 */
export const InvestorTradingResponseSchema = z.object({
	/**
	 * 다음 페이지 조회 기준일. 다음 페이지 조회 시 `until` 쿼리 파라미터에 그대로 전달. 더 이상 데이터가 없으면 null
	 */
	nextUntil: z.string().nullable().optional(),
	/**
	 * 집계 기간별 매매대금 기록 목록 (최신순). 데이터가 없으면 빈 배열
	 */
	records: z.array(InvestorTradingRecordSchema),
});
export type InvestorTradingResponse = z.infer<typeof InvestorTradingResponseSchema>;

/**
 * 통화별 합산 금액. 각 통화 필드는 해당 통화로 거래된 종목의 합만 포함합니다 (환율 환산을 통한 통화 간 합산 미포함).
 */
export const PriceSchema = z.object({
	/**
	 * KRW로 거래되는 국내 종목의 합산 금액. 국내 종목이 없으면 0
	 */
	krw: z.string(),
	/**
	 * USD로 거래되는 해외 종목의 합산 금액. 해외 종목이 없으면 null
	 */
	usd: z.string().nullable().optional(),
});
export type Price = z.infer<typeof PriceSchema>;

/**
 * 시장 평가금액. 전체 보유 종목의 통화별 합산
 */
export const OverviewMarketValueSchema = z.object({
	/**
	 * 시장 평가금액
	 */
	amount: PriceSchema,
	/**
	 * 세금/수수료 공제 후 평가금액
	 */
	amountAfterCost: PriceSchema,
});
export type OverviewMarketValue = z.infer<typeof OverviewMarketValueSchema>;

/**
 * 손익. 전체 보유 종목의 통화별 합산
 */
export const OverviewProfitLossSchema = z.object({
	/**
	 * 손익금액
	 */
	amount: PriceSchema,
	/**
	 * 세금/수수료 공제 후 손익금액
	 */
	amountAfterCost: PriceSchema,
	/**
	 * 손익률 (소수비율). 전체 자산을 현재 환율로 원화 환산한 기준. 0.1516 = 15.16%
	 */
	rate: z.string(),
	/**
	 * 세금/수수료 공제 후 손익률 (소수비율). 전체 자산을 현재 환율로 원화 환산한 기준. 0.1406 = 14.06%
	 */
	rateAfterCost: z.string(),
});
export type OverviewProfitLoss = z.infer<typeof OverviewProfitLossSchema>;

/**
 * 일간 손익. 전체 보유 종목의 통화별 합산
 */
export const OverviewDailyProfitLossSchema = z.object({
	/**
	 * 일간 손익금액
	 */
	amount: PriceSchema,
	/**
	 * 일간 손익률 (소수비율). 전체 자산을 현재 환율로 원화 환산한 기준. 0.0185 = 1.85%
	 */
	rate: z.string(),
});
export type OverviewDailyProfitLoss = z.infer<typeof OverviewDailyProfitLossSchema>;

/**
 * 시장 평가. 거래 통화(currency) 기준
 */
export const MarketValueSchema = z.object({
	/**
	 * 매입금액
	 */
	purchaseAmount: z.string(),
	/**
	 * 시장 평가금액
	 */
	amount: z.string(),
	/**
	 * 세금/수수료 공제 후 평가금액
	 */
	amountAfterCost: z.string(),
});
export type MarketValue = z.infer<typeof MarketValueSchema>;

/**
 * 손익. 거래 통화(currency) 기준
 */
export const ProfitLossSchema = z.object({
	/**
	 * 손익금액
	 */
	amount: z.string(),
	/**
	 * 세금/수수료 공제 후 손익금액
	 */
	amountAfterCost: z.string(),
	/**
	 * 손익률. 소수비율 (0.1077 = 10.77%)
	 */
	rate: z.string(),
	/**
	 * 세금/수수료 공제 후 손익률. 소수비율 (0.0846 = 8.46%)
	 */
	rateAfterCost: z.string(),
});
export type ProfitLoss = z.infer<typeof ProfitLossSchema>;

/**
 * 일간 손익. 거래 통화(currency) 기준
 */
export const DailyProfitLossSchema = z.object({
	/**
	 * 일간 손익금액
	 */
	amount: z.string(),
	/**
	 * 일간 손익률. 소수비율 (0.0141 = 1.41%)
	 */
	rate: z.string(),
});
export type DailyProfitLoss = z.infer<typeof DailyProfitLossSchema>;

/**
 * 비용. 거래 통화(currency) 기준
 */
export const CostSchema = z.object({
	/**
	 * 수수료
	 */
	commission: z.string(),
	/**
	 * 세금. 세금이 없는 경우 null
	 */
	tax: z.string().nullable().optional(),
});
export type Cost = z.infer<typeof CostSchema>;

/**
 * HoldingsItem 응답 값입니다.
 */
export const HoldingsItemSchema = z.object({
	/**
	 * 종목 심볼. KR: 6자리 숫자, US: 티커
	 */
	symbol: z.string(),
	/**
	 * 종목명
	 */
	name: z.string(),
	/**
	 * marketCountry 필드입니다.
	 */
	marketCountry: MarketCountrySchema,
	/**
	 * currency 필드입니다.
	 */
	currency: CurrencySchema,
	/**
	 * 보유 수량
	 */
	quantity: z.string(),
	/**
	 * 현재가. 거래 통화(currency) 기준
	 */
	lastPrice: z.string(),
	/**
	 * 매수 평균가. 거래 통화(currency) 기준
	 */
	averagePurchasePrice: z.string(),
	/**
	 * marketValue 필드입니다.
	 */
	marketValue: MarketValueSchema,
	/**
	 * profitLoss 필드입니다.
	 */
	profitLoss: ProfitLossSchema,
	/**
	 * dailyProfitLoss 필드입니다.
	 */
	dailyProfitLoss: DailyProfitLossSchema,
	/**
	 * cost 필드입니다.
	 */
	cost: CostSchema,
});
export type HoldingsItem = z.infer<typeof HoldingsItemSchema>;

/**
 * HoldingsOverview 응답 값입니다.
 */
export const HoldingsOverviewSchema = z.object({
	/**
	 * 투자원금. 전체 보유 종목의 통화별 합산
	 */
	totalPurchaseAmount: PriceSchema,
	/**
	 * marketValue 필드입니다.
	 */
	marketValue: OverviewMarketValueSchema,
	/**
	 * profitLoss 필드입니다.
	 */
	profitLoss: OverviewProfitLossSchema,
	/**
	 * dailyProfitLoss 필드입니다.
	 */
	dailyProfitLoss: OverviewDailyProfitLossSchema,
	/**
	 * 보유 종목 목록. 보유 종목이 없으면 빈 배열
	 */
	items: z.array(HoldingsItemSchema),
});
export type HoldingsOverview = z.infer<typeof HoldingsOverviewSchema>;

/**
 * 주문 상태. - `PENDING`: 체결 대기. 주문이 접수되어 체결을 대기 중인 상태 - `PENDING_CANCEL`: 취소 대기. 취소 요청이 접수되어 브로커 응답을 대기 중인 상태 - `PENDING_REPLACE`: 정정 대기. 정정 요청이 접수되어 브로커 응답을 대기 중인 상태 - `PARTIAL_FILLED`: 부분 체결. 주문 수량 중 일부만 체결된 상태 - `FILLED`: 체결 완료. 주문 수량이 전량 체결된 상태 - `CANCELED`: 취소 완료. execution.filledQuantity를 통해 부분 체결 여부를 확인할 수 있음 - `REJECTED`: 거부됨. 브로커가 주문을 거부한 상태. execution.filledQuantity를 통해 부분 체결 여부를 확인할 수 있음 - `CANCEL_REJECTED`: 취소 거부. 브로커가 취소 요청을 거부한 경우 별도 주문 레코드로 생성됨. 원주문은 이전 상태로 복귀함 - `REPLACE_REJECTED`: 정정 거부. 브로커가 정정 요청을 거부한 경우 별도 주문 레코드로 생성됨. 원주문은 이전 상태로 복귀함 - `REPLACED`: 정정됨. 정정 요청이 수락되어 원주문이 대체된 상태. execution.filledQuantity를 통해 부분 체결 여부를 확인할 수 있음 클라이언트는 unknown code 를 허용하도록 구현해야 합니다.
 */
export const OrderStatusSchema = z.enum(["PENDING","PENDING_CANCEL","PENDING_REPLACE","PARTIAL_FILLED","FILLED","CANCELED","REJECTED","CANCEL_REJECTED","REPLACE_REJECTED","REPLACED"]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

/**
 * OrderExecution 응답 값입니다.
 */
export const OrderExecutionSchema = z.object({
	/**
	 * 체결 수량
	 */
	filledQuantity: z.string(),
	/**
	 * 평균 체결 가격 (native currency). 부분 체결 시 체결된 건의 평균
	 */
	averageFilledPrice: z.string().nullable(),
	/**
	 * 총 체결 금액 (native currency)
	 */
	filledAmount: z.string().nullable(),
	/**
	 * 총 체결 수수료 (native currency)
	 */
	commission: z.string().nullable(),
	/**
	 * 총 체결 세금 (native currency)
	 */
	tax: z.string().nullable(),
	/**
	 * 최종 체결 시간 (ISO 8601, KST)
	 */
	filledAt: z.string().nullable(),
	/**
	 * 결제 예정일 (YYYY-MM-DD, KST 기준). 미결제 시 null
	 */
	settlementDate: z.string().nullable(),
});
export type OrderExecution = z.infer<typeof OrderExecutionSchema>;

/**
 * Order 응답 값입니다.
 */
export const OrderSchema = z.object({
	/**
	 * 주문 식별자
	 */
	orderId: z.string(),
	/**
	 * 종목 심볼. KRX: 6자리 숫자, US: 영문 티커
	 */
	symbol: z.string(),
	/**
	 * 주문 방향
	 */
	side: z.enum(["BUY","SELL"]),
	/**
	 * 호가 유형. - `LIMIT`: 지정가 - `MARKET`: 시장가 클라이언트는 unknown code 를 허용하도록 구현해야 합니다.
	 */
	orderType: z.enum(["LIMIT","MARKET"]),
	/**
	 * 주문 유효 조건 (Time In Force). `orderType` 과 결합되어 주문 방식이 결정됩니다 (예: `LIMIT` + `CLS` = LOC). - `DAY`: 당일 유효 (Day) - `CLS`: 장 마감 주문 (At the Close) - `OPG`: 장 개시 주문 (At the Opening). 현재는 지원하지 않습니다. 클라이언트는 unknown code 를 허용하도록 구현해야 합니다.
	 */
	timeInForce: z.enum(["DAY","CLS","OPG"]),
	/**
	 * status 필드입니다.
	 */
	status: OrderStatusSchema,
	/**
	 * 주문 가격 (native currency). MARKET 주문 시 null
	 */
	price: z.string().nullable().optional(),
	/**
	 * 주문 수량
	 */
	quantity: z.string(),
	/**
	 * 주문 금액 (USD). 금액 기반 US 시장가 매수 주문에만 해당. 그 외 null
	 */
	orderAmount: z.string().nullable().optional(),
	/**
	 * currency 필드입니다.
	 */
	currency: CurrencySchema,
	/**
	 * 주문 시간 (ISO 8601, KST)
	 */
	orderedAt: z.string(),
	/**
	 * 취소 시간 (ISO 8601, KST). 해당 없으면 null
	 */
	canceledAt: z.string().nullable().optional(),
	/**
	 * 체결 결과. 체결 내역이 없으면 filledQuantity=0
	 */
	execution: OrderExecutionSchema,
});
export type Order = z.infer<typeof OrderSchema>;

/**
 * 주문 목록 페이징 응답. - `status=OPEN`: 모든 대기 중 주문을 반환합니다. `nextCursor`는 항상 `null`, `hasNext`는 항상 `false`. - `status=CLOSED`: 현재 호출 시 `400 closed-not-supported` 를 반환합니다.
 */
export const PaginatedOrderResponseSchema = z.object({
	/**
	 * 주문 목록
	 */
	orders: z.array(OrderSchema),
	/**
	 * 다음 페이지 커서. 다음 페이지가 없으면 null
	 */
	nextCursor: z.string().nullable(),
	/**
	 * 다음 페이지 존재 여부
	 */
	hasNext: z.boolean(),
});
export type PaginatedOrderResponse = z.infer<typeof PaginatedOrderResponseSchema>;

/**
 * ConditionalOrderCondition 응답 값입니다.
 */
export const ConditionalOrderConditionSchema = z.object({
	/**
	 * 감시 조건 세부 타입 (그룹 타입을 구성하는 단위). - `STOP`: 가격 트리거 - `PROFIT_RATE`: 목표 수익률(%) 트리거 그룹(OCO/OTO)의 `first` 와 `second` 는 항상 동일한 타입입니다.
	 */
	type: z.enum(["STOP","PROFIT_RATE"]),
	/**
	 * 조건(leg) 단위 상태. 최상위 조건주문 `status` 와 달리 leg 전용인 `HOLDING`·`CANCELED` 를 포함합니다. - `HOLDING`: 선행 조건(OTO first) 체결 전 대기 (leg 전용) - `CANCELED`: 취소됨 (완료된 OCO 에서 자동취소된 반대편 조건)
	 */
	status: z.enum(["WATCHING","HOLDING","PAUSED","ORDERING","ORDERED","COMPLETED","EXPIRED","CANCELED"]),
	/**
	 * 이 가격에 닿으면 트리거됩니다. 현재 지원 조건은 항상 값이 존재하나, 향후 수익률(PROFIT_RATE)·추종형 조건은 고정 트리거가가 없어 null 일 수 있습니다.
	 */
	triggerPrice: z.string().nullable().optional(),
	/**
	 * [PROFIT_RATE 전용] 감시 수익률. **퍼센트(%) 단위**입니다 (예: `10.5` = +10.5%). PROFIT_RATE 이 아닌 조건이면 null.
	 */
	targetProfitRate: z.string().nullable().optional(),
	/**
	 * 주문 가격(지정가). 그룹 호가유형(orderType)이 LIMIT 이면 값이 있고, MARKET 이면 null.
	 */
	orderPrice: z.string().nullable().optional(),
	/**
	 * 조건 충족으로 생성된 주문의 ID. 일반 주문 API(`GET /orders/{orderId}` 등)에 그대로 사용할 수 있습니다. 주문 생성 전이면 null.
	 */
	triggeredOrderId: z.string().nullable().optional(),
});
export type ConditionalOrderCondition = z.infer<typeof ConditionalOrderConditionSchema>;

/**
 * 조건주문 조회 응답 (목록 항목 / 상세 공용). 모든 타입을 단일 스키마로 표현하며, 감시 조건은 `first`/`second` 로 내려갑니다 (SINGLE 은 `first` 만, OCO/OTO 는 `second` 도 존재).
 */
export const ConditionalOrderDetailResponseSchema = z.object({
	/**
	 * 조건주문 식별자. 상세 조회·수정·취소에 사용합니다.
	 */
	conditionalOrderId: z.string(),
	/**
	 * 조건주문 타입. - `SINGLE`: 한 조건만 감시 - `OCO` (One-Cancels-the-Other): 두 조건을 동시에 감시, 하나의 조건 충족 시 나머지 조건 자동 취소 - `OTO` (One-Triggers-the-Other): `first` 조건 체결 후 `second` 조건 감시 시작
	 */
	type: z.enum(["SINGLE","OCO","OTO"]),
	/**
	 * 조건주문(그룹) 상태 — 살아있는 조건(leg)의 상태를 대표로 따릅니다. leg 전용 상태인 `HOLDING`·`CANCELED` 는 최상위 status 로는 내려오지 않습니다 (조건별 상태 `first.status`/`second.status` 에서만 노출). - `WATCHING`: 조건 감시 중 - `PAUSED`: 일시중지 - `ORDERING`: 조건 충족 — 주문 생성 진행 중 - `ORDERED`: 주문 생성됨 - `COMPLETED`: 완료 - `EXPIRED`: 만료
	 */
	status: z.enum(["WATCHING","PAUSED","ORDERING","ORDERED","COMPLETED","EXPIRED"]),
	/**
	 * 종목 심볼. KRX: 6자리 숫자, US: 영문 티커
	 */
	symbol: z.string(),
	/**
	 * 시장 구분
	 */
	market: z.enum(["KR","US"]),
	/**
	 * 매매 수량 (주 단위, 그룹 공통).
	 */
	quantity: z.string(),
	/**
	 * 호가유형 (그룹 공통). LIMIT(지정가)/MARKET(시장가).
	 */
	orderType: z.enum(["LIMIT","MARKET"]),
	/**
	 * 조건주문 만료일 (조건주문 1건의 모든 감시 조건이 공유). 이 날짜까지 미충족 시 자동 만료됩니다.
	 */
	expireDate: z.string().optional(),
	/**
	 * 첫번째 감시 조건 (OTO 는 부모)
	 */
	first: ConditionalOrderConditionSchema,
	/**
	 * 두번째 감시 조건. OCO/OTO 만 존재하며 단일(SINGLE)은 null.
	 */
	second: ConditionalOrderConditionSchema.optional(),
	/**
	 * 조건주문 등록 시각 (KST)
	 */
	createdAt: z.string(),
});
export type ConditionalOrderDetailResponse = z.infer<typeof ConditionalOrderDetailResponseSchema>;

/**
 * PaginatedConditionalOrderResponse 응답 값입니다.
 */
export const PaginatedConditionalOrderResponseSchema = z.object({
	/**
	 * conditionalOrders 필드입니다.
	 */
	conditionalOrders: z.array(ConditionalOrderDetailResponseSchema),
	/**
	 * 다음 페이지 커서. 마지막 페이지면 null.
	 */
	nextCursor: z.string().nullable().optional(),
	/**
	 * 다음 페이지 존재 여부
	 */
	hasNext: z.boolean(),
});
export type PaginatedConditionalOrderResponse = z.infer<typeof PaginatedConditionalOrderResponseSchema>;
