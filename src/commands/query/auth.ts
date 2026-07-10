import type { Command } from "commander";
import z from "zod";

import { TOSS_INVEST_AUTH_RUNTIME } from "../../runtime/auth";
import { readHiddenSecret } from "../../runtime/secret-input";
import { COMMAND_RUNTIME_SUPPORT, type CommandRuntimeOptions } from "../shared";
import type { IQueryCommand } from "./interface";

export class AuthCommands implements IQueryCommand {
	constructor(
		private readonly readSecret: (
			prompt: string,
		) => Promise<string> = readHiddenSecret,
	) {}

	register(program: Command, runtime: CommandRuntimeOptions): void {
		const auth = program
			.command("auth")
			.description("local authentication commands");

		auth
			.command("login")
			.description(
				"store API credentials in the encrypted local credential store",
			)
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					z.object({}),
					runtime,
					async (_params, context) => {
						return TOSS_INVEST_AUTH_RUNTIME.loginWithPrompt(
							context.config,
							this.readSecret,
						);
					},
				),
			);

		auth
			.command("logout")
			.description("remove local encrypted authentication data")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					z.object({}),
					runtime,
					async (_params, context) => {
						await TOSS_INVEST_AUTH_RUNTIME.logout(context.config);
						return { loggedOut: true };
					},
				),
			);

		auth
			.command("token")
			.description("validate available authentication without printing a token")
			.action(
				COMMAND_RUNTIME_SUPPORT.makeAction(
					z.object({}),
					runtime,
					async (_params, context) => {
						await TOSS_INVEST_AUTH_RUNTIME.resolveAccessToken(context.config);
						return { authenticated: true, tokenType: "Bearer" };
					},
				),
			);
	}
}
