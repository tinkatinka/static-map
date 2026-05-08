import { mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join as pathJoin } from 'path';


function cyrb53(str: string, seed: number = 0): string {
	let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
	for (let i = 0, ch; i < str.length; i++) {
		ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	// return 4294967296 * (2097151 & h2) + (h1 >>> 0);
	return (h2>>>0).toString(16).padStart(8, '0')+(h1>>>0).toString(16).padStart(8, '0');
};


/**
 * Tile data
 */
export interface TileData {
	z: number;
	x: number;
	y: number;
	url: string;
}


/**
 * A fs-based tile cache
 */
export class TileCache {

	static fnTemplate = '{url}_{z}_{x}_{y}.png';

	path: string;

	/**
	 * Construct a new cache
	 * @param path Path to a directory where to store the tile cache
	 */
	constructor(path: string) {
		this.path = path;
		mkdirSync(path, { recursive: true });
	}

	/**
	 * Return cached data if available. If not, generate the data using the provided function and store the result in
	 * the cache.
	 * @param data Tile data to look for
	 * @param generator A function to obtain the data on cache miss
	 * @returns Data from the cache if available, from the generator otherwise
	 */
	async pass(data: TileData, generator: (data: TileData) => Promise<string>): Promise<string> {
		let buf = await this.read(data);
		if (buf === undefined) {
			buf = await generator(data);
			await this.write(data, buf);
		}
		return buf;
	}

	/**
	 * Return a tile object from the cache or `undefined` if not available
	 * @param data Tile data to look for
	 * @returns Data from the cache or `undefined` if not available
	 */
	async read(data: TileData): Promise<string | undefined> {
		const p = this.tilePath(data);
		try {
			const r = await readFile(p, { encoding: 'utf-8' });
			return r;
		} catch {
			return undefined;
		}
	}

	/**
	 * Write tile data to the cache
	 * @param data Tile data to write
	 * @param src Data object
	 */
	async write(data: TileData, src: string): Promise<void> {
		const p = this.tilePath(data);
		await writeFile(p, src, { encoding: 'utf-8' });
	}

	/**
	 * Obtain the cache path for a tile data object
	 * @param data Tile data to look for
	 * @returns The path to a cached object for the provided data
	 */
	private tilePath(data: TileData): string {
		const fn = TileCache.fnTemplate
			.replace('{url}', cyrb53(data.url))
			.replace('{z}', data.z.toString())
			.replace('{x}', data.x.toString())
			.replace('{y}', data.y.toString());
		return pathJoin(this.path, fn);
	}
}
