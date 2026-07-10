import { SERVICE } from "../service-registry";
import { OAuth2TokenRequestSchema } from "../schema/api/auth";
import type { CliConfig } from "../schema/cli/config";
import { CliException } from "../exceptions";
import { CREDENTIAL_STORE, type CredentialStoreData } from "./credential-store";
import { readHiddenSecret } from "./secret-input";

interface UnlockedCredentialStore {
	data: CredentialStoreData;
	password: string;
}

type CredentialSourceFromLogin =
	| Exclude<CliConfig["clientCredentialsSource"], undefined>
	| {
			kind: "prompt";
	  };

type LoginResult = {
	readonly authenticated: true;
	readonly credentialSource: CredentialSourceFromLogin;
};

export class TossInvestAuthRuntime {
	async prepareApi(config: CliConfig): Promise<void> {
		SERVICE.tossInvestAPIService.clearRequestMetadata();

		const accessToken = await this.resolveAccessToken(config);
		SERVICE.tossInvestAPIService.setRequestMetadata({ accessToken });
	}

	async refreshApi(config: CliConfig): Promise<void> {
		SERVICE.tossInvestAPIService.clearRequestMetadata();

		const accessToken = await this.issueAndCacheAccessToken(config);
		SERVICE.tossInvestAPIService.setRequestMetadata({ accessToken });
	}

	async resolveAccessToken(config: CliConfig): Promise<string> {
		if (config.accessToken) {
			return config.accessToken;
		}

		const store = await this.readCredentialStore(config);
		const storedToken = store?.data.oauthToken;
		if (storedToken && this.isFresh(storedToken.expiresAt)) {
			return storedToken.accessToken;
		}

		if (config.environmentAccessToken) {
			return config.environmentAccessToken;
		}

		return this.issueAndCacheAccessToken(config, store);
	}

	async canRefresh(config: CliConfig): Promise<boolean> {
		if (config.accessToken) {
			return false;
		}
		const store = await this.readCredentialStore(config);
		return Boolean(
			(store?.data.clientId && store.data.clientSecret) ||
				(config.clientId && config.clientSecret),
		);
	}

	async loginWithPrompt(
		config: CliConfig,
		readSecret: (prompt: string) => Promise<string> = readHiddenSecret,
	): Promise<LoginResult> {
		const clientCredentialsSource = config.clientCredentialsSource;
		let credentialSource: CredentialSourceFromLogin = { kind: "prompt" };
		let clientId: string | undefined;
		let clientSecret: string | undefined;

		if (
			config.clientId &&
			config.clientSecret &&
			clientCredentialsSource &&
			(clientCredentialsSource.kind === "environment" ||
				clientCredentialsSource.kind === "dotenv")
		) {
			credentialSource = clientCredentialsSource;
			clientId = config.clientId;
			clientSecret = config.clientSecret;
		} else {
			clientId = await readSecret("Toss API key: ");
			clientSecret = await readSecret("Toss API secret: ");
		}

		const password = config.keyringPassword ?? (await readSecret("Credential store password: "));
		if (!clientId || !clientSecret || !password) {
			throw new CliException(
				"Interactive authentication requires non-empty credentials and password.",
				{ code: "invalid_auth_input", exitCode: 2 },
			);
		}

		await this.login(config, { clientId, clientSecret, password });
		return { authenticated: true, credentialSource };
	}

	async login(
		config: CliConfig,
		credentials: { clientId: string; clientSecret: string; password: string },
	): Promise<void> {
		await CREDENTIAL_STORE.write(config.credentialsPath, credentials.password, {
			clientId: credentials.clientId,
			clientSecret: credentials.clientSecret,
		});
		await CREDENTIAL_STORE.remove(config.authCachePath);
	}

	async logout(config: CliConfig): Promise<void> {
		await Promise.all([
			CREDENTIAL_STORE.remove(config.credentialsPath),
			CREDENTIAL_STORE.remove(config.authCachePath),
		]);
	}

	private async issueAndCacheAccessToken(
		config: CliConfig,
		unlockedStore?: UnlockedCredentialStore,
	): Promise<string> {
		const store = unlockedStore ?? (await this.readCredentialStore(config));
		const clientId = store?.data.clientId ?? config.clientId;
		const clientSecret = store?.data.clientSecret ?? config.clientSecret;
		if (!clientId || !clientSecret) {
			throw new CliException(
				"Authentication is required. Use auth login, pass --access-token, or set an access token or API credentials in the environment.",
				{ code: "missing_config", exitCode: 2 },
			);
		}

		const token = await SERVICE.tossInvestAPIService.issueOAuth2Token(
			OAuth2TokenRequestSchema.parse({
				client_id: clientId,
				client_secret: clientSecret,
			}),
		);
		if (store) {
			await CREDENTIAL_STORE.write(config.credentialsPath, store.password, {
				...store.data,
				oauthToken: {
					accessToken: token.access_token,
					expiresAt: new Date(
						Date.now() + token.expires_in * 1000,
					).toISOString(),
				},
			});
			await CREDENTIAL_STORE.remove(config.authCachePath);
		}
		return token.access_token;
	}

	private async readCredentialStore(
		config: CliConfig,
	): Promise<UnlockedCredentialStore | undefined> {
		const exists = await CREDENTIAL_STORE.exists(config.credentialsPath);
		if (!exists) {
			return undefined;
		}

		const password = config.keyringPassword ?? (await this.promptForPassword());
		if (!password) {
			return undefined;
		}
		const data = await CREDENTIAL_STORE.read(config.credentialsPath, password);
		return data ? { data, password } : undefined;
	}

	private async promptForPassword(): Promise<string | undefined> {
		if (!process.stdin.isTTY) {
			return undefined;
		}
		return readHiddenSecret("Credential store password: ");
	}

	private isFresh(expiresAt: string): boolean {
		const timestamp = Date.parse(expiresAt);
		return Number.isFinite(timestamp) && timestamp > Date.now();
	}
}

export const TOSS_INVEST_AUTH_RUNTIME = new TossInvestAuthRuntime();
