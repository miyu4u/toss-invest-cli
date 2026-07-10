import type { Command } from "commander";

import { CURRENCY_ITEMS, MarketCountrySchema } from "../../schema/enum";
import {
	GetExchangeRateParamsSchema,
	GetMarketCalendarParamsSchema,
} from "../../schema/api/params";
import { COMMAND_RUNTIME_SUPPORT, type CommandRuntimeOptions } from "../shared";
import type { IQueryCommand } from "./interface";
import { SERVICE } from "../../service-registry";

const MarketCalendarOptionsSchema = GetMarketCalendarParamsSchema.extend({
	country: MarketCountrySchema,
});

export class MarketInfoCommands implements IQueryCommand {
	register(program: Command, runtime: CommandRuntimeOptions): void {
		const marketInfo = program
			.command("market-info")
			.description("조회: exchange rate and market calendars");

		marketInfo
			.command("exchange-rate")
			.description("조회: exchange rate")
			.requiredOption(
				"--base-currency <currency>",
				`base currency: ${CURRENCY_ITEMS.join(", ")}`,
			)
			.requiredOption(
				"--quote-currency <currency>",
				`quote currency: ${CURRENCY_ITEMS.join(", ")}`,
			)
			.option("--date-time <datetime>", "target datetime")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					GetExchangeRateParamsSchema,
					runtime,
					(params, context) =>
						COMMAND_RUNTIME_SUPPORT.runQuery(
							() => SERVICE.queryCommandService.exchangeRate(params),
							context.config,
						),
				),
			);

		marketInfo
			.command("calendar")
			.description("조회: market calendar")
			.requiredOption("--country <country>", "KR or US")
			.option("--date <date>", "target date")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					MarketCalendarOptionsSchema,
					runtime,
					(params, context) =>
						COMMAND_RUNTIME_SUPPORT.runQuery(
							() =>
								params.country === "KR"
									? SERVICE.queryCommandService.krMarketCalendar({
											date: params.date,
										})
									: SERVICE.queryCommandService.usMarketCalendar({
											date: params.date,
										}),
							context.config,
						),
				),
			);
	}
}
