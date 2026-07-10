import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Command } from "commander";
import z from "zod";

import { TOSS_INVEST_AUTH_RUNTIME } from "../runtime/auth";
import { CLI_CONFIG_RUNTIME } from "../runtime/config";
import { HttpException } from "../exceptions";
import type { CliConfig } from "../schema/cli/config";
import type { CliOutput } from "../schema/cli/output";
import { COMMAND_RUNTIME_SUPPORT } from "./shared";

const authRuntime = TOSS_INVEST_AUTH_RUNTIME as unknown as {
	refreshApi?: (config: CliConfig) => Promise<void>;
};

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

function createOutput(): CliOutput {
	return {
		stderr: new BufferStream(),
		stdout: new BufferStream(),
	};
}

function createFakeCommand(globals: {
	account?: string;
	accessToken?: string;
	json?: boolean;
}): Command {
	return {
		optsWithGlobals: () => globals,
	} as unknown as Command;
}

function createConfig(overrides: Partial<CliConfig> = {}): CliConfig {
	return {
		accountAllowlist: [],
		authCachePath: "/tmp/auth-cache.json",
		configHome: "/tmp/toss-invest-cli-test",
		credentialsPath: "/tmp/credentials.enc",
		...overrides,
	};
}

describe("COMMAND_RUNTIME_SUPPORT", () => {
	afterEach(() => {
		jest.restoreAllMocks();
		process.exitCode = undefined;
	});
	describe("makeAction", () => {
		let output: CliOutput;
		let load: jest.SpiedFunction<typeof CLI_CONFIG_RUNTIME.load>;
		let capturedParams: unknown;
		let capturedContext: unknown;

		beforeEach(() => {
			output = createOutput();
			capturedParams = undefined;
			capturedContext = undefined;
		});

		describe("성공 케이스", () => {
			beforeEach(() => {
				load = jest.spyOn(CLI_CONFIG_RUNTIME, "load").mockReturnValue(
					createConfig({
						accessToken: "from-config",
						defaultAccount: "from-default",
					}),
				);
			});

			it("옵션 파싱과 config 우선순위를 적용해 결과를 출력한다", async () => {
				const action = COMMAND_RUNTIME_SUPPORT.makeAction(
					z.object({ symbol: z.string() }),
					{ output, env: { TOSS_INVEST_ACCESS_TOKEN: "from-env" } },
					async (params, context) => {
						capturedParams = params;
						capturedContext = context;
						return { dryRun: true };
					},
				);

				await action(
					{ symbol: "005930" },
					createFakeCommand({
						account: "42",
						accessToken: "from-flag",
						json: true,
					}),
				);

				expect(load).toHaveBeenCalledWith(
					{ TOSS_INVEST_ACCESS_TOKEN: "from-env" },
					{
						accessToken: "from-flag",
						account: "42",
					},
				);
				expect(capturedParams).toEqual({ symbol: "005930" });
				expect(capturedContext).toEqual(
					expect.objectContaining({
						config: expect.objectContaining({
							accessToken: "from-config",
							defaultAccount: "from-default",
						}),
						json: true,
						output,
					}),
				);
				expect(output.stderr.toString()).toBe("");
				expect(JSON.parse(output.stdout.toString())).toEqual({ dryRun: true });
			});
		});

		describe("실패 케이스", () => {
			describe("요청 파라미터가 스키마 유효성 검증을 통과하지 못하면", () => {
				let handler: jest.Mock;

				beforeEach(() => {
					handler = jest.fn(async () => ({ ok: true }));
				});

				it("핸들러를 호출하지 않고 exitCode=2로 종료한다", async () => {
					const action = COMMAND_RUNTIME_SUPPORT.makeAction(
						z.object({ count: z.number() }),
						{ output },
						handler,
					);

					await action({ count: "bad" }, createFakeCommand({ json: true }));

					expect(handler).not.toHaveBeenCalled();
					expect(process.exitCode).toBe(2);
					expect(output.stdout.toString()).toBe("");
					expect(output.stderr.toString()).toContain(
						"error_kind=VALIDATION_ERROR",
					);
				});
			});

			describe("핸들러에서 예기치 못한 예외가 발생하면", () => {
				it("예외가 정규화되어 stderr와 exitCode=1로 매핑된다", async () => {
					const action = COMMAND_RUNTIME_SUPPORT.makeAction(
						z.object({}),
					{ output, env: { TOSS_INVEST_ACCESS_TOKEN: "unused" } },
						() => {
							throw new Error("bad things");
						},
					);

					await expect(
						action({}, createFakeCommand({})),
					).resolves.toBeUndefined();
					expect(process.exitCode).toBe(1);
					expect(output.stderr.toString()).toBe(
						"error_kind=Error: bad things\n",
					);
				});
			});
		});
	});

	describe("accountFrom", () => {
		let context: {
			config: CliConfig;
			json: boolean;
			output: CliOutput;
		};
		let prepareApi: jest.SpiedFunction<
			typeof TOSS_INVEST_AUTH_RUNTIME.prepareApi
		>;
		type AccountListResponse = {
			result: Array<{
				accountNo: string;
				accountSeq: number;
				accountType: string;
			}>;
		};
		let getAccounts: jest.MockedFunction<() => Promise<AccountListResponse>>;

		const accountFrom = (
			params: { account?: string | number },
			context: {
				config: CliConfig;
				json: boolean;
				output: CliOutput;
			},
			resolveAccounts: typeof getAccounts,
		): Promise<unknown> =>
			Promise.resolve().then(() =>
				(
					COMMAND_RUNTIME_SUPPORT.accountFrom as unknown as (
						params: { account?: string | number },
						context: {
							config: CliConfig;
							json: boolean;
							output: CliOutput;
						},
						resolveAccounts: typeof getAccounts,
					) => unknown
				)(params, context, resolveAccounts),
			);

		beforeEach(() => {
			context = {
				config: createConfig({ accessToken: "runtime-token" }),
				json: false,
				output: createOutput(),
			};

			prepareApi = jest
				.spyOn(TOSS_INVEST_AUTH_RUNTIME, "prepareApi")
				.mockResolvedValue(undefined);
			getAccounts = jest.fn(async () => ({
				result: [
					{
						accountNo: "010123456789",
						accountSeq: 2001,
						accountType: "BROKERAGE",
					},
					{
						accountNo: "990012345678",
						accountSeq: 3003,
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
			}));
		});

		describe("성공 케이스", () => {
			describe("계좌가 전달되면", () => {
				it("표시 계좌번호는 accountSeq로 해석된다", async () => {
					const accountSeq = await accountFrom(
						{ account: "010123456789" },
						context,
						getAccounts,
					);

					expect(accountSeq).toBe(2001);
					expect(prepareApi).toHaveBeenCalledTimes(1);
					expect(getAccounts).toHaveBeenCalledTimes(1);
				});

				it("명시 계좌 시퀀스는 동일한 값으로 해석한다", async () => {
					const accountSeq = await accountFrom(
						{ account: "3003" },
						context,
						getAccounts,
					);

					expect(accountSeq).toBe(3003);
				});
			});

			describe("알 수 없는 계좌가 전달되면", () => {
				it("ACCOUNT_NOT_FOUND 예외를 반환한다", async () => {
					await expect(
						accountFrom({ account: "없는 계좌" }, context, getAccounts),
					).rejects.toMatchObject({
						name: "CliException",
						code: "ACCOUNT_NOT_FOUND",
						message: expect.stringContaining("toss-invest-cli account list"),
					});
				});
			});
		});

		describe("실패 케이스", () => {
			describe("계좌가 accountSeq와 accountNo로 동시에 해석되면", () => {
				it("ACCOUNT_AMBIGUOUS 예외를 반환한다", async () => {
					await expect(
						accountFrom({ account: "1" }, context, getAccounts),
					).rejects.toMatchObject({
						name: "CliException",
						code: "ACCOUNT_AMBIGUOUS",
						message: expect.stringContaining("toss-invest-cli account list"),
					});
				});
			});

			it("기본 계좌도 없으면 CliException을 던진다", async () => {
				context.config = createConfig({ accessToken: "runtime-token" });
				await expect(
					accountFrom({}, context, getAccounts),
				).rejects.toMatchObject({
					name: "CliException",
					code: "ACCOUNT_REQUIRED",
				});
				expect(prepareApi).not.toHaveBeenCalled();
			});
		});
	});

	describe("runQuery", () => {
		describe("성공 케이스", () => {
			let callback: jest.MockedFunction<() => Promise<{ done: boolean }>>;
			let prepareApi: jest.SpiedFunction<
				typeof TOSS_INVEST_AUTH_RUNTIME.prepareApi
			>;

			beforeEach(() => {
				callback = jest.fn(async () => ({ done: true }));
				prepareApi = jest
					.spyOn(TOSS_INVEST_AUTH_RUNTIME, "prepareApi")
					.mockResolvedValue(undefined);
			});

			it("prepareApi 호출 뒤 콜백을 실행하고 결과를 반환한다", async () => {
				const result = await COMMAND_RUNTIME_SUPPORT.runQuery(
					callback,
					createConfig({ accessToken: "run-query-token" }),
				);

				expect(result).toEqual({ done: true });
				expect(callback).toHaveBeenCalledTimes(1);
				expect(prepareApi).toHaveBeenCalledTimes(1);
				const prepareCallOrder = prepareApi.mock.invocationCallOrder.at(0);
				const callbackCallOrder = callback.mock.invocationCallOrder.at(0);
				expect(prepareCallOrder).toBeDefined();
				expect(callbackCallOrder).toBeDefined();
				if (prepareCallOrder === undefined || callbackCallOrder === undefined) {
					throw new Error("Expected prepareApi and callback to be invoked");
				}
				expect(prepareCallOrder).toBeLessThan(callbackCallOrder);
			});
		});

		describe("실패 케이스", () => {
			let callback: jest.MockedFunction<() => Promise<unknown>>;
			let prepareApi: jest.SpiedFunction<
				typeof TOSS_INVEST_AUTH_RUNTIME.prepareApi
			>;
			let refreshApi: jest.SpiedFunction<(config: CliConfig) => Promise<void>>;

			beforeEach(() => {
				if (typeof authRuntime.refreshApi !== "function") {
					authRuntime.refreshApi = jest.fn(async () => undefined);
				}

				prepareApi = jest
					.spyOn(TOSS_INVEST_AUTH_RUNTIME, "prepareApi")
					.mockResolvedValue(undefined);
				refreshApi = jest
					.spyOn(authRuntime, "refreshApi")
					.mockResolvedValue(undefined);
			});

			it("401이면 client credentials로 토큰을 재발급 후 한 번만 재시도해 성공한다", async () => {
				const unauthorized = new HttpException("HTTP 401 Unauthorized", {
					status: 401,
				});

				callback = jest
					.fn<() => Promise<{ ok: true }>>()
					.mockRejectedValueOnce(unauthorized)
					.mockResolvedValueOnce({ ok: true });

				const result = await COMMAND_RUNTIME_SUPPORT.runQuery(
					callback,
					createConfig({
						clientId: "client-id",
						clientSecret: "client-secret",
					}),
				);

				expect(result).toEqual({ ok: true });
				expect(prepareApi).toHaveBeenCalledTimes(1);
				expect(refreshApi).toHaveBeenCalledTimes(1);
				expect(callback).toHaveBeenCalledTimes(2);

				const prepareOrder = prepareApi.mock.invocationCallOrder.at(0);
				const firstCallbackOrder = callback.mock.invocationCallOrder.at(0);
				const refreshOrder = refreshApi.mock.invocationCallOrder.at(0);
				const secondCallbackOrder = callback.mock.invocationCallOrder.at(1);

				expect(prepareOrder).toBeDefined();
				expect(firstCallbackOrder).toBeDefined();
				expect(refreshOrder).toBeDefined();
				expect(secondCallbackOrder).toBeDefined();
				if (
					prepareOrder === undefined ||
					firstCallbackOrder === undefined ||
					refreshOrder === undefined ||
					secondCallbackOrder === undefined
				) {
					throw new Error(
						"Expected prepare, refresh, and callback invocations to be recorded",
					);
				}
				expect(prepareOrder).toBeLessThan(firstCallbackOrder);
				expect(firstCallbackOrder).toBeLessThan(refreshOrder);
				expect(refreshOrder).toBeLessThan(secondCallbackOrder);
			});

			it("재시도에서 다시 401이 발생하면 두 번째 재발급 없이 전파한다", async () => {
				const unauthorized = new HttpException("HTTP 401 Unauthorized", {
					status: 401,
				});

				callback = jest
					.fn<() => Promise<unknown>>()
					.mockRejectedValueOnce(unauthorized)
					.mockRejectedValueOnce(unauthorized);

				await expect(
					COMMAND_RUNTIME_SUPPORT.runQuery(
						callback,
						createConfig({
							clientId: "client-id",
							clientSecret: "client-secret",
						}),
					),
				).rejects.toMatchObject({ status: 401 });

				expect(prepareApi).toHaveBeenCalledTimes(1);
				expect(refreshApi).toHaveBeenCalledTimes(1);
				expect(callback).toHaveBeenCalledTimes(2);
			});
		});
	});
});
