import { beforeEach, describe, expect, it } from "@jest/globals";

import { CliException } from "../exceptions";
import { CLI_OUTPUT_WRITER } from "./output";

class BufferStream {
	readonly chunks: string[] = [];

	write(chunk: string): boolean {
		this.chunks.push(chunk);
		return true;
	}

	toString(): string {
		return this.chunks.join("");
	}
}

function createOutput() {
	return {
		stderr: new BufferStream(),
		stdout: new BufferStream(),
	};
}

describe("CLI_OUTPUT_WRITER", () => {
	let output: ReturnType<typeof createOutput>;

	beforeEach(() => {
		output = createOutput();
	});

	describe("writeResult 공개 동작", () => {
		describe("성공 케이스", () => {
			it("JSON 모드에서는 stdout에 개행이 포함된 단일 JSON을 쓴다", () => {
				CLI_OUTPUT_WRITER.writeResult(
					{ json: true, output },
					{ message: "hello", nested: { ready: true } },
				);

				const body = output.stdout.toString();
				expect(body.endsWith("\n")).toBe(true);
				expect(JSON.parse(body)).toEqual({
					message: "hello",
					nested: { ready: true },
				});
			});

			it("인간 가독성 모드에서는 stdout에 파싱 가능한 pretty JSON을 쓴다", () => {
				CLI_OUTPUT_WRITER.writeResult(
					{ json: false, output },
					{ message: "hello", nested: { ready: true } },
				);

				const body = output.stdout.toString();
				expect(body.endsWith("\n")).toBe(true);
				expect(body).toMatch(/^\{[\s\S]*\}\n$/);
				expect(body.includes("\n")).toBe(true);
				expect(() => JSON.parse(body)).not.toThrow();
				expect(JSON.parse(body)).toEqual({
					message: "hello",
					nested: { ready: true },
				});
			});
		});
	});

	describe("writeError 공개 동작", () => {
		describe("성공 케이스", () => {
			it("JSON 모드에서는 error 코드 접두사 뒤에 민감정보가 마스킹된 payload를 출력한다", () => {
				const error = new CliException("Authentication failed", {
					code: "missing_config",
					exitCode: 2,
					details: {
						message: "Bearer super-secret-token",
						access_token: "super-secret-token",
						headers: {
							authorization: "Bearer top-secret",
							password: "top-secret",
						},
						bad: [
							{ token: "token-val" },
							"TOSS_INVEST_SECRET_KEY=abc123",
						],
					},
				});

				CLI_OUTPUT_WRITER.writeError({ json: true, output }, error);

				const message = output.stderr.toString();
				const match = message.match(/^error_kind=missing_config (.+)\n$/);
				expect(match).not.toBeNull();
				const payload = JSON.parse(match?.[1] ?? "{}");

				expect(payload).toEqual({
					error: {
						code: "missing_config",
						message: "Authentication failed",
						details: {
							message: "Bearer [REDACTED]",
							access_token: "[REDACTED]",
							headers: {
								authorization: "[REDACTED]",
								password: "[REDACTED]",
							},
							bad: [
								{ token: "[REDACTED]" },
								"TOSS_INVEST_SECRET_KEY=[REDACTED]",
							],
						},
					},
				});
			});

			it("Error 상세는 JSON 모드에서 타입명만 노출한다", () => {
				CLI_OUTPUT_WRITER.writeError(
					{ json: true, output },
					new CliException("boom", {
						code: "error_type_example",
						details: new TypeError("boom"),
					}),
				);

				const body = output.stderr.toString();
				const match = body.match(/^error_kind=error_type_example (.+)\n$/);
				expect(match).not.toBeNull();
				const json = JSON.parse(match?.[1] ?? "{}");

				expect(json).toEqual({
					error: {
						code: "error_type_example",
						details: { name: "TypeError" },
						message: "boom",
					},
				});
			});

			it("코드가 생략된 에러는 기본 code로 JSON payload를 출력한다", () => {
				CLI_OUTPUT_WRITER.writeError(
					{ json: true, output },
					new CliException("fallback error", {}),
				);

				const body = output.stderr.toString();
				const match = body.match(/^error_kind=CLI_ERROR (.+)\n$/);
				expect(match).not.toBeNull();
				const payload = JSON.parse(match?.[1] ?? "{}");

				expect(payload).toEqual({
					error: {
						code: "CLI_ERROR",
						message: "fallback error",
					},
				});
			});

		});

		describe("실패 케이스", () => {
			it("비 JSON 모드에서는 code/message만 출력하고 details는 노출하지 않는다", () => {
				CLI_OUTPUT_WRITER.writeError(
					{ json: false, output },
					new CliException("human readable failure", {
						code: "human_err",
						details: {
							message: "secret detail",
							access_token: "secret-token",
						},
					}),
				);

				const body = output.stderr.toString();
				expect(body).toBe("error_kind=human_err: human readable failure\n");
				expect(body).not.toContain("secret");
				expect(output.stdout.toString()).toBe("");
			});

		});
	});

	describe("redact 공개 동작", () => {
		describe("성공 케이스", () => {
			it("객체/배열/문자열을 재귀적으로 탐색해 민감정보를 마스킹한다", () => {
				const value = {
					access_token: "abc123",
					account: {
						password: "pw-abc",
						nested: ["Token=abc", { client_secret: "secret" }],
					},
					list: [{ token: "t" }, "Bearer secret-token"],
					ok: "value",
				};

				expect(CLI_OUTPUT_WRITER.redact(value)).toEqual({
					access_token: "[REDACTED]",
					account: {
						password: "[REDACTED]",
						nested: ["Token=abc", { client_secret: "[REDACTED]" }],
					},
					list: [{ token: "[REDACTED]" }, "Bearer [REDACTED]"],
					ok: "value",
				});
			});
		});

	});
});
