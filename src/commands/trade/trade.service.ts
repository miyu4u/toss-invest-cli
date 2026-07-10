import { SERVICE } from "../../service-registry";
import type {
	ConditionalOrderIdentityParams,
	OrderIdentityParams,
} from "../../schema/api/params";
import type {
	ConditionalOrderCreateRequest,
	ConditionalOrderModifyRequest,
	OrderCreateRequest,
	OrderModifyRequest,
} from "../../schema/api/requests";
import type { AccountScopedParams } from "../../schema/helper-schema";

export interface ITradeCommandService {
	/**
	 * 조건부 주문 취소 요청을 API 서비스에 위임해 지정 주문을 취소합니다.
	 * 전달된 `params`는 계정/조건부 주문 식별 정보로 사용되며, 실제 API 호출은
	 * `SERVICE.tossInvestAPIService.cancelConditionalOrder(params)`로 바로 위임됩니다.
	 * 본 서비스는 실행 시점의 안전성 정책 결정을 하지 않고, caller(예: `TRADE_COMMAND_EXECUTOR`)가
	 * live/dry-run 게이트, 승인, 재확인 정책을 선결정합니다.
	 * HTTP 위임 구간에서 2xx가 아닌 응답은 `HttpException`이 발생해 상위로 전파됩니다.
	 * @param params 조건부 주문 취소 대상 계정 및 식별자 정보를 담는 파라미터.
	 * @returns 조건부 주문 취소 API 호출 결과(Promise<unknown>).
	 */
	cancelConditionalOrder(
		params: ConditionalOrderIdentityParams,
	): Promise<unknown>;

	/**
	 * 주문 취소 요청을 API 서비스에 위임해 지정 주문을 취소합니다.
	 * 전달된 `params`는 주문 식별 정보로 사용되며, 실제 API 호출은
	 * `SERVICE.tossInvestAPIService.cancelOrder(params)`로 위임됩니다.
	 * 본 메서드는 상태 변경의 실행 조건을 판별하지 않고, caller가 live 모드인지 dry-run인지의
	 * 안전 가드와 승인 흐름을 담당합니다.
	 * HTTP 위임 구간에서 2xx가 아닌 응답은 `HttpException`이 발생해 상위로 전파됩니다.
	 * @param params 주문 취소 대상 계정 및 주문 식별자 정보를 담는 파라미터.
	 * @returns 주문 취소 API 호출 결과(Promise<unknown>).
	 */
	cancelOrder(params: OrderIdentityParams): Promise<unknown>;

	/**
	 * 조건부 주문 생성 요청을 API 서비스에 위임해 새 주문을 생성합니다.
	 * `params`는 계정 범위 정보를, `request`는 주문 생성 본문을 정의하며, 실 API 호출은
	 * `SERVICE.tossInvestAPIService.createConditionalOrder(params, request)`로 그대로 위임됩니다.
	 * 생성 API의 실행/중단, live 승인, dry-run 차단은 호출측(`TRADE_COMMAND_EXECUTOR`)의
	 * 정책으로 결정되며, 본 서비스는 위임과 결과 전달만 담당합니다.
	 * HTTP 위임 구간에서 2xx가 아닌 응답은 `HttpException`이 발생해 상위로 전파됩니다.
	 * @param params 조건부 주문 생성을 수행할 계정 범위를 지정하는 파라미터.
	 * @param request 조건부 주문 생성 본문(수량, 가격, 조건, 타입, 심볼, 만료 등)을 담은 파라미터.
	 * @returns 조건부 주문 생성 API 호출 결과(Promise<unknown>).
	 */
	createConditionalOrder(
		params: AccountScopedParams,
		request: ConditionalOrderCreateRequest,
	): Promise<unknown>;

	/**
	 * 주문 생성 요청을 API 서비스에 위임해 새 주문을 생성합니다.
	 * `params`는 계정 범위를 지정하고 `request`는 주문 생성 본문을 전달하며, 위임 호출은
	 * `SERVICE.tossInvestAPIService.createOrder(params, request)`입니다.
	 * 본 메서드는 API 호출 자체를 수행하지 않고, live 모드 진입·dry-run 안전 정책·확인 절차는
	 * caller가 선행 제어합니다.
	 * HTTP 위임 구간에서 2xx가 아닌 응답은 `HttpException`이 발생해 상위로 전파됩니다.
	 * @param params 주문 생성을 수행할 계정 범위를 지정하는 파라미터.
	 * @param request 주문 생성 본문(종목, 매수/매도 방향, 수량/금액, 가격 조건 등)을 담은 파라미터.
	 * @returns 주문 생성 API 호출 결과(Promise<unknown>).
	 */
	createOrder(
		params: AccountScopedParams,
		request: OrderCreateRequest,
	): Promise<unknown>;

	/**
	 * 조건부 주문 수정 요청을 API 서비스에 위임해 대상 주문을 갱신합니다.
	 * `params`는 조건부 주문 식별 정보로, `request`는 변경할 주문 속성으로 사용되며,
	 * 실제 처리 진입점은 `SERVICE.tossInvestAPIService.modifyConditionalOrder(params, request)`입니다.
	 * 실행 안정성 판단(예: live 전환, dry-run 차단, 승인 조건)은 호출자 계층이 담당하고,
	 * 본 메서드는 위임된 호출 결과만 전달합니다.
	 * HTTP 위임 구간에서 2xx가 아닌 응답은 `HttpException`이 발생해 상위로 전파됩니다.
	 * @param params 조건부 주문 수정 대상의 계정/주문 식별 정보를 담는 파라미터.
	 * @param request 조건부 주문 수정 본문(만료일, 수량, 가격, 조건 등)을 담는 파라미터.
	 * @returns 조건부 주문 수정 API 호출 결과(Promise<unknown>).
	 */
	modifyConditionalOrder(
		params: ConditionalOrderIdentityParams,
		request: ConditionalOrderModifyRequest,
	): Promise<unknown>;

	/**
	 * 주문 수정 요청을 API 서비스에 위임해 대상 주문을 갱신합니다.
	 * `params`는 주문 식별 정보, `request`는 변경값을 담고, 실제 요청은
	 * `SERVICE.tossInvestAPIService.modifyOrder(params, request)`로 그대로 전달됩니다.
	 * 실행 가드(실시간 전환, dry-run 정책, 안전 승인)는 이 인터페이스의 caller가 책임지며,
	 * 본 메서드는 상태 변경 API 호출의 진입자 역할만 수행합니다.
	 * HTTP 위임 구간에서 2xx가 아닌 응답은 `HttpException`이 발생해 상위로 전파됩니다.
	 * @param params 주문 수정 대상의 계정/주문 식별 정보를 담는 파라미터.
	 * @param request 주문 수정 본문(수량, 가격, 주문 타입 등 변경 항목)을 담는 파라미터.
	 * @returns 주문 수정 API 호출 결과(Promise<unknown>).
	 */
	modifyOrder(
		params: OrderIdentityParams,
		request: OrderModifyRequest,
	): Promise<unknown>;
}

export class TradeCommandService implements ITradeCommandService {
	cancelConditionalOrder(
		params: ConditionalOrderIdentityParams,
	): Promise<unknown> {
		return SERVICE.tossInvestAPIService.cancelConditionalOrder(params);
	}

	cancelOrder(params: OrderIdentityParams): Promise<unknown> {
		return SERVICE.tossInvestAPIService.cancelOrder(params);
	}

	createConditionalOrder(
		params: AccountScopedParams,
		request: ConditionalOrderCreateRequest,
	): Promise<unknown> {
		return SERVICE.tossInvestAPIService.createConditionalOrder(params, request);
	}

	createOrder(
		params: AccountScopedParams,
		request: OrderCreateRequest,
	): Promise<unknown> {
		return SERVICE.tossInvestAPIService.createOrder(params, request);
	}

	modifyConditionalOrder(
		params: ConditionalOrderIdentityParams,
		request: ConditionalOrderModifyRequest,
	): Promise<unknown> {
		return SERVICE.tossInvestAPIService.modifyConditionalOrder(params, request);
	}

	modifyOrder(
		params: OrderIdentityParams,
		request: OrderModifyRequest,
	): Promise<unknown> {
		return SERVICE.tossInvestAPIService.modifyOrder(params, request);
	}
}
