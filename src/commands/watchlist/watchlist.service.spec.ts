import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from "@jest/globals";

import { SERVICE } from "../../service-registry";
import type { CliConfig } from "../../schema/cli/config";
import {
	WatchlistCommandService,
	type WatchlistState,
} from "./watchlist.service";

let configHome = "";
let service: WatchlistCommandService;

function createConfig(overrides: Partial<CliConfig> = {}): CliConfig {
	return {
		accountAllowlist: [],
		authCachePath: join(configHome, "auth-cache.json"),
		configHome,
		...overrides,
	} as CliConfig;
}

function stateFile(config: CliConfig): string {
	return join(config.configHome, "watchlist.json");
}

async function readStoredState(config: CliConfig): Promise<WatchlistState> {
	return JSON.parse(
		await readFile(stateFile(config), "utf8"),
	) as WatchlistState;
}

describe("WatchlistCommandService", () => {
	let config: CliConfig;

	beforeEach(async () => {
		configHome = await mkdtemp(join(tmpdir(), "toss-invest-cli-watchlist-"));
		service = new WatchlistCommandService();
		config = createConfig();
	});

	afterEach(async () => {
		jest.restoreAllMocks();
		await rm(configHome, { force: true, recursive: true });
	});

	describe("add(config, symbols)", () => {
		describe("성공 케이스", () => {
			it("정규화/중복 제거/정렬 후 영속 상태를 갱신한다", async () => {
				await writeFile(
					stateFile(config),
					`${JSON.stringify(
						{ symbols: [" 005930 ", "AAPL", " msft", "AAPL"] },
						null,
						2,
					)}\n`,
				);

				const added = await service.add(
					config,
					"msft,  005930, nvda, AAPL, nvda ",
				);

				expect(added).toEqual({
					symbols: ["005930", "AAPL", "MSFT", "NVDA"],
				});
				expect(await readStoredState(config)).toEqual({
					symbols: ["005930", "AAPL", "MSFT", "NVDA"],
				});
			});
		});
	});

	describe("list(config)", () => {
		describe("성공 케이스", () => {
			it("저장된 감시 목록을 정규화해 반환한다", async () => {
				await writeFile(
					stateFile(config),
					`${JSON.stringify({ symbols: [" 005930 ", "msft", "AAPL"] }, null, 2)}\n`,
				);

				const result = await service.list(config);
				expect(result.symbols).toEqual(
					expect.arrayContaining(["005930", "AAPL", "MSFT"]),
				);
				expect(result.symbols).toHaveLength(3);
			});
		});

		describe("실패 케이스", () => {
			it("감시 목록 파일이 없으면 빈 목록으로 폴백한다", async () => {
				expect(await service.list(config)).toEqual({ symbols: [] });
			});
		});
	});

	describe("remove(config, symbol)", () => {
		describe("성공 케이스", () => {
			it("제거 대상 입력을 정규화해 목록에서 제외하고 영속 상태를 갱신한다", async () => {
				await writeFile(
					stateFile(config),
					`${JSON.stringify({ symbols: ["005930", "AAPL", "MSFT"] }, null, 2)}\n`,
				);

				const afterRemove = await service.remove(config, "aapl, not-present");

				expect(afterRemove).toEqual({ symbols: ["005930", "MSFT"] });
				expect(await readStoredState(config)).toEqual({
					symbols: ["005930", "MSFT"],
				});
			});
		});
	});

	describe("prices(config)", () => {
		describe("성공 케이스", () => {
			it("정규화된 저장 상태를 symbols 쿼리로 API에 위임한다", async () => {
				const getPrices = jest
					.spyOn(SERVICE.tossInvestAPIService, "getPrices")
					.mockResolvedValue({ result: true });

				await writeFile(
					stateFile(config),
					`${JSON.stringify(
						{ symbols: ["005930", " AAPL", "msft"] },
						null,
						2,
					)}\n`,
				);

				const prices = await service.prices(config);

				expect(prices).toEqual({ result: true });
				expect(getPrices).toHaveBeenCalledTimes(1);
				expect(getPrices).toHaveBeenCalledWith({ symbols: "005930,AAPL,MSFT" });
			});
		});

		describe("실패 케이스", () => {
			it("가격 조회 API 오류를 그대로 전파한다", async () => {
				const transportError = new Error("price endpoint unavailable");
				const getPrices = jest
					.spyOn(SERVICE.tossInvestAPIService, "getPrices")
					.mockRejectedValue(transportError);

				await writeFile(
					stateFile(config),
					`${JSON.stringify({ symbols: ["005930", "AAPL"] }, null, 2)}\n`,
				);

				await expect(service.prices(config)).rejects.toThrow(
					"price endpoint unavailable",
				);
				expect(getPrices).toHaveBeenCalledTimes(1);
			});
		});
	});
});
