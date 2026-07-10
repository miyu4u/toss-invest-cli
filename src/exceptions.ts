import z from "zod";

export class HttpException extends Error {
	constructor(message: string, options: Record<string, unknown>) {
		super(message);
		this.name = "HttpException";
		Object.assign(this, options);
	}
}

export class CliException extends Error {
	readonly code: string;
	readonly details?: unknown;
	readonly exitCode: number;

	constructor(
		message: string,
		options: { code?: string; details?: unknown; exitCode?: number } = {},
	) {
		super(message);
		this.name = "CliException";
		this.code = options.code ?? "CLI_ERROR";
		this.details = options.details;
		this.exitCode = options.exitCode ?? 1;
	}

	static normalize(error: unknown): CliException {
		if (error instanceof CliException) {
			return error;
		}

		if (error instanceof z.ZodError) {
			return new CliException("Invalid command options", {
				code: "VALIDATION_ERROR",
				details: z.treeifyError(error),
				exitCode: 2,
			});
		}

		if (error instanceof Error) {
			return new CliException(error.message, {
				code: error.name || "UNEXPECTED_ERROR",
				details: error,
			});
		}

		return new CliException("Unexpected error", {
			code: "UNEXPECTED_ERROR",
			details: error,
		});
	}
}
