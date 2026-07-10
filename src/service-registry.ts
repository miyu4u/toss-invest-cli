import { TossInvestAPIService } from "./bridge/api.service";
import { HttpService, type IHttpService } from "./bridge/http.service";
import {
	QueryCommandService,
	type IQueryCommandService,
} from "./commands/query/query.service";
import {
	TradeCommandService,
	type ITradeCommandService,
} from "./commands/trade/trade.service";
import {
	WatchlistCommandService,
	type IWatchlistCommandService,
} from "./commands/watchlist/watchlist.service";
import { TOSS_INVEST_API_URL } from "./config";

export interface ServiceRegistry {
	httpService: IHttpService;
	queryCommandService: IQueryCommandService;
	tossInvestAPIService: TossInvestAPIService;
	tradeCommandService: ITradeCommandService;
	watchlistCommandService: IWatchlistCommandService;
}

export const SERVICE: ServiceRegistry = {
	httpService: new HttpService({ baseURL: TOSS_INVEST_API_URL }),
	queryCommandService: new QueryCommandService(),
	tossInvestAPIService: new TossInvestAPIService(),
	tradeCommandService: new TradeCommandService(),
	watchlistCommandService: new WatchlistCommandService(),
};
