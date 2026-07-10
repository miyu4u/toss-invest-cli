import type { CliOutput } from "../schema/cli/output";
import type { CliException } from "../exceptions";

export interface OutputContext {
	json: boolean;
	output: CliOutput;
}

export class CliOutputWriter {
	writeResult(context: OutputContext, value: unknown): void {
		const body = context.json
			? `${JSON.stringify(value)}\n`
			: `${JSON.stringify(value, null, 2)}\n`;
		context.output.stdout.write(body);
	}

	writeError(context: OutputContext, error: CliException): void {
		if (context.json) {
			context.output.stderr.write(
				`error_kind=${error.code} ${JSON.stringify({
					error: {
						code: error.code,
						details: this.redactedErrorDetails(error.details),
						message: error.message,
					},
				})}\n`,
			);
			return;
		}

		context.output.stderr.write(`error_kind=${error.code}: ${error.message}\n`);
	}

	redact(value: unknown): unknown {
		if (typeof value === "string") {
			return this.redactSecretString(value);
		}

		if (Array.isArray(value)) {
			return value.map((item) => this.redact(item));
		}

		if (value && typeof value === "object") {
			return Object.fromEntries(
				Object.entries(value).map(([key, entry]) => [
					key,
					this.isSensitiveKey(key) ? "[REDACTED]" : this.redact(entry),
				]),
			);
		}

		return value;
	}

	private redactedErrorDetails(details: unknown): unknown {
		if (details instanceof Error) {
			return { name: details.name };
		}
		return this.redact(details);
	}

	private redactSecretString(value: string): string {
		return value
			.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
			.replace(/(TOSS_INVEST_SECRET_KEY)=([^\s&]+)/gi, "$1=[REDACTED]");
	}

	private isSensitiveKey(key: string): boolean {
		return /token|secret|authorization|password/i.test(key);
	}
}

export const CLI_OUTPUT_WRITER = new CliOutputWriter();
