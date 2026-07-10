import type { Command } from "commander";

import {
	OrderIdentityParamsSchema,
	GetOrdersParamsSchema,
} from "../../schema/api/params";
import {
	ORDER_STATUS_FILTER_ITEMS,
} from "../../schema/enum";
import { CLI_COMMAND_OPTIONS } from "../options";
import { COMMAND_RUNTIME_SUPPORT, type CommandRuntimeOptions } from "../shared";
import type { IQueryCommand } from "./interface";
import { SERVICE } from "../../service-registry";

export class OrdersReadCommands implements IQueryCommand {
	register(program: Command, runtime: CommandRuntimeOptions): void {
		const orders = program
			.command("orders")
			.description("조회/거래: regular orders");

		CLI_COMMAND_OPTIONS.addAccountOption(
			orders
				.command("history")
				.description("조회: order history")
				.requiredOption(
					"--status <status>",
					`status: ${ORDER_STATUS_FILTER_ITEMS.join(", ")}`,
				)
				.option("--symbol <symbol>", "stock symbol")
				.option("--from <date>", "start date")
				.option("--to <date>", "end date")
				.option("--cursor <cursor>", "pagination cursor")
				.option("--limit <limit>", "page size"),
		).action(
			COMMAND_RUNTIME_SUPPORT.makeAction(
				GetOrdersParamsSchema.partial({ account: true }).extend({
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
						return SERVICE.queryCommandService.orders({
							...params,
							account,
						});
					}, context.config),
			),
		);

		CLI_COMMAND_OPTIONS.addAccountOption(
			orders
				.command("detail")
				.description("조회: order detail")
				.requiredOption("--order-id <orderId>", "order id"),
		).action(
			COMMAND_RUNTIME_SUPPORT.makeAction(
				OrderIdentityParamsSchema.partial({ account: true }),
				runtime,
				(params, context) =>
					COMMAND_RUNTIME_SUPPORT.runQuery(async () => {
						const account = await COMMAND_RUNTIME_SUPPORT.accountFrom(
							params,
							context,
							() => SERVICE.tossInvestAPIService.getAccounts(),
						);
						const id = OrderIdentityParamsSchema.parse({
							...params,
							account,
						});
						return SERVICE.queryCommandService.order(id);
					}, context.config),
			),
		);
	}
}
