import { SERVICE } from "../../service-registry";
import type {
	AccountScopedParams,
} from "../../schema/helper-schema";
import type {
	ConditionalOrderIdentityParams,
	GetBuyingPowerParams,
	GetCandlesParams,
	GetConditionalOrdersParams,
	GetExchangeRateParams,
	GetHoldingsParams,
	GetMarketCalendarParams,
	GetMarketIndicatorCandlesParams,
	OrderIdentityParams,
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
} from "../../schema/api/params";

export interface IQueryCommandService {
	/**
	 * 계정 목록 조회 리소스를 요청해 인증된 사용자 계정 목록을 조회합니다.
	 * 내부적으로 `SERVICE.tossInvestAPIService.getAccounts()`를 위임 호출하며,
	 * 로컬 상태를 변경하지 않고 원격 조회 결과를 그대로 반환합니다.
	 * `HttpService.request`에서 2xx가 아닌 응답은 `HttpException`이 발생해 상위로 전파됩니다.
	 * @returns 계정 목록 조회 API의 응답 결과(Promise<unknown>).
	 */
	accounts(): Promise<unknown>;

	/**
	 * 현금/신용 구매력 조회 리소스를 요청해 계좌 단위의 가용 구매력 관련 정보를 조회합니다.
	 * 전달된 `params`를 그대로 `SERVICE.tossInvestAPIService.getBuyingPower(params)`에 위임하고,
	 * 조회 결과를 그대로 반환하므로 로컬 상태 변경은 없습니다.
	 * @param params 구매력 조회 대상 계좌/조건을 담는 요청 파라미터.
	 * @returns 구매력 조회 API의 응답 결과(Promise<unknown>).
	 */
	buyingPower(params: GetBuyingPowerParams): Promise<unknown>;

	/**
	 * 차트 캔들 데이터 조회 리소스를 요청해 지정 조건의 시계열 가격 구간을 가져옵니다.
	 * 전달된 `params`를 `SERVICE.tossInvestAPIService.getCandles(params)`에 위임하며,
	 * 조회 결과만 반환하고 로컬 캐시/상태를 변경하지 않습니다.
	 * @param params 캔들 조회 조건(종목/기간 등)을 담는 요청 파라미터.
	 * @returns 캔들 조회 API의 응답 결과(Promise<unknown>).
	 */
	candles(params: GetCandlesParams): Promise<unknown>;

	/**
	 * 계좌 기준 수수료 정책 조회 리소스를 요청해 수수료 관련 메타 정보를 조회합니다.
	 * `params`를 통해 대상 범위를 지정하고, 내부적으로
	 * `SERVICE.tossInvestAPIService.getCommissions(params)`를 위임 호출합니다.
	 * 네트워크 실패/응답 오류는 하위 HTTP 계층에서 전파되고 로컬 상태는 유지됩니다.
	 * @param params 수수료 조회 대상 계좌/범위 정보를 담는 요청 파라미터.
	 * @returns 수수료 조회 API의 응답 결과(Promise<unknown>).
	 */
	commissions(params: AccountScopedParams): Promise<unknown>;

	/**
	 * 조건부 주문 단건 조회 리소스를 요청해 지정 아이디의 조건부 주문 상세를 조회합니다.
	 * 전달된 `params`를 그대로 `SERVICE.tossInvestAPIService.getConditionalOrder(params)`로 전달하며
	 * 응답을 가공하지 않고 반환합니다.
	 * @param params 조건부 주문 식별 정보를 담는 요청 파라미터.
	 * @returns 조건부 주문 단건 조회 API의 응답 결과(Promise<unknown>).
	 */
	conditionalOrder(params: ConditionalOrderIdentityParams): Promise<unknown>;

	/**
	 * 조건부 주문 목록 조회 리소스를 요청해 사용자의 조건부 주문 목록을 조회합니다.
	 * `SERVICE.tossInvestAPIService.getConditionalOrders(params)`로 위임하고,
	 * 결과만 노출하므로 추가 정렬/가공/상태 변경을 수행하지 않습니다.
	 * @param params 조건부 주문 목록 조회 조건을 담는 요청 파라미터.
	 * @returns 조건부 주문 목록 조회 API의 응답 결과(Promise<unknown>).
	 */
	conditionalOrders(params: GetConditionalOrdersParams): Promise<unknown>;

	/**
	 * 환율 조회 리소스를 요청해 통화 간 환율 값을 조회합니다.
	 * `params`를 `SERVICE.tossInvestAPIService.getExchangeRate(params)`로 전달하고
	 * 응답을 그대로 반환해 호출자에서 출력/가공을 수행하도록 합니다.
	 * @param params 조회 대상 통화 조합 등 환율 조회 조건을 담는 요청 파라미터.
	 * @returns 환율 조회 API의 응답 결과(Promise<unknown>).
	 */
	exchangeRate(params: GetExchangeRateParams): Promise<unknown>;

	/**
	 * 보유 종목 조회 리소스를 요청해 계좌 기준 보유 자산 정보를 조회합니다.
	 * `SERVICE.tossInvestAPIService.getHoldings(params)`로 위임하고,
	 * 네트워크 결과만 전달하며 로컬 상태를 변경하지 않습니다.
	 * @param params 보유 종목 조회 대상 계좌/정렬 조건을 담는 요청 파라미터.
	 * @returns 보유 종목 조회 API의 응답 결과(Promise<unknown>).
	 */
	holdings(params: GetHoldingsParams): Promise<unknown>;

	/**
	 * 한국 증시 휴장일/개장일 캘린더 조회 리소스를 요청합니다.
	 * 선택적 `params`를 전달해 `SERVICE.tossInvestAPIService.getKrMarketCalendar(params)`를
	 * 호출하며, 조회 결과를 그대로 반환합니다.
	 * @param params 조회 기간 또는 상세 필터를 담는 선택적 요청 파라미터.
	 * @returns 한국 시장 캘린더 조회 API의 응답 결과(Promise<unknown>).
	 */
	krMarketCalendar(params?: GetMarketCalendarParams): Promise<unknown>;

	/**
	 * 시장 지표 캔들 조회 리소스를 요청해 지표 시계열 캔들 데이터를 조회합니다.
	 * 전달된 `params`를 `SERVICE.tossInvestAPIService.getMarketIndicatorCandles(params)`로
	 * 위임하고 결과를 그대로 반환해 추가 상태 의존 처리를 하지 않습니다.
	 * @param params 시장 지표 캔들 조회 조건을 담는 요청 파라미터.
	 * @returns 시장 지표 캔들 API의 응답 결과(Promise<unknown>).
	 */
	marketIndicatorCandles(
		params: GetMarketIndicatorCandlesParams,
	): Promise<unknown>;

	/**
	 * 투자자별 시장 지표 조회 리소스를 요청해 투자자 동향 지표를 가져옵니다.
	 * `params`를 `SERVICE.tossInvestAPIService.getMarketIndicatorInvestorTrading(params)`에
	 * 위임하며, 결과를 그대로 반환해 로컬에 가공/캐시를 남기지 않습니다.
	 * @param params 투자자 트레이딩 지표 조회 조건을 담는 요청 파라미터.
	 * @returns 투자자 트레이딩 지표 API의 응답 결과(Promise<unknown>).
	 */
	marketIndicatorInvestorTrading(
		params: GetMarketIndicatorInvestorTradingParams,
	): Promise<unknown>;

	/**
	 * 가격 지표 조회 리소스를 요청해 종목군 기준 시장 가격 지표 데이터를 조회합니다.
	 * `SERVICE.tossInvestAPIService.getMarketIndicatorPrices(params)`를 호출하여
	 * 조회 응답을 그대로 전달하고, 지역 상태를 변경하지 않습니다.
	 * @param params 가격 지표 조회 조건을 담는 요청 파라미터.
	 * @returns 시장 가격 지표 조회 API의 응답 결과(Promise<unknown>).
	 */
	marketIndicatorPrices(
		params: GetMarketIndicatorPricesParams,
	): Promise<unknown>;

	/**
	 * 주문 단건 조회 리소스를 요청해 특정 주문의 상세 정보를 조회합니다.
	 * 전달된 `params`를 `SERVICE.tossInvestAPIService.getOrder(params)`로 전달하고
	 * 하위에서 발생한 API 예외를 전파하여 호출자에게 오류를 노출합니다.
	 * @param params 주문 식별 정보를 담는 요청 파라미터.
	 * @returns 주문 상세 조회 API의 응답 결과(Promise<unknown>).
	 */
	order(params: OrderIdentityParams): Promise<unknown>;

	/**
	 * 주문 호가창 조회 리소스를 요청해 지정 종목의 매수/매도 호가 스냅샷을 조회합니다.
	 * `params`를 `SERVICE.tossInvestAPIService.getOrderbook(params)`로 위임해
	 * 반환값을 가공 없이 전달합니다.
	 * @param params 주문호가 조회 대상 종목/호가 깊이 조건을 담는 요청 파라미터.
	 * @returns 주문호가 조회 API의 응답 결과(Promise<unknown>).
	 */
	orderbook(params: GetOrderbookParams): Promise<unknown>;

	/**
	 * 주문 목록 조회 리소스를 요청해 계좌 기반 주문 목록을 조회합니다.
	 * `SERVICE.tossInvestAPIService.getOrders(params)`에 `params`를 전달하고
	 * 네트워크 응답을 그대로 반환하며 로컬 캐시/상태를 갱신하지 않습니다.
	 * @param params 주문 목록 조회 조건(계좌, 상태, 기간 등)을 담는 요청 파라미터.
	 * @returns 주문 목록 조회 API의 응답 결과(Promise<unknown>).
	 */
	orders(params: GetOrdersParams): Promise<unknown>;

	/**
	 * 포트폴리오 요약 정보를 조회합니다.
	 * 1) `SERVICE.tossInvestAPIService.getHoldings(params)`를 먼저 호출해 계좌의 보유 종목 목록을 조회하고,
	 * 2) 결과를 `{ account, holdings }` 형태로 묶어 반환합니다.
	 * 여기서 `account`는 입력 `params.account`를 그대로 노출하며, 호출 자체는 조회 위임만 수행하고
	 * 추가 저장/갱신 같은 로컬 상태 변경은 하지 않습니다.
	 * @param params 요약 대상 계좌 식별 및 범위를 담는 요청 파라미터.
	 * @returns `{ account, holdings }` 형태의 포트폴리오 요약 래퍼(Promise<unknown>).
	 */
	portfolioSummary(params: AccountScopedParams): Promise<unknown>;

	/**
	 * 가격 제한 조회 리소스를 요청해 주문 가격 상/하단 제한 정보를 가져옵니다.
	 * `params`를 `SERVICE.tossInvestAPIService.getPriceLimit(params)`로 그대로 위임하고,
	 * 하위 계층에서 발생한 Http 예외는 상위로 전파됩니다.
	 * @param params 가격 제한 조회 조건을 담는 요청 파라미터.
	 * @returns 가격 제한 조회 API의 응답 결과(Promise<unknown>).
	 */
	priceLimit(params: GetPriceLimitParams): Promise<unknown>;

	/**
	 * 가격 조회 리소스를 요청해 여러 종목의 현재 가격/가격대 정보를 조회합니다.
	 * `SERVICE.tossInvestAPIService.getPrices(params)` 호출에 `params`를 위임하고
	 * 조회 결과를 그대로 반환해 추가 가공 없이 전달합니다.
	 * @param params 가격 조회 대상 및 조회 모드 조건을 담는 요청 파라미터.
	 * @returns 다종목 가격 조회 API의 응답 결과(Promise<unknown>).
	 */
	prices(params: GetPricesParams): Promise<unknown>;

	/**
	 * 랭킹 조회 리소스를 요청해 시장 내 순위 기반 지표 정보를 가져옵니다.
	 * 전달된 `params`를 `SERVICE.tossInvestAPIService.getRankings(params)`로 위임하고
	 * 결과 그대로 반환합니다.
	 * @param params 랭킹 조회 조건(카테고리/기간 등)을 담는 요청 파라미터.
	 * @returns 랭킹 조회 API의 응답 결과(Promise<unknown>).
	 */
	rankings(params: GetRankingsParams): Promise<unknown>;

	/**
	 * 매도 가능 수량 조회 리소스를 요청해 특정 보유분에 대한 매도 가능 수량을 계산/조회합니다.
	 * `params`를 `SERVICE.tossInvestAPIService.getSellableQuantity(params)`에 위임하며,
	 * 로컬 상태 또는 주문 상태를 변경하지 않고 원격 계산 결과를 반환합니다.
	 * @param params 매도 가능 수량 조회 대상 계좌/종목 조건을 담는 요청 파라미터.
	 * @returns 매도 가능 수량 조회 API의 응답 결과(Promise<unknown>).
	 */
	sellableQuantity(params: GetSellableQuantityParams): Promise<unknown>;

	/**
	 * 종목 경고 조회 리소스를 요청해 종목별 투자 주의/경고 정보를 조회합니다.
	 * `params`를 `SERVICE.tossInvestAPIService.getStockWarnings(params)`로 전달하고
	 * 반환값을 그대로 전달해 호출자 책임 경계(출력/필터링)로 둡니다.
	 * @param params 종목 경고 조회 대상 종목군/조건을 담는 요청 파라미터.
	 * @returns 종목 경고 조회 API의 응답 결과(Promise<unknown>).
	 */
	stockWarnings(params: GetStockWarningsParams): Promise<unknown>;

	/**
	 * 종목 정보 조회 리소스를 요청해 다수 종목의 기본 정보/현재 상태를 가져옵니다.
	 * `params`를 `SERVICE.tossInvestAPIService.getStocks(params)`로 위임하고,
	 * 네트워크 조회 실패 시 하위 HTTP 예외를 상위로 전달합니다.
	 * @param params 종목 조회 대상 및 필터 조건을 담는 요청 파라미터.
	 * @returns 종목 정보 조회 API의 응답 결과(Promise<unknown>).
	 */
	stocks(params: GetStocksParams): Promise<unknown>;

	/**
	 * 체결 이력 조회 리소스를 요청해 거래 체결 목록을 조회합니다.
	 * `params`를 `SERVICE.tossInvestAPIService.getTrades(params)`에 전달하고
	 * 호출 결과를 그대로 반환하므로 내부 캐시/상태 변화는 없습니다.
	 * @param params 체결 조회 대상 계좌/기간 조건을 담는 요청 파라미터.
	 * @returns 체결 이력 조회 API의 응답 결과(Promise<unknown>).
	 */
	trades(params: GetTradesParams): Promise<unknown>;

	/**
	 * 미국 증시 휴장일/개장일 캘린더 조회 리소스를 요청합니다.
	 * 선택적 `params`를 `SERVICE.tossInvestAPIService.getUsMarketCalendar(params)`로 전달하고
	 * 응답을 그대로 반환합니다.
	 * @param params 조회 기간 또는 상세 필터를 담는 선택적 요청 파라미터.
	 * @returns 미국 시장 캘린더 조회 API의 응답 결과(Promise<unknown>).
	 */
	usMarketCalendar(params?: GetMarketCalendarParams): Promise<unknown>;
}

export class QueryCommandService implements IQueryCommandService {
	accounts(): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getAccounts();
	}

	buyingPower(params: GetBuyingPowerParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getBuyingPower(params);
	}

	candles(params: GetCandlesParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getCandles(params);
	}

	commissions(params: AccountScopedParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getCommissions(params);
	}

	conditionalOrder(params: ConditionalOrderIdentityParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getConditionalOrder(params);
	}

	conditionalOrders(params: GetConditionalOrdersParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getConditionalOrders(params);
	}

	exchangeRate(params: GetExchangeRateParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getExchangeRate(params);
	}

	holdings(params: GetHoldingsParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getHoldings(params);
	}

	krMarketCalendar(params?: GetMarketCalendarParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getKrMarketCalendar(params);
	}

	marketIndicatorCandles(
		params: GetMarketIndicatorCandlesParams,
	): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getMarketIndicatorCandles(params);
	}

	marketIndicatorInvestorTrading(
		params: GetMarketIndicatorInvestorTradingParams,
	): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getMarketIndicatorInvestorTrading(
			params,
		);
	}

	marketIndicatorPrices(
		params: GetMarketIndicatorPricesParams,
	): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getMarketIndicatorPrices(params);
	}

	order(params: OrderIdentityParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getOrder(params);
	}

	orderbook(params: GetOrderbookParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getOrderbook(params);
	}

	orders(params: GetOrdersParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getOrders(params);
	}

	async portfolioSummary(params: AccountScopedParams): Promise<unknown> {
		const holdings = await SERVICE.tossInvestAPIService.getHoldings(params);
		return { account: params.account, holdings };
	}

	priceLimit(params: GetPriceLimitParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getPriceLimit(params);
	}

	prices(params: GetPricesParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getPrices(params);
	}

	rankings(params: GetRankingsParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getRankings(params);
	}

	sellableQuantity(params: GetSellableQuantityParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getSellableQuantity(params);
	}

	stockWarnings(params: GetStockWarningsParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getStockWarnings(params);
	}

	stocks(params: GetStocksParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getStocks(params);
	}

	trades(params: GetTradesParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getTrades(params);
	}

	usMarketCalendar(params?: GetMarketCalendarParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.getUsMarketCalendar(params);
	}
}
