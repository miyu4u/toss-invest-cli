import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import { CREDENTIAL_STORE, type CredentialStoreData } from "./credential-store";

let directory: string;
let credentialsPath: string;

function createData(): CredentialStoreData {
	return {
		clientId: randomUUID(),
		clientSecret: randomUUID(),
		oauthToken: {
			accessToken: randomUUID(),
			expiresAt: new Date(Date.now() + 60_000).toISOString(),
		},
	};
}

describe("CREDENTIAL_STORE", () => {
	beforeEach(async () => {
		directory = await mkdtemp(join(tmpdir(), "toss-invest-cli-credentials-"));
		credentialsPath = join(directory, "credentials.enc");
	});

	afterEach(async () => {
		await rm(directory, { force: true, recursive: true });
	});

	it("round-trips encrypted credentials with an owner-only file", async () => {
		const password = randomUUID();
		const data = createData();

		await CREDENTIAL_STORE.write(credentialsPath, password, data);

		expect(await CREDENTIAL_STORE.read(credentialsPath, password)).toEqual(
			data,
		);
		expect((await stat(credentialsPath)).mode & 0o777).toBe(0o600);
	});

	it("uses a fresh salt and IV and leaves plaintext values out of the envelope", async () => {
		const password = randomUUID();
		const data = createData();

		await CREDENTIAL_STORE.write(credentialsPath, password, data);
		const first = JSON.parse(await readFile(credentialsPath, "utf8"));
		await CREDENTIAL_STORE.write(credentialsPath, password, data);
		const second = JSON.parse(await readFile(credentialsPath, "utf8"));
		const contents = await readFile(credentialsPath, "utf8");

		expect(first.version).toBe(1);
		expect(first.salt).not.toBe(second.salt);
		expect(first.iv).not.toBe(second.iv);
		expect(contents).not.toContain(data.clientId ?? "");
		expect(contents).not.toContain(data.clientSecret ?? "");
		expect(contents).not.toContain(data.oauthToken?.accessToken ?? "");
	});

	it("rejects wrong passwords and authentication-tag tampering", async () => {
		const password = randomUUID();
		await CREDENTIAL_STORE.write(credentialsPath, password, createData());

		await expect(
			CREDENTIAL_STORE.read(credentialsPath, randomUUID()),
		).rejects.toMatchObject({ code: "credential_store_invalid", exitCode: 2 });

		const envelope = JSON.parse(await readFile(credentialsPath, "utf8"));
		const tag = Buffer.from(envelope.tag, "base64");
		tag[0] = (tag[0] ?? 0) ^ 1;
		envelope.tag = tag.toString("base64");
		await writeFile(credentialsPath, JSON.stringify(envelope));

		await expect(
			CREDENTIAL_STORE.read(credentialsPath, password),
		).rejects.toMatchObject({ code: "credential_store_invalid", exitCode: 2 });
	});
});
