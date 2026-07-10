import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { OrderIDSchema } from "../../schema/api/identifier";
import { AccountSchema } from "../../schema/api/responses";
import { SERVICE } from "../../service-registry";
import { runCLI } from "../../cli/bootstrap";
import { TossInvestApiResponseSchema } from "../../schema/helper-schema";
import { TOSS_INVEST_AUTH_RUNTIME } from "../../runtime/auth";

class BufferStream {
	readonly chunks: string[] = [];

	write(chunk: string): boolean {
		this.chunks.push(chunk);
		return true;
	}

	toString(): string {
		return this.chunks.join("");
	}
}

function createOutput() {
	return {
		stderr: new BufferStream(),
		stdout: new BufferStream(),
	};
}

const createOrderArgv = [
	"node",
	"toss-invest-cli",
	"--json",
	"--account",
	"42",
	"orders",
	"create",
	"--symbol",
	"005930",
	"--side",
	"BUY",
	"--order-type",
	"LIMIT",
	"--quantity",
	"1",
	"--price",
	"70000",
];

const createConditionalOrderArgv = [
	"node",
	"toss-invest-cli",
	"--json",
	"--account",
	"42",
	"orders",
	"conditional",
	"create",
	"--symbol",
	"005930",
	"--type",
	"SINGLE",
	"--quantity",
	"1",
	"--order-type",
	"LIMIT",
	"--expire-date",
	"20280101",
	"--first-order-side",
	"BUY",
	"--first-trigger-price",
	"70000",
];

function parseConfirmationSummary(summary: unknown): Record<string, string> {
	return Object.fromEntries(
		String(summary)
			.split("|")
			.filter((segment) => segment.includes("="))
			.map((segment) => {
				const [key, ...rawValue] = segment.split("=");
				return [key, rawValue.join("=")];
			}),
	);
}

function toSummaryAndBody(argv: string[]): {
	output: ReturnType<typeof createOutput>;
	run: () => Promise<unknown>;
} {
	const output = createOutput();
	return {
		output,
		run: () => runCLI(argv, { output }),
	};
}

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CANONICAL_ACCOUNT_SEQ = "42";
const DISPLAY_ACCOUNT_NO = "010123456789";
const DISPLAY_ACCOUNT_SEQ = 2001;

const getAccountsResponse = TossInvestApiResponseSchema(
	AccountSchema.array(),
).parse({
	result: [
		{
			accountNo: "42",
			accountSeq: 42,
			accountType: "BROKERAGE",
		},
		{
			accountNo: DISPLAY_ACCOUNT_NO,
			accountSeq: DISPLAY_ACCOUNT_SEQ,
			accountType: "BROKERAGE",
		},
		{
			accountNo: "1",
			accountSeq: 4004,
			accountType: "BROKERAGE",
		},
		{
			accountNo: "020222222222",
			accountSeq: 1,
			accountType: "BROKERAGE",
		},
	],
});

function withAccount(argv: string[], account: string): string[] {
	return [...argv.slice(0, 4), account, ...argv.slice(5)];
}

describe("거래 명령", () => {
	let prepareApi: jest.SpiedFunction<
		typeof TOSS_INVEST_AUTH_RUNTIME.prepareApi
	>;
	let getAccounts: jest.SpiedFunction<
		typeof SERVICE.tossInvestAPIService.getAccounts
	>;

	beforeEach(() => {
		prepareApi = jest
			.spyOn(TOSS_INVEST_AUTH_RUNTIME, "prepareApi")
			.mockResolvedValue(undefined);
		getAccounts = jest
			.spyOn(SERVICE.tossInvestAPIService, "getAccounts")
			.mockResolvedValue(getAccountsResponse);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("orders create", () => {
		let output: ReturnType<typeof createOutput>;
		let createOrder: jest.SpiedFunction<
			typeof SERVICE.tossInvestAPIService.createOrder
		>;

		beforeEach(() => {
			output = createOutput();
			createOrder = jest.spyOn(SERVICE.tossInvestAPIService, "createOrder");
		});

		describe("성공 케이스", () => {
			it("클라이언트 주문 ID를 지정하고 승인 게이트/요약을 만족하면 live 주문이 실행된다", async () => {
				const clientOrderId = "cid-live-existing";
				const dryRunOutput = createOutput();
				createOrder.mockResolvedValue({
					result: { orderId: OrderIDSchema.parse("dry-run-order-id") },
				});

				const dryRunExitCode = await runCLI(
					[
						...createOrderArgv,
						"--client-order-id",
						clientOrderId,
					],
					{ output: dryRunOutput },
				);
				const dryRunBody = JSON.parse(dryRunOutput.stdout.toString());

				expect(dryRunExitCode).toBe(0);
				expect(dryRunBody.result.summary).toContain(
					`clientOrderId=${clientOrderId}`,
				);
				expect(dryRunBody).toMatchObject({
					mode: "dry-run",
					result: {
						clientOrderId,
						summary: expect.any(String),
					},
				});
				expect(dryRunBody).not.toHaveProperty("dryRun");
				expect(dryRunBody).not.toHaveProperty("clientOrderId");
				expect(dryRunBody).not.toHaveProperty("summary");
				expect(dryRunOutput.stderr.toString()).toBe("");
				expect(createOrder).not.toHaveBeenCalled();

				createOrder.mockResolvedValue({
					result: { orderId: OrderIDSchema.parse("live-order-id") },
				});
				const exitCode = await runCLI(
					[
						...createOrderArgv,
						"--client-order-id",
						clientOrderId,
						"--live",
						"--confirm",
						dryRunBody.result.summary,
					],
					{
						output,
						env: {
							TOSSINVEST_ACCOUNT_ALLOWLIST: CANONICAL_ACCOUNT_SEQ,
							TOSSINVEST_ORDER_KILL_SWITCH: "open",
							TOSSINVEST_ORDER_LIVE_APPROVED: "yes",
						},
					},
				);

				expect(exitCode).toBe(0);
				expect(output.stderr.toString()).toBe("");
				expect(JSON.parse(output.stdout.toString())).toEqual({
					mode: "live",
					result: { orderId: "live-order-id" },
				});
				expect(createOrder).toHaveBeenCalledTimes(1);
			});

			it("표시 계좌번호를 입력하면 accountSeq로 정규화한 뒤 API 주문을 호출한다", async () => {
				const clientOrderId = "cid-live-account-no";
				const dryRunOutput = createOutput();

				createOrder.mockResolvedValue({
					result: { orderId: OrderIDSchema.parse("dry-run-order-id") },
				});

				const dryRunExitCode = await runCLI(
					[
						...withAccount(createOrderArgv, DISPLAY_ACCOUNT_NO),
						"--client-order-id",
						clientOrderId,
					],
					{ output: dryRunOutput },
				);
				const dryRunBody = JSON.parse(dryRunOutput.stdout.toString());

				expect(dryRunExitCode).toBe(0);
				expect(dryRunBody).toMatchObject({
					mode: "dry-run",
					result: {
						clientOrderId,
						summary: expect.any(String),
					},
				});
				expect(
					parseConfirmationSummary(dryRunBody.result.summary).account,
				).toBe(String(DISPLAY_ACCOUNT_SEQ));
				expect(dryRunBody).not.toHaveProperty("dryRun");
				expect(dryRunBody).not.toHaveProperty("clientOrderId");
				expect(dryRunBody).not.toHaveProperty("summary");
				expect(createOrder).not.toHaveBeenCalled();

				createOrder.mockResolvedValue({
					result: { orderId: OrderIDSchema.parse("live-order-id") },
				});
				const exitCode = await runCLI(
					[
						...withAccount(createOrderArgv, DISPLAY_ACCOUNT_NO),
						"--client-order-id",
						clientOrderId,
						"--live",
						"--confirm",
						dryRunBody.result.summary,
					],
					{
						output,
						env: {
							TOSSINVEST_ACCOUNT_ALLOWLIST: String(
								DISPLAY_ACCOUNT_SEQ,
							),
							TOSSINVEST_ORDER_KILL_SWITCH: "open",
							TOSSINVEST_ORDER_LIVE_APPROVED: "yes",
						},
					},
				);

				expect(exitCode).toBe(0);
				expect(output.stderr.toString()).toBe("");
				expect(JSON.parse(output.stdout.toString())).toEqual({
					mode: "live",
					result: { orderId: "live-order-id" },
				});
				expect(createOrder).toHaveBeenCalledTimes(1);
				const createOrderCall = createOrder.mock.calls[0];
				if (!createOrderCall) {
					throw new Error("Expected createOrder to be called");
				}

				const [createOrderParams, createOrderRequest] = createOrderCall;
				expect(String(createOrderParams.account)).toBe(
					String(DISPLAY_ACCOUNT_SEQ),
				);
				expect(createOrderRequest).toMatchObject({
					clientOrderId,
					orderType: "LIMIT",
					quantity: "1",
					price: "70000",
					side: "BUY",
					symbol: "005930",
				});
				expect(prepareApi).toHaveBeenCalledTimes(3);
				expect(getAccounts).toHaveBeenCalledTimes(2);
			});

			it("기본 dry-run에서 요약만 반환하고 API 호출 없이 종료한다", async () => {
				const exitCode = await runCLI(createOrderArgv, { output });
				const body = JSON.parse(output.stdout.toString());
				const summary = parseConfirmationSummary(body.result.summary);

				expect(exitCode).toBe(0);
				expect(body).toMatchObject({
					mode: "dry-run",
					result: {
						clientOrderId: expect.stringMatching(UUID_PATTERN),
						summary: expect.any(String),
					},
				});
				expect(body).not.toHaveProperty("dryRun");
				expect(body).not.toHaveProperty("clientOrderId");
				expect(body).not.toHaveProperty("summary");
				expect(summary).toEqual(
					expect.objectContaining({
						action: "orders.create",
						account: "42",
						orderType: "LIMIT",
						price: "70000",
						quantity: "1",
						side: "BUY",
						symbol: "005930",
					}),
				);
				expect(createOrder).not.toHaveBeenCalled();
				expect(output.stderr.toString()).toBe("");
			});

			it("time in force를 dry-run 승인 요약에 포함한다", async () => {
				const exitCode = await runCLI(
					[...createOrderArgv, "--time-in-force", "DAY"],
					{ output },
				);
				const body = JSON.parse(output.stdout.toString());
				const summary = parseConfirmationSummary(body.result.summary);

				expect(exitCode).toBe(0);
				expect(summary.timeInForce).toBe("DAY");
				expect(createOrder).not.toHaveBeenCalled();
			});

			it("client-order-id 생략 시 dry-run 결과/요약에 UUID가 노출되고 호출마다 달라진다", async () => {
				const firstRun = toSummaryAndBody(createOrderArgv);
				const secondRun = toSummaryAndBody(createOrderArgv);

				const firstExitCode = await firstRun.run();
				const secondExitCode = await secondRun.run();

				const firstBody = JSON.parse(firstRun.output.stdout.toString());
				const secondBody = JSON.parse(secondRun.output.stdout.toString());
				const firstSummary = parseConfirmationSummary(
					firstBody.result.summary,
				);
				const secondSummary = parseConfirmationSummary(
					secondBody.result.summary,
				);

				expect(firstExitCode).toBe(0);
				expect(secondExitCode).toBe(0);
				expect(firstBody).toMatchObject({
					mode: "dry-run",
					result: {
						clientOrderId: expect.stringMatching(UUID_PATTERN),
						summary: expect.any(String),
					},
				});
				expect(secondBody).toMatchObject({
					mode: "dry-run",
					result: {
						clientOrderId: expect.stringMatching(UUID_PATTERN),
						summary: expect.any(String),
					},
				});
				expect(firstBody).not.toHaveProperty("dryRun");
				expect(firstBody).not.toHaveProperty("clientOrderId");
				expect(firstBody).not.toHaveProperty("summary");
				expect(firstBody.result.clientOrderId).toEqual(
					expect.stringMatching(UUID_PATTERN),
				);
				expect(firstBody.result.clientOrderId).toBe(
					firstSummary.clientOrderId,
				);
				expect(secondBody.result.clientOrderId).toEqual(
					expect.stringMatching(UUID_PATTERN),
				);
				expect(secondBody.result.clientOrderId).toBe(
					secondSummary.clientOrderId,
				);
				expect(firstBody.result.clientOrderId).not.toBe(
					secondBody.result.clientOrderId,
				);
				expect(firstRun.output.stderr.toString()).toBe("");
				expect(secondRun.output.stderr.toString()).toBe("");
				expect(secondBody).not.toHaveProperty("dryRun");
				expect(secondBody).not.toHaveProperty("clientOrderId");
				expect(secondBody).not.toHaveProperty("summary");
				expect(createOrder).not.toHaveBeenCalled();
			});

			it("client-order-id를 제공하면 dry-run result/요약에서 그대로 유지된다", async () => {
				const explicitClientOrderId = "cid-dryrun-existing";
				const exitCode = await runCLI(
					[...createOrderArgv, "--client-order-id", explicitClientOrderId],
					{ output },
				);
				const body = JSON.parse(output.stdout.toString());
				const summary = parseConfirmationSummary(body.result.summary);

				expect(exitCode).toBe(0);
				expect(body).toMatchObject({
					mode: "dry-run",
					result: {
						clientOrderId: explicitClientOrderId,
						summary: expect.any(String),
					},
				});
				expect(body.result.clientOrderId).toBe(explicitClientOrderId);
				expect(summary.clientOrderId).toBe(explicitClientOrderId);
				expect(body).not.toHaveProperty("dryRun");
				expect(body).not.toHaveProperty("clientOrderId");
				expect(body).not.toHaveProperty("summary");
				expect(output.stderr.toString()).toBe("");
				expect(createOrder).not.toHaveBeenCalled();
			});
		});

		describe("실패 케이스", () => {
			it("live 모드에서 client-order-id 미지정 시 동작을 중단하고 API 호출을 하지 않는다", async () => {
				const exitCode = await runCLI([...createOrderArgv, "--live"], { output });

				expect(exitCode).toBe(2);
				expect(output.stdout.toString()).toBe("");
				expect(output.stderr.toString()).toContain(
					"client_order_id_required",
				);
				expect(createOrder).not.toHaveBeenCalled();
			});

			it("계좌가 모호하면 요청을 중단하고 createOrder를 호출하지 않는다", async () => {
				const exitCode = await runCLI(
					withAccount(createOrderArgv, "1"),
					{ output },
				);

				expect(exitCode).toBe(2);
				expect(output.stdout.toString()).toBe("");
				expect(output.stderr.toString()).toContain(
					"error_kind=ACCOUNT_AMBIGUOUS",
				);
				expect(createOrder).not.toHaveBeenCalled();
			});
		});
	});

	describe("conditional-orders create", () => {
		let output: ReturnType<typeof createOutput>;
		let createConditionalOrder: jest.SpiedFunction<
			typeof SERVICE.tradeCommandService.createConditionalOrder
		>;

		beforeEach(() => {
			output = createOutput();
			createConditionalOrder = jest.spyOn(
				SERVICE.tradeCommandService,
				"createConditionalOrder",
			);
		});

		describe("성공 케이스", () => {
			it("클라이언트 주문 ID를 지정하고 승인 게이트/요약을 만족하면 live 조건부 주문이 실행된다", async () => {
				const clientOrderId = "cid-conditional-live-existing";
				const dryRunOutput = createOutput();

				createConditionalOrder.mockResolvedValue({
					result: { conditionalOrderId: "dry-run-order-id" },
				});

				const dryRunExitCode = await runCLI(
					[
						...createConditionalOrderArgv,
						"--client-order-id",
						clientOrderId,
					],
					{ output: dryRunOutput },
				);
				const dryRunBody = JSON.parse(dryRunOutput.stdout.toString());

				expect(dryRunExitCode).toBe(0);
				expect(dryRunOutput.stderr.toString()).toBe("");
				expect(dryRunBody).toMatchObject({
					mode: "dry-run",
					result: {
						clientOrderId,
						summary: expect.any(String),
					},
				});
				expect(dryRunBody.result.summary).toContain(
					`clientOrderId=${clientOrderId}`,
				);
				expect(dryRunBody).not.toHaveProperty("dryRun");
				expect(dryRunBody).not.toHaveProperty("clientOrderId");
				expect(dryRunBody).not.toHaveProperty("summary");
				expect(createConditionalOrder).not.toHaveBeenCalled();

				createConditionalOrder.mockResolvedValue({
					result: { conditionalOrderId: "conditional-live-order-id" },
				});

				const exitCode = await runCLI(
					[
						...createConditionalOrderArgv,
						"--client-order-id",
						clientOrderId,
						"--live",
						"--confirm",
						dryRunBody.result.summary,
					],
					{
						output,
						env: {
							TOSSINVEST_ACCOUNT_ALLOWLIST: CANONICAL_ACCOUNT_SEQ,
							TOSSINVEST_ORDER_KILL_SWITCH: "open",
							TOSSINVEST_ORDER_LIVE_APPROVED: "yes",
						},
					},
				);

				expect(exitCode).toBe(0);
				expect(output.stderr.toString()).toBe("");
				expect(JSON.parse(output.stdout.toString())).toMatchObject({
					mode: "live",
					result: {
						conditionalOrderId: "conditional-live-order-id",
					},
				});
				expect(createConditionalOrder).toHaveBeenCalledTimes(1);
			});

			it("기본 dry-run에서 요약만 반환하고 API 호출 없이 종료한다", async () => {
				const exitCode = await runCLI(createConditionalOrderArgv, { output });
				const body = JSON.parse(output.stdout.toString());
				const summary = parseConfirmationSummary(body.result.summary);

				expect(exitCode).toBe(0);
				expect(body).toMatchObject({
					mode: "dry-run",
					result: {
						clientOrderId: expect.stringMatching(UUID_PATTERN),
						summary: expect.any(String),
					},
				});
				expect(body).not.toHaveProperty("dryRun");
				expect(body).not.toHaveProperty("clientOrderId");
				expect(body).not.toHaveProperty("summary");
				expect(summary).toEqual(
					expect.objectContaining({
						action: "conditional-orders.create",
						account: "42",
						type: "SINGLE",
						orderType: "LIMIT",
						quantity: "1",
						symbol: "005930",
					}),
				);
				expect(createConditionalOrder).not.toHaveBeenCalled();
				expect(output.stderr.toString()).toBe("");
			});

			it("client-order-id 생략 시 dry-run 결과/요약에 UUID가 노출되고 호출마다 달라진다", async () => {
				const firstRun = toSummaryAndBody(createConditionalOrderArgv);
				const secondRun = toSummaryAndBody(createConditionalOrderArgv);

				const firstExitCode = await firstRun.run();
				const secondExitCode = await secondRun.run();

				const firstBody = JSON.parse(firstRun.output.stdout.toString());
				const secondBody = JSON.parse(secondRun.output.stdout.toString());
				const firstSummary = parseConfirmationSummary(
					firstBody.result.summary,
				);
				const secondSummary = parseConfirmationSummary(
					secondBody.result.summary,
				);

				expect(firstExitCode).toBe(0);
				expect(secondExitCode).toBe(0);
				expect(firstRun.output.stderr.toString()).toBe("");
				expect(secondRun.output.stderr.toString()).toBe("");
				expect(firstBody).toMatchObject({
					mode: "dry-run",
					result: {
						clientOrderId: expect.stringMatching(UUID_PATTERN),
						summary: expect.any(String),
					},
				});
				expect(secondBody).toMatchObject({
					mode: "dry-run",
					result: {
						clientOrderId: expect.stringMatching(UUID_PATTERN),
						summary: expect.any(String),
					},
				});
				expect(createConditionalOrder).not.toHaveBeenCalled();
				expect(firstBody.result.clientOrderId).toEqual(
					expect.stringMatching(UUID_PATTERN),
				);
				expect(secondBody.result.clientOrderId).toEqual(
					expect.stringMatching(UUID_PATTERN),
				);
				expect(firstBody.result.clientOrderId).toBe(
					firstSummary.clientOrderId,
				);
				expect(secondBody.result.clientOrderId).toBe(
					secondSummary.clientOrderId,
				);
				expect(firstBody.result.clientOrderId).not.toBe(
					secondBody.result.clientOrderId,
				);
				expect(firstBody).not.toHaveProperty("dryRun");
				expect(firstBody).not.toHaveProperty("clientOrderId");
				expect(firstBody).not.toHaveProperty("summary");
				expect(secondBody).not.toHaveProperty("dryRun");
				expect(secondBody).not.toHaveProperty("clientOrderId");
				expect(secondBody).not.toHaveProperty("summary");
			});

			it("client-order-id를 제공하면 dry-run result/요약에서 그대로 유지된다", async () => {
				const explicitClientOrderId = "cid-conditional-dryrun-existing";
				const exitCode = await runCLI(
					[
						...createConditionalOrderArgv,
						"--client-order-id",
						explicitClientOrderId,
					],
					{ output },
				);
				const body = JSON.parse(output.stdout.toString());
				const summary = parseConfirmationSummary(body.result.summary);

				expect(exitCode).toBe(0);
				expect(body).toMatchObject({
					mode: "dry-run",
					result: {
						clientOrderId: expect.any(String),
						summary: expect.any(String),
					},
				});
				expect(body.result.clientOrderId).toBe(explicitClientOrderId);
				expect(summary.clientOrderId).toBe(explicitClientOrderId);
				expect(body).not.toHaveProperty("dryRun");
				expect(body).not.toHaveProperty("clientOrderId");
				expect(body).not.toHaveProperty("summary");
				expect(output.stderr.toString()).toBe("");
				expect(createConditionalOrder).not.toHaveBeenCalled();
			});
		});

		describe("실패 케이스", () => {
			it("live 모드에서 client-order-id 미지정 시 동작을 중단하고 API 호출을 하지 않는다", async () => {
				const exitCode = await runCLI(
					[...createConditionalOrderArgv, "--live"],
					{ output },
				);

				expect(exitCode).toBe(2);
				expect(output.stdout.toString()).toBe("");
				expect(output.stderr.toString()).toContain(
					"client_order_id_required",
				);
				expect(createConditionalOrder).not.toHaveBeenCalled();
			});
		});
	});
});
