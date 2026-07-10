import z from "zod";

import { HttpHeadersInitSchema } from "./http";

/**
 * 내부 API 호출 공통 메타데이터.
 * 토큰/헤더/AbortSignal을 선택적으로 받아 요청 시그널과 인증 헤더를 구성한다.
 */
export const TossInvestRequestMetadataSchema = z.object({
	/**
	 * API 요청 액세스 토큰.
	 * 요청별로 전달할 Bearer 토큰 문자열이며 선택 항목이다.
	 */
	accessToken: z.string().optional(),
	/**
	 * API 요청 헤더.
	 * HttpHeadersInit 형식의 선택적 헤더 맵으로 추가 인증/메타 정보를 전달한다.
	 */
	headers: HttpHeadersInitSchema.optional(),
	/**
	 * 요청 중단 신호.
	 * AbortSignal을 받아 요청 취소 동작을 제어하는 선택 항목이다.
	 */
	signal: z.custom<AbortSignal>().optional(),
});
export type TossInvestRequestMetadata = z.infer<
	typeof TossInvestRequestMetadataSchema
>;
