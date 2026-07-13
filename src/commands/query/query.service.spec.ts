import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from "@jest/globals";

import { SERVICE } from "../../service-registry";
import { QueryCommandService } from "./query.service";

function envelope<F extends (...args: never[]) => unknown>(
	result: unknown,
): Awaited<ReturnType<F>> {
	return { result } as unknown as Awaited<ReturnType<F>>;
}

describe("QueryCommandService", () => {
	let service: QueryCommandService;

	beforeEach(() => {
		service = new QueryCommandService();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("위임 메서드 happy path", () => {
		it("accounts()는 getAccounts에 위임하고 반환값을 동일하게 전달한다", async () => {
			const response = envelope<typeof SERVICE.tossInvestAPIService.getAccounts>({
				seed: "accounts",
			});
			const getAccounts = jest
				.spyOn(SERVICE.tossInvestAPIService, "getAccounts")
				.mockResolvedValue(response);

			const result = await service.accounts();

			expect(result).toEqual(response);
			expect(getAccounts).toHaveBeenCalledTimes(1);
			expect(getAccounts).toHaveBeenCalledWith();
		});

		it("buyingPower(params)는 getBuyingPower에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				account: "42",
				currency: "USD",
			} as Parameters<typeof SERVICE.tossInvestAPIService.getBuyingPower>[0];
			const response = envelope<typeof SERVICE.tossInvestAPIService.getBuyingPower>({
				seed: "buyingPower",
			});
			const getBuyingPower = jest
				.spyOn(SERVICE.tossInvestAPIService, "getBuyingPower")
				.mockResolvedValue(response);

			const result = await service.buyingPower(params);

			expect(result).toEqual(response);
			expect(getBuyingPower).toHaveBeenCalledTimes(1);
			expect(getBuyingPower).toHaveBeenCalledWith(params);
		});

		it("candles(params)는 getCandles에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				symbol: "005930",
				interval: "1d",
				count: 5,
				before: "20260101",
				adjusted: true,
			} as Parameters<typeof SERVICE.tossInvestAPIService.getCandles>[0];
			const response = envelope<typeof SERVICE.tossInvestAPIService.getCandles>({
				seed: "candles",
			});
			const getCandles = jest
				.spyOn(SERVICE.tossInvestAPIService, "getCandles")
				.mockResolvedValue(response);

			const result = await service.candles(params);

			expect(result).toEqual(response);
			expect(getCandles).toHaveBeenCalledTimes(1);
			expect(getCandles).toHaveBeenCalledWith(params);
		});

		it("commissions(params)는 getCommissions에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				account: "42",
			} as Parameters<typeof SERVICE.tossInvestAPIService.getCommissions>[0];
			const response = envelope<typeof SERVICE.tossInvestAPIService.getCommissions>({
				seed: "commissions",
			});
			const getCommissions = jest
				.spyOn(SERVICE.tossInvestAPIService, "getCommissions")
				.mockResolvedValue(response);

			const result = await service.commissions(params);

			expect(result).toEqual(response);
			expect(getCommissions).toHaveBeenCalledTimes(1);
			expect(getCommissions).toHaveBeenCalledWith(params);
		});

		it("conditionalOrder(params)는 getConditionalOrder에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				account: "42",
				conditionalOrderId: "co-123",
			} as Parameters<typeof SERVICE.tossInvestAPIService.getConditionalOrder>[0];
			const response = envelope<typeof SERVICE.tossInvestAPIService.getConditionalOrder>(
				{
					seed: "conditionalOrder",
				},
			);
			const getConditionalOrder = jest
				.spyOn(SERVICE.tossInvestAPIService, "getConditionalOrder")
				.mockResolvedValue(response);

			const result = await service.conditionalOrder(params);

			expect(result).toEqual(response);
			expect(getConditionalOrder).toHaveBeenCalledTimes(1);
			expect(getConditionalOrder).toHaveBeenCalledWith(params);
		});

		it("conditionalOrders(params)는 getConditionalOrders에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				account: "42",
				status: "OPEN",
			} as Parameters<
				typeof SERVICE.tossInvestAPIService.getConditionalOrders
			>[0];
			const response = envelope<
				typeof SERVICE.tossInvestAPIService.getConditionalOrders
			>({
				seed: "conditionalOrders",
			});
			const getConditionalOrders = jest
				.spyOn(SERVICE.tossInvestAPIService, "getConditionalOrders")
				.mockResolvedValue(response);

			const result = await service.conditionalOrders(params);

			expect(result).toEqual(response);
			expect(getConditionalOrders).toHaveBeenCalledTimes(1);
			expect(getConditionalOrders).toHaveBeenCalledWith(params);
		});

		it("exchangeRate(params)는 getExchangeRate에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				baseCurrency: "KRW",
				quoteCurrency: "USD",
				dateTime: "20260101T000000+09:00",
			} as Parameters<typeof SERVICE.tossInvestAPIService.getExchangeRate>[0];
			const response = envelope<typeof SERVICE.tossInvestAPIService.getExchangeRate>({
				seed: "exchangeRate",
			});
			const getExchangeRate = jest
				.spyOn(SERVICE.tossInvestAPIService, "getExchangeRate")
				.mockResolvedValue(response);

			const result = await service.exchangeRate(params);

			expect(result).toEqual(response);
			expect(getExchangeRate).toHaveBeenCalledTimes(1);
			expect(getExchangeRate).toHaveBeenCalledWith(params);
		});

		it("holdings(params)는 getHoldings에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				account: "42",
			} as Parameters<typeof SERVICE.tossInvestAPIService.getHoldings>[0];
			const response = envelope<typeof SERVICE.tossInvestAPIService.getHoldings>({
				seed: "holdings",
			});
			const getHoldings = jest
				.spyOn(SERVICE.tossInvestAPIService, "getHoldings")
				.mockResolvedValue(response);

			const result = await service.holdings(params);

			expect(result).toEqual(response);
			expect(getHoldings).toHaveBeenCalledTimes(1);
			expect(getHoldings).toHaveBeenCalledWith(params);
		});

		it("krMarketCalendar(params)는 getKrMarketCalendar에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				date: "20260101",
			} as Parameters<
				typeof SERVICE.tossInvestAPIService.getKrMarketCalendar
			>[0];
			const response = envelope<
				typeof SERVICE.tossInvestAPIService.getKrMarketCalendar
			>({
				seed: "krMarketCalendar",
			});
			const getKrMarketCalendar = jest
				.spyOn(SERVICE.tossInvestAPIService, "getKrMarketCalendar")
				.mockResolvedValue(response);

			const result = await service.krMarketCalendar(params);

			expect(result).toEqual(response);
			expect(getKrMarketCalendar).toHaveBeenCalledTimes(1);
			expect(getKrMarketCalendar).toHaveBeenCalledWith(params);
		});

		it("marketIndicatorCandles(params)는 getMarketIndicatorCandles에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				symbol: "005930",
				interval: "1d",
				count: 3,
				before: "20260102",
			} as Parameters<
				typeof SERVICE.tossInvestAPIService.getMarketIndicatorCandles
			>[0];
			const response = envelope<
				typeof SERVICE.tossInvestAPIService.getMarketIndicatorCandles
			>({
				seed: "marketIndicatorCandles",
			});
			const getMarketIndicatorCandles = jest
				.spyOn(SERVICE.tossInvestAPIService, "getMarketIndicatorCandles")
				.mockResolvedValue(response);

			const result = await service.marketIndicatorCandles(params);

			expect(result).toEqual(response);
			expect(getMarketIndicatorCandles).toHaveBeenCalledTimes(1);
			expect(getMarketIndicatorCandles).toHaveBeenCalledWith(params);
		});

		it("marketIndicatorInvestorTrading(params)는 getMarketIndicatorInvestorTrading에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				symbol: "KOSPI",
				interval: "1w",
			} as Parameters<
				typeof SERVICE.tossInvestAPIService.getMarketIndicatorInvestorTrading
			>[0];
			const response = envelope<
				typeof SERVICE.tossInvestAPIService.getMarketIndicatorInvestorTrading
			>({
				seed: "marketIndicatorInvestorTrading",
			});
			const getMarketIndicatorInvestorTrading = jest
				.spyOn(SERVICE.tossInvestAPIService, "getMarketIndicatorInvestorTrading")
				.mockResolvedValue(response);

			const result = await service.marketIndicatorInvestorTrading(params);

			expect(result).toEqual(response);
			expect(getMarketIndicatorInvestorTrading).toHaveBeenCalledTimes(1);
			expect(getMarketIndicatorInvestorTrading).toHaveBeenCalledWith(params);
		});

		it("marketIndicatorPrices(params)는 getMarketIndicatorPrices에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				symbols: "AAPL,MSFT",
			} as Parameters<
				typeof SERVICE.tossInvestAPIService.getMarketIndicatorPrices
			>[0];
			const response = envelope<
				typeof SERVICE.tossInvestAPIService.getMarketIndicatorPrices
			>({
				seed: "marketIndicatorPrices",
			});
			const getMarketIndicatorPrices = jest
				.spyOn(SERVICE.tossInvestAPIService, "getMarketIndicatorPrices")
				.mockResolvedValue(response);

			const result = await service.marketIndicatorPrices(params);

			expect(result).toEqual(response);
			expect(getMarketIndicatorPrices).toHaveBeenCalledTimes(1);
			expect(getMarketIndicatorPrices).toHaveBeenCalledWith(params);
		});

		it("order(params)는 getOrder에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				account: "42",
				orderId: "ord-123",
			} as Parameters<typeof SERVICE.tossInvestAPIService.getOrder>[0];
			const response = envelope<typeof SERVICE.tossInvestAPIService.getOrder>({
				seed: "order",
			});
			const getOrder = jest
				.spyOn(SERVICE.tossInvestAPIService, "getOrder")
				.mockResolvedValue(response);

			const result = await service.order(params);

			expect(result).toEqual(response);
			expect(getOrder).toHaveBeenCalledTimes(1);
			expect(getOrder).toHaveBeenCalledWith(params);
		});

		it("orderbook(params)는 getOrderbook에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				symbol: "AAPL",
			} as Parameters<typeof SERVICE.tossInvestAPIService.getOrderbook>[0];
			const response = envelope<typeof SERVICE.tossInvestAPIService.getOrderbook>({
				seed: "orderbook",
			});
			const getOrderbook = jest
				.spyOn(SERVICE.tossInvestAPIService, "getOrderbook")
				.mockResolvedValue(response);

			const result = await service.orderbook(params);

			expect(result).toEqual(response);
			expect(getOrderbook).toHaveBeenCalledTimes(1);
			expect(getOrderbook).toHaveBeenCalledWith(params);
		});

		it("orders(params)는 getOrders에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				account: "42",
				status: "OPEN",
			} as Parameters<typeof SERVICE.tossInvestAPIService.getOrders>[0];
			const response = envelope<typeof SERVICE.tossInvestAPIService.getOrders>({
				seed: "orders",
			});
			const getOrders = jest
				.spyOn(SERVICE.tossInvestAPIService, "getOrders")
				.mockResolvedValue(response);

			const result = await service.orders(params);

			expect(result).toEqual(response);
			expect(getOrders).toHaveBeenCalledTimes(1);
			expect(getOrders).toHaveBeenCalledWith(params);
		});

		it("priceLimit(params)는 getPriceLimit에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				symbol: "AAPL",
			} as Parameters<typeof SERVICE.tossInvestAPIService.getPriceLimit>[0];
			const response = envelope<typeof SERVICE.tossInvestAPIService.getPriceLimit>({
				seed: "priceLimit",
			});
			const getPriceLimit = jest
				.spyOn(SERVICE.tossInvestAPIService, "getPriceLimit")
				.mockResolvedValue(response);

			const result = await service.priceLimit(params);

			expect(result).toEqual(response);
			expect(getPriceLimit).toHaveBeenCalledTimes(1);
			expect(getPriceLimit).toHaveBeenCalledWith(params);
		});

		it("prices(params)는 getPrices에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				symbols: "AAPL,MSFT",
			} as Parameters<typeof SERVICE.tossInvestAPIService.getPrices>[0];
			const response = envelope<typeof SERVICE.tossInvestAPIService.getPrices>([
				{
					symbol: "AAPL",
					lastPrice: "100",
					currency: "USD",
					timestamp: "2026-01-01T00:00:00.000+09:00",
				},
				{
					symbol: "MSFT",
					lastPrice: "120",
					currency: "USD",
				},
			]);
			const getPrices = jest
				.spyOn(SERVICE.tossInvestAPIService, "getPrices")
				.mockResolvedValue(response);

			const result = await service.prices(params);

			expect(result).toEqual(response);
			expect(getPrices).toHaveBeenCalledTimes(1);
			expect(getPrices).toHaveBeenCalledWith(params);
		});

		it("rankings(params)는 getRankings에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				type: "MARKET_TRADING_AMOUNT",
				marketCountry: "KR",
				duration: "1d",
			} as Parameters<typeof SERVICE.tossInvestAPIService.getRankings>[0];
			const response = envelope<typeof SERVICE.tossInvestAPIService.getRankings>({
				seed: "rankings",
			});
			const getRankings = jest
				.spyOn(SERVICE.tossInvestAPIService, "getRankings")
				.mockResolvedValue(response);

			const result = await service.rankings(params);

			expect(result).toEqual(response);
			expect(getRankings).toHaveBeenCalledTimes(1);
			expect(getRankings).toHaveBeenCalledWith(params);
		});

		it("sellableQuantity(params)는 getSellableQuantity에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				account: "42",
				symbol: "AAPL",
			} as Parameters<typeof SERVICE.tossInvestAPIService.getSellableQuantity>[0];
			const response = envelope<
				typeof SERVICE.tossInvestAPIService.getSellableQuantity
			>({
				seed: "sellableQuantity",
			});
			const getSellableQuantity = jest
				.spyOn(SERVICE.tossInvestAPIService, "getSellableQuantity")
				.mockResolvedValue(response);

			const result = await service.sellableQuantity(params);

			expect(result).toEqual(response);
			expect(getSellableQuantity).toHaveBeenCalledTimes(1);
			expect(getSellableQuantity).toHaveBeenCalledWith(params);
		});

		it("stockWarnings(params)는 getStockWarnings에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				symbol: "AAPL",
			} as Parameters<typeof SERVICE.tossInvestAPIService.getStockWarnings>[0];
			const response = envelope<typeof SERVICE.tossInvestAPIService.getStockWarnings>({
				seed: "stockWarnings",
			});
			const getStockWarnings = jest
				.spyOn(SERVICE.tossInvestAPIService, "getStockWarnings")
				.mockResolvedValue(response);

			const result = await service.stockWarnings(params);

			expect(result).toEqual(response);
			expect(getStockWarnings).toHaveBeenCalledTimes(1);
			expect(getStockWarnings).toHaveBeenCalledWith(params);
		});

		it("stocks(params)는 getStocks에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				symbols: "AAPL,MSFT",
			} as Parameters<typeof SERVICE.tossInvestAPIService.getStocks>[0];
			const response = envelope<typeof SERVICE.tossInvestAPIService.getStocks>({
				seed: "stocks",
			});
			const getStocks = jest
				.spyOn(SERVICE.tossInvestAPIService, "getStocks")
				.mockResolvedValue(response);

			const result = await service.stocks(params);

			expect(result).toEqual(response);
			expect(getStocks).toHaveBeenCalledTimes(1);
			expect(getStocks).toHaveBeenCalledWith(params);
		});

		it("trades(params)는 getTrades에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				symbol: "AAPL",
				count: 10,
			} as Parameters<typeof SERVICE.tossInvestAPIService.getTrades>[0];
			const response = envelope<typeof SERVICE.tossInvestAPIService.getTrades>({
				seed: "trades",
			});
			const getTrades = jest
				.spyOn(SERVICE.tossInvestAPIService, "getTrades")
				.mockResolvedValue(response);

			const result = await service.trades(params);

			expect(result).toEqual(response);
			expect(getTrades).toHaveBeenCalledTimes(1);
			expect(getTrades).toHaveBeenCalledWith(params);
		});

		it("usMarketCalendar(params)는 getUsMarketCalendar에 위임하고 반환값을 동일하게 전달한다", async () => {
			const params = {
				date: "20260103",
			} as Parameters<typeof SERVICE.tossInvestAPIService.getUsMarketCalendar>[0];
			const response = envelope<
				typeof SERVICE.tossInvestAPIService.getUsMarketCalendar
			>({
				seed: "usMarketCalendar",
			});
			const getUsMarketCalendar = jest
				.spyOn(SERVICE.tossInvestAPIService, "getUsMarketCalendar")
				.mockResolvedValue(response);

			const result = await service.usMarketCalendar(params);

			expect(result).toEqual(response);
			expect(getUsMarketCalendar).toHaveBeenCalledTimes(1);
			expect(getUsMarketCalendar).toHaveBeenCalledWith(params);
		});
	});

	describe("portfolioSummary", () => {
		it("holdings 응답을 account와 결합해 포트폴리오 요약으로 반환한다", async () => {
			const params = {
				account: 42,
			} as Parameters<typeof SERVICE.tossInvestAPIService.getHoldings>[0];
			const holdings = envelope<typeof SERVICE.tossInvestAPIService.getHoldings>({
				seed: "holdings",
			});
			const getHoldings = jest
				.spyOn(SERVICE.tossInvestAPIService, "getHoldings")
				.mockResolvedValue(holdings);

			const summary = await service.portfolioSummary(params);

			expect(summary).toEqual({ account: params.account, holdings });
			expect(getHoldings).toHaveBeenCalledTimes(1);
			expect(getHoldings).toHaveBeenCalledWith(params);
		});

		it("holdings API 오류를 그대로 전파한다", async () => {
			const params = {
				account: 42,
			} as Parameters<typeof SERVICE.tossInvestAPIService.getHoldings>[0];
			const err = new Error("holdings unavailable");
			const getHoldings = jest
				.spyOn(SERVICE.tossInvestAPIService, "getHoldings")
				.mockRejectedValue(err);

			await expect(service.portfolioSummary(params)).rejects.toThrow(
				"holdings unavailable",
			);
			expect(getHoldings).toHaveBeenCalledTimes(1);
			expect(getHoldings).toHaveBeenCalledWith(params);
		});
	});
});
