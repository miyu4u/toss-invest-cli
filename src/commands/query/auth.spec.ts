import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { CREDENTIAL_STORE } from "../../runtime/credential-store";
import { CLI_COMMAND_OPTIONS } from "../options";
import { AuthCommands } from "./auth";

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

async function runAuthLoginWithInjectedSecrets(
	readSecret: (prompt: string) => Promise<string>,
	options: {
		env: Record<string, string>;
		output: { stdout: BufferStream; stderr: BufferStream };
	},
): Promise<number> {
	const program = new Command()
		.name("toss-invest-cli")
		.exitOverride()
		.configureOutput({
			writeErr: (message) => options.output.stderr.write(message),
			writeOut: (message) => options.output.stdout.write(message),
		});
	CLI_COMMAND_OPTIONS.addJsonOption(
		CLI_COMMAND_OPTIONS.addAuthOptions(
			CLI_COMMAND_OPTIONS.addAccountOption(program),
		),
	);
	new AuthCommands(readSecret).register(program, {
		output: options.output,
		env: options.env,
	});

	const previousExitCode = process.exitCode;
	process.exitCode = undefined;
	try {
		await program.parseAsync(
			["node", "toss-invest-cli", "--json", "auth", "login"],
			{
				from: "node",
			},
		);
		return typeof process.exitCode === "number" ? process.exitCode : 0;
	} finally {
		process.exitCode = previousExitCode;
	}
}

describe("AuthCommands", () => {
	afterEach(() => {
		jest.restoreAllMocks();
		process.exitCode = undefined;
	});

	it("auth login은 완전 주입된 환경변수 source에서 prompt 없이 environment credentialSource를 반환한다", async () => {
		const output = createOutput();
		const configHome = await mkdtemp(
			join(tmpdir(), "toss-invest-cli-auth-env-home-"),
		);
		const home = await mkdtemp(join(tmpdir(), "toss-invest-cli-auth-env-user-home-"));
		const cwd = await mkdtemp(join(tmpdir(), "toss-invest-cli-auth-env-cwd-"));
		const previousCwd = process.cwd();
		const clientId = randomUUID();
		const clientSecret = randomUUID();
		const keyringPassword = randomUUID();
		const readSecret = jest.fn(
			async (_prompt: string): Promise<string> => randomUUID(),
		) as jest.MockedFunction<(prompt: string) => Promise<string>>;

		try {
			process.chdir(cwd);
			const exitCode = await runAuthLoginWithInjectedSecrets(readSecret, {
				env: {
					HOME: home,
					TOSS_INVEST_CLI_HOME: configHome,
					TOSS_INVEST_API_KEY: clientId,
					TOSS_INVEST_SECRET_KEY: clientSecret,
					TOSS_INVEST_CLI_KEYRING_PASSWORD: keyringPassword,
				},
				output,
			});

			const body = JSON.parse(output.stdout.toString());

			expect(exitCode).toBe(0);
			expect(body).toEqual({
				authenticated: true,
				credentialSource: { kind: "environment" },
			});
			expect(readSecret).not.toHaveBeenCalled();
			expect(output.stderr.toString()).toBe("");
			for (const secret of [clientId, clientSecret, keyringPassword]) {
				expect(output.stdout.toString()).not.toContain(secret);
				expect(output.stderr.toString()).not.toContain(secret);
			}
			expect(
				await CREDENTIAL_STORE.read(
					join(configHome, "credentials.enc"),
					keyringPassword,
				),
			).toMatchObject({
				clientId,
				clientSecret,
			});
		} finally {
			process.chdir(previousCwd);
			await rm(configHome, { force: true, recursive: true });
			await rm(home, { force: true, recursive: true });
			await rm(cwd, { force: true, recursive: true });
		}
	});

	it("auth login은 config-home dotenv source에서 prompt 없이 dotenv credentialSource를 반환한다", async () => {
		const output = createOutput();
		const configHome = await mkdtemp(
			join(tmpdir(), "toss-invest-cli-auth-dotenv-home-"),
		);
		const home = await mkdtemp(join(tmpdir(), "toss-invest-cli-auth-dotenv-user-home-"));
		const cwd = await mkdtemp(join(tmpdir(), "toss-invest-cli-auth-dotenv-cwd-"));
		const previousCwd = process.cwd();
		const clientId = randomUUID();
		const clientSecret = randomUUID();
		const keyringPassword = randomUUID();
		const readSecret = jest.fn(
			async (_prompt: string): Promise<string> => randomUUID(),
		) as jest.MockedFunction<(prompt: string) => Promise<string>>;

		try {
			await writeFile(
				join(configHome, ".env"),
				`TOSS_INVEST_API_KEY=${clientId}\nTOSS_INVEST_SECRET_KEY=${clientSecret}\nTOSS_INVEST_CLI_KEYRING_PASSWORD=${keyringPassword}\n`,
				"utf8",
			);
			process.chdir(cwd);
			const exitCode = await runAuthLoginWithInjectedSecrets(readSecret, {
				env: {
					HOME: home,
					TOSS_INVEST_CLI_HOME: configHome,
				},
				output,
			});

			const body = JSON.parse(output.stdout.toString());

			expect(exitCode).toBe(0);
			expect(body).toEqual({
				authenticated: true,
				credentialSource: {
					kind: "dotenv",
					path: join(configHome, ".env"),
				},
			});
			expect(readSecret).not.toHaveBeenCalled();
			expect(output.stderr.toString()).toBe("");
			for (const secret of [clientId, clientSecret, keyringPassword]) {
				expect(output.stdout.toString()).not.toContain(secret);
				expect(output.stderr.toString()).not.toContain(secret);
			}
			expect(
				await CREDENTIAL_STORE.read(
					join(configHome, "credentials.enc"),
					keyringPassword,
				),
			).toMatchObject({
				clientId,
				clientSecret,
			});
		} finally {
			process.chdir(previousCwd);
			await rm(configHome, { force: true, recursive: true });
			await rm(home, { force: true, recursive: true });
			await rm(cwd, { force: true, recursive: true });
		}
	});

	it("auth login은 분리된 dotenv source 환경에서 prompt-only credentialSource를 반환한다", async () => {
		const output = createOutput();
		const configHome = await mkdtemp(
			join(tmpdir(), "toss-invest-cli-auth-fallback-home-"),
		);
		const home = await mkdtemp(join(tmpdir(), "toss-invest-cli-auth-home-"));
		const cwd = await mkdtemp(join(tmpdir(), "toss-invest-cli-auth-cwd-"));
		const previousCwd = process.cwd();
		const prompts: string[] = [];
		const clientId = randomUUID();
		const clientSecret = randomUUID();
		const keyringPassword = randomUUID();
		const readSecret = jest.fn(async (prompt: string) => {
			prompts.push(prompt);
			switch (prompts.length) {
				case 1:
					return clientId;
				case 2:
					return clientSecret;
				default:
					return keyringPassword;
			}
		});

		await writeFile(
			join(configHome, ".env"),
			`TOSS_INVEST_API_KEY=${randomUUID()}\n`,
			"utf8",
		);
		await writeFile(
			join(home, ".env"),
			`TOSS_INVEST_SECRET_KEY=${randomUUID()}\n`,
			"utf8",
		);
		try {
			process.chdir(cwd);
			const exitCode = await runAuthLoginWithInjectedSecrets(readSecret, {
				env: {
					HOME: home,
					TOSS_INVEST_CLI_HOME: configHome,
				},
				output,
			});

			const body = JSON.parse(output.stdout.toString());

			expect(exitCode).toBe(0);
			expect(body).toEqual({
				authenticated: true,
				credentialSource: { kind: "prompt" },
			});
			expect(prompts).toEqual([
				"Toss API key: ",
				"Toss API secret: ",
				"Credential store password: ",
			]);
			expect(output.stderr.toString()).toBe("");
			for (const secret of [clientId, clientSecret, keyringPassword]) {
				expect(output.stdout.toString()).not.toContain(secret);
				expect(output.stderr.toString()).not.toContain(secret);
			}
			expect(
				await CREDENTIAL_STORE.read(
					join(configHome, "credentials.enc"),
					keyringPassword,
				),
			).toMatchObject({
				clientId,
				clientSecret,
			});
		} finally {
			process.chdir(previousCwd);
			await rm(configHome, { force: true, recursive: true });
			await rm(home, { force: true, recursive: true });
			await rm(cwd, { force: true, recursive: true });
		}
	});
});
