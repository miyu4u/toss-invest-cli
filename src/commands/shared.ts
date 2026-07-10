import type { Command } from "commander";
import type z from "zod";

import type { Account } from "../schema/api/responses";
import {
	TossInvestAccountIDSchema,
	type TossInvestApiResponse,
} from "../schema/helper-schema";
import { TOSS_INVEST_AUTH_RUNTIME } from "../runtime/auth";
import { CLI_CONFIG_RUNTIME } from "../runtime/config";
import type { CliConfig, CliEnv } from "../schema/cli/config";
import type { CliOutput } from "../schema/cli/output";
import { CliException, HttpException } from "../exceptions";
import { CLI_OUTPUT_WRITER } from "../runtime/output";

export interface CommandRuntimeOptions {
	env?: CliEnv;
	output: CliOutput;
}

export interface CommandContext {
	config: CliConfig;
	json: boolean;
	output: CliOutput;
}

export type CommandHandler<TParams> = (
	params: TParams,
	context: CommandContext,
) => Promise<unknown> | unknown;

export class CommandRuntimeSupport {
	makeAction<TParams>(
		schema: z.ZodType<TParams>,
		runtime: CommandRuntimeOptions,
		handler: CommandHandler<TParams>,
	): (options: unknown, command: Command) => Promise<void> {
		return async (options: unknown, command: Command) => {
			const globals = command.optsWithGlobals<{
				account?: string;
				accessToken?: string;
				json?: boolean;
			}>();
			const context: CommandContext = {
				config: CLI_CONFIG_RUNTIME.load(runtime.env, {
					accessToken: globals.accessToken,
					account: globals.account,
				}),
				json: Boolean(globals.json),
				output: runtime.output,
			};

			try {
				const params = schema.parse(options);
				const result = await handler(params, context);
				CLI_OUTPUT_WRITER.writeResult(context, result);
			} catch (error) {
				const cliException = CliException.normalize(error);
				CLI_OUTPUT_WRITER.writeError(context, cliException);
				process.exitCode = cliException.exitCode;
			}
		};
	}

	async runQuery<T>(callback: () => Promise<T>, config: CliConfig) {
		await TOSS_INVEST_AUTH_RUNTIME.prepareApi(config);
		try {
			return await callback();
		} catch (error) {
			if (!(await this.shouldRefreshAfterUnauthorized(error, config))) {
				throw error;
			}

			await TOSS_INVEST_AUTH_RUNTIME.refreshApi(config);
			return callback();
		}
	}

	async accountFrom(
		params: { account?: string | number },
		context: CommandContext,
		getAccounts: () => Promise<TossInvestApiResponse<Account[]>>,
	): Promise<z.infer<typeof TossInvestAccountIDSchema>> {
		const requestedAccount = CLI_CONFIG_RUNTIME.resolveAccount(
			params.account,
			context.config,
		);
		const accounts = await this.runQuery(getAccounts, context.config);
		const accountSeqMatches = accounts.result.filter(
			(candidate) => String(candidate.accountSeq) === requestedAccount,
		);
		const accountNoMatches = accounts.result.filter(
			(candidate) => candidate.accountNo === requestedAccount,
		);
		const matchedAccounts = [
			...new Map(
				[...accountSeqMatches, ...accountNoMatches].map((candidate) => [
					candidate.accountSeq,
					candidate,
				]),
			).values(),
		];
		const account =
			matchedAccounts.length === 1 ? matchedAccounts[0] : undefined;

		if (!account) {
			const isAmbiguous = matchedAccounts.length > 1;
			throw new CliException(
				isAmbiguous
					? `Account "${requestedAccount}" matched multiple accounts. Run "toss-invest-cli account list" and pass an unambiguous accountNo or accountSeq.`
					: `Account "${requestedAccount}" was not found. Run "toss-invest-cli account list" and pass its accountNo or accountSeq.`,
				{
					code: isAmbiguous ? "ACCOUNT_AMBIGUOUS" : "ACCOUNT_NOT_FOUND",
					details: { account: requestedAccount },
					exitCode: 2,
				},
			);
		}

		return TossInvestAccountIDSchema.parse(account.accountSeq);
	}

	private async shouldRefreshAfterUnauthorized(
		error: unknown,
		config: CliConfig,
	): Promise<boolean> {
		return (
			error instanceof HttpException &&
			"status" in error &&
			error.status === 401 &&
			(await TOSS_INVEST_AUTH_RUNTIME.canRefresh(config))
		);
	}
}

export const COMMAND_RUNTIME_SUPPORT = new CommandRuntimeSupport();
