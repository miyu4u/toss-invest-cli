import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from "@jest/globals";

import { SERVICE } from "../service-registry";
import { CREDENTIAL_STORE } from "../runtime/credential-store";
import { createCliProgram, runCLI } from "./bootstrap";

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

describe("CLI bootstrap", () => {
	afterEach(() => {
		jest.restoreAllMocks();
		process.exitCode = undefined;
	});

	describe("createCliProgram", () => {
		describe("성공 케이스", () => {
			it("최상위 사용법은 toss-invest-cli 루트 명을 표시한다", () => {
				const help = createCliProgram().helpInformation();

				expect(help).toMatch(/Usage:\s+toss-invest-cli\b/);
			});

			it("헬프에 query/trading 명령 그룹과 --json 옵션을 노출한다", () => {
				const help = createCliProgram().helpInformation();

				expect(help).toContain("market");
				expect(help).toContain("orders");
				expect(help).toContain("portfolio");
				expect(help).toContain("watchlist");
				expect(help).toContain("--json");
			});

			it("--account 옵션 도움말은 계좌 번호와 accountSeq 모두를 허용한다고 안내한다", () => {
				const help = createCliProgram().helpInformation();

				expect(help).toMatch(
					/Toss\s+Invest\s+accountNo\s+or\s+accountSeq;\s*normalized\s+to\s+accountSeq/,
				);
			});

			it("폐기된 라이브 안전 플래그는 help 출력에 포함되지 않는다", () => {
				const help = createCliProgram().helpInformation();

				expect(help).not.toContain("--reconciliation-plan");
				expect(help).not.toContain("--transaction-key");
				expect(help).not.toContain("--safety-mode");
			});
		});
	});

	describe("hello", () => {
		let output: ReturnType<typeof createOutput>;

		beforeEach(() => {
			output = createOutput();
		});

		it("인자를 주지 않으면 기본 인사 메시지에 toss-invest-cli를 사용한다", async () => {
			const exitCode = await runCLI(["node", "toss-invest-cli", "hello"], {
				output,
			});
			const body = JSON.parse(output.stdout.toString());

			expect(exitCode).toBe(0);
			expect(output.stderr.toString()).toBe("");
			expect(body).toEqual({ message: "Hello, toss-invest-cli!" });
		});
	});

	describe("auth", () => {
		it("auth login은 완전한 환경 변수 pair로 JSON credentialSource(environment)를 반환하고 secret prompt를 건너뛰며 암호화 저장소에 보관한다", async () => {
			const output = createOutput();
			const configHome = await mkdtemp(
				join(tmpdir(), "toss-invest-cli-auth-env-home-"),
			);
			const home = await mkdtemp(join(tmpdir(), "toss-invest-cli-auth-home-"));
			const clientId = randomUUID();
			const clientSecret = randomUUID();
			const keyringPassword = randomUUID();

			try {
				const exitCode = await runCLI(
					["node", "toss-invest-cli", "--json", "auth", "login"],
					{
						env: {
							HOME: home,
							TOSS_INVEST_CLI_HOME: configHome,
							TOSS_INVEST_API_KEY: clientId,
							TOSS_INVEST_SECRET_KEY: clientSecret,
							TOSS_INVEST_CLI_KEYRING_PASSWORD: keyringPassword,
						},
						output,
					},
				);

				const stdout = output.stdout.toString();
				const body = JSON.parse(stdout);

				expect(exitCode).toBe(0);
				expect(body).toEqual({
					authenticated: true,
					credentialSource: { kind: "environment" },
				});
				expect(output.stderr.toString()).toBe("");
				expect(await CREDENTIAL_STORE.read(
					join(configHome, "credentials.enc"),
					keyringPassword,
				)).toMatchObject({
					clientId,
					clientSecret,
				});
				for (const secret of [clientId, clientSecret, keyringPassword]) {
					expect(stdout).not.toContain(secret);
					expect(output.stderr.toString()).not.toContain(secret);
				}
			} finally {
				await rm(configHome, { force: true, recursive: true });
				await rm(home, { force: true, recursive: true });
			}
		});

		it("auth login은 config-home dotenv pair로 JSON credentialSource(dotenv + path)를 반환한다", async () => {
			const output = createOutput();
			const configHome = await mkdtemp(
				join(tmpdir(), "toss-invest-cli-auth-dotenv-home-"),
			);
			const home = await mkdtemp(join(tmpdir(), "toss-invest-cli-auth-home-"));
			const clientId = randomUUID();
			const clientSecret = randomUUID();
			const keyringPassword = randomUUID();
			const dotenvPath = join(configHome, ".env");

			try {
				await writeFile(
					dotenvPath,
					[
						`TOSS_INVEST_API_KEY=${clientId}`,
						`TOSS_INVEST_SECRET_KEY=${clientSecret}`,
						`TOSS_INVEST_CLI_KEYRING_PASSWORD=${keyringPassword}`,
					].join("\n"),
					"utf8",
				);

				const exitCode = await runCLI(
					["node", "toss-invest-cli", "--json", "auth", "login"],
					{
						env: {
							HOME: home,
							TOSS_INVEST_CLI_HOME: configHome,
						},
						output,
					},
				);

				const stdout = output.stdout.toString();
				const body = JSON.parse(stdout);

				expect(exitCode).toBe(0);
				expect(body).toEqual({
					authenticated: true,
					credentialSource: {
						kind: "dotenv",
						path: dotenvPath,
					},
				});
				expect(output.stderr.toString()).toBe("");
				expect(await CREDENTIAL_STORE.read(
					join(configHome, "credentials.enc"),
					keyringPassword,
				)).toMatchObject({
					clientId,
					clientSecret,
				});
			} finally {
				await rm(configHome, { force: true, recursive: true });
				await rm(home, { force: true, recursive: true });
			}
		});

		it("auth 하위 명령 도움말에 login, logout, token을 노출한다", async () => {
			const output = createOutput();
			const exitCode = await runCLI(
				["node", "toss-invest-cli", "auth", "--help"],
				{
					output,
				},
			);

			expect(exitCode).toBe(0);
			expect(output.stdout.toString()).toMatch(/login/);
			expect(output.stdout.toString()).toMatch(/logout/);
			expect(output.stdout.toString()).toMatch(/token/);
		});

		it.each([
			"login",
			"logout",
			"token",
		])("auth %s 도움말을 표시한다", async (subcommand) => {
			const output = createOutput();
			const exitCode = await runCLI(
				["node", "toss-invest-cli", "auth", subcommand, "--help"],
				{ output },
			);

			expect(exitCode).toBe(0);
			expect(output.stdout.toString()).toMatch(/Usage:/);
			expect(output.stderr.toString()).toBe("");
		});

		it("auth token은 JSON stdout에 access token을 노출하지 않는다", async () => {
			const output = createOutput();
			const accessToken = randomUUID();
			const exitCode = await runCLI(
				["node", "toss-invest-cli", "--json", "auth", "token"],
				{
					env: { TOSS_INVEST_ACCESS_TOKEN: accessToken },
					output,
				},
			);

			expect(exitCode).toBe(0);
			expect(JSON.parse(output.stdout.toString())).toEqual({
				authenticated: true,
				tokenType: "Bearer",
			});
			expect(output.stdout.toString()).not.toContain(accessToken);
			expect(output.stderr.toString()).toBe("");
		});

		it("auth login은 TTY 없이 stderr 오류로 종료한다", async () => {
			const output = createOutput();
			const configHome = await mkdtemp(
				join(tmpdir(), "toss-invest-cli-auth-no-tty-home-"),
			);
			const home = await mkdtemp(
				join(tmpdir(), "toss-invest-cli-auth-no-tty-home2-"),
			);
			const cwd = await mkdtemp(join(tmpdir(), "toss-invest-cli-auth-no-tty-cwd-"));
			const previousCwd = process.cwd();
			process.chdir(cwd);
			try {
				const exitCode = await runCLI(
					["node", "toss-invest-cli", "--json", "auth", "login"],
					{
						env: {
							HOME: home,
							TOSS_INVEST_CLI_HOME: configHome,
						},
						output,
					},
				);

				expect(exitCode).toBe(2);
				expect(output.stdout.toString()).toBe("");
				expect(output.stderr.toString()).toMatch(/tty_required/);
			} finally {
				process.chdir(previousCwd);
				await rm(configHome, { force: true, recursive: true });
				await rm(home, { force: true, recursive: true });
				await rm(cwd, { force: true, recursive: true });
			}
		});

		it("auth logout은 JSON stdout에 상태만 기록한다", async () => {
			const output = createOutput();
			const exitCode = await runCLI(
				["node", "toss-invest-cli", "--json", "auth", "logout"],
				{
					env: { TOSS_INVEST_CLI_HOME: join(tmpdir(), randomUUID()) },
					output,
				},
			);

			expect(exitCode).toBe(0);
			expect(JSON.parse(output.stdout.toString())).toEqual({ loggedOut: true });
			expect(output.stderr.toString()).toBe("");
		});
	});

	describe("market prices", () => {
		const successArgv = [
			"node",
			"toss-invest-cli",
			"--json",
			"--access-token",
			"test-token",
			"market",
			"prices",
			"--symbols",
			"AAPL",
		];

		const missingSymbolsArgv = [
			"node",
			"toss-invest-cli",
			"--json",
			"--access-token",
			"test-token",
			"market",
			"prices",
		];

		describe("성공 케이스", () => {
			let output: ReturnType<typeof createOutput>;
			let prices: jest.SpiedFunction<typeof SERVICE.queryCommandService.prices>;
			let apiPrices: jest.SpiedFunction<
				typeof SERVICE.tossInvestAPIService.getPrices
			>;
			let response: {
				result: Array<{
					symbol: string;
					lastPrice: string;
					currency: "KRW" | "USD";
					timestamp?: string;
				}>;
			};

			beforeEach(() => {
				output = createOutput();
				response = {
					result: [
						{
							symbol: "AAPL",
							lastPrice: "100",
							currency: "USD",
							timestamp: "2026-06-25T09:30:00.123+09:00",
						},
					],
				};
				apiPrices = jest
					.spyOn(SERVICE.tossInvestAPIService, "getPrices")
					.mockResolvedValue(response);
				prices = jest.spyOn(SERVICE.queryCommandService, "prices");
			});

			it("parse-clean한 --json stdout을 내보내고 정확한 서비스 시그니처로 위임한다", async () => {
				const exitCode = await runCLI(successArgv, { output });
				const stdout = output.stdout.toString();
				const body = JSON.parse(stdout);

				expect(exitCode).toBe(0);
				expect(stdout.endsWith("\n")).toBe(true);
				expect(body).toMatchObject(response);
				expect(output.stderr.toString()).toBe("");
				expect(prices).toHaveBeenCalledTimes(1);
				expect(apiPrices).toHaveBeenCalledTimes(1);
				expect(prices).toHaveBeenCalledWith({ symbols: "AAPL" });
				expect(apiPrices).toHaveBeenCalledWith({ symbols: "AAPL" });
			});
		});

		describe("실패 케이스", () => {
			let output: ReturnType<typeof createOutput>;
			let prices: jest.SpiedFunction<typeof SERVICE.queryCommandService.prices>;
			let apiPrices: jest.SpiedFunction<
				typeof SERVICE.tossInvestAPIService.getPrices
			>;

			beforeEach(() => {
				output = createOutput();
				apiPrices = jest
					.spyOn(SERVICE.tossInvestAPIService, "getPrices")
					.mockResolvedValue({
						result: [
							{
								symbol: "AAPL",
								lastPrice: "100",
								currency: "USD",
							},
						],
					});
				prices = jest.spyOn(SERVICE.queryCommandService, "prices");
			});

			it("--symbols 누락은 유효성 실패로 종료하고 downstream 가격 조회를 호출하지 않는다", async () => {
				const exitCode = await runCLI(missingSymbolsArgv, { output });

				expect(exitCode).toBe(1);
				expect(output.stdout.toString()).toBe("");
				expect(output.stderr.toString()).toMatch(/error_kind=/);
				expect(output.stderr.toString()).toMatch(
					/required option.*--symbols <symbols>/i,
				);
				expect(prices).not.toHaveBeenCalled();
				expect(apiPrices).not.toHaveBeenCalled();
			});
		});
	});
});
