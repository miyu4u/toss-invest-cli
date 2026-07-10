
import { SERVICE } from "../service-registry";
import type {
	Account,
	BuyingPowerResponse,
	Commission,
	OrderOperationResponse,
	OrderResponse,
	ConditionalOrderResponse,
	ConditionalOrderCreateResponse,
	SellableQuantityResponse,
} from "../schema/api/responses";
import type {
	CancelOrderRequest,
	ConditionalOrderCreateRequest,
	ConditionalOrderModifyRequest,
	OrderCreateRequest,
	OrderModifyRequest,
} from "../schema/api/requests";
import type {
	GetBuyingPowerParams,
	GetCandlesParams,
	GetConditionalOrdersParams,
	GetExchangeRateParams,
	GetHoldingsParams,
	GetMarketCalendarParams,
	GetMarketIndicatorCandlesParams,
	GetMarketIndicatorInvestorTradingParams,
	GetMarketIndicatorPricesParams,
	GetOrderbookParams,
	GetOrdersParams,
	GetPriceLimitParams,
	GetPricesParams,
	GetRankingsParams,
	GetSellableQuantityParams,
	GetStocksParams,
	GetStockWarningsParams,
	GetTradesParams,
	ConditionalOrderIdentityParams,
	OrderIdentityParams,
} from "../schema/api/params";
import type { OAuth2TokenRequest, OAuth2TokenResponse } from "../schema/api/auth";
import type { TossInvestRequestMetadata } from "../schema/api/metadata";
import type {
	AccountScopedParams,
	TossInvestAccountID,
	TossInvestApiResponse,
} from "../schema/helper-schema";
import type { HttpHeadersInit, QueryParams } from "../schema/api/http";

export const TOSS_INVEST_OPEN_API_BASE_URL = "https://openapi.tossinvest.com";
export const TOSS_INVEST_ACCOUNT_HEADER = "X-Tossinvest-Account";

export class TossInvestAPIService {
    private accessToken?: string;
    private requestHeaders = new Headers();
    private requestSignal?: AbortSignal;

    setRequestMetadata(metadata: TossInvestRequestMetadata): void {
        if ("accessToken" in metadata) {
            this.setAccessToken(metadata.accessToken);
        }

        if ("headers" in metadata) {
            this.setRequestHeaders(metadata.headers);
        }

        if ("signal" in metadata) {
            this.setRequestSignal(metadata.signal);
        }
    }

    clearRequestMetadata(): void {
        this.clearAccessToken();
        this.setRequestHeaders();
        this.setRequestSignal();
    }

    setRequestHeaders(headers?: HttpHeadersInit): void {
        this.requestHeaders = new Headers(headers);
    }

    setRequestSignal(signal?: AbortSignal): void {
        this.requestSignal = signal;
    }

    setAccessToken(accessToken?: string): void {
        const normalizedToken = accessToken?.trim();
        this.accessToken = normalizedToken ? normalizedToken : undefined;
    }

    clearAccessToken(): void {
        this.accessToken = undefined;
    }

    issueOAuth2Token(request: OAuth2TokenRequest): Promise<OAuth2TokenResponse> {
        const form = new URLSearchParams({
            client_id: request.client_id,
            client_secret: request.client_secret,
            grant_type: request.grant_type ?? "client_credentials",
        });

        return SERVICE.httpService.post<OAuth2TokenResponse>(
            "/oauth2/token",
            form,
            {
                headers: this.mergeHeaders(this.requestHeaders, {
                    "content-type": "application/x-www-form-urlencoded",
                }),
                signal: this.requestSignal,
            },
        );
    }

    getOrderbook<TResult = unknown>(
        params: GetOrderbookParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        return this.get("/api/v1/orderbook", params);
    }

    getPrices<TResult = unknown>(
        params: GetPricesParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        return this.get("/api/v1/prices", params);
    }

    getTrades<TResult = unknown>(
        params: GetTradesParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        return this.get("/api/v1/trades", params);
    }

    getPriceLimit<TResult = unknown>(
        params: GetPriceLimitParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        return this.get("/api/v1/price-limits", params);
    }

    getCandles<TResult = unknown>(
        params: GetCandlesParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        return this.get("/api/v1/candles", params);
    }

    getStocks<TResult = unknown>(
        params: GetStocksParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        return this.get("/api/v1/stocks", params);
    }

    getStockWarnings<TResult = unknown>(
        params: GetStockWarningsParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        return this.get(
            `/api/v1/stocks/${this.pathSegment(params.symbol, "symbol")}/warnings`,
            undefined,
        );
    }

    getExchangeRate<TResult = unknown>(
        params: GetExchangeRateParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        return this.get("/api/v1/exchange-rate", params);
    }

    getKrMarketCalendar<TResult = unknown>(
        params: GetMarketCalendarParams = {},
    ): Promise<TossInvestApiResponse<TResult>> {
        return this.get("/api/v1/market-calendar/KR", params);
    }

    getUsMarketCalendar<TResult = unknown>(
        params: GetMarketCalendarParams = {},
    ): Promise<TossInvestApiResponse<TResult>> {
        return this.get("/api/v1/market-calendar/US", params);
    }

    getRankings<TResult = unknown>(
        params: GetRankingsParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        return this.get("/api/v1/rankings", params);
    }

    getMarketIndicatorPrices<TResult = unknown>(
        params: GetMarketIndicatorPricesParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        return this.get("/api/v1/market-indicators/prices", params);
    }

    getMarketIndicatorCandles<TResult = unknown>(
        params: GetMarketIndicatorCandlesParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        const { symbol, ...query } = params;
        return this.get(
            `/api/v1/market-indicators/${this.pathSegment(symbol, "symbol")}/candles`,
            query,
        );
    }

    getMarketIndicatorInvestorTrading<TResult = unknown>(
        params: GetMarketIndicatorInvestorTradingParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        const { symbol, ...query } = params;
        return this.get(
            `/api/v1/market-indicators/${this.pathSegment(symbol, "symbol")}/investor-trading`,
            query,
        );
    }

    getAccounts(): Promise<TossInvestApiResponse<Account[]>> {
        return this.get("/api/v1/accounts", undefined);
    }

    getHoldings<TResult = unknown>(
        params: GetHoldingsParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        const { account, ...query } = params;
        return this.get("/api/v1/holdings", query, account);
    }

    getOrders<TResult = unknown>(
        params: GetOrdersParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        const { account, ...query } = params;
        return this.get("/api/v1/orders", query, account);
    }

    createOrder(
        params: AccountScopedParams,
        request: OrderCreateRequest,
    ): Promise<TossInvestApiResponse<OrderResponse>> {
        return this.post("/api/v1/orders", request, params.account);
    }

    getOrder<TResult = unknown>(
        params: OrderIdentityParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        return this.get(
            `/api/v1/orders/${this.pathSegment(params.orderId, "orderId")}`,
            undefined,
            params.account,
        );
    }

    modifyOrder(
        params: OrderIdentityParams,
        request: OrderModifyRequest,
    ): Promise<TossInvestApiResponse<OrderOperationResponse>> {
        return this.post(
            `/api/v1/orders/${this.pathSegment(params.orderId, "orderId")}/modify`,
            request,
            params.account,
        );
    }

    cancelOrder(
        params: OrderIdentityParams,
        request: CancelOrderRequest = {},
    ): Promise<TossInvestApiResponse<OrderOperationResponse>> {
        return this.post(
            `/api/v1/orders/${this.pathSegment(params.orderId, "orderId")}/cancel`,
            request,
            params.account,
        );
    }

    createConditionalOrder(
        params: AccountScopedParams,
        request: ConditionalOrderCreateRequest,
    ): Promise<TossInvestApiResponse<ConditionalOrderCreateResponse>> {
        return this.post("/api/v1/conditional-orders", request, params.account);
    }

    getConditionalOrders<TResult = unknown>(
        params: GetConditionalOrdersParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        const { account, ...query } = params;
        return this.get("/api/v1/conditional-orders", query, account);
    }

    getConditionalOrder<TResult = unknown>(
        params: ConditionalOrderIdentityParams,
    ): Promise<TossInvestApiResponse<TResult>> {
        return this.get(
            `/api/v1/conditional-orders/${this.pathSegment(
                params.conditionalOrderId,
                "conditionalOrderId",
            )}`,
            undefined,
            params.account,
        );
    }

    cancelConditionalOrder(
        params: ConditionalOrderIdentityParams,
    ): Promise<void> {
        return this.delete(
            `/api/v1/conditional-orders/${this.pathSegment(
                params.conditionalOrderId,
                "conditionalOrderId",
            )}`,
            params.account,
        );
    }

    modifyConditionalOrder(
        params: ConditionalOrderIdentityParams,
        request: ConditionalOrderModifyRequest,
    ): Promise<TossInvestApiResponse<ConditionalOrderResponse>> {
        return this.post(
            `/api/v1/conditional-orders/${this.pathSegment(
                params.conditionalOrderId,
                "conditionalOrderId",
            )}/modify`,
            request,
            params.account,
        );
    }

    getBuyingPower(
        params: GetBuyingPowerParams,
    ): Promise<TossInvestApiResponse<BuyingPowerResponse>> {
        const { account, ...query } = params;
        return this.get("/api/v1/buying-power", query, account);
    }

    getSellableQuantity(
        params: GetSellableQuantityParams,
    ): Promise<TossInvestApiResponse<SellableQuantityResponse>> {
        const { account, ...query } = params;
        return this.get("/api/v1/sellable-quantity", query, account);
    }

    getCommissions(
        params: AccountScopedParams,
    ): Promise<TossInvestApiResponse<Commission[]>> {
        return this.get("/api/v1/commissions", undefined, params.account);
    }

    private get<T>(
        path: string,
        query?: object,
        account?: TossInvestAccountID,
    ): Promise<T> {
        return SERVICE.httpService.get<T>(path, {
            ...this.buildRequestOptions(account),
            query: this.toQueryParams(query),
        });
    }

    private post<T>(
        path: string,
        body: unknown,
        account?: TossInvestAccountID,
    ): Promise<T> {
        return SERVICE.httpService.post<T>(path, body, {
            ...this.buildRequestOptions(account),
        });
    }

    private delete<T>(path: string, account?: TossInvestAccountID): Promise<T> {
        return SERVICE.httpService.delete<T>(path, {
            ...this.buildRequestOptions(account),
        });
    }

    private toQueryParams(query?: object): QueryParams | undefined {
        return query as QueryParams | undefined;
    }

    private buildRequestOptions(account?: TossInvestAccountID): {
        headers: Headers;
        signal?: AbortSignal;
    } {
        const headers = this.mergeHeaders(this.requestHeaders);
        const accessToken = this.normalizeAccessToken(this.accessToken);

        if (accessToken) {
            headers.set("authorization", `Bearer ${accessToken}`);
        }

        if (account !== undefined) {
            headers.set(TOSS_INVEST_ACCOUNT_HEADER, this.accountHeaderValue(account));
        }

        return { headers, signal: this.requestSignal };
    }

    private mergeHeaders(
        baseHeaders?: HttpHeadersInit,
        extraHeaders: Record<string, string> = {},
    ): Headers {
        const headers = new Headers(baseHeaders);

        for (const [key, value] of Object.entries(extraHeaders)) {
            headers.set(key, value);
        }

        return headers;
    }

    private normalizeAccessToken(accessToken?: string): string | undefined {
        const normalizedToken = accessToken?.trim();
        return normalizedToken ? normalizedToken : undefined;
    }

    private accountHeaderValue(account: TossInvestAccountID): string {
        const value = String(account).trim();
        if (value.length === 0) {
            throw new TypeError("account must not be empty");
        }
        return value;
    }

    private pathSegment(value: string, label: string): string {
        const segment = value.trim();
        if (segment.length === 0) {
            throw new TypeError(`${label} must not be empty`);
        }
        return encodeURIComponent(segment);
    }
}
