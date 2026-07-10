import type { Command } from "commander";

import {
	GetRankingsParamsSchema,
} from "../../schema/api/params";
import {
	MARKET_COUNTRY_ITEMS,
	RANKING_DURATION_ITEMS,
	RANKING_TYPE_ITEMS,
} from "../../schema/enum";
import { CLI_COMMAND_OPTIONS } from "../options";
import { COMMAND_RUNTIME_SUPPORT, type CommandRuntimeOptions } from "../shared";
import type { IQueryCommand } from "./interface";
import { SERVICE } from "../../service-registry";

export class RankingsCommands implements IQueryCommand {
	register(program: Command, runtime: CommandRuntimeOptions): void {
		const market = program.commands.find(
			(command) => command.name() === "market",
		);
		if (!market) {
			throw new Error(
				"market command must be registered before rankings commands",
			);
		}

		market
			.command("rankings")
			.description("조회: market rankings")
			.requiredOption(
				"--type <type>",
				`type: ${RANKING_TYPE_ITEMS.join(", ")}`,
			)
			.requiredOption(
				"--market-country <country>",
				`market country: ${MARKET_COUNTRY_ITEMS.join(", ")}`,
			)
			.requiredOption(
				"--duration <duration>",
				`duration: ${RANKING_DURATION_ITEMS.join(", ")}`,
			)
			.option(
				"--exclude-investment-caution <boolean>",
				"exclude investment caution flag",
			)
			.option("--count <count>", "number of rows")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					GetRankingsParamsSchema.extend({
						count: CLI_COMMAND_OPTIONS.optionalNumberSchema,
						excludeInvestmentCaution: CLI_COMMAND_OPTIONS.optionalBooleanSchema,
					}),
					runtime,
					(params, context) =>
						COMMAND_RUNTIME_SUPPORT.runQuery(
							() => SERVICE.queryCommandService.rankings(params),
							context.config,
						),
				),
			);
	}
}
