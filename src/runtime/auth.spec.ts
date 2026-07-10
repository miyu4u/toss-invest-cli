import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
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

import { CliException } from "../exceptions";
import { SERVICE } from "../service-registry";
import type { CliConfig } from "../schema/cli/config";
import { CREDENTIAL_STORE } from "./credential-store";
import { TOSS_INVEST_AUTH_RUNTIME } from "./auth";

let directory: string;
let authCachePath: string;
let credentialsPath: string;

function createConfig(overrides: Partial<CliConfig> = {}): CliConfig {
	return {
		accountAllowlist: [],
		authCachePath,
		configHome: directory,
		credentialsPath,
		...overrides,
	};
}

function createCredentials() {
	return {
		clientId: randomUUID(),
		clientSecret: randomUUID(),
	};
}

function createToken() {
	return randomUUID();
}

describe("TOSS_INVEST_AUTH_RUNTIME", () => {
	beforeEach(async () => {
		directory = await mkdtemp(join(tmpdir(), "toss-invest-cli-auth-runtime-"));
		authCachePath = join(directory, "auth-cache.json");
		credentialsPath = join(directory, "credentials.enc");
	});

	afterEach(async () => {
		jest.restoreAllMocks();
		await rm(directory, { force: true, recursive: true });
	});

	describe("resolveAccessToken(config)", () => {
		it("uses an explicit token before every other source", async () => {
			const token = createToken();
			const issueOAuth2Token = jest.spyOn(
				SERVICE.tossInvestAPIService,
				"issueOAuth2Token",
			);

			await expect(
				TOSS_INVEST_AUTH_RUNTIME.resolveAccessToken(
					createConfig({ accessToken: token }),
				),
			).resolves.toBe(token);
			expect(issueOAuth2Token).not.toHaveBeenCalled();
		});

		it("uses a fresh encrypted-store token before an environment token", async () => {
			const password = randomUUID();
			const storedToken = createToken();
			await CREDENTIAL_STORE.write(credentialsPath, password, {
				oauthToken: {
					accessToken: storedToken,
					expiresAt: new Date(Date.now() + 60_000).toISOString(),
				},
			});

			await expect(
				TOSS_INVEST_AUTH_RUNTIME.resolveAccessToken(
					createConfig({
						environmentAccessToken: createToken(),
						keyringPassword: password,
					}),
				),
			).resolves.toBe(storedToken);
		});

		it("uses an environment token when no encrypted store is available", async () => {
			const token = createToken();

			await expect(
				TOSS_INVEST_AUTH_RUNTIME.resolveAccessToken(
					createConfig({ environmentAccessToken: token }),
				),
			).resolves.toBe(token);
		});

		it("does not read a legacy plaintext cache", async () => {
			const token = createToken();
			await writeFile(
				authCachePath,
				JSON.stringify({ accessToken: createToken() }),
			);

			await expect(
				TOSS_INVEST_AUTH_RUNTIME.resolveAccessToken(
					createConfig({ environmentAccessToken: token }),
				),
			).resolves.toBe(token);
		});

		it("refreshes an expired stored token and removes the legacy cache after encryption", async () => {
			const password = randomUUID();
			const credentials = createCredentials();
			const issuedToken = createToken();
			await CREDENTIAL_STORE.write(credentialsPath, password, {
				...credentials,
				oauthToken: {
					accessToken: createToken(),
					expiresAt: new Date(Date.now() - 60_000).toISOString(),
				},
			});
			await writeFile(authCachePath, "legacy-sensitive-state");
			jest
				.spyOn(SERVICE.tossInvestAPIService, "issueOAuth2Token")
				.mockResolvedValue({
					access_token: issuedToken,
					expires_in: 120,
					token_type: "Bearer",
				});

			await expect(
				TOSS_INVEST_AUTH_RUNTIME.resolveAccessToken(
					createConfig({ keyringPassword: password }),
				),
			).resolves.toBe(issuedToken);
			expect(await CREDENTIAL_STORE.read(credentialsPath, password)).toEqual(
				expect.objectContaining({
					...credentials,
					oauthToken: expect.objectContaining({ accessToken: issuedToken }),
				}),
			);
			await expect(stat(authCachePath)).rejects.toMatchObject({
				code: "ENOENT",
			});
		});

		it("does not silently use environment fallback after an unlock failure", async () => {
			const password = randomUUID();
			await CREDENTIAL_STORE.write(
				credentialsPath,
				password,
				createCredentials(),
			);

			await expect(
				TOSS_INVEST_AUTH_RUNTIME.resolveAccessToken(
					createConfig({
						environmentAccessToken: createToken(),
						keyringPassword: randomUUID(),
					}),
				),
			).rejects.toMatchObject({
				code: "credential_store_invalid",
				exitCode: 2,
			});
		});

		it("reports missing configuration when no supported source exists", async () => {
			await expect(
				TOSS_INVEST_AUTH_RUNTIME.resolveAccessToken(createConfig()),
			).rejects.toMatchObject({ code: "missing_config", exitCode: 2 });
		});
	});

	describe("credential lifecycle", () => {
		it("login writes encrypted credentials then deletes the legacy cache", async () => {
			const password = randomUUID();
			const credentials = createCredentials();
			await writeFile(authCachePath, "legacy-sensitive-state");

			await TOSS_INVEST_AUTH_RUNTIME.login(createConfig(), {
				...credentials,
				password,
			});

			expect(await CREDENTIAL_STORE.read(credentialsPath, password)).toEqual(
				credentials,
			);
			await expect(stat(authCachePath)).rejects.toMatchObject({
				code: "ENOENT",
			});
		});

		it("logout is idempotent and removes both credential paths", async () => {
			await TOSS_INVEST_AUTH_RUNTIME.logout(createConfig());
			await expect(
				TOSS_INVEST_AUTH_RUNTIME.logout(createConfig()),
			).resolves.toBeUndefined();
		});
	});

	describe("prepareApi(config)", () => {
		it("sets the resolved token as request metadata", async () => {
			const token = createToken();
			const setRequestMetadata = jest.spyOn(
				SERVICE.tossInvestAPIService,
				"setRequestMetadata",
			);

			await TOSS_INVEST_AUTH_RUNTIME.prepareApi(
				createConfig({ accessToken: token }),
			);

			expect(setRequestMetadata).toHaveBeenCalledWith({ accessToken: token });
		});

		it("preserves an OAuth issue error", async () => {
			const credentials = createCredentials();
			jest
				.spyOn(SERVICE.tossInvestAPIService, "issueOAuth2Token")
				.mockRejectedValue(
					new CliException("upstream unavailable", {
						code: "upstream",
						exitCode: 3,
					}),
				);

			await expect(
				TOSS_INVEST_AUTH_RUNTIME.prepareApi(createConfig(credentials)),
			).rejects.toMatchObject({ code: "upstream", exitCode: 3 });
		});
	});
});
