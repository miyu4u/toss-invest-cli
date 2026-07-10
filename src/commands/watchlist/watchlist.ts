import type { Command } from "commander";
import z from "zod";

import { SERVICE } from "../../service-registry";
import { COMMAND_RUNTIME_SUPPORT, type CommandRuntimeOptions } from "../shared";

const WatchlistAddOptionsSchema = z.object({
	symbols: z.string(),
});
const WatchlistRemoveOptionsSchema = z.object({
	symbol: z.string(),
});

export class WatchlistCommands {
	register(program: Command, runtime: CommandRuntimeOptions): void {
		const watchlist = program
			.command("watchlist")
			.description("local watchlist");

		watchlist
			.command("add")
			.description("add symbols to the local watchlist")
			.requiredOption("--symbols <symbols>", "comma-separated stock symbols")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					WatchlistAddOptionsSchema,
					runtime,
					(params, context) =>
						SERVICE.watchlistCommandService.add(context.config, params.symbols),
				),
			);

		watchlist
			.command("remove")
			.description("remove a symbol from the local watchlist")
			.requiredOption("--symbol <symbol>", "stock symbol")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					WatchlistRemoveOptionsSchema,
					runtime,
					(params, context) =>
						SERVICE.watchlistCommandService.remove(
							context.config,
							params.symbol,
						),
				),
			);

		watchlist
			.command("list")
			.description("list local watchlist symbols")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					z.object({}),
					runtime,
					(_params, context) =>
						SERVICE.watchlistCommandService.list(context.config),
				),
			);

		watchlist
			.command("prices")
			.description("조회: prices for local watchlist symbols")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					z.object({}),
					runtime,
					(_params, context) =>
						COMMAND_RUNTIME_SUPPORT.runQuery(
							() => SERVICE.watchlistCommandService.prices(context.config),
							context.config,
						),
				),
			);
	}
}
