import { describe, expect, it } from "@jest/globals";
import z from "zod";

import {
	CandlePageResponseSchema,
	ConditionalOrderDetailResponseSchema,
	ExchangeRateResponseSchema,
	HoldingsOverviewSchema,
	InvestorTradingResponseSchema,
	KrMarketCalendarResponseSchema,
	MarketIndicatorCandlePageResponseSchema,
	MarketIndicatorPriceResponseSchema,
	OrderSchema,
	OrderbookResponseSchema,
	PaginatedConditionalOrderResponseSchema,
	PaginatedOrderResponseSchema,
	PriceLimitResponseSchema,
	PriceResponseSchema,
	RankingResponseSchema,
	StockInfoSchema,
	StockWarningSchema,
	TradeSchema,
	UsMarketCalendarResponseSchema,
} from "./responses";
import { TossInvestApiResponseSchema } from "../helper-schema";

type InvalidFixture = {
	name: string;
	value: unknown;
};

type QueryResultFixtureCase = {
	name: string;
	schema: z.ZodTypeAny;
	validFixture: unknown;
	invalidFixtures: InvalidFixture[];
};

const institutionBreakdownFixture = {
	financialInvestment: {
		buyAmount: "1",
		sellAmount: "0",
	},
	insurance: {
		buyAmount: "2",
		sellAmount: "1",
	},
	trust: {
		buyAmount: "3",
		sellAmount: "1",
	},
	privateEquityFund: {
		buyAmount: "4",
		sellAmount: "2",
	},
	bank: {
		buyAmount: "5",
		sellAmount: "3",
	},
	otherFinancialInstitution: {
		buyAmount: "6",
		sellAmount: "4",
	},
	pensionFund: {
		buyAmount: "7",
		sellAmount: "6",
	},
};

const commonOrderExecutionFixture = {
	filledQuantity: "0",
	averageFilledPrice: null,
	filledAmount: null,
	commission: null,
	tax: null,
	filledAt: null,
	settlementDate: null,
};

const minimalOrderFixture = {
	orderId: "order-1",
	symbol: "AAPL",
	side: "BUY",
	orderType: "LIMIT",
	timeInForce: "DAY",
	status: "PENDING",
	price: "7000",
	quantity: "1",
	currency: "USD",
	orderedAt: "2026-01-01T09:00:00+09:00",
	execution: commonOrderExecutionFixture,
};

const queryResultFixtures: QueryResultFixtureCase[] = [
	{
		name: "CandlePageResponseSchema",
		schema: CandlePageResponseSchema,
		validFixture: {
			candles: [
				{
					timestamp: "2026-01-01T00:00:00+09:00",
					openPrice: "70000",
					highPrice: "70500",
					lowPrice: "69900",
					closePrice: "70200",
					volume: "13",
					currency: "KRW",
				},
			],
		},
		invalidFixtures: [
			{
				name: "필수 필드 candles가 누락되면 실패",
				value: {},
			},
			{
				name: "nullable/optional 필드 nextBefore가 숫자면 실패",
				value: {
					candles: [],
					nextBefore: 1,
				},
			},
		],
	},
	{
		name: "ConditionalOrderDetailResponseSchema",
		schema: ConditionalOrderDetailResponseSchema,
		validFixture: {
			conditionalOrderId: "co-1",
			type: "SINGLE",
			status: "WATCHING",
			symbol: "005930",
			market: "KR",
			quantity: "1",
			orderType: "LIMIT",
			first: {
				type: "STOP",
				status: "WATCHING",
			},
			createdAt: "2026-01-01T09:00:00+09:00",
		},
		invalidFixtures: [
			{
				name: "필수 필드 conditionalOrderId가 빠지면 실패",
				value: {
					type: "SINGLE",
					status: "WATCHING",
					symbol: "005930",
					market: "KR",
					quantity: "1",
					orderType: "LIMIT",
					first: {
						type: "STOP",
						status: "WATCHING",
					},
					createdAt: "2026-01-01T09:00:00+09:00",
				},
			},
			{
				name: "선택 필드 second가 객체가 아니면 실패",
				value: {
					conditionalOrderId: "co-1",
					type: "SINGLE",
					status: "WATCHING",
					symbol: "005930",
					market: "KR",
					quantity: "1",
					orderType: "LIMIT",
					first: {
						type: "STOP",
						status: "WATCHING",
					},
					createdAt: "2026-01-01T09:00:00+09:00",
					second: 1,
				},
			},
		],
	},
	{
		name: "PaginatedConditionalOrderResponseSchema",
		schema: PaginatedConditionalOrderResponseSchema,
		validFixture: {
			conditionalOrders: [],
			nextCursor: null,
			hasNext: false,
		},
		invalidFixtures: [
			{
				name: "필수 필드 conditionalOrders가 누락되면 실패",
				value: {
					nextCursor: null,
					hasNext: false,
				},
			},
			{
				name: "optional 필드 nextCursor가 숫자면 실패",
				value: {
					conditionalOrders: [],
					nextCursor: 1,
					hasNext: false,
				},
			},
		],
	},
	{
		name: "ExchangeRateResponseSchema",
		schema: ExchangeRateResponseSchema,
		validFixture: {
			baseCurrency: "KRW",
			quoteCurrency: "USD",
			rate: "1320.15",
			midRate: "1320.00",
			basisPoint: "1.13",
			rateChangeType: "UP",
			validFrom: "2026-01-01T00:00:00+09:00",
			validUntil: "2026-01-01T23:59:59+09:00",
		},
		invalidFixtures: [
			{
				name: "필수 필드 rateChangeType이 누락되면 실패",
				value: {
					baseCurrency: "KRW",
					quoteCurrency: "USD",
					rate: "1320.15",
					midRate: "1320.00",
					basisPoint: "1.13",
					validFrom: "2026-01-01T00:00:00+09:00",
					validUntil: "2026-01-01T23:59:59+09:00",
				},
			},
			{
				name: "enum 값이 아니면 실패",
				value: {
					baseCurrency: "KRW",
					quoteCurrency: "USD",
					rate: "1320.15",
					midRate: "1320.00",
					basisPoint: "1.13",
					rateChangeType: "SIDEWAYS",
					validFrom: "2026-01-01T00:00:00+09:00",
					validUntil: "2026-01-01T23:59:59+09:00",
				},
			},
		],
	},
	{
		name: "HoldingsOverviewSchema",
		schema: HoldingsOverviewSchema,
		validFixture: {
			totalPurchaseAmount: {
				krw: "1000000",
				usd: "0",
			},
			marketValue: {
				amount: {
					krw: "1200000",
				},
				amountAfterCost: {
					krw: "1180000",
				},
			},
			profitLoss: {
				amount: {
					krw: "200000",
				},
				amountAfterCost: {
					krw: "180000",
				},
				rate: "0.2",
				rateAfterCost: "0.18",
			},
			dailyProfitLoss: {
				amount: {
					krw: "50000",
				},
				rate: "0.05",
			},
			items: [],
		},
		invalidFixtures: [
			{
				name: "필수 필드 totalPurchaseAmount가 누락되면 실패",
				value: {
					marketValue: {
						amount: {
							krw: "1200000",
						},
						amountAfterCost: {
							krw: "1180000",
						},
					},
					profitLoss: {
						amount: {
							krw: "200000",
						},
						amountAfterCost: {
							krw: "180000",
						},
						rate: "0.2",
						rateAfterCost: "0.18",
					},
					dailyProfitLoss: {
						amount: {
							krw: "50000",
						},
						rate: "0.05",
					},
					items: [],
				},
			},
			{
				name: "중첩 객체의 usd 타입이 문자열이 아니면 실패",
				value: {
					totalPurchaseAmount: {
						krw: "1000000",
						usd: 0,
					},
					marketValue: {
						amount: {
							krw: "1200000",
						},
						amountAfterCost: {
							krw: "1180000",
						},
					},
					profitLoss: {
						amount: {
							krw: "200000",
						},
						amountAfterCost: {
							krw: "180000",
						},
						rate: "0.2",
						rateAfterCost: "0.18",
					},
					dailyProfitLoss: {
						amount: {
							krw: "50000",
						},
						rate: "0.05",
					},
					items: [],
				},
			},
		],
	},
	{
		name: "InvestorTradingResponseSchema",
		schema: InvestorTradingResponseSchema,
		validFixture: {
			nextUntil: null,
			records: [
				{
					date: "2026-01-01",
					updatedAt: "2026-01-01T23:59:59+09:00",
					individual: {
						buyAmount: "100",
						sellAmount: "50",
					},
					foreigner: {
						buyAmount: "20",
						sellAmount: "10",
					},
					institution: {
						buyAmount: "30",
						sellAmount: "15",
						breakdown: institutionBreakdownFixture,
					},
					otherCorporation: {
						buyAmount: "40",
						sellAmount: "20",
					},
				},
			],
		},
		invalidFixtures: [
			{
				name: "필수 필드 records가 누락되면 실패",
				value: {
					nextUntil: null,
				},
			},
			{
				name: "records 값이 배열이 아니면 실패",
				value: {
					nextUntil: null,
					records: null,
				},
			},
		],
	},
	{
		name: "KrMarketCalendarResponseSchema",
		schema: KrMarketCalendarResponseSchema,
		validFixture: {
			today: {
				date: "2026-01-01",
			},
			previousBusinessDay: {
				date: "2025-12-31",
			},
			nextBusinessDay: {
				date: "2026-01-02",
			},
		},
		invalidFixtures: [
			{
				name: "필수 필드 previousBusinessDay가 누락되면 실패",
				value: {
					today: {
						date: "2026-01-01",
					},
					nextBusinessDay: {
						date: "2026-01-02",
					},
				},
			},
			{
				name: "nullable이 아닌 date에 null을 주면 실패",
				value: {
					today: {
						date: null,
					},
					previousBusinessDay: {
						date: "2025-12-31",
					},
					nextBusinessDay: {
						date: "2026-01-02",
					},
				},
			},
		],
	},
	{
		name: "MarketIndicatorCandlePageResponseSchema",
		schema: MarketIndicatorCandlePageResponseSchema,
		validFixture: {
			candles: [
				{
					timestamp: "2026-01-01T00:00:00+09:00",
					openPrice: "1",
					highPrice: "2",
					lowPrice: "0.5",
					closePrice: "1.8",
					volume: "300",
				},
			],
		},
		invalidFixtures: [
			{
				name: "필수 필드 candles가 누락되면 실패",
				value: {},
			},
			{
				name: "optional 필드 nextBefore가 문자열/널만 아니면 실패",
				value: {
					candles: [],
					nextBefore: false,
				},
			},
		],
	},
	{
		name: "MarketIndicatorPriceResponseSchema",
		schema: MarketIndicatorPriceResponseSchema,
		validFixture: {
			symbol: "KOSPI",
			lastPrice: "2500",
			// nullable optional timestamp omitted
		},
		invalidFixtures: [
			{
				name: "필수 필드 symbol이 누락되면 실패",
				value: {
					lastPrice: "2500",
				},
			},
			{
				name: "nullable/optional이 아닌 timestamp 타입 오류는 실패",
				value: {
					symbol: "KOSPI",
					lastPrice: "2500",
					timestamp: 1,
				},
			},
		],
	},
	{
		name: "OrderSchema",
		schema: OrderSchema,
		validFixture: minimalOrderFixture,
		invalidFixtures: [
			{
				name: "필수 필드 execution이 누락되면 실패",
				value: {
					orderId: "order-1",
					symbol: "AAPL",
					side: "BUY",
					orderType: "LIMIT",
					timeInForce: "DAY",
					status: "PENDING",
					price: "7000",
					quantity: "1",
					currency: "USD",
					orderedAt: "2026-01-01T09:00:00+09:00",
				},
			},
			{
				name: "nullable이 아닌 orderId에 null은 실패",
				value: {
					orderId: null,
					symbol: "AAPL",
					side: "BUY",
					orderType: "LIMIT",
					timeInForce: "DAY",
					status: "PENDING",
					price: "7000",
					quantity: "1",
					currency: "USD",
					orderedAt: "2026-01-01T09:00:00+09:00",
					execution: commonOrderExecutionFixture,
				},
			},
		],
	},
	{
		name: "OrderbookResponseSchema",
		schema: OrderbookResponseSchema,
		validFixture: {
			currency: "USD",
			asks: [{ price: "101", volume: "10" }],
			bids: [{ price: "100", volume: "20" }],
		},
		invalidFixtures: [
			{
				name: "필수 필드 bids가 누락되면 실패",
				value: {
					currency: "USD",
					asks: [{ price: "101", volume: "10" }],
				},
			},
			{
				name: "enum이 아닌 currency는 실패",
				value: {
					currency: "JPY",
					asks: [{ price: "101", volume: "10" }],
					bids: [{ price: "100", volume: "20" }],
				},
			},
		],
	},
	{
		name: "PaginatedOrderResponseSchema",
		schema: PaginatedOrderResponseSchema,
		validFixture: {
			orders: [minimalOrderFixture],
			nextCursor: null,
			hasNext: false,
		},
		invalidFixtures: [
			{
				name: "필수 필드 hasNext가 누락되면 실패",
				value: {
					orders: [minimalOrderFixture],
					nextCursor: null,
				},
			},
			{
				name: "optional 필드 nextCursor가 문자열/널만 아니면 실패",
				value: {
					orders: [minimalOrderFixture],
					nextCursor: 2,
					hasNext: false,
				},
			},
		],
	},
	{
		name: "PriceLimitResponseSchema",
		schema: PriceLimitResponseSchema,
		validFixture: {
			timestamp: "2026-01-01T00:00:00+09:00",
			upperLimitPrice: null,
			lowerLimitPrice: null,
			currency: "KRW",
		},
		invalidFixtures: [
			{
				name: "필수 필드 timestamp이 누락되면 실패",
				value: {
					currency: "KRW",
				},
			},
			{
				name: "nullable/optional 상한가가 숫자면 실패",
				value: {
					timestamp: "2026-01-01T00:00:00+09:00",
					upperLimitPrice: 1,
					currency: "KRW",
				},
			},
		],
	},
	{
		name: "PriceResponseSchema",
		schema: PriceResponseSchema,
		validFixture: {
			symbol: "005930",
			lastPrice: "70000",
			currency: "KRW",
		},
		invalidFixtures: [
			{
				name: "필수 필드 symbol이 누락되면 실패",
				value: {
					lastPrice: "70000",
					currency: "KRW",
				},
			},
			{
				name: "nullable이 아닌 lastPrice에 null은 실패",
				value: {
					symbol: "005930",
					lastPrice: null,
					currency: "KRW",
				},
			},
		],
	},
	{
		name: "RankingResponseSchema",
		schema: RankingResponseSchema,
		validFixture: {
			rankedAt: "2026-01-01T00:00:00+09:00",
			rankings: [
				{
					rank: 1,
					symbol: "005930",
					currency: "KRW",
					price: {
						lastPrice: "70000",
						basePrice: "68000",
					},
					tradingVolume: "100",
					tradingAmount: "7000000",
				},
			],
		},
		invalidFixtures: [
			{
				name: "필수 필드 rankings가 누락되면 실패",
				value: {
					rankedAt: "2026-01-01T00:00:00+09:00",
				},
			},
			{
				name: "rank 필드는 숫자가 아니면 실패",
				value: {
					rankedAt: "2026-01-01T00:00:00+09:00",
					rankings: [
					{
						rank: "1",
						symbol: "005930",
						currency: "KRW",
						price: {
							lastPrice: "70000",
							basePrice: "68000",
						},
						tradingVolume: "100",
						tradingAmount: "7000000",
					},
					],
				},
			},
		],
	},
	{
		name: "StockWarning[]",
		schema: z.array(StockWarningSchema),
		validFixture: [
			{
				warningType: "OVERHEATED",
				exchange: "KRX",
			},
		],
		invalidFixtures: [
			{
				name: "요소 객체의 필수 warningType이 누락되면 실패",
				value: [{}],
			},
			{
				name: "nullable이 아닌 warningType에 null은 실패",
				value: [{
					warningType: null,
				}],
			},
		],
	},
	{
		name: "StockInfo[]",
		schema: z.array(StockInfoSchema),
		validFixture: [
			{
				symbol: "005930",
				name: "삼성전자",
				englishName: "Samsung Electronics",
				isinCode: "KR7005930003",
				market: "KOSPI",
				securityType: "STOCK",
				isCommonShare: true,
				status: "ACTIVE",
				currency: "KRW",
				sharesOutstanding: "100000000",
			},
		],
		invalidFixtures: [
			{
				name: "요소 객체의 market가 누락되면 실패",
				value: [
					{
						symbol: "005930",
						name: "삼성전자",
						englishName: "Samsung Electronics",
						isinCode: "KR7005930003",
						securityType: "STOCK",
						isCommonShare: true,
						status: "ACTIVE",
						currency: "KRW",
						sharesOutstanding: "100000000",
					},
				],
			},
			{
				name: "enum이 아닌 market는 실패",
				value: [
					{
						symbol: "005930",
						name: "삼성전자",
						englishName: "Samsung Electronics",
						isinCode: "KR7005930003",
						market: "KRX",
						securityType: "STOCK",
						isCommonShare: true,
						status: "ACTIVE",
						currency: "KRW",
						sharesOutstanding: "100000000",
					},
				],
			},
		],
	},
	{
		name: "Trade[]",
		schema: z.array(TradeSchema),
		validFixture: [
			{
				price: "70200",
				volume: "1",
				timestamp: "2026-01-01T10:00:00+09:00",
				currency: "KRW",
			},
		],
		invalidFixtures: [
			{
				name: "요소 객체가 비어있으면 실패",
				value: [{}],
			},
			{
				name: "통화가 enum에 없으면 실패",
				value: [
					{
						price: "70200",
						volume: "1",
						timestamp: "2026-01-01T10:00:00+09:00",
						currency: "JPY",
					},
				],
			},
		],
	},
	{
		name: "UsMarketCalendarResponseSchema",
		schema: UsMarketCalendarResponseSchema,
		validFixture: {
			today: {
				date: "2026-01-01",
			},
			previousBusinessDay: {
				date: "2025-12-31",
			},
			nextBusinessDay: {
				date: "2026-01-02",
			},
		},
		invalidFixtures: [
			{
				name: "필수 필드 nextBusinessDay가 누락되면 실패",
				value: {
					today: {
						date: "2026-01-01",
					},
					previousBusinessDay: {
						date: "2025-12-31",
					},
				},
			},
			{
				name: "nullable이 아닌 today.date에 null은 실패",
				value: {
					today: {
						date: null,
					},
					previousBusinessDay: {
						date: "2025-12-31",
					},
					nextBusinessDay: {
						date: "2026-01-02",
					},
				},
			},
		],
	},
];

describe("쿼리 결과 루트 스키마 fixture 계약", () => {
	for (const { name, schema, validFixture, invalidFixtures } of queryResultFixtures) {
		describe(name, () => {
			it("최소 유효 fixture 파싱이 통과", () => {
				const envelopeSchema = TossInvestApiResponseSchema(schema);
				const parsed = envelopeSchema.safeParse({ result: validFixture });
				expect(parsed.success).toBe(true);
			});

			for (const invalid of invalidFixtures) {
				it(
					`실패 fixture는 거부: ${invalid.name}`,
					() => {
						const envelopeSchema = TossInvestApiResponseSchema(schema);
						expect(
							envelopeSchema.safeParse({ result: invalid.value }).success,
						).toBe(false);
					},
				);
			}
		});
	}
});
