import type { Command } from "commander";

import { GetHoldingsParamsSchema } from "../../schema/api/params";
import { CLI_COMMAND_OPTIONS } from "../options";
import { COMMAND_RUNTIME_SUPPORT, type CommandRuntimeOptions } from "../shared";
import type { IQueryCommand } from "./interface";
import { SERVICE } from "../../service-registry";

export class AccountCommands implements IQueryCommand {
	register(program: Command, runtime: CommandRuntimeOptions): void {
		const account = program
			.command("account")
			.description("조회: account and asset information");

		account
			.command("list")
			.description("조회: available accounts")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					GetHoldingsParamsSchema.pick({}).partial(),
					runtime,
					(_params, context) =>
						COMMAND_RUNTIME_SUPPORT.runQuery(
							() => SERVICE.queryCommandService.accounts(),
							context.config,
						),
				),
			);

		CLI_COMMAND_OPTIONS.addAccountOption(
			account
				.command("holdings")
				.description("조회: holdings for an account")
				.option("--symbol <symbol>", "optional stock symbol"),
		).action(
			COMMAND_RUNTIME_SUPPORT.makeAction(
				GetHoldingsParamsSchema.partial({ account: true }),
				runtime,
				(params, context) =>
					COMMAND_RUNTIME_SUPPORT.runQuery(async () => {
						const account = await COMMAND_RUNTIME_SUPPORT.accountFrom(
							params,
							context,
							() => SERVICE.tossInvestAPIService.getAccounts(),
						);
						return SERVICE.queryCommandService.holdings({
							...params,
							account,
						});
					}, context.config),
			),
		);
	}
}
