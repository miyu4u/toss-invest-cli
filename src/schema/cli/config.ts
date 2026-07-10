import z from "zod";

export const CliEnvSchema = z.record(z.string(), z.string().optional());
export type CliEnv = z.infer<typeof CliEnvSchema>;

const CliConfigSourceSchema = z.object({
	kind: z.union([z.literal("environment"), z.literal("dotenv")]),
	path: z.string().trim().min(1).optional(),
});
export type CliConfigSource = z.infer<typeof CliConfigSourceSchema>;

export const CliConfigSchema = z.object({
	accessToken: z.string().trim().min(1).optional(),
	accountAllowlist: z.array(z.string()).default([]),
	authCachePath: z.string().trim().min(1),
	clientId: z.string().trim().min(1).optional(),
	clientSecret: z.string().trim().min(1).optional(),
	clientCredentialsSource: CliConfigSourceSchema.optional(),
	configHome: z.string().trim().min(1),
	credentialsPath: z.string().trim().min(1),
	environmentAccessToken: z.string().trim().min(1).optional(),
	keyringPassword: z.string().trim().min(1).optional(),
	keyringPasswordSource: CliConfigSourceSchema.optional(),
	defaultAccount: z.string().trim().min(1).optional(),
	orderKillSwitch: z.string().optional(),
	orderLiveApproved: z.string().optional(),
});
export type CliConfig = z.infer<typeof CliConfigSchema>;
