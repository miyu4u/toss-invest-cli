import { CliException } from "../exceptions";

export async function readHiddenSecret(prompt: string): Promise<string> {
	if (!process.stdin.isTTY) {
		throw new CliException("Interactive authentication requires a TTY.", {
			code: "tty_required",
			exitCode: 2,
		});
	}

	return new Promise((resolve, reject) => {
		let value = "";
		const input = process.stdin;
		const cleanup = () => {
			input.off("data", onData);
			input.setRawMode?.(false);
			input.pause();
			process.stderr.write("\n");
		};
		const fail = (error: CliException) => {
			cleanup();
			reject(error);
		};
		const onData = (chunk: Buffer | string) => {
			for (const character of chunk.toString("utf8")) {
				if (character === "\u0003") {
					fail(
						new CliException("Interactive authentication cancelled.", {
							code: "auth_cancelled",
							exitCode: 2,
						}),
					);
					return;
				}
				if (character === "\r" || character === "\n") {
					cleanup();
					resolve(value.trim());
					return;
				}
				if (character === "\u007f" || character === "\b") {
					value = value.slice(0, -1);
					continue;
				}
				value += character;
			}
		};

		process.stderr.write(prompt);
		input.setRawMode?.(true);
		input.resume();
		input.on("data", onData);
	});
}
