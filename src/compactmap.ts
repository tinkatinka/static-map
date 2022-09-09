const isDefined = <T>(value: T | undefined): value is T => (value !== undefined);

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


declare global {
	interface Array<T> {
		/**
		 * Map an array, ignoring `undefined`/`null` values
		 * @param func Callback for each element
		 * @returns The mapped array, filtered by `undefined`/`null` values
		 */
		compactMap<R>(func: (value: T, idx: number) => R | undefined): Array<R>;
	}
}

if (!Array.prototype.compactMap) {
	Array.prototype.compactMap = function <T, R>(
		func: (value: T, idx: number) => R | undefined
	): Array<R> {
		return compactMap(this, func);
	};

}
