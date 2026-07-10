import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from "@jest/globals";

import { HttpService } from "./http.service";
import { SERVICE } from "../service-registry";
import {
	TOSS_INVEST_ACCOUNT_HEADER,
	TossInvestAPIService,
} from "./api.service";
import { OAuth2TokenRequestSchema } from "../schema/api/auth";
import { TossInvestAccountIDSchema } from "../schema/helper-schema";
import type { HttpRequestOptions } from "../schema/api/http";
import type { IHttpService } from "./http.service";

interface RecordedHttpCall {
	body?: unknown;
	method: "GET" | "POST" | "DELETE";
	options?: Omit<HttpRequestOptions, "body" | "method">;
	path: string;
}

class RecordingHttpService implements IHttpService {
	readonly baseURL = "https://openapi.tossinvest.com/";
	readonly calls: RecordedHttpCall[] = [];
	nextResponse: unknown = { result: true };

	async get<T>(
		path: string,
		options?: Omit<HttpRequestOptions, "body" | "method">,
	): Promise<T> {
		this.calls.push({ method: "GET", options, path });
		return this.nextResponse as T;
	}

	async post<T>(
		path: string,
		body?: unknown,
		options?: Omit<HttpRequestOptions, "body" | "method">,
	): Promise<T> {
		this.calls.push({ body, method: "POST", options, path });
		return this.nextResponse as T;
	}

	async patch<T>(): Promise<T> {
		throw new Error("patch is not used by TossInvestAPIService");
	}

	async delete<T>(
		path: string,
		options?: Omit<HttpRequestOptions, "body" | "method">,
	): Promise<T> {
		this.calls.push({ method: "DELETE", options, path });
		return this.nextResponse as T;
	}

	async request<T>(): Promise<T> {
		throw new Error("request is not used by TossInvestAPIService");
	}
}

function firstCall(httpService: RecordingHttpService): RecordedHttpCall {
	const call = httpService.calls.at(0);
	if (call === undefined) {
		throw new Error("expected at least one HTTP call");
	}
	return call;
}

function headersFrom(call: RecordedHttpCall): Headers {
	return new Headers(call.options?.headers);
}

const oauthRequestFixture = OAuth2TokenRequestSchema.parse({
	client_id: "client-id",
	client_secret: "client-secret",
});

describe("TossInvestAPIService", () => {
	let apiService: TossInvestAPIService;
	let recordingHttpService: RecordingHttpService;
	let originalHttpService: IHttpService;

	beforeEach(() => {
		originalHttpService = SERVICE.httpService;
		recordingHttpService = new RecordingHttpService();
		SERVICE.httpService = recordingHttpService;
		apiService = new TossInvestAPIService();
	});

	afterEach(() => {
		SERVICE.httpService = originalHttpService;
		jest.restoreAllMocks();
	});

	describe("생성자", () => {
		describe("성공 케이스", () => {
			it("정의되어야 한다", () => {
				expect(apiService).toBeInstanceOf(TossInvestAPIService);
			});
		});
	});

	describe("OAuth2 토큰 발급", () => {
		describe("성공 케이스", () => {
			it("OAuth2 요청은 x-www-form-urlencoded 바디를 보내고 Authorization 헤더를 누락한다", async () => {
				apiService.setAccessToken("existing-token");

				await apiService.issueOAuth2Token(oauthRequestFixture);

				const call = firstCall(recordingHttpService);
				const body = call.body as URLSearchParams;

				expect(call).toMatchObject({
					method: "POST",
					path: "/oauth2/token",
				});
				expect(body).toBeInstanceOf(URLSearchParams);
				expect(body.get("grant_type")).toBe("client_credentials");
				expect(body.get("client_id")).toBe("client-id");
				expect(headersFrom(call).get("content-type")).toBe(
					"application/x-www-form-urlencoded",
				);
				expect(headersFrom(call).get("authorization")).toBeNull();
			});
		});

		describe("실패 케이스", () => {
			it("HTTP 전송 오류를 그대로 전파하고 요청이 전달된 채로 종료한다", async () => {
				const transportError = new Error("oauth token endpoint unavailable");
				recordingHttpService.nextResponse = Promise.reject(transportError);

				await expect(
					apiService.issueOAuth2Token(oauthRequestFixture),
				).rejects.toBe(transportError);

				const call = firstCall(recordingHttpService);
				const body = call.body as URLSearchParams;

				expect(call).toMatchObject({
					method: "POST",
					path: "/oauth2/token",
				});
				expect(body).toBeInstanceOf(URLSearchParams);
				expect(body.get("grant_type")).toBe("client_credentials");
				expect(headersFrom(call).get("content-type")).toBe(
					"application/x-www-form-urlencoded",
				);
				expect(headersFrom(call).get("authorization")).toBeNull();
			});
		});
	});

	describe("가격 조회", () => {
		describe("성공 케이스", () => {
			it("요청 메타데이터가 Authorization/signal/커스텀 헤더와 쿼리로 전파된다", async () => {
				const abortController = new AbortController();
				apiService.setRequestMetadata({
					accessToken: "test-token",
					headers: { "x-client-id": "cli-test" },
					signal: abortController.signal,
				});

				await apiService.getPrices({ symbols: "AAPL,NVDA" });

				const call = firstCall(recordingHttpService);
				expect(call).toMatchObject({
					method: "GET",
					path: "/api/v1/prices",
				});
				expect(call.options?.query).toEqual({ symbols: "AAPL,NVDA" });
				expect(call.options?.signal).toBe(abortController.signal);
				expect(headersFrom(call).get("authorization")).toBe("Bearer test-token");
				expect(headersFrom(call).get("x-client-id")).toBe("cli-test");
			});
		});

		describe("실패 케이스", () => {
			it("HTTP 전송 오류를 그대로 전파하고 요청 메서드/경로/쿼리를 기록한다", async () => {
				const transportError = new Error("transport unavailable");
				const realHttpService = new HttpService({
					baseURL: "https://openapi.tossinvest.com",
				});
				SERVICE.httpService = realHttpService;
				const requestMock = jest
					.spyOn(realHttpService, "request")
					.mockRejectedValueOnce(transportError);

				await expect(
					apiService.getPrices({ symbols: "BRK/B" }),
				).rejects.toBe(transportError);

				expect(requestMock).toHaveBeenCalledTimes(1);
				const [path, options] = requestMock.mock.calls.at(0) ?? [];
				expect(path).toBe("/api/v1/prices");
				expect(options?.method).toBe("GET");
				expect(options?.query).toEqual({ symbols: "BRK/B" });
			});
		});
	});

	describe("보유 자산 조회", () => {
		describe("성공 케이스", () => {
			it("계좌 헤더와 요청 쿼리를 함께 전송한다", async () => {
				apiService.setAccessToken("test-token");

				await apiService.getHoldings({
					account: TossInvestAccountIDSchema.parse(123456789),
					symbol: "005930",
				});

				const call = firstCall(recordingHttpService);
				expect(call).toMatchObject({
					method: "GET",
					path: "/api/v1/holdings",
				});
				expect(call.options?.query).toEqual({ symbol: "005930" });
				expect(headersFrom(call).get(TOSS_INVEST_ACCOUNT_HEADER)).toBe(
					"123456789",
				);
				expect(headersFrom(call).get("authorization")).toBe("Bearer test-token");
			});
		});

		describe("실패 케이스", () => {
			it("HTTP 전송 오류를 그대로 전파하고 계좌/쿼리 위임을 유지한다", async () => {
				const transportError = new Error("holdings endpoint unavailable");
				recordingHttpService.nextResponse = Promise.reject(transportError);
				apiService.setAccessToken("test-token");

				await expect(
					apiService.getHoldings({
						account: TossInvestAccountIDSchema.parse(123456789),
						symbol: "005930",
					}),
				).rejects.toBe(transportError);

				const call = firstCall(recordingHttpService);
				expect(call).toMatchObject({
					method: "GET",
					path: "/api/v1/holdings",
				});
				expect(call.options?.query).toEqual({ symbol: "005930" });
				expect(headersFrom(call).get(TOSS_INVEST_ACCOUNT_HEADER)).toBe(
					"123456789",
				);
				expect(headersFrom(call).get("authorization")).toBe("Bearer test-token");
			});
		});
	});

	describe("주문 생성", () => {
		describe("성공 케이스", () => {
			it("계좌 헤더와 주문 본문을 POST로 전송한다", async () => {
				apiService.setAccessToken("test-token");
				const request = {
					orderType: "LIMIT" as const,
					price: "70000",
					quantity: "1",
					side: "BUY" as const,
					symbol: "005930",
				};

				await apiService.createOrder(
					{
						account: TossInvestAccountIDSchema.parse("42"),
					},
					request,
				);

				const call = firstCall(recordingHttpService);
				expect(call).toMatchObject({
					method: "POST",
					path: "/api/v1/orders",
				});
				expect(call.body).toEqual(request);
				expect(headersFrom(call).get(TOSS_INVEST_ACCOUNT_HEADER)).toBe("42");
			});
		});

		describe("실패 케이스", () => {
			it("HTTP 전송 오류를 그대로 전파하고 주문 본문과 계좌 헤더 위임을 유지한다", async () => {
				const transportError = new Error("create order endpoint unavailable");
				recordingHttpService.nextResponse = Promise.reject(transportError);
				apiService.setAccessToken("test-token");
				const request = {
					orderType: "LIMIT" as const,
					price: "70000",
					quantity: "1",
					side: "BUY" as const,
					symbol: "005930",
				};

				await expect(
					apiService.createOrder(
						{
							account: TossInvestAccountIDSchema.parse("42"),
						},
						request,
					),
				).rejects.toBe(transportError);

				const call = firstCall(recordingHttpService);
				expect(call).toMatchObject({
					method: "POST",
					path: "/api/v1/orders",
				});
				expect(call.body).toEqual(request);
				expect(headersFrom(call).get(TOSS_INVEST_ACCOUNT_HEADER)).toBe("42");
			});
		});
	});

	describe("종목 경고 조회", () => {
		describe("성공 케이스", () => {
			it("symbol 경로 파라미터를 URL 인코딩한다", async () => {
				await apiService.getStockWarnings({ symbol: "BRK/B" });

				expect(firstCall(recordingHttpService).path).toBe(
					"/api/v1/stocks/BRK%2FB/warnings",
				);
			});
		});

		describe("실패 케이스", () => {
			it("빈 symbol은 TypeError를 던지고 HTTP 호출을 하지 않는다", () => {
				expect(() => apiService.getStockWarnings({ symbol: "" })).toThrow(TypeError);
				expect(recordingHttpService.calls).toHaveLength(0);
			});
		});
	});

});


