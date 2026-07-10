import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { HttpService } from "./http.service";
import type { HttpHeadersInit } from "../schema/api/http";

const baseURL = "https://example.com/api";

function createJsonResponse(body: unknown, init: ResponseInit = {}): Response {
	const headers = createHeaders(init.headers);
	if (body !== undefined && !headers.has("content-type")) {
		headers.set("content-type", "application/json");
	}

	return new Response(JSON.stringify(body), {
		...init,
		headers,
		status: init.status ?? 200,
	});
}

function expectRequestHeaders(
	requestInit: RequestInit,
	expected: Record<string, string | null>,
): void {
	const headers = createHeaders(requestInit.headers);

	for (const [name, value] of Object.entries(expected)) {
		if (value === null) {
			expect(headers.get(name)).toBeNull();
			continue;
		}
		expect(headers.get(name)).toBe(value);
	}
}

function createHeaders(
	initHeaders?: RequestInit["headers"] | ResponseInit["headers"] | HttpHeadersInit,
): Headers {
	const normalized = new Headers();

	if (!initHeaders) {
		return normalized;
	}

	if (initHeaders instanceof Headers) {
		return new Headers(initHeaders);
	}

	if (Array.isArray(initHeaders)) {
		for (const [name, value] of initHeaders) {
			normalized.append(name, value);
		}

		return normalized;
	}

	for (const [name, value] of Object.entries(initHeaders)) {
		if (Array.isArray(value)) {
			for (const item of value) {
				normalized.append(name, item);
			}
			continue;
		}

		normalized.set(name, value);
	}

	return normalized;
}

function getFetchCall(
	fetchMock: jest.SpiedFunction<typeof globalThis.fetch>,
): [Parameters<typeof globalThis.fetch>[0], NonNullable<Parameters<typeof globalThis.fetch>[1]>] {
	const call = fetchMock.mock.calls[0];
	if (!call) {
		throw new Error("Expected fetch to be called");
	}

	const [url, init] = call;
	if (init === undefined) {
		throw new Error("Expected fetch call to include request init");
	}

	return [url, init];
}

afterEach(() => {
	jest.restoreAllMocks();
});

describe("HttpService", () => {
	let http: HttpService;

	beforeEach(() => {
		http = new HttpService({
			baseURL,
			defaultHeaders: {
				"x-service-header": "http-client",
			},
		});
	});

	describe("생성자", () => {
		describe("성공 케이스", () => {
			it("정의되어야 한다", () => {
				expect(http).toBeDefined();
				expect(http.baseURL).toBe(`${baseURL}/`);
			});
		});

		describe("실패 케이스", () => {
			it("빈 baseURL은 TypeError를 던진다", () => {
				expect(() => new HttpService({ baseURL: "" })).toThrow(
					"baseURL must not be empty",
				);
			});
		});
	});

	describe("GET 메서드", () => {
		let fetchMock: jest.SpiedFunction<typeof globalThis.fetch>;

		beforeEach(() => {
			fetchMock = jest
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(
					createJsonResponse({ ok: true }, { status: 200, statusText: "OK" }),
				);
		});

		describe("성공 케이스", () => {
			it("정의된 baseURL을 사용해 query가 병합된 GET 호출을 수행한다", async () => {
				const response = await http.get<{ ok: boolean }>("accounts", {
					query: {
						symbol: "AAPL",
						active: true,
						skipped: null,
						optional: undefined,
					},
					headers: {
						"x-request-id": "market-prices",
					},
				});

				expect(response).toEqual({ ok: true });

				const [url, init] = getFetchCall(fetchMock);
				expect(url).toBe(`${baseURL}/accounts?symbol=AAPL&active=true`);
				expect(init).toMatchObject({ method: "GET" });
				expectRequestHeaders(init, {
					"x-service-header": "http-client",
					"x-request-id": "market-prices",
				});
			});
		});
	});

	describe("POST 메서드", () => {
		let fetchMock: jest.SpiedFunction<typeof globalThis.fetch>;
		const requestBody = {
			side: "BUY",
			price: "70000",
		};

		beforeEach(() => {
			fetchMock = jest
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(createJsonResponse({ result: "created" }));
		});

		describe("성공 케이스", () => {
			it("JSON 바디를 직렬화해 POST 요청을 전송하고 기본 헤더를 유지한다", async () => {
				const response = await http.post<{ result: string }>(
					"anything/post",
					requestBody,
					{
						headers: {
							"content-type": "application/json",
					},
					},
				);

				expect(response).toEqual({ result: "created" });

				const [url, init] = getFetchCall(fetchMock);
				expect(url).toBe(`${baseURL}/anything/post`);
				expect(init).toMatchObject({ method: "POST" });
				expect(init.body).toBe(JSON.stringify(requestBody));
				expectRequestHeaders(init, {
					"x-service-header": "http-client",
					"content-type": "application/json",
				});
			});
		});
	});

	describe("PATCH 메서드", () => {
		let fetchMock: jest.SpiedFunction<typeof globalThis.fetch>;
		const requestBody = {
			limit: 42,
		};

		beforeEach(() => {
			fetchMock = jest
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(createJsonResponse({ patched: true }));
		});

		describe("성공 케이스", () => {
			it("JSON 바디를 직렬화해 PATCH 요청을 전송한다", async () => {
				const response = await http.patch<{ patched: boolean }>(
					"anything/patch",
					requestBody,
					{
						headers: { "x-request-id": "patch-endpoint" },
				},
				);

				expect(response).toEqual({ patched: true });

				const [url, init] = getFetchCall(fetchMock);
				expect(url).toBe(`${baseURL}/anything/patch`);
				expect(init).toMatchObject({ method: "PATCH" });
				expect(init.body).toBe(JSON.stringify(requestBody));
				expectRequestHeaders(init, {
					"x-service-header": "http-client",
					"x-request-id": "patch-endpoint",
				});
			});
		});
	});

	describe("DELETE 메서드", () => {
		let fetchMock: jest.SpiedFunction<typeof globalThis.fetch>;

		beforeEach(() => {
			fetchMock = jest
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(createJsonResponse({ ok: true }));
		});

		describe("성공 케이스", () => {
			it("query를 유지한 DELETE 호출을 수행한다", async () => {
				const response = await http.delete<{ ok: boolean }>("anything/delete", {
					query: {
						type: ["open", "closed"],
					},
				});

				expect(response).toEqual({ ok: true });

				const [url, init] = getFetchCall(fetchMock);
				expect(url).toBe(`${baseURL}/anything/delete?type=open&type=closed`);
				expect(init).toMatchObject({ method: "DELETE" });
				expectRequestHeaders(init, { "x-service-header": "http-client" });
			});
		});
	});

	describe("요청 공용 메서드", () => {
		let fetchMock: jest.SpiedFunction<typeof globalThis.fetch>;

		beforeEach(() => {
			fetchMock = jest
				.spyOn(globalThis, "fetch")
				.mockResolvedValue(createJsonResponse({ ok: true }));
		});

		describe("성공 케이스", () => {
			it("바디 타입을 그대로 전달해 공용 요청 경로를 통해 전송한다", async () => {
				const body = new URLSearchParams({ grant_type: "client_credentials" });

				const response = await http.request<{ ok: true }>("oauth2/token", {
					body,
					method: "POST",
					headers: { authorization: "Basic abc" },
				});

				expect(response).toEqual({ ok: true });

				const [url, init] = getFetchCall(fetchMock);
				expect(url).toBe(`${baseURL}/oauth2/token`);
				expect(init).toMatchObject({ method: "POST" });
				expect(init.body).toBe(body);
				expectRequestHeaders(init, {
					authorization: "Basic abc",
					"x-service-header": "http-client",
				});
			});
		});

		describe("실패 케이스", () => {
			it("비정상 응답은 HttpException으로 전환한다", async () => {
				fetchMock.mockResolvedValueOnce(
					new Response(JSON.stringify({ code: "forbidden" }), {
						headers: {
							"content-type": "application/json",
						},
						status: 403,
						statusText: "Forbidden",
					}),
				);

				await expect(
					http.request("oauth2/token", {
						method: "POST",
					}),
				).rejects.toMatchObject({
					message: "HTTP 403 Forbidden",
					name: "HttpException",
					body: { code: "forbidden" },
					method: "POST",
					status: 403,
					statusText: "Forbidden",
					url: `${baseURL}/oauth2/token`,
				});

				const [url, init] = getFetchCall(fetchMock);
				expect(url).toBe(`${baseURL}/oauth2/token`);
				expect(init).toMatchObject({ method: "POST" });
				expectRequestHeaders(init, { "x-service-header": "http-client" });

				expect(fetchMock).toHaveBeenCalledTimes(1);
			});
		});
	});
});
