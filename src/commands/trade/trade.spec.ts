import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { OrderIDSchema } from "../../schema/api/identifier";
import { AccountSchema } from "../../schema/api/responses";
import { SERVICE } from "../../service-registry";
import { runCLI } from "../../cli/bootstrap";
import { TossInvestApiResponseSchema } from "../../schema/helper-schema";
import { TOSS_INVEST_AUTH_RUNTIME } from "../../runtime/auth";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

const createConditionalOrderWithSecondConditionArgv = [
	...createConditionalOrderArgv,
	"--first-order-price",
	"70100",
	"--second-order-side",
	"SELL",
	"--second-trigger-price",
	"71000",
	"--second-order-price",
	"70900",
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
const createCanonicalTradeSafetyEnv = (
	account: string = CANONICAL_ACCOUNT_SEQ,
): Record<string, string> => ({
	TOSS_INVEST_ACCOUNT_ALLOWLIST: String(account),
	TOSS_INVEST_ORDER_KILL_SWITCH: "open",
	TOSS_INVEST_ORDER_LIVE_APPROVED: "yes",
});

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

async function withScopedTradeSafetyEnv<T>(
	account: string,
	run: (env: Record<string, string>) => Promise<T>,
): Promise<T> {
	const cliHome = await mkdtemp(
		join(tmpdir(), "toss-invest-cli-trade-safety-"),
	);
	const envPath = join(cliHome, ".env");
	await writeFile(
		envPath,
		[
			`TOSS_INVEST_ACCOUNT_ALLOWLIST=${account}`,
			"TOSS_INVEST_ORDER_KILL_SWITCH=open",
			"TOSS_INVEST_ORDER_LIVE_APPROVED=yes",
		].join("\n"),
	);

	try {
		return await run({
			TOSS_INVEST_CLI_HOME: cliHome,
		});
	} finally {
		await rm(cliHome, { recursive: true, force: true });
	}
}

const modifyOrderArgv = [
	"node",
	"toss-invest-cli",
	"--json",
	"--account",
	"42",
	"orders",
	"modify",
	"--order-id",
	"ord-live-123",
	"--order-type",
	"LIMIT",
	"--quantity",
	"2",
];

const cancelOrderArgv = [
	"node",
	"toss-invest-cli",
	"--json",
	"--account",
	"42",
	"orders",
	"cancel",
	"--order-id",
	"ord-cancel-123",
];

const modifyConditionalOrderArgv = [
	"node",
	"toss-invest-cli",
	"--json",
	"--account",
	"42",
	"orders",
	"conditional",
	"modify",
	"--conditional-order-id",
	"coid-live-123",
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

const modifyConditionalOrderWithSecondConditionArgv = [
	...modifyConditionalOrderArgv,
	"--first-order-price",
	"70100",
	"--second-order-side",
	"SELL",
	"--second-trigger-price",
	"71000",
	"--second-order-price",
	"70900",
];

const cancelConditionalOrderArgv = [
	"node",
	"toss-invest-cli",
	"--json",
	"--account",
	"42",
	"orders",
	"conditional",
	"cancel",
	"--conditional-order-id",
	"coid-cancel-123",
];

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
						"--confirm-high-value-order",
					],
					{ output: dryRunOutput },
				);
				const dryRunBody = JSON.parse(dryRunOutput.stdout.toString());

				expect(dryRunExitCode).toBe(0);
				const dryRunSummary = parseConfirmationSummary(dryRunBody.result.summary);
				expect(dryRunBody.result.summary).toContain(
					`clientOrderId=${clientOrderId}`,
				);
				expect(dryRunSummary.confirmHighValueOrder).toBe("true");
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
						"--confirm-high-value-order",
						"--live",
						"--confirm",
						dryRunBody.result.summary,
					],
					{
						output,
						env: {
							...createCanonicalTradeSafetyEnv(),
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
				const [, createOrderRequest] = createOrderCall;
				expect(createOrderRequest).toMatchObject({
					confirmHighValueOrder: true,
				});
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
							...createCanonicalTradeSafetyEnv(String(DISPLAY_ACCOUNT_SEQ)),
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
				expect(createOrderRequest).not.toHaveProperty(
					"confirmHighValueOrder",
				);
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
				expect(summary).not.toHaveProperty("confirmHighValueOrder");
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
						"--confirm-high-value-order",
					],
					{ output: dryRunOutput },
				);
				const dryRunBody = JSON.parse(dryRunOutput.stdout.toString());

				expect(dryRunExitCode).toBe(0);
				const dryRunSummary = parseConfirmationSummary(
					dryRunBody.result.summary,
				);
				expect(dryRunOutput.stderr.toString()).toBe("");
				expect(dryRunBody).toMatchObject({
					mode: "dry-run",
					result: {
						clientOrderId,
						summary: expect.any(String),
					},
				});
				expect(dryRunSummary.confirmHighValueOrder).toBe("true");
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
						"--confirm-high-value-order",
						"--live",
						"--confirm",
						dryRunBody.result.summary,
					],
					{
						output,
						env: {
							...createCanonicalTradeSafetyEnv(),
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
				const createConditionalOrderCall = createConditionalOrder.mock.calls[0];
				if (!createConditionalOrderCall) {
					throw new Error("Expected createConditionalOrder to be called");
				}
				const [, createConditionalOrderRequest] = createConditionalOrderCall;
				expect(createConditionalOrderRequest).toMatchObject({
					confirmHighValueOrder: true,
				});
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
				expect(summary).not.toHaveProperty("confirmHighValueOrder");
				expect(createConditionalOrder).not.toHaveBeenCalled();
				expect(output.stderr.toString()).toBe("");
			});

			it("선택 가격/두 번째 조건을 포함한 dry-run 요약으로 동일 요청이 live에서 실행되어야 한다", async () => {
				const clientOrderId = "cid-conditional-live-with-second";
				const dryRunOutput = createOutput();

				createConditionalOrder.mockResolvedValue({
					result: { conditionalOrderId: "dry-run-order-id" },
				});

				const dryRunExitCode = await runCLI(
					[
						...createConditionalOrderWithSecondConditionArgv,
						"--client-order-id",
						clientOrderId,
						"--confirm-high-value-order",
					],
					{ output: dryRunOutput },
				);
				const dryRunBody = JSON.parse(dryRunOutput.stdout.toString());
				const dryRunSummary = parseConfirmationSummary(dryRunBody.result.summary);

				expect(dryRunExitCode).toBe(0);
				expect(dryRunOutput.stderr.toString()).toBe("");
				expect(dryRunBody).toMatchObject({
					mode: "dry-run",
					result: {
						clientOrderId,
						summary: expect.any(String),
					},
				});
				expect(dryRunSummary.firstOrderPrice).toBe("70100");
				expect(dryRunSummary.secondOrderSide).toBe("SELL");
				expect(dryRunSummary.secondTriggerPrice).toBe("71000");
				expect(dryRunSummary.secondOrderPrice).toBe("70900");
				expect(createConditionalOrder).not.toHaveBeenCalled();

				createConditionalOrder.mockResolvedValue({
					result: { conditionalOrderId: "conditional-live-order-id" },
				});
				const exitCode = await runCLI(
					[
						...createConditionalOrderWithSecondConditionArgv,
						"--client-order-id",
						clientOrderId,
						"--confirm-high-value-order",
						"--live",
						"--confirm",
						dryRunBody.result.summary,
					],
					{
						output,
						env: {
							...createCanonicalTradeSafetyEnv(),
						},
					},
				);
				const body = JSON.parse(output.stdout.toString());

				expect(exitCode).toBe(0);
				expect(output.stderr.toString()).toBe("");
				expect(body).toMatchObject({
					mode: "live",
					result: {
						conditionalOrderId: "conditional-live-order-id",
					},
				});
				expect(createConditionalOrder).toHaveBeenCalledTimes(1);
				const createConditionalOrderCall = createConditionalOrder.mock.calls[0];
				if (!createConditionalOrderCall) {
					throw new Error("Expected createConditionalOrder to be called");
				}
				const [, createConditionalOrderRequest] = createConditionalOrderCall;
				expect(createConditionalOrderRequest).toMatchObject({
					clientOrderId,
					confirmHighValueOrder: true,
					expireDate: "20280101",
					orderType: "LIMIT",
					quantity: "1",
					symbol: "005930",
					type: "SINGLE",
					first: {
						orderPrice: "70100",
						orderSide: "BUY",
						triggerPrice: "70000",
					},
					second: {
						orderPrice: "70900",
						orderSide: "SELL",
						triggerPrice: "71000",
					},
				});
			});

			it("요약을 하나 변경해 live로 재실행하면 조건부 주문이 거부된다", async () => {
				const clientOrderId = "cid-conditional-live-with-second-mismatch";
				const dryRunOutput = createOutput();

				const dryRunExitCode = await runCLI(
					[
						...createConditionalOrderWithSecondConditionArgv,
						"--client-order-id",
						clientOrderId,
					],
					{ output: dryRunOutput },
				);

				expect(dryRunExitCode).toBe(0);
				const dryRunBody = JSON.parse(dryRunOutput.stdout.toString());

				const staleSummary = dryRunBody.result.summary.replace(
					"firstOrderPrice=70100",
					"firstOrderPrice=99999",
				);

				const exitCode = await runCLI(
					[
						...createConditionalOrderWithSecondConditionArgv,
						"--client-order-id",
						clientOrderId,
						"--live",
						"--confirm",
						staleSummary,
					],
					{
						output,
						env: createCanonicalTradeSafetyEnv(),
					},
				);

				expect(exitCode).toBe(2);
				expect(output.stdout.toString()).toBe("");
				expect(output.stderr.toString()).toContain(
					"live_confirmation_required",
				);
				expect(createConditionalOrder).not.toHaveBeenCalled();
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

	describe("orders modify", () => {
		let output: ReturnType<typeof createOutput>;
		let modifyOrder: jest.SpiedFunction<
			typeof SERVICE.tradeCommandService.modifyOrder
		>;

		beforeEach(() => {
			output = createOutput();
			modifyOrder = jest.spyOn(SERVICE.tradeCommandService, "modifyOrder");
		});

		describe("성공 케이스", () => {
			it("기본 dry-run에서 요약만 반환하고 API 호출 없이 종료한다", async () => {
				const exitCode = await runCLI(modifyOrderArgv, { output });
				const body = JSON.parse(output.stdout.toString());
				const summary = parseConfirmationSummary(body.result.summary);

				expect(exitCode).toBe(0);
				expect(body).toMatchObject({
					mode: "dry-run",
					result: {
						summary: expect.any(String),
					},
				});
				expect(body).not.toHaveProperty("clientOrderId");
				expect(body).not.toHaveProperty("summary");
				expect(summary).toEqual(
					expect.objectContaining({
						action: "orders.modify",
						account: "42",
						orderId: "ord-live-123",
						orderType: "LIMIT",
						quantity: "2",
					}),
				);
				expect(summary).not.toHaveProperty("confirmHighValueOrder");
				expect(modifyOrder).not.toHaveBeenCalled();
				expect(output.stderr.toString()).toBe("");
			});

			it("안전 변수 승인 + 정확한 confirm으로 live 실행이 정확히 1회 수행된다", async () => {
				const dryRunOutput = createOutput();
				const dryRunExitCode = await runCLI(
					[...modifyOrderArgv, "--confirm-high-value-order"],
					{
					output: dryRunOutput,
					},
				);
				const dryRunBody = JSON.parse(dryRunOutput.stdout.toString());

				expect(dryRunExitCode).toBe(0);
				const dryRunSummary = parseConfirmationSummary(dryRunBody.result.summary);
				expect(dryRunOutput.stderr.toString()).toBe("");
				expect(dryRunBody).toMatchObject({
					mode: "dry-run",
					result: {
						summary: expect.any(String),
					},
				});
				expect(modifyOrder).not.toHaveBeenCalled();
				expect(dryRunSummary.confirmHighValueOrder).toBe("true");

				modifyOrder.mockResolvedValue({
					result: { orderId: OrderIDSchema.parse("mod-live-order-id") },
				});
				const exitCode = await withScopedTradeSafetyEnv(
					CANONICAL_ACCOUNT_SEQ,
					(safeEnv) =>
						runCLI(
							[
								...modifyOrderArgv,
								"--confirm-high-value-order",
								"--live",
								"--confirm",
								dryRunBody.result.summary,
							],
							{
								output,
								env: safeEnv,
							},
						),
				);
				const body = JSON.parse(output.stdout.toString());

				expect(exitCode).toBe(0);
				expect(output.stderr.toString()).toBe("");
				expect(body).toMatchObject({
					mode: "live",
					result: { orderId: "mod-live-order-id" },
				});
				expect(modifyOrder).toHaveBeenCalledTimes(1);
				const modifyOrderCall = modifyOrder.mock.calls[0];
				if (!modifyOrderCall) {
					throw new Error("Expected modifyOrder to be called");
				}
				const [, modifyOrderRequest] = modifyOrderCall;
				expect(modifyOrderRequest).toMatchObject({
					confirmHighValueOrder: true,
				});
			});

			it("scoped config-home dotenv로 안전 변수 적용 후 dry-run 요약으로 live 주문이 정확히 1회 수행된다", async () => {
				const outputForDryRun = createOutput();
				const outputForLive = createOutput();
				const commandSafetyEnv = createCanonicalTradeSafetyEnv();
				const configHome = await mkdtemp(
					join(tmpdir(), "toss-invest-cli-trade-scoped-config-home-"),
				);
				const home = await mkdtemp(
					join(tmpdir(), "toss-invest-cli-trade-scoped-home-"),
				);
				const cwd = await mkdtemp(
					join(tmpdir(), "toss-invest-cli-trade-scoped-cwd-"),
				);
				const previousCwd = process.cwd();
				const commandEnv = {
					HOME: home,
					TOSS_INVEST_CLI_HOME: configHome,
				};
				try {
					await writeFile(
						join(configHome, ".env"),
						Object.entries(commandSafetyEnv)
							.map(([key, value]) => `${key}=${value}`)
							.join("\n"),
					);

					process.chdir(cwd);
					const dryRunExitCode = await runCLI(modifyOrderArgv, {
						output: outputForDryRun,
						env: commandEnv,
					});
					const dryRunBody = JSON.parse(outputForDryRun.stdout.toString());

					expect(dryRunExitCode).toBe(0);
					expect(outputForDryRun.stderr.toString()).toBe("");
					expect(dryRunBody).toMatchObject({
						mode: "dry-run",
						result: {
							summary: expect.any(String),
						},
					});
					expect(modifyOrder).not.toHaveBeenCalled();

					modifyOrder.mockResolvedValue({
						result: {
							orderId: OrderIDSchema.parse("scoped-mod-live-order-id"),
						},
					});

					const exitCode = await runCLI(
						[
							...modifyOrderArgv,
							"--live",
							"--confirm",
							dryRunBody.result.summary,
						],
						{
							output: outputForLive,
							env: commandEnv,
						},
					);
					const body = JSON.parse(outputForLive.stdout.toString());

					expect(exitCode).toBe(0);
					expect(outputForLive.stderr.toString()).toBe("");
					expect(body).toEqual({
						mode: "live",
						result: {
							orderId: "scoped-mod-live-order-id",
						},
					});
					expect(modifyOrder).toHaveBeenCalledTimes(1);
					const modifyOrderCall = modifyOrder.mock.calls[0];
					if (!modifyOrderCall) {
						throw new Error("Expected modifyOrder to be called once");
					}
					const [modifyOrderParams, modifyOrderRequest] = modifyOrderCall;
					expect(modifyOrderParams).toMatchObject({
						account: Number(CANONICAL_ACCOUNT_SEQ),
						orderId: "ord-live-123",
					});
					expect(modifyOrderRequest).toMatchObject({
						orderType: "LIMIT",
						quantity: "2",
					});
					expect(modifyOrderRequest).not.toHaveProperty(
						"confirmHighValueOrder",
					);
				} finally {
					process.chdir(previousCwd);
					await rm(configHome, { recursive: true, force: true });
					await rm(home, { recursive: true, force: true });
					await rm(cwd, { recursive: true, force: true });
				}
			});
		});

		describe("실패 케이스", () => {
			it("live 모드에서 승인 요약 없이 동작을 중단하고 API 호출을 하지 않는다", async () => {
				const exitCode = await runCLI(
					[...modifyOrderArgv, "--live"],
					{ output, env: createCanonicalTradeSafetyEnv() },
				);

				expect(exitCode).toBe(2);
				expect(output.stdout.toString()).toBe("");
				expect(output.stderr.toString()).toContain(
					"live_confirmation_required",
				);
				expect(modifyOrder).not.toHaveBeenCalled();
			});
		});
	});

	describe("orders cancel", () => {
		let output: ReturnType<typeof createOutput>;
		let cancelOrder: jest.SpiedFunction<
			typeof SERVICE.tradeCommandService.cancelOrder
		>;

		beforeEach(() => {
			output = createOutput();
			cancelOrder = jest.spyOn(SERVICE.tradeCommandService, "cancelOrder");
		});

		describe("성공 케이스", () => {
			it("기본 dry-run에서 요약만 반환하고 API 호출 없이 종료한다", async () => {
				const exitCode = await runCLI(cancelOrderArgv, { output });
				const body = JSON.parse(output.stdout.toString());
				const summary = parseConfirmationSummary(body.result.summary);

				expect(exitCode).toBe(0);
				expect(body).toMatchObject({
					mode: "dry-run",
					result: {
						summary: expect.any(String),
					},
				});
				expect(body).not.toHaveProperty("clientOrderId");
				expect(body).not.toHaveProperty("summary");
				expect(summary).toEqual(
					expect.objectContaining({
						action: "orders.cancel",
						account: "42",
						orderId: "ord-cancel-123",
					}),
				);
				expect(summary).not.toHaveProperty("confirmHighValueOrder");
				expect(cancelOrder).not.toHaveBeenCalled();
				expect(output.stderr.toString()).toBe("");
			});

			it("dry-run 요약 재생성으로 승인 시 주문 취소가 정확히 1회 수행된다", async () => {
				const dryRunOutput = createOutput();
				const dryRunExitCode = await runCLI(cancelOrderArgv, {
					output: dryRunOutput,
				});
				const dryRunBody = JSON.parse(dryRunOutput.stdout.toString());

				expect(dryRunExitCode).toBe(0);
				expect(dryRunOutput.stderr.toString()).toBe("");
				expect(dryRunBody).toMatchObject({
					mode: "dry-run",
					result: {
						summary: expect.any(String),
					},
				});
				expect(cancelOrder).not.toHaveBeenCalled();

				cancelOrder.mockResolvedValue({
					result: { orderId: OrderIDSchema.parse("ord-live-cancel-id") },
				});
				const exitCode = await runCLI(
					[
						...cancelOrderArgv,
						"--live",
						"--confirm",
						dryRunBody.result.summary,
					],
					{
						output,
						env: createCanonicalTradeSafetyEnv(),
					},
				);
				const body = JSON.parse(output.stdout.toString());

				expect(exitCode).toBe(0);
				expect(output.stderr.toString()).toBe("");
				expect(body).toMatchObject({
					mode: "live",
					result: {
						orderId: "ord-live-cancel-id",
					},
				});
				expect(cancelOrder).toHaveBeenCalledTimes(1);
			});
		});

		describe("실패 케이스", () => {
			it("live 모드에서 승인 요약 없이 동작을 중단하고 API 호출을 하지 않는다", async () => {
				const exitCode = await runCLI(
					[...cancelOrderArgv, "--live"],
					{ output, env: createCanonicalTradeSafetyEnv() },
				);

				expect(exitCode).toBe(2);
				expect(output.stdout.toString()).toBe("");
				expect(output.stderr.toString()).toContain(
					"live_confirmation_required",
				);
				expect(cancelOrder).not.toHaveBeenCalled();
			});
		});
	});

	describe("conditional-orders modify", () => {
		let output: ReturnType<typeof createOutput>;
		let modifyConditionalOrder: jest.SpiedFunction<
			typeof SERVICE.tradeCommandService.modifyConditionalOrder
		>;

		beforeEach(() => {
			output = createOutput();
			modifyConditionalOrder = jest.spyOn(
				SERVICE.tradeCommandService,
				"modifyConditionalOrder",
			);
		});

		describe("성공 케이스", () => {
			it("기본 dry-run에서 요약만 반환하고 API 호출 없이 종료한다", async () => {
				const exitCode = await runCLI(modifyConditionalOrderArgv, { output });
				const body = JSON.parse(output.stdout.toString());
				const summary = parseConfirmationSummary(body.result.summary);

				expect(exitCode).toBe(0);
				expect(body).toMatchObject({
					mode: "dry-run",
					result: {
						summary: expect.any(String),
					},
				});
				expect(body).not.toHaveProperty("clientOrderId");
				expect(body).not.toHaveProperty("summary");
				expect(summary).toEqual(
					expect.objectContaining({
						action: "conditional-orders.modify",
						account: "42",
						conditionalOrderId: "coid-live-123",
						type: "SINGLE",
						quantity: "1",
						orderType: "LIMIT",
						expireDate: "20280101",
						firstOrderSide: "BUY",
						firstTriggerPrice: "70000",
					}),
				);
				expect(summary).not.toHaveProperty("confirmHighValueOrder");
				expect(modifyConditionalOrder).not.toHaveBeenCalled();
				expect(output.stderr.toString()).toBe("");
			});

			it("dry-run 요약 재생성으로 승인 시 조건부 주문이 정확히 1회 수정된다", async () => {
				const dryRunOutput = createOutput();
				const dryRunExitCode = await runCLI(
					[...modifyConditionalOrderArgv, "--confirm-high-value-order"],
					{
					output: dryRunOutput,
					},
				);
				const dryRunBody = JSON.parse(dryRunOutput.stdout.toString());
				const dryRunSummary = parseConfirmationSummary(dryRunBody.result.summary);

				expect(dryRunExitCode).toBe(0);
				expect(dryRunOutput.stderr.toString()).toBe("");
				expect(dryRunBody).toMatchObject({
					mode: "dry-run",
					result: {
						summary: expect.any(String),
					},
				});
				expect(dryRunSummary.confirmHighValueOrder).toBe("true");
				expect(modifyConditionalOrder).not.toHaveBeenCalled();

				modifyConditionalOrder.mockResolvedValue({
					result: {
						conditionalOrderId: "coid-live-order-id",
					},
				});
				const exitCode = await runCLI(
					[
						...modifyConditionalOrderArgv,
						"--confirm-high-value-order",
						"--live",
						"--confirm",
						dryRunBody.result.summary,
					],
					{
						output,
						env: createCanonicalTradeSafetyEnv(),
					},
				);
				const body = JSON.parse(output.stdout.toString());

				expect(exitCode).toBe(0);
				expect(output.stderr.toString()).toBe("");
				expect(body).toMatchObject({
					mode: "live",
					result: {
						conditionalOrderId: "coid-live-order-id",
					},
				});
				expect(modifyConditionalOrder).toHaveBeenCalledTimes(1);
				const modifyConditionalOrderCall = modifyConditionalOrder.mock.calls[0];
				if (!modifyConditionalOrderCall) {
					throw new Error("Expected modifyConditionalOrder to be called");
				}
				const [, modifyConditionalOrderRequest] = modifyConditionalOrderCall;
				expect(modifyConditionalOrderRequest).toMatchObject({
					confirmHighValueOrder: true,
				});
			});

			it("선택 가격/두 번째 조건을 포함한 dry-run 요약으로 동일 요청이 live에서 실행되어야 한다", async () => {
				const dryRunOutput = createOutput();

				modifyConditionalOrder.mockResolvedValue({
					result: { conditionalOrderId: "dry-run-order-id" },
				});
				const dryRunExitCode = await runCLI(
					[...modifyConditionalOrderWithSecondConditionArgv, "--confirm-high-value-order"],
					{
						output: dryRunOutput,
					},
				);
				const dryRunBody = JSON.parse(dryRunOutput.stdout.toString());
				const dryRunSummary = parseConfirmationSummary(dryRunBody.result.summary);

				expect(dryRunExitCode).toBe(0);
				expect(dryRunOutput.stderr.toString()).toBe("");
				expect(dryRunBody).toMatchObject({
					mode: "dry-run",
					result: {
						summary: expect.any(String),
					},
				});
				expect(dryRunSummary.firstOrderPrice).toBe("70100");
				expect(dryRunSummary.secondOrderSide).toBe("SELL");
				expect(dryRunSummary.secondTriggerPrice).toBe("71000");
				expect(dryRunSummary.secondOrderPrice).toBe("70900");
				expect(modifyConditionalOrder).not.toHaveBeenCalled();

				modifyConditionalOrder.mockResolvedValue({
					result: {
						conditionalOrderId: "coid-live-order-id",
					},
				});
				const exitCode = await runCLI(
					[
						...modifyConditionalOrderWithSecondConditionArgv,
						"--confirm-high-value-order",
						"--live",
						"--confirm",
						dryRunBody.result.summary,
					],
					{
						output,
						env: createCanonicalTradeSafetyEnv(),
					},
				);
				const body = JSON.parse(output.stdout.toString());

				expect(exitCode).toBe(0);
				expect(output.stderr.toString()).toBe("");
				expect(body).toMatchObject({
					mode: "live",
					result: {
						conditionalOrderId: "coid-live-order-id",
					},
				});
				expect(modifyConditionalOrder).toHaveBeenCalledTimes(1);
				const modifyConditionalOrderCall = modifyConditionalOrder.mock.calls[0];
				if (!modifyConditionalOrderCall) {
					throw new Error("Expected modifyConditionalOrder to be called");
				}
				const [modifyConditionalOrderParams, modifyConditionalOrderRequest] =
					modifyConditionalOrderCall;
				expect(modifyConditionalOrderParams).toMatchObject({
					account: Number(CANONICAL_ACCOUNT_SEQ),
					conditionalOrderId: "coid-live-123",
				});
				expect(modifyConditionalOrderRequest).toMatchObject({
					confirmHighValueOrder: true,
					expireDate: "20280101",
					orderType: "LIMIT",
					quantity: "1",
					type: "SINGLE",
					first: {
						orderPrice: "70100",
						orderSide: "BUY",
						triggerPrice: "70000",
					},
					second: {
						orderPrice: "70900",
						orderSide: "SELL",
						triggerPrice: "71000",
					},
				});
			});

			it("요약을 하나 변경해 live로 재실행하면 조건부 주문 수정이 거부된다", async () => {
				const dryRunOutput = createOutput();
				const dryRunExitCode = await runCLI(
					modifyConditionalOrderWithSecondConditionArgv,
					{ output: dryRunOutput },
				);
				expect(dryRunExitCode).toBe(0);
				const dryRunBody = JSON.parse(dryRunOutput.stdout.toString());

				const staleSummary = dryRunBody.result.summary.replace(
					"secondOrderPrice=70900",
					"secondOrderPrice=99999",
				);
				const exitCode = await runCLI(
					[
						...modifyConditionalOrderWithSecondConditionArgv,
						"--live",
						"--confirm",
						staleSummary,
					],
					{
						output,
						env: createCanonicalTradeSafetyEnv(),
					},
				);

				expect(exitCode).toBe(2);
				expect(output.stdout.toString()).toBe("");
				expect(output.stderr.toString()).toContain(
					"live_confirmation_required",
				);
				expect(modifyConditionalOrder).not.toHaveBeenCalled();
			});
		});

		describe("실패 케이스", () => {
			it("live 모드에서 승인 요약 없이 동작을 중단하고 API 호출을 하지 않는다", async () => {
				const exitCode = await runCLI(
					[...modifyConditionalOrderArgv, "--live"],
					{ output, env: createCanonicalTradeSafetyEnv() },
				);

				expect(exitCode).toBe(2);
				expect(output.stdout.toString()).toBe("");
				expect(output.stderr.toString()).toContain(
					"live_confirmation_required",
				);
				expect(modifyConditionalOrder).not.toHaveBeenCalled();
			});
		});
	});

	describe("conditional-orders cancel", () => {
		let output: ReturnType<typeof createOutput>;
		let cancelConditionalOrder: jest.SpiedFunction<
			typeof SERVICE.tradeCommandService.cancelConditionalOrder
		>;

		beforeEach(() => {
			output = createOutput();
			cancelConditionalOrder = jest.spyOn(
				SERVICE.tradeCommandService,
				"cancelConditionalOrder",
			);
		});

		describe("성공 케이스", () => {
			it("기본 dry-run에서 요약만 반환하고 API 호출 없이 종료한다", async () => {
				const exitCode = await runCLI(cancelConditionalOrderArgv, { output });
				const body = JSON.parse(output.stdout.toString());
				const summary = parseConfirmationSummary(body.result.summary);

				expect(exitCode).toBe(0);
				expect(body).toMatchObject({
					mode: "dry-run",
					result: {
						summary: expect.any(String),
					},
				});
				expect(body).not.toHaveProperty("clientOrderId");
				expect(body).not.toHaveProperty("summary");
				expect(summary).toEqual(
					expect.objectContaining({
						action: "conditional-orders.cancel",
						account: "42",
						conditionalOrderId: "coid-cancel-123",
					}),
				);
				expect(summary).not.toHaveProperty("confirmHighValueOrder");
				expect(cancelConditionalOrder).not.toHaveBeenCalled();
				expect(output.stderr.toString()).toBe("");
			});

			it("dry-run 요약 재생성으로 승인 시 조건부 주문이 정확히 1회 취소된다", async () => {
				const dryRunOutput = createOutput();
				const dryRunExitCode = await runCLI(cancelConditionalOrderArgv, {
					output: dryRunOutput,
				});
				const dryRunBody = JSON.parse(dryRunOutput.stdout.toString());

				expect(dryRunExitCode).toBe(0);
				expect(dryRunOutput.stderr.toString()).toBe("");
				expect(dryRunBody).toMatchObject({
					mode: "dry-run",
					result: {
						summary: expect.any(String),
					},
				});
				expect(cancelConditionalOrder).not.toHaveBeenCalled();

				cancelConditionalOrder.mockResolvedValue({
					result: {
						conditionalOrderId: "coid-live-cancel-id",
					},
				});
				const exitCode = await runCLI(
					[
						...cancelConditionalOrderArgv,
						"--live",
						"--confirm",
						dryRunBody.result.summary,
					],
					{
						output,
						env: createCanonicalTradeSafetyEnv(),
					},
				);
				const body = JSON.parse(output.stdout.toString());

				expect(exitCode).toBe(0);
				expect(output.stderr.toString()).toBe("");
				expect(body).toMatchObject({
					mode: "live",
					result: {
						conditionalOrderId: "coid-live-cancel-id",
					},
				});
				expect(cancelConditionalOrder).toHaveBeenCalledTimes(1);
			});
		});

		describe("실패 케이스", () => {
			it("live 모드에서 승인 요약 없이 동작을 중단하고 API 호출을 하지 않는다", async () => {
				const exitCode = await runCLI(
					[...cancelConditionalOrderArgv, "--live"],
					{ output, env: createCanonicalTradeSafetyEnv() },
				);

				expect(exitCode).toBe(2);
				expect(output.stdout.toString()).toBe("");
				expect(output.stderr.toString()).toContain(
					"live_confirmation_required",
				);
				expect(cancelConditionalOrder).not.toHaveBeenCalled();
			});
		});
	});
});
