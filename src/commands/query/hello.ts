import type { Command } from "commander";

import { CLI_OUTPUT_WRITER } from "../../runtime/output";
import type { CommandRuntimeOptions } from "../shared";
import type { IQueryCommand } from "./interface";

export class HelloCommand implements IQueryCommand {
	register(program: Command, runtime: CommandRuntimeOptions): void {
		program
			.command("hello")
			.description("print a greeting")
			.argument("[name]", "name to greet")
			.action((name: string | undefined) => {
				CLI_OUTPUT_WRITER.writeResult(
					{
						json: Boolean(program.opts<{ json?: boolean }>().json),
						output: runtime.output,
					},
					{ message: `Hello, ${name ?? "toss-invest-cli"}!` },
				);
			});
	}
}
