export interface WritableStreamLike {
	/**
	 * 문자열 청크를 출력 버퍼로 전달한다.
	 *
	 * 호출은 상위 모듈이 렌더링한 텍스트를 최소 단위로 내보내는 동작이며,
	 * 실제 쓰기 구현(예: `process.stdout`, 테스트용 가짜 스트림)은 반환값과
	 * 내부 버퍼 압력 제어 정책을 독자적으로 정의한다. 인터페이스 계약상 호출자는
	 * 반환값의 형태를 가정하기보다 `chunk`가 기록된 부수 효과에 의존한다.
	 *
	 * @param chunk 출력할 문자열 조각
	 * @returns 하위 스트림의 쓰기 결과(`unknown`, 구현체별 반환 타입)
	 */
	write(chunk: string): unknown;
}

export interface CliOutput {
	stderr: WritableStreamLike;
	stdout: WritableStreamLike;
}

