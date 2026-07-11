import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import { ScopedDotenvRuntime, type DotenvSource } from "./scoped-dotenv";

const KEYRING_PASSWORD = "TOSS_INVEST_CLI_KEYRING_PASSWORD";
const ACCESS_TOKEN = "TOSS_INVEST_ACCESS_TOKEN";
const ACCOUNT = "TOSS_INVEST_ACCOUNT";
const ACCOUNT_ALLOWLIST = "TOSS_INVEST_ACCOUNT_ALLOWLIST";
const ORDER_KILL_SWITCH = "TOSS_INVEST_ORDER_KILL_SWITCH";
const ORDER_LIVE_APPROVED = "TOSS_INVEST_ORDER_LIVE_APPROVED";

describe("ScopedDotenvRuntime", () => {
	let workspace: string;
	let cliHome: string;
	let cwd: string;
	let home: string;

	beforeEach(async () => {
		workspace = await mkdtemp(join(tmpdir(), "toss-invest-cli-scoped-dotenv-"));
		cliHome = join(workspace, "cli-home");
		cwd = join(workspace, "cwd");
		home = join(workspace, "home");
		await mkdir(cliHome, { recursive: true });
		await mkdir(cwd, { recursive: true });
		await mkdir(home, { recursive: true });
	});

	afterEach(async () => {
		await rm(workspace, { force: true, recursive: true });
	});

	async function writeDotenv(base: string, lines: string[]): Promise<void> {
		await writeFile(join(base, ".env"), `${lines.join("\n")}\n`);
	}

	function expectedDotenvSource(path: string): DotenvSource {
		return { kind: "dotenv", path };
	}

	it("주입된 env 값이 dotenv source보다 우선한다", async () => {
		const env = {
			HOME: home,
			TOSS_INVEST_CLI_HOME: ` ${cliHome} `,
			[ACCESS_TOKEN]: "explicit-token",
			[ACCOUNT]: "env-account",
			[ACCOUNT_ALLOWLIST]: "env-42, env-7",
			[ORDER_KILL_SWITCH]: "env-open",
			[ORDER_LIVE_APPROVED]: "env-yes",
		};
		await writeDotenv(cliHome, [
			`${ACCESS_TOKEN}=config-home-token`,
			`${ACCOUNT}=config-home-account`,
			`${ACCOUNT_ALLOWLIST}=config-home-42, config-home-7`,
			`${ORDER_KILL_SWITCH}=config-home-close`,
			`${ORDER_LIVE_APPROVED}=config-home-no`,
		]);
		await writeDotenv(cwd, [
			`${ACCESS_TOKEN}=cwd-token`,
			`${ACCOUNT}=cwd-account`,
			`${ACCOUNT_ALLOWLIST}=cwd-42, cwd-7`,
			`${ORDER_KILL_SWITCH}=cwd-open`,
			`${ORDER_LIVE_APPROVED}=cwd-yes`,
		]);
		await writeDotenv(home, [
			`${ACCESS_TOKEN}=home-token`,
			`${ACCOUNT}=home-account`,
			`${ACCOUNT_ALLOWLIST}=home-42, home-7`,
			`${ORDER_KILL_SWITCH}=home-open`,
			`${ORDER_LIVE_APPROVED}=home-yes`,
		]);

		const runtime = new ScopedDotenvRuntime(env, {
			cwd,
			home,
		});

		expect(runtime.resolve([ACCESS_TOKEN])).toEqual({
			value: "explicit-token",
			source: { kind: "environment" },
		});
		expect(runtime.resolve([ACCOUNT])).toEqual({
			value: "env-account",
			source: { kind: "environment" },
		});
		expect(runtime.resolve([ACCOUNT_ALLOWLIST])).toEqual({
			value: "env-42, env-7",
			source: { kind: "environment" },
		});
		expect(runtime.resolve([ORDER_KILL_SWITCH])).toEqual({
			value: "env-open",
			source: { kind: "environment" },
		});
		expect(runtime.resolve([ORDER_LIVE_APPROVED])).toEqual({
			value: "env-yes",
			source: { kind: "environment" },
		});
	});

	it("dotenv precedence는 config-home > cwd > home 이며 source path가 남는다", async () => {
		const env = { HOME: home, TOSS_INVEST_CLI_HOME: cliHome };
		await writeDotenv(cliHome, [`${KEYRING_PASSWORD}=config-home-password`]);
		await writeDotenv(cwd, [`${KEYRING_PASSWORD}=cwd-password`]);
		await writeDotenv(home, [`${KEYRING_PASSWORD}=home-password`]);

		const runtime = new ScopedDotenvRuntime(env, {
			cwd,
			home,
		});

		const resolved = runtime.resolve([KEYRING_PASSWORD]);
		expect(resolved.value).toBe("config-home-password");
		expect(resolved.source).toEqual(expectedDotenvSource(join(cliHome, ".env")));
	});

	it("canonical account/safety 키도 config-home > cwd > home precedence와 source path를 따른다", async () => {
		const env = {
			HOME: home,
			TOSS_INVEST_CLI_HOME: cliHome,
		};
		await writeDotenv(cliHome, [
			`${ACCOUNT}=config-home-account`,
			`${ACCOUNT_ALLOWLIST}=config-home-42, config-home-7`,
			`${ORDER_KILL_SWITCH}=config-home-close`,
			`${ORDER_LIVE_APPROVED}=config-home-no`,
		]);
		await writeDotenv(cwd, [
			`${ACCOUNT}=cwd-account`,
			`${ACCOUNT_ALLOWLIST}=cwd-home-42, cwd-home-7`,
			`${ORDER_KILL_SWITCH}=cwd-open`,
			`${ORDER_LIVE_APPROVED}=cwd-yes`,
		]);
		await writeDotenv(home, [
			`${ACCOUNT}=home-account`,
			`${ACCOUNT_ALLOWLIST}=home-42, home-7`,
			`${ORDER_KILL_SWITCH}=home-close`,
			`${ORDER_LIVE_APPROVED}=home-no`,
		]);

		const runtime = new ScopedDotenvRuntime(env, { cwd, home });
		const expected = expectedDotenvSource(join(cliHome, ".env"));

		expect(runtime.resolve([ACCOUNT])).toEqual({
			value: "config-home-account",
			source: expected,
		});
		expect(runtime.resolve([ACCOUNT_ALLOWLIST])).toEqual({
			value: "config-home-42, config-home-7",
			source: expected,
		});
		expect(runtime.resolve([ORDER_KILL_SWITCH])).toEqual({
			value: "config-home-close",
			source: expected,
		});
		expect(runtime.resolve([ORDER_LIVE_APPROVED])).toEqual({
			value: "config-home-no",
			source: expected,
		});
	});

	it("config-home가 없으면 cwd .env가 home보다 우선한다 (canonical key 검증)", async () => {
		const missingConfigHome = join(cwd, "missing-cli-home");
		const env = {
			HOME: home,
			TOSS_INVEST_CLI_HOME: missingConfigHome,
		};
		await writeDotenv(cwd, [
			`${ACCOUNT}=cwd-account`,
			`${ACCOUNT_ALLOWLIST}=cwd-home-42, cwd-home-7`,
			`${ORDER_KILL_SWITCH}=cwd-open`,
			`${ORDER_LIVE_APPROVED}=cwd-yes`,
		]);
		await writeDotenv(home, [
			`${ACCOUNT}=home-account`,
			`${ACCOUNT_ALLOWLIST}=home-42, home-7`,
			`${ORDER_KILL_SWITCH}=home-close`,
			`${ORDER_LIVE_APPROVED}=home-no`,
		]);

		const runtime = new ScopedDotenvRuntime(env, { cwd, home });
		const expected = expectedDotenvSource(join(cwd, ".env"));

		expect(runtime.resolve([ACCOUNT])).toEqual({
			value: "cwd-account",
			source: expected,
		});
		expect(runtime.resolve([ACCOUNT_ALLOWLIST])).toEqual({
			value: "cwd-home-42, cwd-home-7",
			source: expected,
		});
		expect(runtime.resolve([ORDER_KILL_SWITCH])).toEqual({
			value: "cwd-open",
			source: expected,
		});
		expect(runtime.resolve([ORDER_LIVE_APPROVED])).toEqual({
			value: "cwd-yes",
			source: expected,
		});
	});

	it("마지막으로 home .env가 사용된다 (canonical safety key 검증)", async () => {
		const env = {
			HOME: home,
			TOSS_INVEST_CLI_HOME: cliHome,
		};
		await writeDotenv(home, [
			`${ACCOUNT}=home-account`,
			`${ACCOUNT_ALLOWLIST}=home-42, home-7`,
			`${ORDER_KILL_SWITCH}=home-close`,
			`${ORDER_LIVE_APPROVED}=home-no`,
		]);
		const runtime = new ScopedDotenvRuntime(env, { cwd, home });
		const expected = expectedDotenvSource(join(home, ".env"));

		expect(runtime.resolve([ACCOUNT])).toEqual({
			value: "home-account",
			source: expected,
		});
		expect(runtime.resolve([ACCOUNT_ALLOWLIST])).toEqual({
			value: "home-42, home-7",
			source: expected,
		});
		expect(runtime.resolve([ORDER_KILL_SWITCH])).toEqual({
			value: "home-close",
			source: expected,
		});
		expect(runtime.resolve([ORDER_LIVE_APPROVED])).toEqual({
			value: "home-no",
			source: expected,
		});
	});

	it("동일한 source에서 access token이 존재하면 dotenv source가 남는다", async () => {
		const env = { HOME: home, TOSS_INVEST_CLI_HOME: cliHome };
		await writeDotenv(cliHome, [
			`${ACCESS_TOKEN}=config-token-primary`,
		]);
		const runtime = new ScopedDotenvRuntime(env, {
			cwd,
			home,
		});

		expect(runtime.resolve([ACCESS_TOKEN])).toEqual({
			value: "config-token-primary",
			source: { kind: "dotenv", path: join(cliHome, ".env") },
		});
	});

	it("동일한 source에서 canonical credential pair는 dotenv source를 남긴다", async () => {
		const env = {
			HOME: home,
			TOSS_INVEST_CLI_HOME: cliHome,
		};
		await writeDotenv(cliHome, [
			"TOSS_INVEST_API_KEY=canonical-client-id",
			"TOSS_INVEST_SECRET_KEY=canonical-client-secret",
		]);

		const runtime = new ScopedDotenvRuntime(env, {
			cwd,
			home,
		});

		expect(runtime.resolve([
			"TOSS_INVEST_API_KEY",
			"TOSS_INVEST_SECRET_KEY",
		])).toEqual({
			value: "canonical-client-id",
			source: { kind: "dotenv", path: join(cliHome, ".env") },
		});
	});

	it("레거시 credential 키는 canonical 키가 없으면 무시된다", async () => {
		const env = {
			HOME: home,
			TOSS_INVEST_CLI_HOME: cliHome,
		};
		const legacyApiKey = ["TOSS", "API_KEY"].join("_");
		const legacySecret = ["TOSS", "SECRET_KEY"].join("_");
		await writeDotenv(cliHome, [`${legacyApiKey}=legacy-client-id`]);
		await writeDotenv(cwd, [`${legacySecret}=legacy-client-secret`]);
		const runtime = new ScopedDotenvRuntime(env, {
			cwd,
			home,
		});

		expect(runtime.resolve(["TOSS_INVEST_API_KEY", "TOSS_INVEST_SECRET_KEY"]))
			.toEqual({});
	});

	it("주입된 env 객체는 mutate되지 않는다", () => {
		const env = {
			HOME: home,
			TOSS_INVEST_CLI_HOME: cliHome,
			[ACCESS_TOKEN]: "env-token",
		};
		const snapshot = { ...env };
		const runtime = new ScopedDotenvRuntime(env, { cwd, home });

		expect(runtime.resolve([ACCESS_TOKEN])).toEqual({
			value: "env-token",
			source: { kind: "environment" },
		});
		expect(env).toEqual(snapshot);
	});

	it("동일 환경 값 없이 config-home가 유효한 경우 configHome를 trimmed 값으로 추론한다", async () => {
		const env = {
			HOME: home,
			TOSS_INVEST_CLI_HOME: ` ${cliHome} `,
		};
		await writeDotenv(cliHome, [`${ACCESS_TOKEN}=config-token`]);
		const runtime = new ScopedDotenvRuntime(env, { cwd, home });

		expect(runtime.configHome).toBe(cliHome);
		expect(runtime.resolve([ACCESS_TOKEN])).toEqual({
			value: "config-token",
			source: { kind: "dotenv", path: join(cliHome, ".env") },
		});
	});

	it("빈/공백 dotenv 값은 미설정으로 취급한다", async () => {
		const env = { HOME: home, TOSS_INVEST_CLI_HOME: cliHome };
		await writeDotenv(cliHome, [
			`${ACCESS_TOKEN}=`,
			`${KEYRING_PASSWORD}=  `,
		]);

		const runtime = new ScopedDotenvRuntime(env, { cwd, home });

		expect(runtime.resolve([ACCESS_TOKEN])).toEqual({});
		expect(runtime.resolve([KEYRING_PASSWORD])).toEqual({});
	});
});

