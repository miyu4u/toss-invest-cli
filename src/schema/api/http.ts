import z from "zod";

type HeadersInitLike = ConstructorParameters<typeof Headers>[0];

export const HttpHeadersInitSchema = z.custom<HeadersInitLike>();
export type HttpHeadersInit = z.infer<typeof HttpHeadersInitSchema>;

export const HttpMethodSchema = z.enum(["GET", "POST", "PATCH", "DELETE"]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const QueryValueSchema = z.union([
	z.boolean(),
	z.number(),
	z.string(),
	z.null(),
	z.undefined(),
]);
export type QueryValue = z.infer<typeof QueryValueSchema>;

export const QueryValueArraySchema = z.array(QueryValueSchema).readonly();
export const QueryParamsSchema = z.union([
	z.instanceof(URLSearchParams),
	z.record(z.string(), z.union([QueryValueSchema, QueryValueArraySchema])),
]);
export type QueryParams = z.infer<typeof QueryParamsSchema>;

export const HttpRequestOptionsSchema = z.object({
	/**
	 * HTTP 요청 본문.
	 * 요청 타입에 따라 임의로 전달되는 값으로, 미지정이 허용된다.
	 */
	body: z.unknown().optional(),
	/**
	 * HTTP 공통 헤더 집합.
	 * `HttpHeadersInitSchema` 형식을 따르는 선택적 헤더이며 미지정이 가능하다.
	 */
	headers: HttpHeadersInitSchema.optional(),
	/**
	 * HTTP 메서드.
	 * GET/POST/PATCH/DELETE 열거형 또는 문자열을 허용하고, 필요 시 생략 가능하다.
	 */
	method: z.union([HttpMethodSchema, z.string()]).optional(),
	/**
	 * URL 쿼리 파라미터.
	 * 단일 값 또는 배열 값을 허용하는 QueryParams 형식으로, 미지정이 가능하다.
	 */
	query: QueryParamsSchema.optional(),
	/**
	 * 요청 취소 시그널.
	 * AbortSignal을 받는 선택적 취소 제어값이다.
	 */
	signal: z.custom<AbortSignal>().optional(),
});
export type HttpRequestOptions = z.infer<typeof HttpRequestOptionsSchema>;
