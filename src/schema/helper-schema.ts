import z from "zod";
import type { Opaque } from "../typed";

export type TossInvestAccountID = Opaque<string | number, "TossInvestAccountID">;
export const TossInvestAccountIDSchema = z.union([z.number(), z.string()]) as unknown as z.ZodType<
	TossInvestAccountID
>;

export const AccountScopedParamsSchema = z.object({
	account: TossInvestAccountIDSchema,
});
export type AccountScopedParams = z.infer<typeof AccountScopedParamsSchema>;

export const TossInvestApiResponseSchema = <
	TResultSchema extends z.ZodType = z.ZodUnknown,
>(
	resultSchema: TResultSchema = z.unknown() as unknown as TResultSchema,
) => z.object({
	result: resultSchema,
});
export type TossInvestApiResponse<TResult = unknown> = z.infer<
	ReturnType<typeof TossInvestApiResponseSchema<z.ZodType<TResult>>>
>;