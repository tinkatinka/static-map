import * as Canvas from 'canvas';

import { TileCache, TileData } from './tilecache';
import base64img from './base64img';


export interface LatLng {
	lat: number;
	lng: number;
}

export interface LatLngBounds {
	min: LatLng;
	max: LatLng;
}

export interface StaticMapImage {
	src: string;
	bounds: LatLngBounds;
}

export interface StaticMapOptions {
	/** Width of the map image in pixels */
	width: number;
	/** Height of the map image in pixels */
	height: number;
	/** Horizontal padding of the map in pixels (beyond bounds) */
	paddingX: number;
	/** Vertical padding of the map in pixels (beyond bounds) */
	paddingY: number;
	/** Extent of the map */
	extent?: LatLngBounds;
	/** Tile URL template */
	tileURL: string;
	/** Tile size */
	tileSize: number;
	/** Tile max zoom */
	tileMaxZoom: number;
	/** Tile cache base path or `undefined` if no cache shall be used */
	tileCache?: string;
	/** Background color in CSS notation (only relevant for transparent tiles) */
	backgroundColor?: string;
	/** Grayscale filter for map tiles (not image overlays(!)) */
	grayscale: boolean;
}


/**
 * Generate a static map image
 */
export class StaticMap {

	/** Default options to be used for a new instance */
	private static defaultOptions: StaticMapOptions = {
		width: 512,
		height: 512,
		paddingX: 0,
		paddingY: 0,
		tileURL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
		tileSize: 256,
		tileMaxZoom: 20,
		grayscale: false
	};

	options: StaticMapOptions;

	/**
	 * The extent of this map. Either as specified explicitly in the options ({@link StaticMapOptions}) or computed
	 * from the image overlays ({@link StaticMapImage})
	 */
	get extent(): LatLngBounds | undefined {
		return this.options.extent ?? this.calculateExtent();
	}

	/** A tile cache, if desired */
	private cache?: TileCache;
	/** An array of image overlays */
	private images: StaticMapImage[];

	/**
	 * Construct a new StaticMap object with options
	 * @param options Options to configure this instance
	 */
	constructor(options?: Partial<StaticMapOptions>) {
		this.options = {...StaticMap.defaultOptions, ...options};
		this.cache = this.options.tileCache ? new TileCache(this.options.tileCache) : undefined;
		this.images = [];
	}

	/**
	 * Render image to data url
	 * @returns Data url containing the rendered map image
	 */
	async renderToDataURL(): Promise<string> {
		const canvas = await this.createCanvas();
		return canvas.toDataURL('image/png');
	}

	/**
	 * Render image to buffer
	 * @returns Buffer containing the rendered map image
	 */
	async renderToBuffer(): Promise<Buffer> {
		const canvas = await this.createCanvas();
		return canvas.toBuffer('image/png');
	}

	/**
	 * Add an image overlay
	 * @param img Image overlay source and bounding rect
	 * @returns `this`
	 */
	addImage(img: StaticMapImage): StaticMap {
		this.images.push(img);
		return this;
	}


	/** Calculates the center of provided bounds */
	private boundsCenter(bounds: LatLngBounds): LatLng {
		return {
			lat: (bounds.max.lat + bounds.min.lat) / 2.0,
			lng: (bounds.max.lng + bounds.min.lng) / 2.0
		};
	}

	/** Transform longitude to tile number */
	private lngToX(lng: number, zoom: number): number {
		const l = (lng < -180 || lng > 180) ? (lng + 180) % 360 - 180 : lng;
		return ((l + 180.0) / 360.0) * Math.pow(2, zoom);
	}

	/** Transform latitude to tile number */
	private latToY(lat: number, zoom: number): number {
		const l = (lat < -90 || lat > 90) ? (lat + 90) % 180 - 90 : lat;
		const lr = l * Math.PI / 180.0;
		return (1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2 * Math.pow(2, zoom);
	}

	/** Transform horizontal tile number to pixel coordinate */
	private xToPx(x: number, centerX: number, scale: number = 1.0): number {
		return Math.round((x - centerX) * this.options.tileSize * scale + this.options.width/2);
	}

	/** Transform vertical tile number to pixel coordinate */
	private yToPy(y: number, centerY: number, scale: number = 1.0): number {
		return Math.round((y - centerY) * this.options.tileSize * scale + this.options.height/2);
	}

	/** Transform longitude to horizontal pixel coordinate */
	private lngToPx(lng: number, zoom: number, centerX: number, scale: number = 1.0): number {
		return this.xToPx(this.lngToX(lng, zoom), centerX, scale);
	}

	/** Transform latitude to vertical pixel coordinate */
	private latToPy(lat: number, zoom: number, centerY: number, scale: number = 1.0): number {
		return this.yToPy(this.latToY(lat, zoom), centerY, scale);
	}

	/**
	 * Calculate extent of this map from image overlays
	 * @returns Maximal enclosing bounds of all overlays or `undefined` if no overlays exist
	 */
	private calculateExtent(): LatLngBounds | undefined {
		if (this.images.length < 1) {
			return undefined;
		}
		if (this.images.length < 2) {
			return this.images[0].bounds;
		}
		const min = (arr: Array<number>): number => arr.reduce((prev, curr) => ((curr < prev) ? curr : prev));
		const max = (arr: Array<number>): number => arr.reduce((prev, curr) => ((curr > prev) ? curr : prev));
		const bounds = this.images.map(id => id.bounds);
		return {
			min: {
				lat: min(bounds.map(b => b.min.lat)),
				lng: min(bounds.map(b => b.min.lng))
			},
			max: {
				lat: max(bounds.map(b => b.max.lat)),
				lng: max(bounds.map(b => b.max.lng))
			}
		};
	}

	/**
	 * Calculate appropriate zoom level for a given extent
	 * @param extent The extent to get the zoom level for
	 * @returns A zoom level, within the range of 0...`tileMaxZoom`
	 */
	private calculateZoom(extent: LatLngBounds): number {
		let z = this.options.tileMaxZoom + 1;
		while (z > 0) {
			z--;
			// console.log(`extent=${JSON.stringify(extent, null, 2)}`);
			const w = (this.lngToX(extent.max.lng, z) - this.lngToX(extent.min.lng, z)) * this.options.tileSize;
			if (w > (this.options.width - this.options.paddingX * 2)) {
				continue;
			}
			const h = (this.latToY(extent.min.lat, z) - this.latToY(extent.max.lat, z)) * this.options.tileSize;
			// console.log(`zoom=${z} -> (w, h)=(${w}, ${h})`);
			if (h > (this.options.height - this.options.paddingY * 2)) {
				continue;
			}
			return z;
		}
		return 0;
	}

	/**
	 * Main function to generate the image canvas
	 * @returns A canvas object containing the map tiles and overlays
	 */
	private async createCanvas(): Promise<Canvas.Canvas> {
		const extent = this.extent;
		if (extent === undefined) {
			throw new Error('Undefined extent');
		}
		const { width, height, paddingX, paddingY, backgroundColor, grayscale, tileSize, tileURL } = this.options;
		const canvas = Canvas.createCanvas(width, height);
		const ctx = canvas.getContext('2d');
		// backgound
		if (backgroundColor !== undefined) {
			ctx.fillStyle = backgroundColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
		// tiles
		const zoom = this.calculateZoom(extent);
		const center = this.boundsCenter(extent);
		const centerX = this.lngToX(center.lng, zoom);
		const centerY = this.latToY(center.lat, zoom);
		const scaleX = (width - 2 * paddingX) / Math.abs(
			this.lngToPx(extent.max.lng, zoom, centerX) - this.lngToPx(extent.min.lng, zoom, centerX)
		);
		const scaleY = (height - 2 * paddingY) / Math.abs(
			this.latToPy(extent.min.lat, zoom, centerY) - this.latToPy(extent.max.lat, zoom, centerY)
		);
		const scale = Math.min(scaleX, scaleY);
		// console.log(`scale=(${scaleX}, ${scaleY}) => ${scale}`);
		const minX = Math.floor(centerX - 0.5 * width / tileSize);
		const maxX = Math.ceil(centerX + 0.5 * width / tileSize);
		const minY = Math.floor(centerY - 0.5 * height / tileSize);
		const maxY = Math.ceil(centerY + 0.5 * height / tileSize);
		const maxTile = Math.pow(2, zoom);
		for (let x = minX; x < maxX; x++) {
			for (let y = minY; y < maxY; y++) {
				const tileX = (x + maxTile) % maxTile;
				const tileY = (y + maxTile) % maxTile;
				const url = tileURL
					.replaceAll('{z}', zoom.toString())
					.replaceAll('{x}', tileX.toString())
					.replaceAll('{y}', tileY.toString());
				let src = url;
				if (this.cache !== undefined) {
					const td: TileData = { z: zoom, x: tileX, y: tileY };
					try {
						const csrc = await this.cache.pass(td, () => base64img(src, 'image/png'));
						if (csrc !== undefined) {
							src = csrc;
						}
					} catch (error) {
						console.error(error);
						throw error;
					}
				}
				const image = await Canvas.loadImage(src);
				const px = this.xToPx(x, centerX, scale);
				const py = this.yToPy(y, centerY, scale);
				const dx = this.xToPx(x + 1, centerX, scale) - px;
				const dy = this.yToPy(y + 1, centerY, scale) - py;
				// console.log(`url='${url}', imgcoord=(${px}, ${py}, ${dx}, ${dy})`);
				ctx.drawImage(image, px, py, dx, dy);
			}
		}
		// grayscaling
		if (grayscale) {
			const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
			const pixels = imgData.data;
			for (let i = 0; i < pixels.length; i += 4) {
				const lightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
				pixels[i] = lightness;
				pixels[i + 1] = lightness;
				pixels[i + 2] = lightness;
			}
			ctx.putImageData(imgData, 0, 0);
		}
		// image overlays
		for (const imgdata of this.images) {
			const img = await Canvas.loadImage(imgdata.src);
			const x = this.lngToPx(imgdata.bounds.min.lng, zoom, centerX, scale);
			const y = this.latToPy(imgdata.bounds.max.lat, zoom, centerY, scale);
			const dx = this.lngToPx(imgdata.bounds.max.lng, zoom, centerX, scale) - x;
			const dy = this.latToPy(imgdata.bounds.min.lat, zoom, centerY, scale) - y;
			// console.log(`Image (x, y, dx, dy) = (${x}, ${y}, ${dx}, ${dy})`);
			ctx.drawImage(img, x, y, dx, dy);
		}
		// done
		return canvas;
	}

}
