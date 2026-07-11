import { beforeEach, describe, expect, it } from "@jest/globals";

import { CliException } from "../exceptions";
import { TossInvestAccountIDSchema } from "../schema/helper-schema";
import type { CliConfig } from "../schema/cli/config";
import { TRADE_SAFETY_POLICY } from "./trade-safety";

type CriticalPayload = Record<string, string | number | boolean | undefined>;

const BASE_CONFIG: CliConfig = {
	accountAllowlist: ["42"],
	authCachePath: "/tmp/toss-invest-cli-test/auth-cache.json",
	credentialsPath: "/tmp/toss-invest-cli-test/credentials.enc",
	clientId: "client-id",
	clientSecret: "client-secret",
	configHome: "/tmp/toss-invest-cli-test",
	orderKillSwitch: "open",
	orderLiveApproved: "yes",
};

function createConfig(overrides: Partial<CliConfig> = {}): CliConfig {
	return {
		...BASE_CONFIG,
		...overrides,
	};
}

function createCritical(
	overrides: Partial<CriticalPayload> = {},
): CriticalPayload {
	return {
		account: "42",
		orderType: "LIMIT",
		price: "70000",
		quantity: "1",
		side: "BUY",
		symbol: "005930",
		...overrides,
	};
}

function createConditionalCritical(
	overrides: Partial<CriticalPayload> = {},
): CriticalPayload {
	return {
		account: "42",
		expireDate: "20280101",
		firstOrderSide: "BUY",
		firstTriggerPrice: "70000",
		orderType: "LIMIT",
		quantity: "1",
		symbol: "005930",
		type: "SINGLE",
		...overrides,
	};
}

function capturePolicyError(action: () => void): CliException {
	let error: CliException | null = null;

	try {
		action();
	} catch (caught) {
		error = caught as CliException;
	}

	expect(error).toBeInstanceOf(CliException);

	return error ?? new CliException("Policy call did not throw", {});
}

const EXPECTED_SUMMARY =
	"action=orders.create|account=42|orderType=LIMIT|price=70000|quantity=1|side=BUY|symbol=005930";

describe("TRADE_SAFETY_POLICY", () => {
	describe("buildConfirmationSummary", () => {
		let action: string;
		let critical: CriticalPayload;

		beforeEach(() => {
			action = "orders.create";
			critical = createCritical();
		});

		describe("성공 케이스", () => {
			it("임계 필드를 정렬해 결정론적인 확인 요약 문자열을 생성한다", () => {
				expect(
					TRADE_SAFETY_POLICY.buildConfirmationSummary(action, critical),
				).toBe(EXPECTED_SUMMARY);
			});

			it("요약 생성 시 undefined, 빈 문자열 필드를 제외한다", () => {
				expect(
					TRADE_SAFETY_POLICY.buildConfirmationSummary(action, {
						...critical,
						clientOrderId: undefined,
						note: "",
					}),
				).not.toContain("clientOrderId=");
				expect(
					TRADE_SAFETY_POLICY.buildConfirmationSummary(action, {
						...critical,
						clientOrderId: undefined,
						note: "",
					}),
				).not.toContain("note=");
			});
		});
	});

	describe("evaluate", () => {
		let account: ReturnType<typeof TossInvestAccountIDSchema.parse>;
		let action: string;
		let critical: CriticalPayload;
		let config: CliConfig;

		beforeEach(() => {
			account = TossInvestAccountIDSchema.parse("42");
			action = "orders.create";
			critical = createCritical();
			config = createConfig();
		});

		describe("성공 케이스", () => {
			it("live 미지정 시 dry-run 결정을 반환하고 입력을 변형하지 않는다", () => {
				const originalConfig = structuredClone(config);
				const originalCritical = structuredClone(critical);

				const decision = TRADE_SAFETY_POLICY.evaluate({
					account,
					action,
					config,
					critical,
				});

				expect(decision).toEqual({
					mode: "dry-run",
					summary: EXPECTED_SUMMARY,
				});
				expect(config).toEqual(originalConfig);
				expect(critical).toEqual(originalCritical);
			});
		});

		describe("성공 케이스", () => {
			it("모든 라이브 승인 게이트를 통과하면 live 결정을 반환한다", () => {
				const decision = TRADE_SAFETY_POLICY.evaluate({
					account,
					action,
					config,
					confirm: EXPECTED_SUMMARY,
					critical,
					live: true,
				});

				expect(decision).toEqual({
					mode: "live",
					summary: EXPECTED_SUMMARY,
				});
			});
		});

		describe("실패 케이스", () => {
			it("라이브 승인 요약이 일치하지 않으면 수행을 거부한다", () => {
				const error = capturePolicyError(() =>
					TRADE_SAFETY_POLICY.evaluate({
						account,
						action,
						config,
						confirm: "orders.create|summary=changed",
						critical,
						live: true,
					}),
				);

				expect(error).toMatchObject({
					code: "live_confirmation_required",
					exitCode: 2,
					details: { summary: EXPECTED_SUMMARY },
				});
				expect(error).not.toHaveProperty("details.safetyMode");
			});

			it("안전 게이트 미충족 시 라이브 실행을 차단한다", () => {
				const error = capturePolicyError(() =>
					TRADE_SAFETY_POLICY.evaluate({
						account,
						action,
						config: createConfig({
							orderKillSwitch: "closed",
						}),
						confirm: EXPECTED_SUMMARY,
						critical,
						live: true,
					}),
				);

				expect(error).toMatchObject({
					code: "live_safety_policy_required",
					exitCode: 2,
					details: {
						missing: expect.arrayContaining([
							"TOSS_INVEST_ORDER_KILL_SWITCH=open",
						]),
					},
				});
			});

			it("허용 계정이 아니면 라이브 실행을 거부한다", () => {
				const error = capturePolicyError(() =>
					TRADE_SAFETY_POLICY.evaluate({
						account,
						action,
						config: createConfig({
							accountAllowlist: ["999"],
						}),
						confirm: EXPECTED_SUMMARY,
						critical,
						live: true,
					}),
				);

				expect(error).toMatchObject({
					code: "live_safety_policy_required",
					exitCode: 2,
					details: {
						missing: expect.arrayContaining([
							"TOSS_INVEST_ACCOUNT_ALLOWLIST account match",
						]),
					},
				});
				expect(error).not.toHaveProperty("details.safetyMode");
			});

			it("clientOrderId가 요구될 때 누락되면 거부한다", () => {
				const error = capturePolicyError(() =>
					TRADE_SAFETY_POLICY.evaluate({
						account,
						action,
						config,
						confirm: EXPECTED_SUMMARY,
						critical: createCritical({
							clientOrderId: undefined,
						}),
						live: true,
						requireClientOrderId: true,
					}),
				);

				expect(error).toMatchObject({
					code: "client_order_id_required",
					exitCode: 2,
				});
				expect(error.message).toContain(
					"Live order creation requires --client-order-id",
				);
			});

			it("conditional 주문 생성에서 clientOrderId가 요구될 때 누락되면 거부한다", () => {
				const error = capturePolicyError(() =>
					TRADE_SAFETY_POLICY.evaluate({
						account,
						action: "conditional-orders.create",
						config,
						confirm: "conditional-orders.create|summary=unused",
						critical: createConditionalCritical({
							clientOrderId: undefined,
						}),
						live: true,
						requireClientOrderId: true,
					}),
				);

				expect(error).toMatchObject({
					code: "client_order_id_required",
					exitCode: 2,
				});
				expect(error.message).toContain(
					"Live order creation requires --client-order-id",
				);
			});
		});
	});
});
