import type { Command } from "commander";

import {
	GetMarketIndicatorCandlesParamsSchema,
	GetMarketIndicatorInvestorTradingParamsSchema,
	GetMarketIndicatorPricesParamsSchema,
} from "../../schema/api/params";
import {
	CANDLE_INTERVAL_ITEMS,
	INVESTOR_TRADING_INTERVAL_ITEMS,
	INVESTOR_TRADING_SYMBOL_ITEMS,
} from "../../schema/enum";
import { CLI_COMMAND_OPTIONS } from "../options";
import { COMMAND_RUNTIME_SUPPORT, type CommandRuntimeOptions } from "../shared";
import type { IQueryCommand } from "./interface";
import { SERVICE } from "../../service-registry";

export class MarketIndicatorCommands implements IQueryCommand {
	register(program: Command, runtime: CommandRuntimeOptions): void {
		const market = program.commands.find(
			(command) => command.name() === "market",
		);
		if (!market) {
			throw new Error(
				"market command must be registered before market indicator commands",
			);
		}
		const indicators = market
			.command("indicators")
			.description("조회: market indicator prices/candles/investor trading");

		indicators
			.command("prices")
			.description("조회: market indicator prices")
			.requiredOption(
				"--symbols <symbols>",
				"comma-separated indicator symbols",
			)
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					GetMarketIndicatorPricesParamsSchema,
					runtime,
					(params, context) =>
						COMMAND_RUNTIME_SUPPORT.runQuery(
							() => SERVICE.queryCommandService.marketIndicatorPrices(params),
							context.config,
						),
				),
			);

		indicators
			.command("candles")
			.description("조회: market indicator candles")
			.requiredOption("--symbol <symbol>", "indicator symbol")
			.requiredOption(
				"--interval <interval>",
				`interval: ${CANDLE_INTERVAL_ITEMS.join(", ")}`,
			)
			.option("--count <count>", "number of candles")
			.option("--before <datetime>", "exclusive upper bound datetime")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					GetMarketIndicatorCandlesParamsSchema.extend({
						count: CLI_COMMAND_OPTIONS.optionalNumberSchema,
					}),
					runtime,
					(params, context) =>
						COMMAND_RUNTIME_SUPPORT.runQuery(
							() => SERVICE.queryCommandService.marketIndicatorCandles(params),
							context.config,
						),
				),
			);

		indicators
			.command("investor-trading")
			.description("조회: investor trading flow")
			.requiredOption(
				"--symbol <symbol>",
				`symbol: ${INVESTOR_TRADING_SYMBOL_ITEMS.join(", ")}`,
			)
			.requiredOption(
				"--interval <interval>",
				`interval: ${INVESTOR_TRADING_INTERVAL_ITEMS.join(", ")}`,
			)
			.option("--count <count>", "number of rows")
			.option("--until <date>", "exclusive upper bound date")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					GetMarketIndicatorInvestorTradingParamsSchema.extend({
						count: CLI_COMMAND_OPTIONS.optionalNumberSchema,
					}),
					runtime,
					(params, context) =>
						COMMAND_RUNTIME_SUPPORT.runQuery(
							() =>
								SERVICE.queryCommandService.marketIndicatorInvestorTrading(
									params,
								),
							context.config,
						),
				),
			);
	}
}
