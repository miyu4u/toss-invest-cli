import type { Command } from "commander";

import {
	ConditionalOrderIdentityParamsSchema,
	GetConditionalOrdersParamsSchema,
} from "../../schema/api/params";
import {
	ORDER_STATUS_FILTER_ITEMS,
} from "../../schema/enum";
import { CLI_COMMAND_OPTIONS } from "../options";
import { COMMAND_RUNTIME_SUPPORT, type CommandRuntimeOptions } from "../shared";
import type { IQueryCommand } from "./interface";
import { SERVICE } from "../../service-registry";

export class ConditionalOrdersReadCommands implements IQueryCommand {
	register(program: Command, runtime: CommandRuntimeOptions): void {
		const orders = program.commands.find(
			(command) => command.name() === "orders",
		);
		if (!orders) {
			throw new Error(
				"orders command must be registered before conditional commands",
			);
		}
		const conditionalOrders = ensureConditionalOrdersCommand(orders);

		CLI_COMMAND_OPTIONS.addAccountOption(
			conditionalOrders
				.command("list")
				.description("조회: conditional order history")
				.requiredOption(
					"--status <status>",
					`status: ${ORDER_STATUS_FILTER_ITEMS.join(", ")}`,
				)
				.option("--symbol <symbol>", "stock symbol")
				.option("--cursor <cursor>", "pagination cursor")
				.option("--limit <limit>", "page size"),
		).action(
			COMMAND_RUNTIME_SUPPORT.makeAction(
				GetConditionalOrdersParamsSchema.partial({ account: true }).extend({
					limit: CLI_COMMAND_OPTIONS.optionalNumberSchema,
				}),
				runtime,
				(params, context) =>
					COMMAND_RUNTIME_SUPPORT.runQuery(async () => {
						const account = await COMMAND_RUNTIME_SUPPORT.accountFrom(
							params,
							context,
							() => SERVICE.tossInvestAPIService.getAccounts(),
						);
						return SERVICE.queryCommandService.conditionalOrders({
							...params,
							account,
						});
					}, context.config),
			),
		);

		CLI_COMMAND_OPTIONS.addAccountOption(
			conditionalOrders
				.command("get")
				.description("조회: conditional order detail")
				.requiredOption(
					"--conditional-order-id <conditionalOrderId>",
					"conditional order id",
				),
		).action(
			COMMAND_RUNTIME_SUPPORT.makeAction(
				ConditionalOrderIdentityParamsSchema.partial({ account: true }),
				runtime,
				(params, context) =>
					COMMAND_RUNTIME_SUPPORT.runQuery(async () => {
						const account = await COMMAND_RUNTIME_SUPPORT.accountFrom(
							params,
							context,
							() => SERVICE.tossInvestAPIService.getAccounts(),
						);
						const id = ConditionalOrderIdentityParamsSchema.parse({
							...params,
							account,
						});
						return SERVICE.queryCommandService.conditionalOrder(id);
					}, context.config),
			),
		);
	}
}

function ensureConditionalOrdersCommand(orders: Command): Command {
	const existing = orders.commands.find(
		(command) => command.name() === "conditional",
	);
	if (existing) {
		return existing;
	}
	return orders
		.command("conditional")
		.description("조회/거래: conditional orders");
}
