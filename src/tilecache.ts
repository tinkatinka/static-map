import { existsSync, mkdirSync, readFile, writeFile } from 'fs';
import { join as pathJoin } from 'path';
import { promisify } from 'util';


/**
 * Tile data
 */
export interface TileData {
	z: number;
	x: number;
	y: number;
}


/**
 * A tile cache
 */
export class TileCache {

	static fnTemplate = '{z}_{x}_{y}.png';

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
		const r = existsSync(p) ? await promisify(readFile)(p, { encoding: 'utf-8' }) : undefined;
		return r;
	}

	/**
	 * Write tile data to the cache
	 * @param data Tile data to write
	 * @param src Data object
	 */
	async write(data: TileData, src: string): Promise<void> {
		const p = this.tilePath(data);
		await promisify(writeFile)(p, src, { encoding: 'utf-8' });
	}

	/**
	 * Obtain the cache path for a tile data object
	 * @param data Tile data to look for
	 * @returns The path to a cached object for the provided data
	 */
	private tilePath(data: TileData): string {
		const fn = TileCache.fnTemplate
			.replace('{z}', data.z.toString())
			.replace('{x}', data.x.toString())
			.replace('{y}', data.y.toString());

		return pathJoin(this.path, fn);
	}
}
