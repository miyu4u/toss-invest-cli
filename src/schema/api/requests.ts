import z from "zod";

import {
	ConditionalOrderTypeSchema,
	OrderSideSchema,
	OrderTypeSchema,
	TimeInForceSchema,
} from "../enum";
import { ClientOrderIDSchema } from "./identifier";

/**
 * 정규 주문 생성 공통 요청 베이스.
 * symbol/side/orderType은 필수이며, 수량 또는 금액은 상위 union에서 상호배타적으로 강제한다.
 */
export const OrderCreateRequestBaseSchema = z.object({
	/**
	 * 선택 가능한 클라이언트 주문 식별자.
	 * 요청 바디에서 생략 가능하며, 전송 시 클라이언트 주문 추적용으로 사용한다.
	 */
	clientOrderId: ClientOrderIDSchema.optional(),
	/**
	 * 종목 코드를 나타내는 문자열.
	 * 요청에서 필수 항목으로 지정된다.
	 */
	symbol: z.string(),
	/**
	 * 주문 방향(매수/매도) 값.
	 * `BUY`, `SELL`만 허용하는 열거형으로 고정된다.
	 */
	side: OrderSideSchema,
	/**
	 * 주문 타입(지정가/시장가) 값.
	 * 필수값으로 주문 처리 방식이 결정된다.
	 */
	orderType: OrderTypeSchema,
	/**
	 * 유효시간 정책.
	 * 미지정 시 기본 동작으로 처리되며, 필요할 때만 전달한다.
	 */
	timeInForce: TimeInForceSchema.optional(),
	/**
	 * 지정가 주문 가격 문자열.
	 * 시장가 주문일 경우 비워둘 수 있고, 전달 시 가격 문자열로 검증한다.
	 */
	price: z.string().optional(),
	/**
	 * 고액 주문 동의 플래그.
	 * 생략 가능하며 true/false만 허용한다.
	 */
	confirmHighValueOrder: z.boolean().optional(),
});
export type OrderCreateRequestBase = z.infer<typeof OrderCreateRequestBaseSchema>;

/**
 * 정규 주문 생성 요청 스키마.
 * 두 분기를 둬 quantity와 orderAmount가 동시에 채워지지 않도록
 * 하나만 required + 다른 하나는 never(optional)로 상호배타 제약한다.
 */
export const OrderCreateRequestSchema = z.union([
	OrderCreateRequestBaseSchema.extend({
		/**
		 * 수량 기반 주문 입력.
		 * 수량 문자열은 필수이며, 금액 기반 필드는 배타적으로 금지된다.
		 */
		quantity: z.string(),
		/**
		 * 주문 금액 기반 입력.
		 * 이 분기에서는 절대 수용되지 않도록 `z.never().optional()`로 배타 제약한다.
		 */
		orderAmount: z.never().optional(),
	}),
	OrderCreateRequestBaseSchema.extend({
		/**
		 * 주문 금액 기반 주문 입력.
		 * 금액 문자열은 필수이며, 수량 기반 필드는 배타적으로 금지된다.
		 */
		orderAmount: z.string(),
		/**
		 * 수량 입력.
		 * 이 분기에서는 절대 수용되지 않도록 `z.never().optional()`로 배타 제약한다.
		 */
		quantity: z.never().optional(),
	}),
]).superRefine((request, context) => {
	if (request.orderType === "MARKET" && request.timeInForce === "CLS") {
		context.addIssue({
			code: "custom",
			message:
				"CLS time in force requires a US LIMIT order; MARKET orders must omit it or use DAY.",
			path: ["timeInForce"],
		});
	}
});
export type OrderCreateRequest = z.infer<typeof OrderCreateRequestSchema>;

/**
 * 주문 수정 요청 스키마.
 * 주문 타입은 필수, 수량/가격/고위험 동의는 각각 optional이며 부분수정 입력을 허용한다.
 */
export const OrderModifyRequestSchema = z.object({
	/**
	 * 주문 타입 변경값.
	 * 부분 수정 시에도 필수로 제공해야 한다.
	 */
	orderType: OrderTypeSchema,
	/**
	 * 주문 수량 변경값.
	 * 생략 가능하며 문자열로 수량을 갱신한다.
	 */
	quantity: z.string().optional(),
	/**
	 * 주문 가격 변경값.
	 * 생략 가능하고 문자열 가격으로 부분 업데이트한다.
	 */
	price: z.string().optional(),
	/**
	 * 고액 주문 동의 값.
	 * 생략 가능하며 true/false를 전달한다.
	 */
	confirmHighValueOrder: z.boolean().optional(),
});
export type OrderModifyRequest = z.infer<typeof OrderModifyRequestSchema>;

/**
 * 주문 취소 요청 스키마.
 * 빈 객체를 허용하는 레코드 타입으로, 바디 필드 없이 빈 요청을 요구하는 엔드포인트에 대응한다.
 */
export const CancelOrderRequestSchema = z.record(z.string(), z.never());
export type CancelOrderRequest = z.infer<typeof CancelOrderRequestSchema>;

/**
 * 조건부 주문 내 개별 조건 블록 스키마.
 * 매수/매도 방향, 트리거 가격 필수, 주문 가격은 시장가/지정가 상황에 따라 선택이다.
 */
export const ConditionRequestSchema = z.object({
	/**
	 * 조건 블록의 주문 방향.
	 * buy/sell 값을 enum으로 제한한 필수 값이다.
	 */
	orderSide: OrderSideSchema,
	/**
	 * 트리거 가격 문자열.
	 * 조건 주문이 발동되는 기준 가격으로 필수 입력이다.
	 */
	triggerPrice: z.string(),
	/**
	 * 실제 주문 가격.
	 * 주문 타입에 따라 생략 가능하며 필요 시 문자열로 제공한다.
	 */
	orderPrice: z.string().optional(),
});
export type ConditionRequest = z.infer<typeof ConditionRequestSchema>;

/**
 * 조건부 주문 생성 요청 스키마.
 * symbol/type/quantity/orderType/expireDate는 필수이며,
 * 첫 번째 조건은 필수, 두 번째 조건은 nullable optional로 다중 조건 조합을 표현한다.
 */
export const ConditionalOrderCreateRequestSchema = z.object({
	/**
	 * 종목 코드 문자열.
	 * 조건부 주문의 대상 종목을 필수로 지정한다.
	 */
	symbol: z.string(),
	/**
	 * 조건부 주문 유형.
	 * `SINGLE/OCO/OTO` 등 허용 enum 값으로 필수 지정한다.
	 */
	type: ConditionalOrderTypeSchema,
	/**
	 * 주문 수량 문자열.
	 * 조건부 주문에서 필수인 수량 값이다.
	 */
	quantity: z.string(),
	/**
	 * 기본 주문 타입.
	 * 지정가/시장가 구분을 위한 필수 주문 유형이다.
	 */
	orderType: OrderTypeSchema,
	/**
	 * 주문 만료일 문자열.
	 * 조건부 주문의 유효기간을 나타내는 필수 필드다.
	 */
	expireDate: z.string(),
	/**
	 * 첫 번째 조건 블록.
	 * 조건부 주문에서 반드시 입력되어야 하는 필수 블록이다.
	 */
	first: ConditionRequestSchema,
	/**
	 * 두 번째 조건 블록.
	 * 없을 수 있고(null) 있어도 `null` 허용하는 optional nullable 필드다.
	 */
	second: ConditionRequestSchema.nullable().optional(),
	/**
	 * 클라이언트 주문 식별자.
	 * 생략 가능하며 제공 시 opaque 문자열 식별자를 사용한다.
	 */
	clientOrderId: ClientOrderIDSchema.optional(),
	/**
	 * 고액 주문 동의 플래그.
	 * 생략 가능하며 true/false만 허용한다.
	 */
	confirmHighValueOrder: z.boolean().optional(),
});
export type ConditionalOrderCreateRequest = z.infer<typeof ConditionalOrderCreateRequestSchema>;

/**
 * 조건부 주문 수정 요청 스키마.
 * create와 동일한 조건 조합을 사용하며, 식별자 없이 body 기반으로 타입/수량/유효기간을 갱신한다.
 */
export const ConditionalOrderModifyRequestSchema = z.object({
	/**
	 * 조건부 주문 유형.
	 * 수정 요청에서 필수로 지정되는 enum 값이다.
	 */
	type: ConditionalOrderTypeSchema,
	/**
	 * 주문 수량 문자열.
	 * 조건부 주문 수정 시 필수로 갱신할 수량이다.
	 */
	quantity: z.string(),
	/**
	 * 주문 타입.
	 * 지정가/시장가 타입을 필수로 전달한다.
	 */
	orderType: OrderTypeSchema,
	/**
	 * 주문 만료일 문자열.
	 * 조건부 주문의 유효기간 변경을 위한 필수 항목이다.
	 */
	expireDate: z.string(),
	/**
	 * 첫 번째 조건 블록.
	 * 존재해야 하는 필수 조건이다.
	 */
	first: ConditionRequestSchema,
	/**
	 * 두 번째 조건 블록.
	 * 생략 가능하고 null도 허용하며 optional nullable 로직을 유지한다.
	 */
	second: ConditionRequestSchema.nullable().optional(),
	/**
	 * 고액 주문 동의 플래그.
	 * 생략 가능하며 true/false를 통해 동의 여부를 갱신한다.
	 */
	confirmHighValueOrder: z.boolean().optional(),
});
export type ConditionalOrderModifyRequest = z.infer<typeof ConditionalOrderModifyRequestSchema>;
