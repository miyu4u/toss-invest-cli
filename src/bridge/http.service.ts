import { z } from "zod";

import { HttpException } from "../exceptions";
import {
	HttpHeadersInitSchema,
	type HttpHeadersInit,
	type HttpRequestOptions,
	type QueryParams,
} from "../schema/api/http";

type BodyInitLike = NonNullable<
	NonNullable<Parameters<typeof fetch>[1]>["body"]
>;

export const HttpBodyInitSchema = z.custom<BodyInitLike>();
export type HttpBodyInit = z.infer<typeof HttpBodyInitSchema>;

export const HttpServiceOptionsSchema = z.object({
	baseURL: z.string(),
	defaultHeaders: HttpHeadersInitSchema.optional(),
});
export type HttpServiceOptions = z.infer<typeof HttpServiceOptionsSchema>;

export interface IHttpService {
	baseURL: string;

	/**
	 * 공통 요청 파이프라인인 `request`로 위임해 GET 요청을 수행한다.
	 *
	 * `path`는 `baseURL` 기반으로 완전한 URL로 결합되며, `options.query`는
	 * URL 검색 파라미터로 직렬화된다. `options.headers`는 서비스 기본 헤더와 병합되고
	 * `options.signal`은 fetch 취소 신호로 전달된다. 본 메서드는 본문을 직접 구성하지 않고
	 * `request`의 본문 처리 규칙을 사용한다.
	 *
	 * 실행 결과는 `request`가 파싱한 응답 본문을 제네릭 타입 `T`로 반환한다.
	 *
	 * @param path 요청 경로
	 * @param options GET 전용 옵션(`body`/`method` 제외)
	 * @returns 파싱된 응답 본문을 담은 `Promise<T>`
	 */
	get<T>(
		path: string,
		options?: Omit<HttpRequestOptions, "body" | "method">,
	): Promise<T>;
	/**
	 * 공통 요청 파이프라인인 `request`로 위임해 POST 요청을 수행한다.
	 *
	 * `path`와 `options`는 기본 URL 결합, 헤더 병합, 쿼리 파라미터 구성에서
	 * `request`의 동작을 그대로 따른다. `body`가 전달되면 JSON 직렬화 가능한 값이면
	 * `content-type`이 지정되지 않을 때 기본 `application/json`을 붙여 `request`가
	 * fetch 본문으로 사용한다.
	 *
	 * 실행 결과는 `request`의 공통 파싱/예외 규칙을 따르며 성공 시 `T` 타입 값으로
	 * 비동기 반환된다.
	 *
	 * @param path 요청 경로
	 * @param body POST 본문 데이터(없으면 omit 가능)
	 * @param options 헤더/쿼리/취소 시그널 등 옵션
	 * @returns 파싱된 응답 본문을 담은 `Promise<T>`
	 */
	post<T>(
		path: string,
		body?: unknown,
		options?: Omit<HttpRequestOptions, "body" | "method">,
	): Promise<T>;
	/**
	 * 공통 요청 파이프라인인 `request`로 위임해 PATCH 요청을 수행한다.
	 *
	 * 기존 조회/생성 흐름과 동일하게 경로 결합, 헤더 병합, 쿼리 파라미터 처리,
	 * 본문 직렬화를 공통 규칙으로 수행한다. `body`가 제공되면 부분 갱신 데이터가
	 * `request`를 통해 fetch에 전달된다.
	 *
	 * 응답과 예외는 모두 `request` 규칙을 공유하므로, 상위 호출부는 한 위치의 계약을
	 * 기준으로 처리할 수 있다.
	 *
	 * @param path 요청 경로
	 * @param body PATCH 본문 데이터(선택)
	 * @param options 헤더/쿼리/취소 시그널 등 옵션
	 * @returns 파싱된 응답 본문을 담은 `Promise<T>`
	 */
	patch<T>(
		path: string,
		body?: unknown,
		options?: Omit<HttpRequestOptions, "body" | "method">,
	): Promise<T>;
	/**
	 * 공통 요청 파이프라인인 `request`로 위임해 DELETE 요청을 수행한다.
	 *
	 * `path` 결합·헤더 병합·쿼리 직렬화 규칙은 GET/POST/PATCH와 동일하고,
	 * 본문은 사용하지 않는다. 실제 네트워크 전송 및 응답 파싱은 `request`가
	 * 담당한다.
	 *
	 * 반환은 공통 파싱 결과를 `T`로 캐스팅해 제공한다.
	 *
	 * @param path 요청 경로
	 * @param options DELETE 전용 옵션(`body`/`method` 제외)
	 * @returns 파싱된 응답 본문을 담은 `Promise<T>`
	 */
	delete<T>(
		path: string,
		options?: Omit<HttpRequestOptions, "body" | "method">,
	): Promise<T>;
	/**
	 * HTTP 요청의 공통 처리 경계를 담당한다.
	 *
	 * `path`를 `baseURL` 상대 URL로 변환하고 `options.query`를 URLSearchParams 기반으로
	 * 병합한다. `options.headers`는 기본 헤더와 덮어쓰기 병합되며, `options.body`
	 *는 `HttpService`의 바디 규칙에 따라 전달 가능한 바디 타입은 그대로 사용하고,
	 *그 외 객체는 JSON 문자열로 직렬화된다(필요 시 `content-type` 자동 부여).
	 * `options.method`가 없으면 GET으로 기본값이 적용된다.
	 *
	 * fetch 응답은 `parseResponseBody`로 본문을 파싱해 반환한다. JSON 콘텐츠 타입이면
	 * JSON 파싱, 빈 본문 또는 204/205는 `undefined`를 반환한다. 2xx가 아닌 상태 코드는
	 * 에러 본문과 메타데이터를 담은 `HttpException`을 발생시킨다.
	 *
	 * @param path 요청 경로 또는 URL 문자열
	 * @param options HTTP 메서드/헤더/쿼리/body/취소 시그널 옵션
	 * @returns 타입 `T`로 캐스팅 가능한 응답 본문 `Promise<T>`
	 * @throws HttpException 비-2xx 응답일 때
	 */
	request<T>(path: string, options?: HttpRequestOptions): Promise<T>;
}

export class HttpService implements IHttpService {
	readonly baseURL: string;
	private readonly defaultHeaders: Headers;

	constructor(options: HttpServiceOptions) {
		if (options.baseURL.trim().length === 0) {
			throw new TypeError("baseURL must not be empty");
		}

		this.baseURL = this.normalizeBaseURL(options.baseURL);
		this.defaultHeaders = new Headers(options.defaultHeaders);
	}

	get<T>(
		path: string,
		options: Omit<HttpRequestOptions, "body" | "method"> = {},
	): Promise<T> {
		return this.request<T>(path, { ...options, method: "GET" });
	}

	post<T>(
		path: string,
		body?: unknown,
		options: Omit<HttpRequestOptions, "body" | "method"> = {},
	): Promise<T> {
		return this.request<T>(path, { ...options, body, method: "POST" });
	}

	patch<T>(
		path: string,
		body?: unknown,
		options: Omit<HttpRequestOptions, "body" | "method"> = {},
	): Promise<T> {
		return this.request<T>(path, { ...options, body, method: "PATCH" });
	}

	delete<T>(
		path: string,
		options: Omit<HttpRequestOptions, "body" | "method"> = {},
	): Promise<T> {
		return this.request<T>(path, { ...options, method: "DELETE" });
	}

	async request<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
		const method = options.method?.toUpperCase() ?? "GET";
		const url = this.buildURL(path, options.query);
		const headers = this.mergeHeaders(options.headers);
		const body = this.serializeBody(options.body, headers);

		const response = await fetch(url, {
			body,
			headers,
			method,
			signal: options.signal,
		});
		const responseBody = await this.parseResponseBody(response);

		if (!response.ok) {
			throw new HttpException(
				`HTTP ${response.status} ${response.statusText}`.trim(),
				{
					body: responseBody,
					method,
					status: response.status,
					statusText: response.statusText,
					url,
				},
			);
		}

		return responseBody as T;
	}

	private normalizeBaseURL(baseURL: string): string {
		return baseURL.endsWith("/") ? baseURL : `${baseURL}/`;
	}

	private buildURL(path: string, query?: QueryParams): string {
		const url = new URL(path, this.baseURL);
		this.appendQuery(url, query);
		return url.toString();
	}

	private appendQuery(url: URL, query?: QueryParams): void {
		if (!query) {
			return;
		}

		if (query instanceof URLSearchParams) {
			query.forEach((value, key) => {
				url.searchParams.append(key, value);
			});
			return;
		}

		for (const [key, value] of Object.entries(query)) {
			const values = Array.isArray(value) ? value : [value];

			for (const item of values) {
				if (item !== null && item !== undefined) {
					url.searchParams.append(key, String(item));
				}
			}
		}
	}

	private mergeHeaders(requestHeaders?: HttpHeadersInit): Headers {
		const headers = new Headers(this.defaultHeaders);
		new Headers(requestHeaders).forEach((value, key) => {
			headers.set(key, value);
		});
		return headers;
	}

	private serializeBody(
		body: unknown,
		headers: Headers,
	): HttpBodyInit | undefined {
		if (body === undefined || body === null) {
			return undefined;
		}

		if (this.isBodyInit(body)) {
			return body;
		}

		if (!headers.has("content-type")) {
			headers.set("content-type", "application/json");
		}

		return JSON.stringify(body);
	}

	private isBodyInit(body: unknown): body is HttpBodyInit {
		return (
			typeof body === "string" ||
			body instanceof URLSearchParams ||
			body instanceof FormData ||
			body instanceof Blob ||
			body instanceof ArrayBuffer ||
			ArrayBuffer.isView(body) ||
			body instanceof ReadableStream
		);
	}

	private async parseResponseBody(response: Response): Promise<unknown> {
		if (response.status === 204 || response.status === 205) {
			return undefined;
		}

		const text = await response.text();
		if (text.length === 0) {
			return undefined;
		}

		const contentType = response.headers.get("content-type") ?? "";
		if (
			contentType.includes("application/json") ||
			contentType.includes("+json")
		) {
			return JSON.parse(text);
		}

		return text;
	}
}
