import { randomUUID } from "node:crypto";

import { TRADE_SAFETY_POLICY } from "../../runtime/trade-safety";
import type { CliConfig } from "../../schema/cli/config";
import {
	TossInvestApiResponseSchema,
	type TossInvestAccountID,
} from "../../schema/helper-schema";
import { COMMAND_RUNTIME_SUPPORT } from "../shared";

export interface TradeExecutionInput<TRequest> {
	account: TossInvestAccountID;
	action: string;
	confirm?: string;
	critical: Record<string, string | number | boolean | undefined>;
	live?: boolean;
	requireClientOrderId?: boolean;
	request: TRequest;
}

export function resolveCreateClientOrderId(
	clientOrderId: string | undefined,
	live: boolean | undefined,
): string | undefined {
	return clientOrderId ?? (live ? undefined : randomUUID());
}

type DryRunTradeResult = {
	mode: "dry-run";
	result: {
		clientOrderId?: string;
		summary: string;
	};
};

type LiveTradeResult = {
	mode: "live";
	result: unknown;
};

export class TradeCommandExecutor {
	async execute<TRequest, TResult>(
		input: TradeExecutionInput<TRequest>,
		config: CliConfig,
		serviceCallback: () => Promise<TResult>,
	): Promise<DryRunTradeResult | LiveTradeResult> {
		const decision = TRADE_SAFETY_POLICY.evaluate({
			action: input.action,
			account: input.account,
			config,
			confirm: input.confirm,
			critical: input.critical,
			live: input.live,
			requireClientOrderId: input.requireClientOrderId,
		});

		if (decision.mode === "dry-run") {
			const clientOrderId =
				input.requireClientOrderId &&
				typeof input.critical.clientOrderId === "string"
					? input.critical.clientOrderId
					: undefined;

			const result: DryRunTradeResult = {
				mode: "dry-run",
				result: {
					...(clientOrderId === undefined ? {} : { clientOrderId }),
					summary: decision.summary,
				},
			};

			return result;
		}

		const response = await COMMAND_RUNTIME_SUPPORT.runQuery(
			() => serviceCallback(),
			config,
		);

		return {
			mode: "live",
			result: TossInvestApiResponseSchema().parse(response).result,
		};
	}
}

export const TRADE_COMMAND_EXECUTOR = new TradeCommandExecutor();