import type { TossInvestAccountID } from "../schema/helper-schema";
import { CliException } from "../exceptions";
import type { CliConfig } from "../schema/cli/config";

export type TradeMode = "dry-run" | "live";

export interface TradeSafetyInput {
	action: string;
	account: TossInvestAccountID;
	config: CliConfig;
	confirm?: string;
	critical: Record<string, string | number | boolean | undefined>;
	live?: boolean;
	requireClientOrderId?: boolean;
}

export interface TradeSafetyDecision {
	mode: TradeMode;
	summary: string;
}

export class TradeSafetyPolicy {
	evaluate(input: TradeSafetyInput): TradeSafetyDecision {
		const summary = this.buildConfirmationSummary(input.action, input.critical);

		if (!input.live) {
			return { mode: "dry-run", summary };
		}

		if (input.requireClientOrderId && !input.critical.clientOrderId) {
			throw new CliException(
				"Live order creation requires --client-order-id for idempotency.",
				{ code: "client_order_id_required", exitCode: 2 },
			);
		}

		this.assertLiveEnvironment(input);

		if (input.confirm !== summary) {
			throw new CliException(
				`Live trading blocked. Re-run with --live --confirm "${summary}".`,
				{
					code: "live_confirmation_required",
					details: { summary },
					exitCode: 2,
				},
			);
		}

		return { mode: "live", summary };
	}

	buildConfirmationSummary(
		action: string,
		critical: Record<string, string | number | boolean | undefined>,
	): string {
		const pairs = Object.entries(critical)
			.filter(([, value]) => value !== undefined && value !== "")
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, value]) => `${key}=${String(value)}`);

		return [`action=${action}`, ...pairs].join("|");
	}

	private assertLiveEnvironment(input: TradeSafetyInput): void {
		const missing: string[] = [];

		if (input.config.orderLiveApproved !== "yes") {
			missing.push("TOSS_INVEST_ORDER_LIVE_APPROVED=yes");
		}
		if (input.config.orderKillSwitch !== "open") {
			missing.push("TOSS_INVEST_ORDER_KILL_SWITCH=open");
		}
		if (!this.isAccountAllowed(input.account, input.config.accountAllowlist)) {
			missing.push("TOSS_INVEST_ACCOUNT_ALLOWLIST account match");
		}

		if (missing.length > 0) {
			throw new CliException("Live trading blocked by safety policy.", {
				code: "live_safety_policy_required",
				details: { missing },
				exitCode: 2,
			});
		}
	}

	private isAccountAllowed(
		account: TossInvestAccountID,
		allowlist: string[],
	): boolean {
		const accountValue = String(account);
		return allowlist.includes(accountValue) || allowlist.includes("*");
	}
}

export const TRADE_SAFETY_POLICY = new TradeSafetyPolicy();