import { describe, expect, it } from "@jest/globals";

import { CURRENCY_ITEMS, CurrencySchema } from "./enum";
import { OrderCreateRequestSchema } from "./api/requests";
import { ClientOrderIDSchema } from "./api/identifier";
import { CliConfigSchema } from "./cli/config";
import { HttpRequestOptionsSchema } from "./api/http";
import { TossInvestAccountIDSchema } from "./helper-schema";

describe("스키마 계약", () => {
	describe("열거형 리터럴", () => {
		it("표준 통화 리터럴을 정확히 허용하고 미등록 통화를 거부한다", () => {
			for (const currency of CURRENCY_ITEMS) {
				expect(CurrencySchema.parse(currency)).toBe(currency);
			}

			expect(CurrencySchema.safeParse("EUR").success).toBe(false);
		});
	});

	describe("주문 생성 요청 스키마 (OrderCreateRequestSchema)", () => {
		const base = {
			symbol: "005930",
			side: "BUY",
			orderType: "LIMIT",
			price: "70000",
		};

		it("수량 단독 주문 페이로드를 허용한다", () => {
			expect(
				OrderCreateRequestSchema.parse({
					...base,
					quantity: "1",
				}).quantity,
			).toBe("1");
		});

		it("주문금액 단독 주문 페이로드를 허용한다", () => {
			expect(
				OrderCreateRequestSchema.parse({
					...base,
					orderAmount: "70000",
				}).orderAmount,
			).toBe("70000");
		});

		it.each([
			[
				"quantity와 orderAmount가 동시에 있을 때 거부한다",
				{ ...base, quantity: "1", orderAmount: "70000" },
			],
			["quantity와 orderAmount 둘 다 없을 때 거부한다", base],
		])("%s", (_, request) => {
			expect(OrderCreateRequestSchema.safeParse(request).success).toBe(false);
		});

		it("시장가 주문에 CLS 유효 조건을 거부한다", () => {
			expect(
				OrderCreateRequestSchema.safeParse({
					...base,
					orderType: "MARKET",
					orderAmount: "5",
					timeInForce: "CLS",
				}).success,
			).toBe(false);
		});
	});

	describe("식별자 스키마", () => {
		it("TossInvestAccountID의 문자열/숫자 값을 보존하고 객체 입력을 거부한다", () => {
			expect(TossInvestAccountIDSchema.parse("42")).toBe("42");
			expect(TossInvestAccountIDSchema.parse(42)).toBe(42);
			expect(TossInvestAccountIDSchema.safeParse({ id: "42" }).success).toBe(
				false,
			);
		});

		it("문자열 기반 브랜디드 식별자를 허용하고 비문자열을 거부한다", () => {
			expect(ClientOrderIDSchema.parse("client-order-1")).toBe(
				"client-order-1",
			);
			expect(ClientOrderIDSchema.safeParse(123).success).toBe(false);
			expect(ClientOrderIDSchema.safeParse({}).success).toBe(false);
		});
	});

	describe("CLI 설정 스키마 (CliConfigSchema)", () => {
		it("accountAllowlist 기본값을 채우고 필수 경로를 보존한다", () => {
			expect(
				CliConfigSchema.parse({
					authCachePath: "/tmp/toss-invest-cli/auth-cache.json",
					configHome: "/tmp/toss-invest-cli",
					credentialsPath: "/tmp/toss-invest-cli/credentials.enc",
				}).accountAllowlist,
			).toEqual([]);
		});

		it.each([
			[
				"비어 있는 authCachePath를 거부한다",
				{
					authCachePath: "",
					configHome: "/tmp/toss-invest-cli",
					credentialsPath: "/tmp/toss-invest-cli/credentials.enc",
				},
			],
			[
				"비어 있는 configHome을 거부한다",
				{
					authCachePath: "/tmp/toss-invest-cli/auth-cache.json",
					configHome: "",
					credentialsPath: "/tmp/toss-invest-cli/credentials.enc",
				},
			],
			[
				"공백만 있는 authCachePath를 거부한다",
				{
					authCachePath: "   ",
					configHome: "/tmp/toss-invest-cli",
					credentialsPath: "/tmp/toss-invest-cli/credentials.enc",
				},
			],
			[
				"공백만 있는 configHome을 거부한다",
				{
					authCachePath: "/tmp/toss-invest-cli/auth-cache.json",
					configHome: "   ",
					credentialsPath: "/tmp/toss-invest-cli/credentials.enc",
				},
			],
			[
				"authCachePath 누락 시 거부한다",
				{
					configHome: "/tmp/toss-invest-cli",
					credentialsPath: "/tmp/toss-invest-cli/credentials.enc",
				},
			],
			[
				"configHome 누락 시 거부한다",
				{
					authCachePath: "/tmp/toss-invest-cli/auth-cache.json",
					credentialsPath: "/tmp/toss-invest-cli/credentials.enc",
				},
			],
		])("%s", (_, input) => {
			expect(CliConfigSchema.safeParse(input).success).toBe(false);
		});
	});

	describe("HTTP 요청 옵션 스키마 (HttpRequestOptionsSchema)", () => {
		it("현재 method/query/signal 형식을 허용한다", () => {
			const controller = new AbortController();
			const query = new URLSearchParams();
			query.set("symbol", "AAPL");
			query.set("active", "true");

			const parsed = HttpRequestOptionsSchema.parse({
				body: { order: "1" },
				headers: { "x-test": "schema-contract" },
				method: "TRACE",
				query,
				signal: controller.signal,
			});

			expect(parsed.query).toBe(query);
			expect(parsed.signal).toBe(controller.signal);
			expect(parsed.method).toBe("TRACE");
		});

		it.each([
			[
				"숫자/불린/널을 포함한 record query 값을 파싱한다",
				{
					query: {
						includeClosed: false,
						limit: 10,
						mode: "market",
						timeout: null,
					},
					signal: undefined,
				},
			],
			[
				"배열 query 값 및 임의 메서드를 파싱한다",
				{
					query: { tags: ["buy", "sell"], allow: true },
					method: "HEAD",
				},
			],
		])("%s", (_, options) => {
			expect(HttpRequestOptionsSchema.safeParse(options).success).toBe(true);
		});
	});
});
