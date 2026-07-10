import { Command } from "commander";

import { CLI_COMMAND_OPTIONS } from "../commands/options";
import { AccountCommands } from "../commands/query/account";
import { AuthCommands } from "../commands/query/auth";
import { ConditionalOrdersReadCommands } from "../commands/query/conditional-orders-read";
import { HelloCommand } from "../commands/query/hello";
import type { IQueryCommand } from "../commands/query/interface";
import { MarketCommands } from "../commands/query/market";
import { MarketIndicatorCommands } from "../commands/query/market-indicators";
import { MarketInfoCommands } from "../commands/query/market-info";
import { OrderInfoCommands } from "../commands/query/order-info";
import { OrdersReadCommands } from "../commands/query/orders-read";
import { PortfolioCommands } from "../commands/query/portfolio";
import { RankingsCommands } from "../commands/query/rankings";
import { StockCommands } from "../commands/query/stock";
import { ConditionalOrderTradeCommands } from "../commands/trade/conditional-orders";
import { OrderTradeCommands } from "../commands/trade/orders";
import { WatchlistCommands } from "../commands/watchlist/watchlist";
import type { CliEnv } from "../schema/cli/config";
import { CliException } from "../exceptions";
import type { CliOutput } from "../schema/cli/output";
import { CLI_OUTPUT_WRITER } from "../runtime/output";

export interface CliBootstrapOptions {
	env?: CliEnv;
	output?: CliOutput;
}

export function createCliProgram(options: CliBootstrapOptions = {}): Command {
	const output = options.output ?? {
		stderr: process.stderr,
		stdout: process.stdout,
	};
	const program = new Command();
	const runtime = { env: options.env, output };

	program
		.name("toss-invest-cli")
		.description("Toss Invest OpenAPI CLI")
		.version("0.0.0+unknown")
		.exitOverride()
		.configureOutput({
			writeErr: (message) => output.stderr.write(message),
			writeOut: (message) => output.stdout.write(message),
		});
	CLI_COMMAND_OPTIONS.addJsonOption(
		CLI_COMMAND_OPTIONS.addAuthOptions(
			CLI_COMMAND_OPTIONS.addAccountOption(program),
		),
	);
	program.action(() => program.outputHelp());

	const independentQueryCommands: IQueryCommand[] = [
		new HelloCommand(),
		new AuthCommands(),
		new MarketCommands(),
		new StockCommands(),
		new MarketInfoCommands(),
		new AccountCommands(),
		new OrderInfoCommands(),
		new OrdersReadCommands(),
		new PortfolioCommands(),
	];
	for (const command of independentQueryCommands) {
		command.register(program, runtime);
	}

	new WatchlistCommands().register(program, runtime);

	const dependentQueryCommands: IQueryCommand[] = [
		new RankingsCommands(),
		new MarketIndicatorCommands(),
		new ConditionalOrdersReadCommands(),
	];
	for (const command of dependentQueryCommands) {
		command.register(program, runtime);
	}
	new OrderTradeCommands().register(program, runtime);
	new ConditionalOrderTradeCommands().register(program, runtime);

	return program;
}

export async function runCLI(
	argv: string[] = process.argv,
	options: CliBootstrapOptions = {},
): Promise<number> {
	const output = options.output ?? {
		stderr: process.stderr,
		stdout: process.stdout,
	};
	const program = createCliProgram({ ...options, output });
	const previousExitCode = process.exitCode;
	process.exitCode = undefined;

	try {
		await program.parseAsync(argv, { from: "node" });
		const exitCode =
			typeof process.exitCode === "number" ? process.exitCode : 0;
		process.exitCode = previousExitCode;
		return exitCode;
	} catch (error) {
		if (isCommanderDisplayExit(error)) {
			process.exitCode = previousExitCode;
			return 0;
		}

		const cliException = CliException.normalize(error);
		CLI_OUTPUT_WRITER.writeError(
			{
				json: argv.includes("--json"),
				output,
			},
			cliException,
		);
		process.exitCode = previousExitCode;
		return cliException.exitCode;
	}
}

function isCommanderDisplayExit(error: unknown): boolean {
	return (
		error instanceof Error &&
		"code" in error &&
		(error.code === "commander.helpDisplayed" ||
			error.code === "commander.version")
	);
}
