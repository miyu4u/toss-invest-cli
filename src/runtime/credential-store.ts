import {
	createCipheriv,
	createDecipheriv,
	randomBytes,
	scrypt,
} from "node:crypto";
import {
	chmod,
	mkdir,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import z from "zod";

import { CliException } from "../exceptions";

const CREDENTIAL_STORE_VERSION = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

const OAuthTokenSchema = z.object({
	accessToken: z.string().trim().min(1),
	expiresAt: z.string().datetime(),
});

export const CredentialStoreDataSchema = z
	.object({
		clientId: z.string().trim().min(1).optional(),
		clientSecret: z.string().trim().min(1).optional(),
		oauthToken: OAuthTokenSchema.optional(),
	})
	.refine(
		(value) => Boolean(value.clientId) === Boolean(value.clientSecret),
		"Stored API credentials must include both client ID and secret.",
	);
export type CredentialStoreData = z.infer<typeof CredentialStoreDataSchema>;

const CredentialEnvelopeSchema = z.object({
	ciphertext: z.string().min(1),
	iv: z.string().min(1),
	salt: z.string().min(1),
	tag: z.string().min(1),
	version: z.literal(CREDENTIAL_STORE_VERSION),
});

type CredentialEnvelope = z.infer<typeof CredentialEnvelopeSchema>;

export class CredentialStore {
	async exists(path: string): Promise<boolean> {
		try {
			await readFile(path);
			return true;
		} catch (error) {
			if (isMissingFileError(error)) {
				return false;
			}
			throw this.invalidStoreError();
		}
	}

	async read(
		path: string,
		password: string,
	): Promise<CredentialStoreData | undefined> {
		let serialized: string;
		try {
			serialized = await readFile(path, "utf8");
		} catch (error) {
			if (isMissingFileError(error)) {
				return undefined;
			}
			throw this.invalidStoreError();
		}

		try {
			const envelope = CredentialEnvelopeSchema.parse(JSON.parse(serialized));
			const key = await this.deriveKey(
				password,
				Buffer.from(envelope.salt, "base64"),
			);
			const decipher = createDecipheriv(
				"aes-256-gcm",
				key,
				Buffer.from(envelope.iv, "base64"),
			);
			decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
			const plaintext = Buffer.concat([
				decipher.update(Buffer.from(envelope.ciphertext, "base64")),
				decipher.final(),
			]).toString("utf8");
			return CredentialStoreDataSchema.parse(JSON.parse(plaintext));
		} catch {
			throw this.invalidStoreError();
		}
	}

	async write(
		path: string,
		password: string,
		data: CredentialStoreData,
	): Promise<void> {
		try {
			const plaintext = JSON.stringify(CredentialStoreDataSchema.parse(data));
			const salt = randomBytes(SALT_LENGTH);
			const iv = randomBytes(IV_LENGTH);
			const key = await this.deriveKey(password, salt);
			const cipher = createCipheriv("aes-256-gcm", key, iv);
			const ciphertext = Buffer.concat([
				cipher.update(plaintext, "utf8"),
				cipher.final(),
			]);
			const envelope: CredentialEnvelope = {
				ciphertext: ciphertext.toString("base64"),
				iv: iv.toString("base64"),
				salt: salt.toString("base64"),
				tag: cipher.getAuthTag().toString("base64"),
				version: CREDENTIAL_STORE_VERSION,
			};
			await this.writeAtomically(path, `${JSON.stringify(envelope)}\n`);
		} catch (error) {
			if (error instanceof CliException) {
				throw error;
			}
			throw new CliException("Unable to save encrypted credential store.", {
				code: "credential_store_write_failed",
				exitCode: 2,
			});
		}
	}

	async remove(path: string): Promise<void> {
		await rm(path, { force: true });
	}

	private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			scrypt(password, salt, KEY_LENGTH, (error, key) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(Buffer.from(key));
			});
		});
	}

	private async writeAtomically(path: string, contents: string): Promise<void> {
		const directory = dirname(path);
		const temporaryPath = join(
			directory,
			`.credentials-${process.pid}-${randomBytes(8).toString("hex")}.tmp`,
		);
		await mkdir(directory, { mode: 0o700, recursive: true });
		try {
			await writeFile(temporaryPath, contents, { mode: 0o600 });
			await chmod(temporaryPath, 0o600);
			await rename(temporaryPath, path);
			await chmod(path, 0o600);
		} finally {
			await rm(temporaryPath, { force: true });
		}
	}

	private invalidStoreError(): CliException {
		return new CliException("Unable to unlock encrypted credential store.", {
			code: "credential_store_invalid",
			exitCode: 2,
		});
	}
}

function isMissingFileError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "ENOENT"
	);
}

export const CREDENTIAL_STORE = new CredentialStore();
