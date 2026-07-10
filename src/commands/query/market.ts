import type { Command } from "commander";

import {
	GetCandlesParamsSchema,
	GetOrderbookParamsSchema,
	GetPricesParamsSchema,
	GetTradesParamsSchema,
	GetPriceLimitParamsSchema,
} from "../../schema/api/params";
import { CANDLE_INTERVAL_ITEMS } from "../../schema/enum";
import { CLI_COMMAND_OPTIONS } from "../options";
import { COMMAND_RUNTIME_SUPPORT, type CommandRuntimeOptions } from "../shared";
import type { IQueryCommand } from "./interface";
import { SERVICE } from "../../service-registry";

export class MarketCommands implements IQueryCommand {
	register(program: Command, runtime: CommandRuntimeOptions): void {
		const market = program.command("market").description("조회: market data");

		market
			.command("orderbook")
			.description("조회: orderbook by symbol")
			.requiredOption("--symbol <symbol>", "stock symbol")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					GetOrderbookParamsSchema,
					runtime,
					(params, context) =>
						COMMAND_RUNTIME_SUPPORT.runQuery(
							() => SERVICE.queryCommandService.orderbook(params),
							context.config,
						),
				),
			);

		market
			.command("prices")
			.description("조회: prices for comma-separated symbols")
			.requiredOption("--symbols <symbols>", "comma-separated stock symbols")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					GetPricesParamsSchema,
					runtime,
					(params, context) =>
						COMMAND_RUNTIME_SUPPORT.runQuery(
							() => SERVICE.queryCommandService.prices(params),
							context.config,
						),
				),
			);

		market
			.command("trades")
			.description("조회: recent trades by symbol")
			.requiredOption("--symbol <symbol>", "stock symbol")
			.option("--count <count>", "number of trades")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					GetTradesParamsSchema.extend({
						count: CLI_COMMAND_OPTIONS.optionalNumberSchema,
					}),
					runtime,
					(params, context) =>
						COMMAND_RUNTIME_SUPPORT.runQuery(
							() => SERVICE.queryCommandService.trades(params),
							context.config,
						),
				),
			);

		market
			.command("price-limits")
			.description("조회: price limits by symbol")
			.requiredOption("--symbol <symbol>", "stock symbol")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					GetPriceLimitParamsSchema,
					runtime,
					(params, context) =>
						COMMAND_RUNTIME_SUPPORT.runQuery(
							() => SERVICE.queryCommandService.priceLimit(params),
							context.config,
						),
				),
			);

		market
			.command("candles")
			.description("조회: candle data by symbol")
			.requiredOption("--symbol <symbol>", "stock symbol")
			.requiredOption(
				"--interval <interval>",
				`interval: ${CANDLE_INTERVAL_ITEMS.join(", ")}`,
			)
			.option("--count <count>", "number of candles")
			.option("--before <datetime>", "exclusive upper bound datetime")
			.option("--adjusted <boolean>", "adjusted price flag")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					GetCandlesParamsSchema.extend({
						adjusted: CLI_COMMAND_OPTIONS.optionalBooleanSchema,
						count: CLI_COMMAND_OPTIONS.optionalNumberSchema,
					}),
					runtime,
					(params, context) =>
						COMMAND_RUNTIME_SUPPORT.runQuery(
							() => SERVICE.queryCommandService.candles(params),
							context.config,
						),
				),
			);
	}
}
