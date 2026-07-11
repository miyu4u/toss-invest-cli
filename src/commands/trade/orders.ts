import type { Command } from "commander";
import z from "zod";
import { SERVICE } from "../../service-registry";
import { OrderIdentityParamsSchema } from "../../schema/api/params";
import {
	OrderCreateRequestSchema,
	OrderModifyRequestSchema,
} from "../../schema/api/requests";
import {
	OrderSideSchema,
	OrderTypeSchema,
	TIME_IN_FORCE_ITEMS,
	ORDER_SIDE_ITEMS,
	ORDER_TYPE_ITEMS,
	TimeInForceSchema,
} from "../../schema/enum";
import { CLI_COMMAND_OPTIONS } from "../options";
import { COMMAND_RUNTIME_SUPPORT, type CommandRuntimeOptions } from "../shared";
import {
	resolveCreateClientOrderId,
	TRADE_COMMAND_EXECUTOR,
} from "./shared";

const OrderCreateOptionsSchema = z.object({
	account: z.string().optional(),
	clientOrderId: z.string().optional(),
	confirm: z.string().optional(),
	confirmHighValueOrder: z.boolean().optional(),
	live: z.boolean().optional(),
	orderAmount: z.string().optional(),
	orderType: OrderTypeSchema,
	price: z.string().optional(),
	quantity: z.string().optional(),
	side: OrderSideSchema,
	symbol: z.string(),
	timeInForce: TimeInForceSchema.optional(),
});

const OrderModifyOptionsSchema = z.object({
	account: z.string().optional(),
	confirm: z.string().optional(),
	confirmHighValueOrder: z.boolean().optional(),
	live: z.boolean().optional(),
	orderId: z.string(),
	orderType: OrderTypeSchema,
	price: z.string().optional(),
	quantity: z.string().optional(),
});

const OrderCancelOptionsSchema = z.object({
	account: z.string().optional(),
	confirm: z.string().optional(),
	live: z.boolean().optional(),
	orderId: z.string(),
});

export class OrderTradeCommands {
	register(program: Command, runtime: CommandRuntimeOptions): void {
		const orders = program.commands.find(
			(command) => command.name() === "orders",
		);
		if (!orders) {
			throw new Error(
				"orders command must be registered before trade commands",
			);
		}

		CLI_COMMAND_OPTIONS.addTradeSafetyOptions(
			CLI_COMMAND_OPTIONS.addAccountOption(
				orders
					.command("create")
					.description("거래: create an order; dry-run by default")
					.requiredOption("--symbol <symbol>", "stock symbol")
					.requiredOption(
						"--side <side>",
						`side: ${ORDER_SIDE_ITEMS.join(", ")}`,
					)
					.requiredOption(
						"--order-type <orderType>",
						`order type: ${ORDER_TYPE_ITEMS.join(", ")}`,
					)
					.option("--quantity <quantity>", "order quantity")
					.option("--order-amount <amount>", "market order amount")
					.option("--price <price>", "limit price")
					.option(
						"--time-in-force <timeInForce>",
						`time in force: ${TIME_IN_FORCE_ITEMS.join(", ")}`,
					)
					.option(
						"--client-order-id <clientOrderId>",
						"idempotency key for live order creation",
					)
					.option("--confirm-high-value-order", "confirm high value order"),
			),
		).action(
			COMMAND_RUNTIME_SUPPORT.makeAction(
				OrderCreateOptionsSchema,
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
					const request = OrderCreateRequestSchema.parse({
						clientOrderId,
						...(params.confirmHighValueOrder === true
							? { confirmHighValueOrder: true }
							: {}),
						orderAmount: params.orderAmount,
						orderType: params.orderType,
						price: params.price,
						quantity: params.quantity,
						side: params.side,
						symbol: params.symbol,
						timeInForce: params.timeInForce,
					});
					return TRADE_COMMAND_EXECUTOR.execute(
						{
							account,
							action: "orders.create",
							confirm: params.confirm,
							critical: {
								account,
								clientOrderId,
								confirmHighValueOrder: params.confirmHighValueOrder,
								orderAmount: params.orderAmount,
								orderType: params.orderType,
								price: params.price,
								quantity: params.quantity,
								side: params.side,
								symbol: params.symbol,
								timeInForce: params.timeInForce,
							},
							live: params.live,
							requireClientOrderId: true,
							request,
						},
						context.config,
						() => SERVICE.tradeCommandService.createOrder({ account }, request),
					);
				},
			),
		);

		CLI_COMMAND_OPTIONS.addTradeSafetyOptions(
			CLI_COMMAND_OPTIONS.addAccountOption(
				orders
					.command("modify")
					.description("거래: modify an order; dry-run by default")
					.requiredOption("--order-id <orderId>", "order id")
					.requiredOption(
						"--order-type <orderType>",
						`order type: ${ORDER_TYPE_ITEMS.join(", ")}`,
					)
					.option("--quantity <quantity>", "new quantity")
					.option("--price <price>", "new price")
					.option("--confirm-high-value-order", "confirm high value order"),
			),
		).action(
			COMMAND_RUNTIME_SUPPORT.makeAction(
				OrderModifyOptionsSchema,
				runtime,
				async (params, context) => {
					const account = await COMMAND_RUNTIME_SUPPORT.accountFrom(
						params,
						context,
						() => SERVICE.tossInvestAPIService.getAccounts(),
					);
					const request = OrderModifyRequestSchema.parse({
						...(params.confirmHighValueOrder === true
							? { confirmHighValueOrder: true }
							: {}),
						orderType: params.orderType,
						price: params.price,
						quantity: params.quantity,
					});
					const order = OrderIdentityParamsSchema.parse({
						account,
						orderId: params.orderId,
					});
					return TRADE_COMMAND_EXECUTOR.execute(
						{
							account,
							action: "orders.modify",
							confirm: params.confirm,
							critical: {
								account,
								orderId: params.orderId,
								confirmHighValueOrder: params.confirmHighValueOrder,
								orderType: params.orderType,
								price: params.price,
								quantity: params.quantity,
							},
							live: params.live,
							request,
						},
						context.config,
						() =>
							SERVICE.tradeCommandService.modifyOrder(
								order,
								request,
							),
					);
				},
			),
		);

		CLI_COMMAND_OPTIONS.addTradeSafetyOptions(
			CLI_COMMAND_OPTIONS.addAccountOption(
				orders
					.command("cancel")
					.description("거래: cancel an order; dry-run by default")
					.requiredOption("--order-id <orderId>", "order id"),
			),
		).action(
			COMMAND_RUNTIME_SUPPORT.makeAction(
				OrderCancelOptionsSchema,
				runtime,
				async (params, context) => {
					const account = await COMMAND_RUNTIME_SUPPORT.accountFrom(
						params,
						context,
						() => SERVICE.tossInvestAPIService.getAccounts(),
					);
					const order = OrderIdentityParamsSchema.parse({
						account,
						orderId: params.orderId,
					});
					return TRADE_COMMAND_EXECUTOR.execute(
						{
							account,
							action: "orders.cancel",
							confirm: params.confirm,
							critical: { account, orderId: params.orderId },
							live: params.live,
							request: { orderId: params.orderId },
						},
						context.config,
						() =>
							SERVICE.tradeCommandService.cancelOrder({
								...order,
							}),
					);
				},
			),
		);
	}
}
