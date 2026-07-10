import type { Command } from "commander";

import { CURRENCY_ITEMS } from "../../schema/enum";
import {
	GetBuyingPowerParamsSchema,
	GetSellableQuantityParamsSchema,
} from "../../schema/api/params";
import { CLI_COMMAND_OPTIONS } from "../options";
import { COMMAND_RUNTIME_SUPPORT, type CommandRuntimeOptions } from "../shared";
import type { IQueryCommand } from "./interface";
import { SERVICE } from "../../service-registry";

export class OrderInfoCommands implements IQueryCommand {
	register(program: Command, runtime: CommandRuntimeOptions): void {
		const orderInfo = program
			.command("order-info")
			.description("조회: account order helper information");

		CLI_COMMAND_OPTIONS.addAccountOption(
			orderInfo
				.command("buying-power")
				.description("조회: buying power by currency")
				.requiredOption(
					"--currency <currency>",
					`currency: ${CURRENCY_ITEMS.join(", ")}`,
				),
		).action(
			COMMAND_RUNTIME_SUPPORT.makeAction(
				GetBuyingPowerParamsSchema.partial({ account: true }),
				runtime,
				(params, context) =>
					COMMAND_RUNTIME_SUPPORT.runQuery(async () => {
						const account = await COMMAND_RUNTIME_SUPPORT.accountFrom(
							params,
							context,
							() => SERVICE.tossInvestAPIService.getAccounts(),
						);
						return SERVICE.queryCommandService.buyingPower({
							...params,
							account,
						});
					}, context.config),
			),
		);

		CLI_COMMAND_OPTIONS.addAccountOption(
			orderInfo
				.command("sellable-quantity")
				.description("조회: sellable quantity by symbol")
				.requiredOption("--symbol <symbol>", "stock symbol"),
		).action(
			COMMAND_RUNTIME_SUPPORT.makeAction(
				GetSellableQuantityParamsSchema.partial({ account: true }),
				runtime,
				(params, context) =>
					COMMAND_RUNTIME_SUPPORT.runQuery(async () => {
						const account = await COMMAND_RUNTIME_SUPPORT.accountFrom(
							params,
							context,
							() => SERVICE.tossInvestAPIService.getAccounts(),
						);
						return SERVICE.queryCommandService.sellableQuantity({
							...params,
							account,
						});
					}, context.config),
			),
		);

		CLI_COMMAND_OPTIONS.addAccountOption(
			orderInfo.command("commissions").description("조회: account commissions"),
		).action(
			COMMAND_RUNTIME_SUPPORT.makeAction(
				GetBuyingPowerParamsSchema.pick({}).partial(),
				runtime,
				(params, context) =>
					COMMAND_RUNTIME_SUPPORT.runQuery(async () => {
						const account = await COMMAND_RUNTIME_SUPPORT.accountFrom(
							params,
							context,
							() => SERVICE.tossInvestAPIService.getAccounts(),
						);
						return SERVICE.queryCommandService.commissions({
							account,
						});
					}, context.config),
			),
		);
	}
}
