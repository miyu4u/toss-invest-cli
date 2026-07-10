import z from "zod";

import {
	AccountScopedParamsSchema,
} from "../helper-schema";
import {
	CandleIntervalSchema,
	CurrencySchema,
	InvestorTradingIntervalSchema,
	InvestorTradingSymbolSchema,
	MarketCountrySchema,
	OrderStatusFilterSchema,
	RankingDurationSchema,
	RankingTypeSchema,
} from "../enum";
import { ConditionalOrderIDSchema, OrderIDSchema } from "./identifier";

/**
 * 호가창 조회 쿼리 스키마.
 * symbol은 필수 문자열이다.
 */
export const GetOrderbookParamsSchema = z.object({
	/**
	 * 조회할 주문 호가창의 종목 코드를 문자열로 지정한다.
	 * 값이 없으면 스키마 검증에서 실패한다.
	 */
	symbol: z.string(),
});
export type GetOrderbookParams = z.infer<typeof GetOrderbookParamsSchema>;

/**
 * 다중 시세 조회 쿼리 스키마.
 * symbols 문자열은 필수이며 API에 전달되는 목록 파라미터이다.
 */
export const GetPricesParamsSchema = z.object({
	/**
	 * 조회할 시세들의 종목 목록 파라미터를 문자열로 전달한다.
	 * 값은 API 요청용 필수 입력 항목이다.
	 */
	symbols: z.string(),
});
export type GetPricesParams = z.infer<typeof GetPricesParamsSchema>;

/**
 * 체결내역 조회 쿼리 스키마.
 * symbol 필수, count는 선택으로 반환 개수를 조절한다.
 */
export const GetTradesParamsSchema = z.object({
	/**
	 * 조회 대상 주문 체결이 발생한 종목 코드.
	 * 필수 문자열로 전달해야 한다.
	 */
	symbol: z.string(),
	/**
	 * 응답 건수를 제한하는 선택 파라미터.
	 * 미지정 시 기본 동작으로 조회한다.
	 */
	count: z.number().optional(),
});
export type GetTradesParams = z.infer<typeof GetTradesParamsSchema>;

/**
 * 가격 제한 조회 쿼리 스키마.
 * symbol 필수 문자열이다.
 */
export const GetPriceLimitParamsSchema = z.object({
	/**
	 * 가격 제한 조회할 종목 코드.
	 * 필수 문자열이며 빈 값 허용은 스키마에 위임한다.
	 */
	symbol: z.string(),
});
export type GetPriceLimitParams = z.infer<typeof GetPriceLimitParamsSchema>;

/**
 * 캔들 조회 쿼리 스키마.
 * symbol/interval 필수이며 count/before/adjusted는 선택으로 분기점/개수/조정 여부를 제어한다.
 */
export const GetCandlesParamsSchema = z.object({
	/**
	 * 캔들 조회 대상 종목 코드.
	 * 필수 문자열이다.
	 */
	symbol: z.string(),
	/**
	 * 캔들 단위(interval) 제한.
	 * CandleIntervalSchema에 정의된 값만 허용한다.
	 */
	interval: CandleIntervalSchema,
	/**
	 * 조회할 캔들 개수를 조정하는 선택 파라미터.
	 * 숫자 생략 시 기본 제한이 적용된다.
	 */
	count: z.number().optional(),
	/**
	 * 기준 기준점 이전 데이터 조회용 문자열 기준값.
	 * 존재하면 필수값으로 간주되지 않는다.
	 */
	before: z.string().optional(),
	/**
	 * 지표 조정값 적용 여부.
	 * 제공되면 boolean 값만 허용한다.
	 */
	adjusted: z.boolean().optional(),
});
export type GetCandlesParams = z.infer<typeof GetCandlesParamsSchema>;

/**
 * 주식 목록 조회 쿼리 스키마.
 * symbols 문자열은 필수이다.
 */
export const GetStocksParamsSchema = z.object({
	/**
	 * 조회할 종목 목록 문자열.
	 * 필수 입력이며 API 형식에 맞는 문자열이어야 한다.
	 */
	symbols: z.string(),
});
export type GetStocksParams = z.infer<typeof GetStocksParamsSchema>;

/**
 * 종목 경고 조회 쿼리 스키마.
 * symbol 필수 문자열이다.
 */
export const GetStockWarningsParamsSchema = z.object({
	/**
	 * 경고 정보를 조회할 종목 코드.
	 * 필수 문자열이다.
	 */
	symbol: z.string(),
});
export type GetStockWarningsParams = z.infer<typeof GetStockWarningsParamsSchema>;

/**
 * 환율 조회 파라미터 스키마.
 * 기준/상대 통화는 enum으로 제한, datetime은 선택 문자열이다.
 */
export const GetExchangeRateParamsSchema = z.object({
	/**
	 * 기준 통화 코드.
	 * CurrencySchema에서 허용한 값만 허용한다.
	 */
	baseCurrency: CurrencySchema,
	/**
	 * 상대 통화 코드.
	 * CurrencySchema에서 허용한 값만 허용한다.
	 */
	quoteCurrency: CurrencySchema,
	/**
	 * 조회 시각 문자열.
	 * 선택 파라미터로, 생략 시 기본 동작으로 처리된다.
	 */
	dateTime: z.string().optional(),
});
export type GetExchangeRateParams = z.infer<typeof GetExchangeRateParamsSchema>;

/**
 * 시장 캘린더 조회 파라미터 스키마.
 * date는 ISO형 문자열 가정의 선택 파라미터이다.
 */
export const GetMarketCalendarParamsSchema = z.object({
	/**
	 * 조회할 달력 날짜.
	 * 문자열로 넘기며 선택 파라미터이다.
	 */
	date: z.string().optional(),
});
export type GetMarketCalendarParams = z.infer<typeof GetMarketCalendarParamsSchema>;

/**
 * 랭킹 조회 파라미터 스키마.
 * 타입/국가/기간은 필수, caution 제외 여부와 limit는 선택 항목이다.
 */
export const GetRankingsParamsSchema = z.object({
	/**
	 * 랭킹 종류.
	 * RankingTypeSchema 값만 허용한다.
	 */
	type: RankingTypeSchema,
	/**
	 * 랭킹 대상 시장 국가.
	 * MarketCountrySchema 값만 허용한다.
	 */
	marketCountry: MarketCountrySchema,
	/**
	 * 랭킹 기간 단위.
	 * RankingDurationSchema 값만 허용한다.
	 */
	duration: RankingDurationSchema,
	/**
	 * 투자주의보 종목 제외 여부.
	 * 선택 boolean 파라미터이다.
	 */
	excludeInvestmentCaution: z.boolean().optional(),
	/**
	 * 조회 개수를 제한하는 선택 파라미터.
	 * 지정하지 않으면 기본 조회 개수가 적용된다.
	 */
	count: z.number().optional(),
});
export type GetRankingsParams = z.infer<typeof GetRankingsParamsSchema>;

/**
 * 지표 시세 조회 파라미터 스키마.
 * symbols 문자열은 필수이다.
 */
export const GetMarketIndicatorPricesParamsSchema = z.object({
	/**
	 * 지표 가격 조회 대상 종목 목록 문자열.
	 * 필수 문자열이다.
	 */
	symbols: z.string(),
});
export type GetMarketIndicatorPricesParams = z.infer<typeof GetMarketIndicatorPricesParamsSchema>;

/**
 * 지표 캔들 조회 파라미터 스키마.
 * symbol+interval 필수, count/before는 선택으로 범위를 조절한다.
 */
export const GetMarketIndicatorCandlesParamsSchema = z.object({
	/**
	 * 지표 캔들 조회 대상 종목 코드.
	 * 필수 문자열이다.
	 */
	symbol: z.string(),
	/**
	 * 지표 캔들의 구간(interval).
	 * CandleIntervalSchema 값으로 제한된다.
	 */
	interval: CandleIntervalSchema,
	/**
	 * 조회할 캔들 개수.
	 * 선택 number 값이다.
	 */
	count: z.number().optional(),
	/**
	 * 조회 기준 시점 이전 문자열.
	 * 선택 파라미터다.
	 */
	before: z.string().optional(),
});
export type GetMarketIndicatorCandlesParams = z.infer<typeof GetMarketIndicatorCandlesParamsSchema>;

/**
 * 투자자 트래픽 지표 조회 파라미터.
 * 시장/구간 필수, count/ until는 선택으로 조회 범위를 제한한다.
 */
export const GetMarketIndicatorInvestorTradingParamsSchema = z.object({
	/**
	 * 투자자 트래픽 기준 시장 구분.
	 * InvestorTradingSymbolSchema 값만 허용한다.
	 */
	symbol: InvestorTradingSymbolSchema,
	/**
	 * 조회 구간.
	 * InvestorTradingIntervalSchema 값만 허용한다.
	 */
	interval: InvestorTradingIntervalSchema,
	/**
	 * 반환 항목 수를 조절하는 선택 파라미터.
	 * 숫자 타입이다.
	 */
	count: z.number().optional(),
	/**
	 * 조회 종료 시점을 제한하는 선택 문자열.
	 * 미지정 시 제한 없이 조회한다.
	 */
	until: z.string().optional(),
});
export type GetMarketIndicatorInvestorTradingParams = z.infer<
	typeof GetMarketIndicatorInvestorTradingParamsSchema
>;

/**
 * 보유 종목 조회 파라미터.
 * AccountScopedParams를 상속해 account는 필수, symbol은 선택 필터로 추가한다.
 */
export const GetHoldingsParamsSchema = AccountScopedParamsSchema.extend({
	/**
	 * 보유 종목 필터링을 위한 종목 코드.
	 * 지정하지 않으면 계좌 전체 보유 내역을 조회한다.
	 */
	symbol: z.string().optional(),
});
export type GetHoldingsParams = z.infer<typeof GetHoldingsParamsSchema>;

/**
 * 주문 목록 조회 파라미터.
 * account 및 status를 기본으로 받고, 심볼/기간/커서/limit으로 페이징/필터링을 지원한다.
 */
export const GetOrdersParamsSchema = AccountScopedParamsSchema.extend({
	/**
	 * 조회할 주문 상태.
	 * OrderStatusFilterSchema에 정의된 상태만 허용한다.
	 */
	status: OrderStatusFilterSchema,
	/**
	 * 종목 코드 필터.
	 * 선택 입력이며 미지정 시 조건 없이 조회한다.
	 */
	symbol: z.string().optional(),
	/**
	 * 시작 시각 기준.
	 * ISO 문자열과 같은 시작 범위 필터로 동작한다.
	 */
	from: z.string().optional(),
	/**
	 * 종료 시각 기준.
	 * ISO 문자열과 같은 종료 범위 필터로 동작한다.
	 */
	to: z.string().optional(),
	/**
	 * 페이지네이션에 사용되는 커서 토큰.
	 * 선택 문자열이다.
	 */
	cursor: z.string().optional(),
	/**
	 * 페이지 크기 제한.
	 * 선택 number 값이다.
	 */
	limit: z.number().optional(),
});
export type GetOrdersParams = z.infer<typeof GetOrdersParamsSchema>;

/**
 * 정규 주문 단건 식별 쿼리.
 * account 스코프 + orderId를 합성해 주문 조작/조회 대상 단건을 제한한다.
 */
export const OrderIdentityParamsSchema = AccountScopedParamsSchema.extend({
	/**
	 * 대상 정규 주문의 식별자.
	 * OrderIDSchema를 통해 opaque ID 형식만 허용한다.
	 */
	orderId: OrderIDSchema,
});
export type OrderIdentityParams = z.infer<typeof OrderIdentityParamsSchema>;

/**
 * 조건부 주문 목록 조회 파라미터.
 * account 기반 확장에 상태 필수, symbol/커서/limit은 선택으로 필터링과 페이지네이션을 처리한다.
 */
export const GetConditionalOrdersParamsSchema = AccountScopedParamsSchema.extend({
	/**
	 * 조회할 조건부 주문 상태.
	 * OrderStatusFilterSchema 값만 허용한다.
	 */
	status: OrderStatusFilterSchema,
	/**
	 * 조건부 주문 종목 코드 필터.
	 * 선택 문자열이며 미입력 시 전체 상태군을 조회한다.
	 */
	symbol: z.string().optional(),
	/**
	 * 페이지네이션 커서.
	 * 선택 문자열이다.
	 */
	cursor: z.string().optional(),
	/**
	 * 한 번에 조회할 개수 제한.
	 * 선택 number 값이다.
	 */
	limit: z.number().optional(),
});
export type GetConditionalOrdersParams = z.infer<typeof GetConditionalOrdersParamsSchema>;

/**
 * 조건부 주문 단건 식별 파라미터.
 * account 스코프에 conditionalOrderId를 추가해 단건 조회/조작 대상 명시한다.
 */
export const ConditionalOrderIdentityParamsSchema = AccountScopedParamsSchema.extend({
	/**
	 * 대상 조건부 주문 식별자.
	 * ConditionalOrderIDSchema를 통해 opaque ID 형식만 허용한다.
	 */
	conditionalOrderId: ConditionalOrderIDSchema,
});
export type ConditionalOrderIdentityParams = z.infer<
	typeof ConditionalOrderIdentityParamsSchema
>;

/**
 * 매수력 조회 파라미터.
 * account 기반에 currency를 추가해 조회 통화를 제한한다.
 */
export const GetBuyingPowerParamsSchema = AccountScopedParamsSchema.extend({
	/**
	 * 매수력 계산 기준 통화.
	 * CurrencySchema 값만 허용한다.
	 */
	currency: CurrencySchema,
});
export type GetBuyingPowerParams = z.infer<typeof GetBuyingPowerParamsSchema>;

/**
 * 매도 가능 수량 조회 파라미터.
 * account 기반에 symbol 필수를 추가해 계좌별 종목 매도 가능수량을 조회한다.
 */
export const GetSellableQuantityParamsSchema = AccountScopedParamsSchema.extend({
	/**
	 * 매도 가능 수량을 조회할 종목 코드.
	 * 필수 문자열이다.
	 */
	symbol: z.string(),
});
export type GetSellableQuantityParams = z.infer<typeof GetSellableQuantityParamsSchema>;
