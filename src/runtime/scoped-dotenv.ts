import { parse } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { CliEnv } from "../schema/cli/config";

export interface DotenvSource {
	readonly kind: "environment" | "dotenv";
	readonly path?: string;
}

export interface ScopedDotenvValue {
	readonly value?: string;
	readonly source?: DotenvSource;
}

interface DotenvScope {
	readonly source: DotenvSource;
	readonly values: Record<string, string | undefined>;
}

interface ScopedDotenvOptions {
	readonly cwd?: string;
	readonly home?: string;
}

export class ScopedDotenvRuntime {
	readonly configHome: string;
	private readonly environmentValues: Record<string, string | undefined>;
	private readonly dotenvScopes: readonly DotenvScope[];

	constructor(
		private readonly env: CliEnv,
		options: ScopedDotenvOptions = {},
	) {
		this.environmentValues = env;
		const home = this.resolveHome(options.home ?? this.env.HOME);
		this.configHome = this.resolveConfigHome(this.env, home);
		this.dotenvScopes = this.buildScopes(
			this.configHome,
			options.cwd ?? process.cwd(),
			home,
		);
	}

	resolve(keys: readonly string[]): ScopedDotenvValue {
		for (const key of keys) {
			const environmentValue = this.environmentValues[key];
			if (environmentValue !== undefined) {
				return { value: environmentValue, source: { kind: "environment" } };
			}
		}

		for (const scope of this.dotenvScopes) {
			for (const key of keys) {
				const value = scope.values[key];
				if (value !== undefined && value.trim() !== "") {
					return { value, source: scope.source };
				}
			}
		}
		return {};
	}

	private buildScopes(
		configHome: string,
		cwd: string,
		home: string,
	): DotenvScope[] {
		const scopes: DotenvScope[] = [];
		const candidates = this.deduplicatePaths([
			join(configHome, ".env"),
			join(cwd, ".env"),
			join(home, ".env"),
		]);

		for (const path of candidates) {
			if (!existsSync(path)) {
				continue;
			}
			scopes.push({
				source: { kind: "dotenv", path },
				values: parse(readFileSync(path, "utf8")),
			});
		}

		return scopes;
	}

	private resolveConfigHome(env: CliEnv, home: string): string {
		const explicitHome = env.TOSS_INVEST_CLI_HOME?.trim();
		if (explicitHome) {
			return explicitHome;
		}
		return join(home, ".config", "toss-invest-cli");
	}

	private resolveHome(home: string | undefined): string {
		const resolved = home?.trim();
		return resolved ? resolved : homedir();
	}

	private deduplicatePaths(paths: string[]): string[] {
		const seen = new Set<string>();
		return paths.filter((path) => {
			if (seen.has(path)) {
				return false;
			}
			seen.add(path);
			return true;
		});
	}
}
