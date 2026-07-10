import type { Command } from "commander";

import { AccountScopedParamsSchema } from "../../schema/helper-schema";
import { SERVICE } from "../../service-registry";
import { CLI_COMMAND_OPTIONS } from "../options";
import { COMMAND_RUNTIME_SUPPORT, type CommandRuntimeOptions } from "../shared";
import type { IQueryCommand } from "./interface";

export class PortfolioCommands implements IQueryCommand {
	register(program: Command, runtime: CommandRuntimeOptions): void {
		const portfolio = program
			.command("portfolio")
			.description("조회: portfolio");

		CLI_COMMAND_OPTIONS.addAccountOption(
			portfolio.command("summary").description("조회: portfolio summary"),
		).action(
			COMMAND_RUNTIME_SUPPORT.makeAction(
				AccountScopedParamsSchema.partial({ account: true }),
				runtime,
				(params, context) =>
					COMMAND_RUNTIME_SUPPORT.runQuery(async () => {
						const account = await COMMAND_RUNTIME_SUPPORT.accountFrom(
							params,
							context,
							() => SERVICE.tossInvestAPIService.getAccounts(),
						);
						return SERVICE.queryCommandService.portfolioSummary({
							account,
						});
					}, context.config),
			),
		);
	}
}
