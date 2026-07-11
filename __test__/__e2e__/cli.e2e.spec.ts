import "dotenv/config";

import { describe, expect, it } from "@jest/globals";
import { rmSync, mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

interface CliRunResult {
	exitCode: number;
	stderr: string;
	stdout: string;
}

const CLI_ENTRYPOINT = resolve(process.cwd(), "src/main.ts");
const BUN_BIN = "bun";
const CLI_BASE_URL = "http://127.0.0.1:1";
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIVE_BASE_URL =
	process.env.TOSSINVEST_BASE_URL?.trim() ??
	process.env.TOSS_INVEST_API_URL?.trim() ??
	"https://openapi.tossinvest.com";
const HAS_LIVE_QUERY_CREDENTIALS =
	Boolean(process.env.TOSS_INVEST_ACCESS_TOKEN?.trim() ?? "") ||
	Boolean(process.env.TOSS_INVEST_API_KEY?.trim() ?? "") &&
	Boolean(process.env.TOSS_INVEST_SECRET_KEY?.trim() ?? "");

function hasLiveQueryAccess(): boolean {
	if (!HAS_LIVE_QUERY_CREDENTIALS) {
		return false;
	}

	try {
		return withTempHome((cliHome) => {
			const result = runLiveCli(["--json", "account", "list"], cliHome);
			const payload = tryParseLiveJson(result);
			return (
				result.exitCode === 0 &&
				result.stderr === "" &&
				typeof payload === "object" &&
				payload !== null &&
				"result" in payload
			);
		});
	} catch (_error) {
		return false;
	}
}

const HAS_LIVE_QUERY_ACCESS =
	HAS_LIVE_QUERY_CREDENTIALS && hasLiveQueryAccess();

function runCli(args: string[], env: NodeJS.ProcessEnv = {}): CliRunResult {
	const child = spawnSync(BUN_BIN, [CLI_ENTRYPOINT, ...args], {
		cwd: process.cwd(),
		encoding: "utf8",
		env: {
			...process.env,
			TOSSINVEST_BASE_URL: CLI_BASE_URL,
			...env,
		},
	});

	if (child.error) {
		throw child.error;
	}

	return {
		exitCode: child.status ?? 1,
		stderr: child.stderr?.toString() ?? "",
		stdout: child.stdout?.toString() ?? "",
	};
}

function runLiveCli(
	args: string[],
	cliHome: string,
	env: NodeJS.ProcessEnv = {},
): CliRunResult {
	return runCli(args, {
		...env,
		TOSS_INVEST_CLI_HOME: cliHome,
		TOSSINVEST_BASE_URL: LIVE_BASE_URL,
	});
}

function parseJsonOutput(result: CliRunResult): unknown {
	expect(result.exitCode).toBe(0);
	expect(result.stderr).toBe("");
	let payload: unknown;
	expect(() => {
		payload = JSON.parse(result.stdout);
	}).not.toThrow();
	return payload;
}

function parseLiveJson(result: CliRunResult): Record<string, unknown> {
	const payload = parseJsonOutput(result);
	expect(typeof payload).toBe("object");
	expect(payload).not.toBeNull();
	return payload as Record<string, unknown>;
}

function tryParseLiveJson(
	result: CliRunResult,
): Record<string, unknown> | undefined {
	if (result.exitCode !== 0 || result.stderr !== "") {
		return undefined;
	}

	try {
		const payload = JSON.parse(result.stdout);
		if (payload === null || typeof payload !== "object") {
			return undefined;
		}
		return payload as Record<string, unknown>;
	} catch (_error) {
		return undefined;
	}
}

function assertHasResult(result: CliRunResult): void {
	const body = parseLiveJson(result);
	expect(body).toHaveProperty("result");
}

function isUnauthorizedLiveResult(result: CliRunResult): boolean {
	return (
		result.exitCode !== 0 &&
		result.stderr.includes("error_kind=HttpException") &&
		/401 Unauthorized/.test(result.stderr)
	);
}

function isMarketRankingsBadRequestResult(result: CliRunResult): boolean {
	return (
		result.exitCode !== 0 &&
		result.stderr.includes("error_kind=HttpException") &&
		result.stderr.includes('"message":"HTTP 400 Bad Request"')
	);
}

function resolveLiveAccount(cliHome: string): string | undefined {
	const explicit = process.env.TOSS_INVEST_ACCOUNT?.trim();
	if (explicit) {
		return explicit;
	}

	const accountsBody = tryParseLiveJson(
		runLiveCli(["--json", "account", "list"], cliHome),
	);
	if (!accountsBody) {
		return undefined;
	}

	if (!("result" in accountsBody) || !Array.isArray(accountsBody.result)) {
		return undefined;
	}

	for (const account of accountsBody.result) {
		if (account && typeof account === "object") {
			const candidate =
				(account as { accountSeq?: unknown }).accountSeq ??
				(account as { accountNo?: unknown }).accountNo;
			if (typeof candidate === "string" || typeof candidate === "number") {
				return String(candidate);
			}
		}
	}

	return undefined;
}

function extractFirstId(
	payload: unknown,
	key: "orderId" | "conditionalOrderId",
): string | undefined {
	if (!payload) {
		return undefined;
	}

	if (Array.isArray(payload)) {
		for (const item of payload) {
			const match = extractFirstId(item, key);
			if (match) {
				return match;
			}
		}
		return undefined;
	}

	if (typeof payload !== "object") {
		return undefined;
	}

	const record = payload as Record<string, unknown>;
	const direct = record[key];
	if (typeof direct === "string") {
		return direct;
	}
	if (typeof direct === "number") {
		return String(direct);
	}

	for (const value of Object.values(record)) {
		const match = extractFirstId(value, key);
		if (match) {
			return match;
		}
	}

	return undefined;
}

function withTempHome<T>(test: (cliHome: string) => T): T {
	const cliHome = mkdtempSync(join(tmpdir(), "toss-invest-cli-e2e-"));
	try {
		return test(cliHome);
	} finally {
		rmSync(cliHome, { recursive: true, force: true });
	}
}

describe("CLI E2E process contract", () => {
	it("renders top-level help without requiring external state", () => {
		withTempHome((cliHome) => {
			const result = runCli(["--help"], {
				TOSS_INVEST_CLI_HOME: cliHome,
			});

			expect(result.exitCode).toBe(0);
			expect(result.stderr).toBe("");
			expect(result.stdout).toContain("Usage:");
			expect(result.stdout).toContain("Toss Invest OpenAPI CLI");
			expect(result.stdout).toContain("market");
			expect(result.stdout).toContain("orders");
			expect(result.stdout).toContain("portfolio");
			expect(result.stdout).toContain("watchlist");
		});
	});

	it("returns deterministic dry-run trade output for order create without API calls", () => {
		withTempHome((cliHome) => {
			const result = runCli(
				[
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
				],
				{
					TOSS_INVEST_CLI_HOME: cliHome,
				},
			);

			expect(result.exitCode).toBe(0);
			expect(result.stderr).toBe("");

			const body = parseJsonOutput(result) as {
				mode: "dry-run";
				result: {
					clientOrderId: string;
					summary: string;
				};
			};

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

			expect(body.result.summary).toBe(
				`action=orders.create|account=42|clientOrderId=${
					body.result.clientOrderId
				}|orderType=LIMIT|price=70000|quantity=1|side=BUY|symbol=005930`,
			);

			expect(
				body.result.summary.split("|").find((segment) =>
					segment.startsWith("clientOrderId="),
				),
			).toBe(`clientOrderId=${body.result.clientOrderId}`);

			const summaryParts = body.result.summary.split("|");
			expect(summaryParts).toEqual([
				"action=orders.create",
				"account=42",
				`clientOrderId=${body.result.clientOrderId}`,
				"orderType=LIMIT",
				"price=70000",
				"quantity=1",
				"side=BUY",
				"symbol=005930",
			]);
		});
	});

	it("keeps validation errors off JSON stdout", () => {
		withTempHome((cliHome) => {
			const result = runCli(
				[
					"--json",
					"--account",
					"42",
					"orders",
					"create",
					"--symbol",
					"005930",
					"--side",
					"INVALID",
					"--order-type",
					"LIMIT",
					"--quantity",
					"1",
					"--price",
					"70000",
				],
				{ TOSS_INVEST_CLI_HOME: cliHome },
			);

			expect(result.exitCode).toBe(2);
			expect(result.stdout).toBe("");
			expect(result.stderr).toMatch(/^error_kind=VALIDATION_ERROR /);
			expect(
				JSON.parse(result.stderr.replace(/^error_kind=VALIDATION_ERROR /, "")),
			).toMatchObject({
				error: {
					code: "VALIDATION_ERROR",
					details: {
						properties: {
							side: {
								errors: expect.any(Array),
							},
						},
					},
				},
			});
		});
	});

	it("persists local watchlist state across invocations in TOSS_INVEST_CLI_HOME", () => {
		withTempHome((cliHome) => {
			const env = { TOSS_INVEST_CLI_HOME: cliHome };

			const initial = runCli(["--json", "watchlist", "list"], { ...env });
			expect(initial.exitCode).toBe(0);
			expect(initial.stderr).toBe("");
			expect(JSON.parse(initial.stdout)).toEqual({ symbols: [] });

			const added = runCli(
				["--json", "watchlist", "add", "--symbols", "msft,aapl,005930,MSFT"],
				{ ...env },
			);
			expect(added.exitCode).toBe(0);
			expect(added.stderr).toBe("");
			expect(JSON.parse(added.stdout)).toEqual({
				symbols: ["005930", "AAPL", "MSFT"],
			});

			const afterRemove = runCli(
				["--json", "watchlist", "remove", "--symbol", "aapL"],
				{ ...env },
			);
			expect(afterRemove.exitCode).toBe(0);
			expect(afterRemove.stderr).toBe("");
			expect(JSON.parse(afterRemove.stdout)).toEqual({
				symbols: ["005930", "MSFT"],
			});

			const final = runCli(["--json", "watchlist", "list"], { ...env });
			expect(final.exitCode).toBe(0);
			expect(final.stderr).toBe("");
			expect(JSON.parse(final.stdout)).toEqual({
				symbols: ["005930", "MSFT"],
			});
		});
	});
});

(HAS_LIVE_QUERY_ACCESS ? describe : describe.skip)(
	"CLI E2E live query contract",
	() => {
		it.each([
			{
				name: "market orderbook",
				args: ["market", "orderbook", "--symbol", "005930"],
			},
			{
				name: "market prices",
				args: ["market", "prices", "--symbols", "005930,AAPL"],
			},
			{
				name: "market trades",
				args: ["market", "trades", "--symbol", "005930", "--count", "2"],
			},
			{
				name: "market price limit",
				args: ["market", "price-limits", "--symbol", "005930"],
			},
			{
				name: "market candles",
				args: [
					"market",
					"candles",
					"--symbol",
					"005930",
					"--interval",
					"1d",
					"--count",
					"1",
				],
			},
			{
				name: "market rankings",
				args: [
					"market",
					"rankings",
					"--type",
					"TOP_GAINERS",
					"--market-country",
					"KR",
					"--duration",
					"realtime",
					"--count",
					"5",
				],
				skipOnKnownError: isMarketRankingsBadRequestResult,
			},
			{
				name: "market-indicators prices",
				args: ["market", "indicators", "prices", "--symbols", "KOSPI"],
				skipOnUnauthorized: true,
			},
			{
				name: "market-indicators candles",
				args: [
					"market",
					"indicators",
					"candles",
					"--symbol",
					"KOSPI",
					"--interval",
					"1d",
					"--count",
					"1",
				],
				skipOnUnauthorized: true,
			},
			{
				name: "market-indicators investor-trading",
				args: [
					"market",
					"indicators",
					"investor-trading",
					"--symbol",
					"KOSPI",
					"--interval",
					"1d",
					"--count",
					"1",
				],
				skipOnUnauthorized: true,
			},
			{
				name: "stock metadata",
				args: ["stock", "info", "--symbols", "005930"],
			},
			{
				name: "stock warnings",
				args: ["stock", "warnings", "--symbol", "005930"],
			},
			{
				name: "market exchange rate",
				args: [
					"market-info",
					"exchange-rate",
					"--base-currency",
					"KRW",
					"--quote-currency",
					"USD",
				],
			},
			{
				name: "market calendar",
				args: ["market-info", "calendar", "--country", "KR"],
			},
			{
				name: "market-info calendar (US)",
				args: ["market-info", "calendar", "--country", "US"],
				skipOnUnauthorized: true,
			},
		])("parses live %s JSON response", ({
			args,
			skipOnUnauthorized,
			skipOnKnownError,
		}) => {
			withTempHome((cliHome) => {
				const result = runLiveCli(["--json", ...args], cliHome);
				if (skipOnUnauthorized && isUnauthorizedLiveResult(result)) {
					return;
				}
				if (skipOnKnownError?.(result)) {
					return;
				}
				assertHasResult(result);
			});
		});

		it("queries account list smoke path", () => {
			withTempHome((cliHome) => {
				assertHasResult(runLiveCli(["--json", "account", "list"], cliHome));
			});
		});

		it("resolves account at runtime and queries account-scoped read paths", () => {
			withTempHome((cliHome) => {
				const account = resolveLiveAccount(cliHome);
				if (!account) {
					return;
				}

				assertHasResult(
					runLiveCli(
						["--json", "account", "holdings", "--account", account],
						cliHome,
					),
				);

				expect(
					parseLiveJson(
						runLiveCli(
							["--json", "portfolio", "summary", "--account", account],
							cliHome,
						),
					),
				).toMatchObject({
					account: account,
					holdings: expect.anything(),
				});

				assertHasResult(
					runLiveCli(
						[
							"--json",
							"order-info",
							"buying-power",
							"--account",
							account,
							"--currency",
							"KRW",
						],
						cliHome,
					),
				);

				assertHasResult(
					runLiveCli(
						["--json", "order-info", "commissions", "--account", account],
						cliHome,
					),
				);
			});
		});

		it("queries order detail when an order id is available", () => {
			withTempHome((cliHome) => {
				const account = resolveLiveAccount(cliHome);
				if (!account) {
					return;
				}

				const historyPayload = parseLiveJson(
					runLiveCli(
						[
							"--json",
							"orders",
							"history",
							"--account",
							account,
							"--status",
							"CLOSED",
							"--limit",
							"5",
						],
						cliHome,
					),
				);

				const orderId = extractFirstId(historyPayload, "orderId");
				if (!orderId) {
					return;
				}

				assertHasResult(
					runLiveCli(
						[
							"--json",
							"orders",
							"detail",
							"--account",
							account,
							"--order-id",
							orderId,
						],
						cliHome,
					),
				);
			});
		});

		it("queries conditional order detail when a conditional order id is available", () => {
			withTempHome((cliHome) => {
				const account = resolveLiveAccount(cliHome);
				if (!account) {
					return;
				}

				const conditionalPayload = parseLiveJson(
					runLiveCli(
						[
							"--json",
							"orders",
							"conditional",
							"list",
							"--account",
							account,
							"--status",
							"OPEN",
							"--limit",
							"5",
						],
						cliHome,
					),
				);

				const conditionalOrderId = extractFirstId(
					conditionalPayload,
					"conditionalOrderId",
				);
				if (!conditionalOrderId) {
					return;
				}

				assertHasResult(
					runLiveCli(
						[
							"--json",
							"orders",
							"conditional",
							"get",
							"--account",
							account,
							"--conditional-order-id",
							conditionalOrderId,
						],
						cliHome,
					),
				);
			});
		});
	},
);
