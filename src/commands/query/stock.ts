import type { Command } from "commander";

import {
	GetStocksParamsSchema,
	GetStockWarningsParamsSchema,
} from "../../schema/api/params";
import { COMMAND_RUNTIME_SUPPORT, type CommandRuntimeOptions } from "../shared";
import type { IQueryCommand } from "./interface";
import { SERVICE } from "../../service-registry";

export class StockCommands implements IQueryCommand {
	register(program: Command, runtime: CommandRuntimeOptions): void {
		const stock = program.command("stock").description("조회: stock metadata");

		stock
			.command("info")
			.description("조회: stock metadata for comma-separated symbols")
			.requiredOption("--symbols <symbols>", "comma-separated stock symbols")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					GetStocksParamsSchema,
					runtime,
					(params, context) =>
						COMMAND_RUNTIME_SUPPORT.runQuery(
							() => SERVICE.queryCommandService.stocks(params),
							context.config,
						),
				),
			);

		stock
			.command("warnings")
			.description("조회: stock warning flags by symbol")
			.requiredOption("--symbol <symbol>", "stock symbol")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					GetStockWarningsParamsSchema,
					runtime,
					(params, context) =>
						COMMAND_RUNTIME_SUPPORT.runQuery(
							() => SERVICE.queryCommandService.stockWarnings(params),
							context.config,
						),
				),
			);
	}
}
