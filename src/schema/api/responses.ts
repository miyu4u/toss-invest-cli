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
