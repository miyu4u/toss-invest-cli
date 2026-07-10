import z from "zod";

import { OAuth2ClientIDSchema } from "./identifier";

/**
 * OAuth2 클라이언트 자격증명 요청 바디.
 * client_id/secret은 필수이며, grant_type은 client_credentials만 허용(옵션)한다.
 */
export const OAuth2TokenRequestSchema = z.object({
	/**
	 * OAuth2 클라이언트 식별자.
	 * OAuth2ClientID 스키마를 따르는 필수 문자열이다.
	 */
	client_id: OAuth2ClientIDSchema,
	/**
	 * OAuth2 클라이언트 비밀키.
	 * 인증 요청에 반드시 포함되어야 하는 필수 문자열이다.
	 */
	client_secret: z.string(),
	/**
	 * OAuth2 그랜트 타입.
	 * 기본값 없이 `client_credentials` 리터럴만 허용하며 미지정이 가능하다.
	 */
	grant_type: z.literal("client_credentials").optional(),
});
export type OAuth2TokenRequest = z.infer<typeof OAuth2TokenRequestSchema>;

/**
 * OAuth2 토큰 응답 스키마.
 * 토큰 문자열, 타입은 Bearer 고정, 만료(seconds) 수치로 구성한다.
 */
export const OAuth2TokenResponseSchema = z.object({
	/**
	 * 접근 토큰 문자열.
	 * 토큰 획득 결과를 전달하는 필수 문자열이다.
	 */
	access_token: z.string(),
	/**
	 * 토큰 타입 표기.
	 * Bearer 토큰 타입만 허용하는 필수 고정값이다.
	 */
	token_type: z.literal("Bearer"),
	/**
	 * 토큰 만료 시간(초 단위).
	 * access token 유효 기간을 초로 표현하는 필수 숫자이다.
	 */
	expires_in: z.number(),
});
export type OAuth2TokenResponse = z.infer<typeof OAuth2TokenResponseSchema>;
