import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { SERVICE } from "../../service-registry";
import type { CliConfig } from "../../schema/cli/config";

export interface WatchlistState {
	symbols: string[];
}

export interface IWatchlistCommandService {
	/**
	 * 로컬 감시 목록 파일에 입력 종목을 추가해 상태를 갱신합니다.
	 * `config`는 저장 경로(`configHome`)를 결정하고, `symbols`는 쉼표 구분 문자열로 입력되며
	 * `normalizeSymbols`를 통해 공백 제거·대문자화·빈 항목 제거 후 기존 목록과 병합해
	 * 중복을 제거하고 정렬된 상태로 `watchlist.json`에 기록합니다.
	 * @param config CLI 환경 설정으로 파일 경로 결정을 위한 컨텍스트.
	 * @param symbols 추가할 종목 문자열(쉼표 구분, 대소문자/공백 변형 허용).
	 * @returns 갱신 후 로컬 watchlist 상태(Promise<WatchlistState>).
	 */
	add(config: CliConfig, symbols: string): Promise<WatchlistState>;

	/**
	 * 로컬 `watchlist.json`를 읽어 현재 감시 목록 상태를 반환합니다.
	 * 파일이 없을 때는 빈 목록을 반환하며(`ENOENT` 처리), 외부 API 호출 없이 로컬 상태 조회만 수행합니다.
	 * @param config CLI 환경 설정으로 파일 경로 결정을 위한 컨텍스트.
	 * @returns 로컬 watchlist 상태(Promise<WatchlistState>).
	 */
	list(config: CliConfig): Promise<WatchlistState>;

	/**
	 * 현재 로컬 감시 목록 상태를 기반으로 가격 조회 API를 호출합니다.
	 * 먼저 로컬 `watchlist.json`을 읽어 정규화된 심볼 배열을 구성하고, 이를
	 * `SERVICE.tossInvestAPIService.getPrices({ symbols: "..." })`에 위임해 외부 시세를 조회합니다.
	 * 본 메서드는 로컬 상태만 읽고, 원격 가격 조회의 실행은 API 게이트웨이에 위임합니다.
	 * HTTP 위임 구간에서 2xx가 아닌 응답은 `HttpException`이 발생해 상위로 전파됩니다.
	 * @param config CLI 환경 설정으로 파일 경로 결정을 위한 컨텍스트.
	 * @returns 가격 조회 API 호출 결과(Promise<unknown>).
	 */
	prices(config: CliConfig): Promise<unknown>;

	/**
	 * 로컬 감시 목록에서 지정한 종목을 제외한 새 상태를 저장소에 반영합니다.
	 * `symbol` 입력은 `normalizeSymbols`를 통해 정규화되며, 동등 비교 후 목록에서 제거 후
	 * `watchlist.json`을 다시 저장해 지속 상태를 갱신합니다.
	 * @param config CLI 환경 설정으로 파일 경로 결정을 위한 컨텍스트.
	 * @param symbol 제거할 종목 문자열(여러 값이 들어오면 쉼표 구분 정규화 적용).
	 * @returns 제거 반영 후의 로컬 watchlist 상태(Promise<WatchlistState>).
	 */
	remove(config: CliConfig, symbol: string): Promise<WatchlistState>;
}

export class WatchlistCommandService implements IWatchlistCommandService {
	async add(config: CliConfig, symbols: string): Promise<WatchlistState> {
		const state = await this.read(config);
		const merged = new Set([...state.symbols, ...normalizeSymbols(symbols)]);
		return this.write(config, { symbols: [...merged].sort() });
	}

	async list(config: CliConfig): Promise<WatchlistState> {
		return this.read(config);
	}

	async prices(config: CliConfig): Promise<unknown> {
		const state = await this.read(config);
		return SERVICE.tossInvestAPIService.getPrices({
			symbols: state.symbols.join(","),
		});
	}

	async remove(config: CliConfig, symbol: string): Promise<WatchlistState> {
		const removals = new Set(normalizeSymbols(symbol));
		const state = await this.read(config);
		return this.write(config, {
			symbols: state.symbols.filter((item) => !removals.has(item)),
		});
	}

	private async read(config: CliConfig): Promise<WatchlistState> {
		try {
			const state = JSON.parse(
				await readFile(this.path(config), "utf8"),
			) as WatchlistState;
			return { symbols: normalizeSymbols(state.symbols.join(",")) };
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return { symbols: [] };
			}
			throw error;
		}
	}

	private async write(
		config: CliConfig,
		state: WatchlistState,
	): Promise<WatchlistState> {
		await mkdir(config.configHome, { recursive: true });
		await writeFile(this.path(config), `${JSON.stringify(state, null, 2)}\n`);
		return state;
	}

	private path(config: CliConfig): string {
		return join(config.configHome, "watchlist.json");
	}
}

function normalizeSymbols(value: string): string[] {
	return value
		.split(",")
		.map((symbol) => symbol.trim().toUpperCase())
		.filter((symbol) => symbol.length > 0);
}
