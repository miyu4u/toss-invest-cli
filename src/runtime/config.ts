import { join } from "node:path";

import {
	CliConfigSchema,
	type CliConfig,
	type CliEnv,
	type CliConfigSource,
} from "../schema/cli/config";
import { CliException } from "../exceptions";
import {
	ScopedDotenvRuntime,
	type DotenvSource,
	type ScopedDotenvValue,
} from "./scoped-dotenv";

export interface CliConfigOverrides {
	accessToken?: string;
	account?: string;
}

export class CliConfigRuntime {
	load(
		env: CliEnv = process.env,
		overrides: CliConfigOverrides = {},
	): CliConfig {
		const scopedDotenv = new ScopedDotenvRuntime(env);
		const configHome = scopedDotenv.configHome;
		const clientId = scopedDotenv.resolve(["TOSS_INVEST_API_KEY"]);
		const clientSecret = scopedDotenv.resolve(["TOSS_INVEST_SECRET_KEY"]);
		const credentials = this.resolveClientCredentialsSource(clientId, clientSecret);
		const keyringPassword = scopedDotenv.resolve(["TOSS_INVEST_CLI_KEYRING_PASSWORD"]);
		const accountAllowlist = scopedDotenv.resolve([
			"TOSS_INVEST_ACCOUNT_ALLOWLIST",
		]);
		const orderKillSwitch = scopedDotenv.resolve([
			"TOSS_INVEST_ORDER_KILL_SWITCH",
		]);
		const orderLiveApproved = scopedDotenv.resolve([
			"TOSS_INVEST_ORDER_LIVE_APPROVED",
		]);
		const accessToken = scopedDotenv.resolve(["TOSS_INVEST_ACCESS_TOKEN"]);
		const account = scopedDotenv.resolve(["TOSS_INVEST_ACCOUNT"]);

		const payload: {
			accessToken?: string;
			accountAllowlist: string[];
			authCachePath: string;
			clientId?: string;
			clientSecret?: string;
			configHome: string;
			credentialsPath: string;
			environmentAccessToken?: string;
			keyringPassword?: string;
			defaultAccount?: string;
			orderKillSwitch?: string;
			orderLiveApproved?: string;
			clientCredentialsSource?: CliConfigSource;
			keyringPasswordSource?: CliConfigSource;
		} = {
			accessToken: overrides.accessToken,
			accountAllowlist: this.splitEnvList(accountAllowlist.value),
			authCachePath: join(configHome, "auth-cache.json"),
			clientId: credentials.clientId,
			clientSecret: credentials.clientSecret,
			configHome,
			credentialsPath: join(configHome, "credentials.enc"),
			environmentAccessToken: accessToken.value,
			keyringPassword: keyringPassword.value,
			defaultAccount: overrides.account ?? account.value,
			orderKillSwitch: orderKillSwitch.value,
			orderLiveApproved: orderLiveApproved.value,
		};

		if (credentials.source !== undefined) {
			payload.clientCredentialsSource = credentials.source;
		}
		if (keyringPassword.source !== undefined) {
			payload.keyringPasswordSource = keyringPassword.source;
		}

		return CliConfigSchema.parse(payload);
	}

	resolveAccount(
		account: string | number | undefined,
		config: CliConfig,
	): string {
		const resolved = String(account ?? config.defaultAccount ?? "").trim();
		if (!resolved) {
			throw new CliException(
				"Account is required. Pass --account or set TOSS_INVEST_ACCOUNT.",
				{ code: "ACCOUNT_REQUIRED", exitCode: 2 },
			);
		}
		return resolved;
	}

	private resolveClientCredentialsSource(
		clientId: ScopedDotenvValue,
		clientSecret: ScopedDotenvValue,
	): { clientId: string | undefined; clientSecret: string | undefined; source: CliConfigSource | undefined } {
		if (!clientId.value || !clientSecret.value) {
			return { clientId: undefined, clientSecret: undefined, source: undefined };
		}
		if (!clientId.source || !clientSecret.source) {
			return { clientId: undefined, clientSecret: undefined, source: undefined };
		}
		if (!this.matchSource(clientId.source, clientSecret.source)) {
			return { clientId: undefined, clientSecret: undefined, source: undefined };
		}
		return {
			clientId: clientId.value,
			clientSecret: clientSecret.value,
			source: clientId.source,
		};
	}

	private matchSource(left: DotenvSource, right: DotenvSource): boolean {
		return left.kind === right.kind && left.path === right.path;
	}

	private splitEnvList(value?: string): string[] {
		return (value ?? "")
			.split(",")
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
	}
}

export const CLI_CONFIG_RUNTIME = new CliConfigRuntime();
