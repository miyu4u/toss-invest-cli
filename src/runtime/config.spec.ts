import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";

import { CliException } from "../exceptions";
import { CLI_CONFIG_RUNTIME } from "./config";
import type { CliConfig } from "../schema/cli/config";

const ACCESS_TOKEN = "TOSS_INVEST_ACCESS_TOKEN";
const ACCOUNT = "TOSS_INVEST_ACCOUNT";
const ACCOUNT_ALLOWLIST = "TOSS_INVEST_ACCOUNT_ALLOWLIST";
const ORDER_KILL_SWITCH = "TOSS_INVEST_ORDER_KILL_SWITCH";
const ORDER_LIVE_APPROVED = "TOSS_INVEST_ORDER_LIVE_APPROVED";

type SourceAwareCliConfig = CliConfig & {
	readonly keyringPasswordSource?: {
		readonly kind: "environment" | "dotenv";
		readonly path?: string;
	};
	readonly clientCredentialsSource?: {
		readonly kind: "environment" | "dotenv";
		readonly path?: string;
	};
}

function expectDotenvSource(
	actual: SourceAwareCliConfig["keyringPasswordSource"] | undefined,
	base: string,
): void {
	expect(actual?.kind).toBe("dotenv");
	expect(actual?.path?.endsWith(join(base, ".env"))).toBe(true);
}

function createConfig(overrides: Partial<CliConfig> = {}): CliConfig {
	return {
		accountAllowlist: [],
		authCachePath: "/tmp/toss-invest-cli-auth-cache.json",
		configHome: "/tmp/toss-invest-cli",
		credentialsPath: "/tmp/toss-invest-cli-credentials.enc",
		...overrides,
	} as CliConfig;
}

describe("CLI_CONFIG_RUNTIME", () => {
	describe("load", () => {
		let environment: Record<string, string>;
		let workspace: string;
		let home: string;
		let cliHome: string;
		let workingDirectory: string;
		let restoreCwd: string;

		beforeEach(async () => {
			environment = {};
			workspace = await mkdtemp(join(tmpdir(), "toss-invest-cli-config-runtime-"));
			home = join(workspace, "home");
			cliHome = join(workspace, "cli-home");
			workingDirectory = join(workspace, "cwd");
			restoreCwd = process.cwd();

			await mkdir(home, { recursive: true });
			await mkdir(cliHome, { recursive: true });
			await mkdir(workingDirectory, { recursive: true });
			process.chdir(workingDirectory);
		});

		afterEach(async () => {
			process.chdir(restoreCwd);
			await rm(workspace, { force: true, recursive: true });
		});

		async function writeDotenv(
			base: string,
			lines: string[],
		): Promise<void> {
			await writeFile(join(base, ".env"), `${lines.join("\n")}\n`);
		}

		describe("성공 케이스", () => {
			it("명령행 입력이 환경 값보다 높은 우선순위를 가진다", () => {
				environment = {
					[ACCESS_TOKEN]: "env-token",
					[ACCOUNT]: "env-account",
				};
				const config = CLI_CONFIG_RUNTIME.load(environment, {
					accessToken: "explicit-token",
					account: "explicit-account",
				});

				expect(config).toMatchObject({
					accessToken: "explicit-token",
					defaultAccount: "explicit-account",
				});
			});

			it("legacy access token env만 있으면 무시된다", () => {
				const legacyAccessToken = ["TOSSINVEST", "ACCESS", "TOKEN"].join("_");

				const legacyOnly = CLI_CONFIG_RUNTIME.load({
					[legacyAccessToken]: "legacy-only-token",
				});

				expect(legacyOnly.environmentAccessToken).toBeUndefined();
			});

			it("canonical access token env는 honored된다", () => {
				const canonical = CLI_CONFIG_RUNTIME.load({
					[ACCESS_TOKEN]: "canonical-token",
				});

				expect(canonical.environmentAccessToken).toBe("canonical-token");
			});

			it("dotenv 우선순위와 source metadata를 해석한다", async () => {
				environment = {
					HOME: home,
					TOSS_INVEST_CLI_HOME: ` ${cliHome} `,
					[ACCESS_TOKEN]: "explicit-access-token",
					[ACCOUNT]: "explicit-account",
					TOSS_INVEST_API_KEY: "explicit-client-id",
					TOSS_INVEST_SECRET_KEY: "explicit-client-secret",
					TOSS_INVEST_CLI_KEYRING_PASSWORD: "explicit-keyring-password",
				};

				await writeDotenv(cliHome, [
					"TOSS_INVEST_CLI_KEYRING_PASSWORD=cli-keyring-password",
					"TOSS_INVEST_API_KEY=cli-client-id",
					"TOSS_INVEST_SECRET_KEY=cli-client-secret",
				]);
				await writeDotenv(workingDirectory, [
					"TOSS_INVEST_CLI_KEYRING_PASSWORD=cwd-keyring-password",
					"TOSS_INVEST_API_KEY=cwd-client-id",
					"TOSS_INVEST_SECRET_KEY=cwd-client-secret",
				]);
				await writeDotenv(home, [
					"TOSS_INVEST_CLI_KEYRING_PASSWORD=home-keyring-password",
					"TOSS_INVEST_SECRET_KEY=home-client-secret",
					"TOSS_INVEST_API_KEY=home-client-id",
				]);

				const config = CLI_CONFIG_RUNTIME.load(
					environment,
				) as SourceAwareCliConfig;

				expect(config).toMatchObject({
					environmentAccessToken: "explicit-access-token",
					defaultAccount: "explicit-account",
					clientId: "explicit-client-id",
					clientSecret: "explicit-client-secret",
					keyringPassword: "explicit-keyring-password",
					clientCredentialsSource: {
						kind: "environment",
					},
					keyringPasswordSource: {
						kind: "environment",
					},
					configHome: cliHome.trim(),
					authCachePath: join(cliHome.trim(), "auth-cache.json"),
					credentialsPath: join(cliHome.trim(), "credentials.enc"),
				});
			});

			it("process env의 account/safety 값이 dotenv보다 우선한다", async () => {
				environment = {
					HOME: home,
					TOSS_INVEST_CLI_HOME: cliHome,
					[ACCOUNT]: "env-account",
					[ACCOUNT_ALLOWLIST]: "env-42, env-7",
					[ORDER_KILL_SWITCH]: "env-open",
					[ORDER_LIVE_APPROVED]: "env-yes",
				};
				await writeDotenv(cliHome, [
					`${ACCOUNT}=config-home-account`,
					`${ACCOUNT_ALLOWLIST}=cli-42, cli-7`,
					`${ORDER_KILL_SWITCH}=config-home-close`,
					`${ORDER_LIVE_APPROVED}=config-home-no`,
				]);
				await writeDotenv(workingDirectory, [
					`${ACCOUNT}=cwd-account`,
					`${ACCOUNT_ALLOWLIST}=cwd-42, cwd-7`,
					`${ORDER_KILL_SWITCH}=cwd-open`,
					`${ORDER_LIVE_APPROVED}=cwd-yes`,
				]);
				await writeDotenv(home, [
					`${ACCOUNT}=home-account`,
					`${ACCOUNT_ALLOWLIST}=home-42, home-7`,
					`${ORDER_KILL_SWITCH}=home-close`,
					`${ORDER_LIVE_APPROVED}=home-no`,
				]);

				const config = CLI_CONFIG_RUNTIME.load(
					environment,
				) as SourceAwareCliConfig;

				expect(config).toMatchObject({
					defaultAccount: "env-account",
					accountAllowlist: ["env-42", "env-7"],
					orderKillSwitch: "env-open",
					orderLiveApproved: "env-yes",
				});
			});

			it("config 홈 > cwd > HOME dotenv 순서로 dotenv source가 적용되고 path가 남는다", async () => {
				environment = {
					HOME: home,
					TOSS_INVEST_CLI_HOME: cliHome,
				};
				await writeDotenv(cliHome, [
					"TOSS_INVEST_CLI_KEYRING_PASSWORD=cli-keyring",
					"TOSS_INVEST_API_KEY=cli-client-id",
					"TOSS_INVEST_SECRET_KEY=cli-client-secret",
					`${ACCOUNT}=cli-account`,
					`${ACCOUNT_ALLOWLIST}=cli-42, cli-7`,
					`${ORDER_KILL_SWITCH}=cli-open`,
					`${ORDER_LIVE_APPROVED}=cli-yes`,
				]);
				await writeDotenv(workingDirectory, [
					"TOSS_INVEST_CLI_KEYRING_PASSWORD=cwd-keyring",
					"TOSS_INVEST_API_KEY=cwd-client-id",
					"TOSS_INVEST_SECRET_KEY=cwd-client-secret",
					`${ACCOUNT}=cwd-account`,
					`${ACCOUNT_ALLOWLIST}=cwd-42, cwd-7`,
					`${ORDER_KILL_SWITCH}=cwd-open`,
					`${ORDER_LIVE_APPROVED}=cwd-no`,
				]);
				await writeDotenv(home, [
					"TOSS_INVEST_CLI_KEYRING_PASSWORD=home-keyring",
					`${ACCOUNT}=home-account`,
					`${ACCOUNT_ALLOWLIST}=home-42, home-7`,
					`${ORDER_KILL_SWITCH}=home-close`,
					`${ORDER_LIVE_APPROVED}=home-yes`,
				]);

				const config = CLI_CONFIG_RUNTIME.load(
					environment,
				) as SourceAwareCliConfig;

				expect(config).toMatchObject({
					keyringPassword: "cli-keyring",
					clientId: "cli-client-id",
					clientSecret: "cli-client-secret",
					defaultAccount: "cli-account",
					accountAllowlist: ["cli-42", "cli-7"],
					orderKillSwitch: "cli-open",
					orderLiveApproved: "cli-yes",
				});
				expectDotenvSource(config.keyringPasswordSource, cliHome);
				expectDotenvSource(config.clientCredentialsSource, cliHome);
			});

			it("config-home .env가 없으면 cwd dotenv의 값으로 대체한다", async () => {
				environment = {
					HOME: home,
					TOSS_INVEST_CLI_HOME: join(workingDirectory, "missing-cli-home"),
				};
				await writeDotenv(workingDirectory, [
					"TOSS_INVEST_CLI_KEYRING_PASSWORD=cwd-keyring",
					"TOSS_INVEST_API_KEY=cwd-client-id",
					"TOSS_INVEST_SECRET_KEY=cwd-client-secret",
					`${ACCOUNT}=cwd-account`,
					`${ACCOUNT_ALLOWLIST}=cwd-42, cwd-7`,
					`${ORDER_KILL_SWITCH}=cwd-open`,
					`${ORDER_LIVE_APPROVED}=cwd-yes`,
				]);
				await writeDotenv(home, [
					`${ACCOUNT}=home-account`,
					`${ACCOUNT_ALLOWLIST}=home-42, home-7`,
					`${ORDER_KILL_SWITCH}=home-close`,
					`${ORDER_LIVE_APPROVED}=home-no`,
				]);

				const config = CLI_CONFIG_RUNTIME.load(
					environment,
				) as SourceAwareCliConfig;

				expect(config.keyringPassword).toBe("cwd-keyring");
				expectDotenvSource(config.keyringPasswordSource, workingDirectory);
				expectDotenvSource(config.clientCredentialsSource, workingDirectory);
				expect(config).toMatchObject({
					defaultAccount: "cwd-account",
					accountAllowlist: ["cwd-42", "cwd-7"],
					orderKillSwitch: "cwd-open",
					orderLiveApproved: "cwd-yes",
				});
			});

			it("레거시 credential 키만 있으면 canonical source 기반 credential이 비활성화된다", async () => {
				const legacyApiKey = ["TOSS", "API_KEY"].join("_");
				const legacySecret = ["TOSS", "SECRET_KEY"].join("_");
				const legacyClientId = ["TOSS", "INVEST", "CLIENT_ID"].join("_");
				const legacyClientSecret = ["TOSS", "INVEST", "CLIENT_SECRET"].join("_");
				environment = {
					HOME: home,
					TOSS_INVEST_CLI_HOME: cliHome,
				};
				await writeDotenv(cliHome, [
					`${legacyApiKey}=legacy-client-id`,
					`${legacySecret}=legacy-client-secret`,
					`${legacyClientId}=legacy-client-id`,
					`${legacyClientSecret}=legacy-client-secret`,
				]);

				const config = CLI_CONFIG_RUNTIME.load(
					environment,
				) as SourceAwareCliConfig;

				expect(config.clientId).toBeUndefined();
				expect(config.clientSecret).toBeUndefined();
				expect(config.clientCredentialsSource).toBeUndefined();
			});

			it("레거시 account/safety 키만 있으면 canonical 값은 설정되지 않는다", async () => {
				const legacyAccount = ["TOSSINVEST", "ACCOUNT"].join("_");
				const legacyAccountAllowlist = [
					"TOSSINVEST",
					"ACCOUNT",
					"ALLOWLIST",
				].join("_");
				const legacyOrderKillSwitch = [
					"TOSSINVEST",
					"ORDER",
					"KILL",
					"SWITCH",
				].join("_");
				const legacyOrderLiveApproved = [
					"TOSSINVEST",
					"ORDER",
					"LIVE",
					"APPROVED",
				].join("_");
				environment = {
					HOME: home,
					TOSS_INVEST_CLI_HOME: cliHome,
				};
				await writeDotenv(cliHome, [
					`${legacyAccount}=legacy-account`,
					`${legacyAccountAllowlist}=legacy-42, legacy-7`,
					`${legacyOrderKillSwitch}=legacy-open`,
					`${legacyOrderLiveApproved}=legacy-yes`,
				]);

				const config = CLI_CONFIG_RUNTIME.load(
					environment,
				) as SourceAwareCliConfig;

				expect(config.defaultAccount).toBeUndefined();
				expect(config.accountAllowlist).toEqual([]);
				expect(config.orderKillSwitch).toBeUndefined();
				expect(config.orderLiveApproved).toBeUndefined();
			});

			it("동일한 source가 아닌 API credential 조합은 clientCredentialsSource 없이 비활성화한다", async () => {
				environment = {
					HOME: home,
					TOSS_INVEST_CLI_HOME: cliHome,
				};
				await writeDotenv(cliHome, [
					"TOSS_INVEST_API_KEY=cli-client-id",
				]);
				await writeDotenv(workingDirectory, [
					"TOSS_INVEST_SECRET_KEY=cwd-client-secret",
				]);
				const config = CLI_CONFIG_RUNTIME.load(
					environment,
				) as SourceAwareCliConfig;

				expect(config.clientId).toBeUndefined();
				expect(config.clientSecret).toBeUndefined();
				expect(config.clientCredentialsSource).toBeUndefined();
			});

			it("동일한 source에서 API credential이 불완전하면 비활성화한다", async () => {
				environment = {
					HOME: home,
					TOSS_INVEST_CLI_HOME: cliHome,
				};
				await writeDotenv(cliHome, ["TOSS_INVEST_API_KEY=cli-client-id"]);
				const config = CLI_CONFIG_RUNTIME.load(
					environment,
				) as SourceAwareCliConfig;

				expect(config.clientId).toBeUndefined();
				expect(config.clientSecret).toBeUndefined();
				expect(config.clientCredentialsSource).toBeUndefined();
			});

			it("완전한 pair가 같은 source에서만 채택되면 source가 남는다", async () => {
				environment = {
					HOME: home,
					TOSS_INVEST_CLI_HOME: cliHome,
				};
				await writeDotenv(cliHome, [
					"TOSS_INVEST_API_KEY=cli-client-id",
					"TOSS_INVEST_SECRET_KEY=cli-client-secret",
					"TOSS_INVEST_CLI_KEYRING_PASSWORD=cli-keyring",
				]);
				const config = CLI_CONFIG_RUNTIME.load(
					environment,
				) as SourceAwareCliConfig;

				expect(config.clientId).toBe("cli-client-id");
				expect(config.clientSecret).toBe("cli-client-secret");
				expect(config.keyringPassword).toBe("cli-keyring");
				expectDotenvSource(config.clientCredentialsSource, cliHome);
				expectDotenvSource(config.keyringPasswordSource, cliHome);
			});

			it("빈 access-token/keyring 값은 무시되고 API pair는 동일 source에서 source metadata로 남는다", async () => {
				environment = {
					HOME: home,
					TOSS_INVEST_CLI_HOME: cliHome,
				};
				await writeDotenv(cliHome, [
					"TOSS_INVEST_ACCESS_TOKEN=  ",
					"TOSS_INVEST_CLI_KEYRING_PASSWORD=   ",
					"TOSS_INVEST_API_KEY=cli-client-id",
					"TOSS_INVEST_SECRET_KEY=cli-client-secret",
				]);

				const config = CLI_CONFIG_RUNTIME.load(
					environment,
				) as SourceAwareCliConfig;

				expect(config.clientId).toBe("cli-client-id");
				expect(config.clientSecret).toBe("cli-client-secret");
				expect(config.environmentAccessToken).toBeUndefined();
				expect(config.keyringPassword).toBeUndefined();
				expect(config.keyringPasswordSource).toBeUndefined();
				expectDotenvSource(config.clientCredentialsSource, cliHome);
			});

			it("CLI 홈이 없으면 HOME 기준으로 config 홈을 계산한다", () => {
				environment = { HOME: home };
				const config = CLI_CONFIG_RUNTIME.load(environment);

				expect(config.configHome).toBe(
					join(home, ".config", "toss-invest-cli"),
				);
			});

			it("HOME도 없으면 운영체제 홈을 기본 config 홈으로 사용한다", () => {
				const config = CLI_CONFIG_RUNTIME.load(environment);

				expect(config.configHome).toBe(
					join(homedir(), ".config", "toss-invest-cli"),
				);
			});

			it("계정 허용 목록이 있으면 trim된 토큰으로 분리하고 빈 값은 제거한다", () => {
				environment = {
					[ACCOUNT_ALLOWLIST]: " 42 , 7, ,  ,19,,*, wildcard ",
				};

				const config = CLI_CONFIG_RUNTIME.load(environment);

				expect(config.accountAllowlist).toEqual([
					"42",
					"7",
					"19",
					"*",
					"wildcard",
				]);
			});

			it("계정 허용 목록이 없으면 빈 배열을 사용한다", () => {
				const config = CLI_CONFIG_RUNTIME.load(environment);

				expect(config.accountAllowlist).toEqual([]);
			});

			it("입력 환경 객체는 읽기만 수행하고 mutate하지 않는다", async () => {
				environment = {
					HOME: home,
					TOSS_INVEST_CLI_HOME: cliHome,
				};
				await writeDotenv(cliHome, ["TOSS_INVEST_CLI_KEYRING_PASSWORD=cli-keyring"]);
				const snapshot = { ...environment };
				const config = CLI_CONFIG_RUNTIME.load(environment);

				expect(config.keyringPassword).toBe("cli-keyring");
				expect(environment).toEqual(snapshot);
			});
		});
	});

	describe("resolveAccount", () => {
		let config: CliConfig;

		beforeEach(() => {
			config = createConfig();
		});

		describe("성공 케이스", () => {
			beforeEach(() => {
				config = createConfig({ defaultAccount: "default-account" });
			});

			it("명시 계정을 우선 적용하고 공백을 제거한다", () => {
				expect(
					CLI_CONFIG_RUNTIME.resolveAccount(" explicit-account ", config),
				).toBe("explicit-account");
			});

			it("명시 계정이 없으면 기본 계정을 반환한다", () => {
				expect(CLI_CONFIG_RUNTIME.resolveAccount(undefined, config)).toBe(
					"default-account",
				);
			});
		});

		describe("실패 케이스", () => {
			it("명시 계정과 기본 계정이 모두 없으면 ACCOUNT_REQUIRED 예외를 던진다", () => {
				let error: CliException | null = null;

				try {
					CLI_CONFIG_RUNTIME.resolveAccount(undefined, config);
				} catch (caught) {
					error = caught as CliException;
				}

				expect(error).toBeInstanceOf(CliException);
				expect(error).toMatchObject({
					name: "CliException",
					code: "ACCOUNT_REQUIRED",
					exitCode: 2,
					message:
						"Account is required. Pass --account or set TOSS_INVEST_ACCOUNT.",
				});
			});
		});
	});
});
