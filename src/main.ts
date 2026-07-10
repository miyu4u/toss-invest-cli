#!/usr/bin/env bun

import { runCLI } from "./cli/bootstrap";

async function bootstrap(): Promise<void> {
	const exitCode = await runCLI(process.argv);
	if (exitCode !== 0) {
		process.exit(exitCode);
	}
}

await bootstrap();
