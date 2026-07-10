import z from "zod";

export const CURRENCY_ITEMS = ["KRW", "USD"] as const;
export const CurrencySchema = z.enum(CURRENCY_ITEMS);
export type Currency = z.infer<typeof CurrencySchema>;

export const MARKET_COUNTRY_ITEMS = ["KR", "US"] as const;
export const MarketCountrySchema = z.enum(MARKET_COUNTRY_ITEMS);
export type MarketCountry = z.infer<typeof MarketCountrySchema>;

export const CANDLE_INTERVAL_ITEMS = ["1m", "1d"] as const;
export const CandleIntervalSchema = z.enum(CANDLE_INTERVAL_ITEMS);
export type CandleInterval = z.infer<typeof CandleIntervalSchema>;

export const RANKING_DURATION_ITEMS = [
	"realtime",
	"1d",
	"1w",
	"1mo",
	"3mo",
	"6mo",
	"1y",
] as const;
export const RankingDurationSchema = z.enum(RANKING_DURATION_ITEMS);
export type RankingDuration = z.infer<typeof RankingDurationSchema>;

export const RANKING_TYPE_ITEMS = [
	"MARKET_TRADING_AMOUNT",
	"MARKET_TRADING_VOLUME",
	"TOP_GAINERS",
	"TOP_LOSERS",
	"TOSS_SECURITIES_TRADING_AMOUNT",
	"TOSS_SECURITIES_TRADING_VOLUME",
] as const;
export const RankingTypeSchema = z.enum(RANKING_TYPE_ITEMS);
export type RankingType = z.infer<typeof RankingTypeSchema>;

export const INVESTOR_TRADING_SYMBOL_ITEMS = ["KOSPI", "KOSDAQ"] as const;
export const InvestorTradingSymbolSchema = z.enum(INVESTOR_TRADING_SYMBOL_ITEMS);
export type InvestorTradingSymbol = z.infer<typeof InvestorTradingSymbolSchema>;

export const INVESTOR_TRADING_INTERVAL_ITEMS = ["1d", "1w", "1mo", "1y"] as const;
export const InvestorTradingIntervalSchema = z.enum(
	INVESTOR_TRADING_INTERVAL_ITEMS,
);
export type InvestorTradingInterval = z.infer<typeof InvestorTradingIntervalSchema>;

export const ORDER_STATUS_FILTER_ITEMS = ["OPEN", "CLOSED"] as const;
export const OrderStatusFilterSchema = z.enum(ORDER_STATUS_FILTER_ITEMS);
export type OrderStatusFilter = z.infer<typeof OrderStatusFilterSchema>;

export const ORDER_SIDE_ITEMS = ["BUY", "SELL"] as const;
export const OrderSideSchema = z.enum(ORDER_SIDE_ITEMS);
export type OrderSide = z.infer<typeof OrderSideSchema>;

export const ORDER_TYPE_ITEMS = ["LIMIT", "MARKET"] as const;
export const OrderTypeSchema = z.enum(ORDER_TYPE_ITEMS);
export type OrderType = z.infer<typeof OrderTypeSchema>;

export const TIME_IN_FORCE_ITEMS = ["DAY", "CLS"] as const;
export const TimeInForceSchema = z.enum(TIME_IN_FORCE_ITEMS);
export type TimeInForce = z.infer<typeof TimeInForceSchema>;

export const CONDITIONAL_ORDER_TYPE_ITEMS = ["SINGLE", "OCO", "OTO"] as const;
export const ConditionalOrderTypeSchema = z.enum(CONDITIONAL_ORDER_TYPE_ITEMS);
export type ConditionalOrderType = z.infer<typeof ConditionalOrderTypeSchema>;

export const ACCOUNT_TYPE_ITEMS = [
	"BROKERAGE",
	"OVERSEAS_DERIVATIVES",
	"PENSION_SAVINGS",
	"RESHORING_INVESTMENT",
] as const;
export const AccountTypeSchema = z.enum(ACCOUNT_TYPE_ITEMS);
export type AccountType = z.infer<typeof AccountTypeSchema>;