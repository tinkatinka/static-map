const isDefined = <T>(value: T | null | undefined): value is T => (
	value !== undefined && value !== null
);

/**
 * Map an array, ignoring `undefined`/`null` values
 * @param array The array to map
 * @param func Callback for each element
 * @returns The mapped array, filtered by `undefined`/`null` values
 */
export const compactMap = <T, R>(
	array: Array<T>,
	func: (value: T, idx: number) => R | undefined
): Array<R> => array.map(func).filter(isDefined);

