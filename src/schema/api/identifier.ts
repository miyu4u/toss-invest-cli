import z from "zod";

import type { ID } from "../../typed";

export type OAuth2ClientID = ID<"OAuth2ClientID">;
export const OAuth2ClientIDSchema = z.string() as unknown as z.ZodType<
	OAuth2ClientID
>;

export type OrderID = ID<"OrderID">;
export const OrderIDSchema = z.string() as unknown as z.ZodType<OrderID>;

export type ClientOrderID = ID<"ClientOrderID">;
export const ClientOrderIDSchema = z.string() as unknown as z.ZodType<
	ClientOrderID
>;

export type ConditionalOrderID = ID<"ConditionalOrderID">;
export const ConditionalOrderIDSchema = z
	.string() as unknown as z.ZodType<ConditionalOrderID>;
