import type { Command } from "commander";
import z from "zod";

import {
	ConditionalOrderCreateRequestSchema,
	ConditionalOrderModifyRequestSchema,
} from "../../schema/api/requests";
import { ConditionalOrderIdentityParamsSchema } from "../../schema/api/params";
import {
	CONDITIONAL_ORDER_TYPE_ITEMS,
	ORDER_SIDE_ITEMS,
	ORDER_TYPE_ITEMS,
	OrderSideSchema,
	OrderTypeSchema,
	ConditionalOrderTypeSchema,
} from "../../schema/enum";
import { CLI_COMMAND_OPTIONS } from "../options";
import { COMMAND_RUNTIME_SUPPORT, type CommandRuntimeOptions } from "../shared";
import {
	resolveCreateClientOrderId,
	TRADE_COMMAND_EXECUTOR,
} from "./shared";
import { SERVICE } from "../../service-registry";

const ConditionOptionSchema = z.object({
	orderPrice: z.string().optional(),
	orderSide: OrderSideSchema,
	triggerPrice: z.string(),
});

const ConditionalOrderCreateOptionsSchema = z.object({
	account: z.string().optional(),
	clientOrderId: z.string().optional(),
	confirm: z.string().optional(),
	confirmHighValueOrder: z.boolean().optional(),
	expireDate: z.string(),
	firstOrderPrice: z.string().optional(),
	firstOrderSide: OrderSideSchema,
	firstTriggerPrice: z.string(),
	live: z.boolean().optional(),
	orderType: OrderTypeSchema,
	quantity: z.string(),
	secondOrderPrice: z.string().optional(),
	secondOrderSide: OrderSideSchema.optional(),
	secondTriggerPrice: z.string().optional(),
	symbol: z.string(),
	type: ConditionalOrderTypeSchema,
});

const ConditionalOrderModifyOptionsSchema =
	ConditionalOrderCreateOptionsSchema.omit({
		clientOrderId: true,
		symbol: true,
	}).extend({
		conditionalOrderId: z.string(),
	});

const ConditionalOrderCancelOptionsSchema = z.object({
	account: z.string().optional(),
	confirm: z.string().optional(),
	conditionalOrderId: z.string(),
	live: z.boolean().optional(),
});

export class ConditionalOrderTradeCommands {
	register(program: Command, runtime: CommandRuntimeOptions): void {
		const orders = program.commands.find(
			(command) => command.name() === "orders",
		);
		if (!orders) {
			throw new Error(
				"orders command must be registered before trade commands",
			);
		}
		const conditionalOrders = ensureConditionalOrdersCommand(orders);

		CLI_COMMAND_OPTIONS.addTradeSafetyOptions(
			CLI_COMMAND_OPTIONS.addAccountOption(addCreateOptions(conditionalOrders)),
		).action(
			COMMAND_RUNTIME_SUPPORT.makeAction(
				ConditionalOrderCreateOptionsSchema,
				runtime,
				async (params, context) => {
					const account = await COMMAND_RUNTIME_SUPPORT.accountFrom(
						params,
						context,
						() => SERVICE.tossInvestAPIService.getAccounts(),
					);
					const clientOrderId = resolveCreateClientOrderId(
						params.clientOrderId,
						params.live,
					);
					const request = ConditionalOrderCreateRequestSchema.parse({
						clientOrderId,
						...(params.confirmHighValueOrder === true
							? { confirmHighValueOrder: true }
							: {}),
						expireDate: params.expireDate,
						first: firstCondition(params),
						orderType: params.orderType,
						quantity: params.quantity,
						second: secondCondition(params),
						symbol: params.symbol,
						type: params.type,
					});
					return TRADE_COMMAND_EXECUTOR.execute(
						{
							account,
							action: "conditional-orders.create",
							confirm: params.confirm,
							critical: {
								account,
								clientOrderId,
								confirmHighValueOrder: params.confirmHighValueOrder,
								expireDate: params.expireDate,
								firstOrderSide: params.firstOrderSide,
								firstTriggerPrice: params.firstTriggerPrice,
								orderType: params.orderType,
								quantity: params.quantity,
								symbol: params.symbol,
								type: params.type,
							},
							live: params.live,
							requireClientOrderId: true,
							request,
						},
						context.config,
						() =>
							SERVICE.tradeCommandService.createConditionalOrder(
								{ account },
								request,
							),
					);
				},
			),
		);

		CLI_COMMAND_OPTIONS.addTradeSafetyOptions(
			CLI_COMMAND_OPTIONS.addAccountOption(addModifyOptions(conditionalOrders)),
		).action(
			COMMAND_RUNTIME_SUPPORT.makeAction(
				ConditionalOrderModifyOptionsSchema,
				runtime,
				async (params, context) => {
					const account = await COMMAND_RUNTIME_SUPPORT.accountFrom(
						params,
						context,
						() => SERVICE.tossInvestAPIService.getAccounts(),
					);
					const request = ConditionalOrderModifyRequestSchema.parse({
						...(params.confirmHighValueOrder === true
							? { confirmHighValueOrder: true }
							: {}),
						expireDate: params.expireDate,
						first: firstCondition(params),
						orderType: params.orderType,
						quantity: params.quantity,
						second: secondCondition(params),
						type: params.type,
					});
					const order = ConditionalOrderIdentityParamsSchema.parse({
						account,
						conditionalOrderId: params.conditionalOrderId,
					});
					return TRADE_COMMAND_EXECUTOR.execute(
						{
							account,
							action: "conditional-orders.modify",
							confirm: params.confirm,
							critical: {
								account,
								conditionalOrderId: params.conditionalOrderId,
								confirmHighValueOrder: params.confirmHighValueOrder,
								expireDate: params.expireDate,
								firstOrderSide: params.firstOrderSide,
								firstTriggerPrice: params.firstTriggerPrice,
								orderType: params.orderType,
								quantity: params.quantity,
								type: params.type,
							},
							live: params.live,
							request,
						},
						context.config,
						() =>
							SERVICE.tradeCommandService.modifyConditionalOrder(
								order,
								request,
							),
					);
				},
			),
		);

		CLI_COMMAND_OPTIONS.addTradeSafetyOptions(
			CLI_COMMAND_OPTIONS.addAccountOption(
				conditionalOrders
					.command("cancel")
					.description("거래: cancel a conditional order; dry-run by default")
					.requiredOption(
						"--conditional-order-id <conditionalOrderId>",
						"conditional order id",
					),
			),
		).action(
			COMMAND_RUNTIME_SUPPORT.makeAction(
				ConditionalOrderCancelOptionsSchema,
				runtime,
				async (params, context) => {
					const account = await COMMAND_RUNTIME_SUPPORT.accountFrom(
						params,
						context,
						() => SERVICE.tossInvestAPIService.getAccounts(),
					);
					const order = ConditionalOrderIdentityParamsSchema.parse({
						account,
						conditionalOrderId: params.conditionalOrderId,
					});
					return TRADE_COMMAND_EXECUTOR.execute(
						{
							account,
							action: "conditional-orders.cancel",
							confirm: params.confirm,
							critical: {
								account,
								conditionalOrderId: params.conditionalOrderId,
							},
							live: params.live,
							request: { conditionalOrderId: params.conditionalOrderId },
						},
						context.config,
						() =>
							SERVICE.tradeCommandService.cancelConditionalOrder({
								...order,
							}),
					);
				},
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

function addCreateOptions(command: Command): Command {
	return addConditionalRequestOptions(
		command
			.command("create")
			.description("거래: create a conditional order; dry-run by default")
			.requiredOption("--symbol <symbol>", "stock symbol")
			.option(
				"--client-order-id <clientOrderId>",
				"idempotency key for live order creation",
			),
	);
}

function addModifyOptions(command: Command): Command {
	return addConditionalRequestOptions(
		command
			.command("modify")
			.description("거래: modify a conditional order; dry-run by default")
			.requiredOption(
				"--conditional-order-id <conditionalOrderId>",
				"conditional order id",
			),
	);
}

function addConditionalRequestOptions(command: Command): Command {
	return command
		.requiredOption(
			"--type <type>",
			`conditional type: ${CONDITIONAL_ORDER_TYPE_ITEMS.join(", ")}`,
		)
		.requiredOption("--quantity <quantity>", "order quantity")
		.requiredOption(
			"--order-type <orderType>",
			`order type: ${ORDER_TYPE_ITEMS.join(", ")}`,
		)
		.requiredOption("--expire-date <date>", "expire date")
		.requiredOption(
			"--first-order-side <side>",
			`first condition side: ${ORDER_SIDE_ITEMS.join(", ")}`,
		)
		.requiredOption("--first-trigger-price <price>", "first trigger price")
		.option("--first-order-price <price>", "first order price")
		.option(
			"--second-order-side <side>",
			`second condition side: ${ORDER_SIDE_ITEMS.join(", ")}`,
		)
		.option("--second-trigger-price <price>", "second trigger price")
		.option("--second-order-price <price>", "second order price")
		.option("--confirm-high-value-order", "confirm high value order");
}

function firstCondition(params: {
	firstOrderPrice?: string;
	firstOrderSide: z.infer<typeof OrderSideSchema>;
	firstTriggerPrice: string;
}): z.infer<typeof ConditionOptionSchema> {
	return ConditionOptionSchema.parse({
		orderPrice: params.firstOrderPrice,
		orderSide: params.firstOrderSide,
		triggerPrice: params.firstTriggerPrice,
	});
}

function secondCondition(params: {
	secondOrderPrice?: string;
	secondOrderSide?: z.infer<typeof OrderSideSchema>;
	secondTriggerPrice?: string;
}): z.infer<typeof ConditionOptionSchema> | undefined {
	if (
		!params.secondOrderSide &&
		!params.secondTriggerPrice &&
		!params.secondOrderPrice
	) {
		return undefined;
	}
	return ConditionOptionSchema.parse({
		orderPrice: params.secondOrderPrice,
		orderSide: params.secondOrderSide,
		triggerPrice: params.secondTriggerPrice,
	});
}
