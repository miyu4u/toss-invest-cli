import type { Command } from "commander";

import type { CommandRuntimeOptions } from "../shared";

export interface IQueryCommand {
	/**
	 * Commander의 루트 `program`에 조회형 서브커맨드를 등록한다.
	 *
	 * 구현은 `program.command(...)`로 하위 명령 트리에 엔트리를 붙이고, 글로벌 옵션
	 * 파싱 결과를 공유할 수 있도록 `runtime`을 바인딩한다. 등록 단계에서
	 * 실제 API 호출은 수행하지 않고, 옵션/액션 바인딩만 선언적으로 구성해 실행 시점에
	 * 동작하도록 만든다.
	 *
	 * @param program 루트 Commander 프로그램 인스턴스
	 * @param runtime 콘솔 출력·환경 옵션 번들
	 * @returns `void`
	 */
	register(program: Command, runtime: CommandRuntimeOptions): void;
}