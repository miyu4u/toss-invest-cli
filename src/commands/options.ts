import type { Command } from "commander";
import z from "zod";

export class CliCommandOptions {
	readonly optionalNumberSchema = z.preprocess((value) => {
		if (value === undefined || value === "") {
			return undefined;
		}
		return Number(value);
	}, z.number().finite().optional());

	readonly optionalBooleanSchema = z.preprocess((value) => {
		if (value === undefined || typeof value === "boolean") {
			return value;
		}
		return value === "true";
	}, z.boolean().optional());

	addAccountOption(command: Command): Command {
		return command.option(
			"-a, --account <account>",
			"Toss Invest accountNo or accountSeq; normalized to accountSeq",
		);
	}

	addJsonOption(command: Command): Command {
		return command.option("--json", "write parse-clean JSON to stdout");
	}

	addAuthOptions(command: Command): Command {
		return command.option(
			"--access-token <token>",
			"Toss Invest OAuth access token",
		);
	}

	addTradeSafetyOptions(command: Command): Command {
		return command
			.option("--live", "execute a live account mutation")
			.option("--confirm <summary>", "required confirmation summary for --live");
	}
}

export const CLI_COMMAND_OPTIONS = new CliCommandOptions();
