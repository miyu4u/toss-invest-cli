declare const opaqueType: unique symbol;

/**
 * 런타임 표현은 유지하면서 동일한 기본 타입의 서로 다른 도메인 값을 구분합니다.
 *
 * `TBrand`가 다른 값은 서로 대입할 수 없지만, 원래 `TValue`가 필요한 위치에는 사용할 수 있습니다.
 */
export type Opaque<TValue, TBrand extends string> = TValue & {
	readonly [opaqueType]: TBrand;
};

/**
 * 문자열 식별자를 표현합니다.
 * 브랜드를 지정하지 않으면 'ID' 브랜드로 간주합니다.
 */
export type ID<TBrand extends string = 'ID'> = Opaque<string, TBrand>;

export function asID<TBrand extends string = 'ID'>(value: string): ID<TBrand> {
	return value as unknown as ID<TBrand>;
}