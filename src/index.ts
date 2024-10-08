import Canvas from 'canvas';
import { merge } from 'lodash-es';
import type { SetOptional, PartialDeep } from 'type-fest';

import { TileCache, type TileData } from './tilecache.js';
import base64img from './base64img.js';
import { compactMap } from './compactmap.js';


export interface LatLng {
	lat: number;
	lng: number;
}

export interface LatLngBounds {
	min: LatLng;
	max: LatLng;
}

interface Point {
	x: number;
	y: number;
}

export interface StrokeOptions {
	/** Stroke style */
	strokeStyle: string | CanvasGradient | CanvasPattern;
	/** Line width in pixels */
	lineWidth: number;
	/** Line join style */
	lineJoin: 'bevel' | 'round' | 'miter';
	/** Line cap style */
	lineCap: 'butt' | 'round' | 'square';
}

export interface FillOptions {
	/** Fill style */
	fillStyle: string | CanvasGradient | CanvasPattern;
}

export type StrokeFillOptions =
	SetOptional<StrokeOptions, 'strokeStyle'> &
	SetOptional<FillOptions, 'fillStyle'>;

export type StaticMapOverlay = {
	type: StaticMapOverlayType;
} &
StaticMapImage | StaticMapLine | StaticMapCircle | StaticMapRect |
StaticMapPolygon | StaticMapText | StaticMapScale;

type StaticMapOverlayType =
	'image' | 'line' | 'circle' | 'rect' | 'polygon' | 'text' | 'scale';

export interface StaticMapImage {
	type: 'image';
	/** Src URL */
	src: string;
	/** Image bounds */
	bounds: LatLngBounds;
}

export interface StaticMapLine {
	type: 'line';
	/** Points to be connected */
	points: LatLng[];
	/** Options for the line display */
	options: StaticMapLineOptions;
}

export type StaticMapLineOptions = StrokeOptions;

export interface StaticMapCircle {
	type: 'circle';
	/** Center point of the circle */
	center: LatLng;
	/** Options for the circle display */
	options: StaticMapCircleOptions;
}

export interface StaticMapCircleOptions extends StrokeFillOptions {
	/** Radius of the circle */
	radius: number;
}

export type StaticMapRectOptions = StrokeFillOptions;

export interface StaticMapRect {
	type: 'rect';
	/** Rectangle bounds */
	bounds: LatLngBounds;
	/** Options for rect display */
	options: StaticMapRectOptions;
}

export type StaticMapPolygonOptions = StrokeFillOptions;

export interface StaticMapPolygon {
	type: 'polygon';
	/** Polygon points */
	points: LatLng[];
	/** Options for polygon display */
	options: StaticMapPolygonOptions;
}

export interface StaticMapText {
	type: 'text';
	/** Text to be displayed */
	text: string;
	/** Anchor point of the text overlay */
	anchor: LatLng;
	/** Options for the text display */
	options: StaticMapTextOptions;
}

export interface StaticMapTextOptions extends
	SetOptional<CanvasTextDrawingStyles, 'letterSpacing' | 'wordSpacing'>,
	StrokeFillOptions
{
	/** Padding x in pixels */
	px: number;
	/** Padding y in pixels */
	py: number;
	/** Max text width in pixels (optional) */
	maxWidth?: number;
}

/** Length units for scale overlay */
export type LengthUnits = 'metric' | 'imperial';
/** Layout position of an overlay */
export type LayoutPosition =
	'topleft' | 'topright' | 'bottomleft' | 'bottomright';

export interface StaticMapScale {
	type: 'scale';
	options: StaticMapScaleOptions;
}

export interface StaticMapScaleOptions {
	/** Units to be displayed in the scale */
	units: LengthUnits;
	/** Position of the scale (corners) */
	position: LayoutPosition;
	/** Height of the scaling overlay in points */
	height: number;
	/** Max width of the scaling overlay in percent of the map width */
	maxWidth: number;
	/** Horizontal margin in percent of image width */
	mx: number;
	/** Vertical margin in percent of image height */
	my: number;
	/** Drawing style of the scaling box */
	boxStyle: StrokeFillOptions;
	/** Drawing style and font of the scaling label */
	textStyle: StrokeFillOptions & {
		font: string;
	};
}


export interface StaticMapOptions {
	/** Width of the map image in pixels */
	width: number;
	/** Height of the map image in pixels */
	height: number;
	/** Padding of the map in pixels (beyond bounds) */
	padding: number;
	/** Horizontal padding (overrides `padding`) */
	paddingX?: number;
	/** Vertical padding (overrides `padding`) */
	paddingY?: number;
	/** Left padding (overrides `paddingX`) */
	paddingLeft?: number;
	/** Right padding (overrides `paddingX`) */
	paddingRight?: number;
	/** Top padding (overrides `paddingY`) */
	paddingTop?: number;
	/** Bottom padding (overrides `paddingY`) */
	paddingBottom?: number;
	/** Extent of the map */
	extent?: LatLngBounds;
	/** Scale map to match size and padding exactly */
	scaling: boolean;
	/** Tile URL template */
	tileURL: string;
	/** Tile size */
	tileSize: number;
	/** Tile max zoom */
	tileMaxZoom: number;
	/** Tile cache base path or `undefined` if no cache shall be used */
	tileCache?: string;
	/** User agent string to transmit when loading tiles */
	userAgent?: string;
	/** Background color in CSS notation (only relevant for transparent tiles) */
	backgroundColor?: string;
	/** Grayscale filter for map tiles (not image overlays(!)) */
	grayscale: boolean;
}


/** mean earth radius in meters */
const EARTH_RADIUS_MEAN = 6371008.8 as const;

/** imperial units */
const FEET_PER_METER = 3.2808399 as const;
const FEET_PER_MILE = 5280 as const;

/**
 * Generate a static map image
 */
export class StaticMap {

	/** Default options to be used for a new instance */
	private static defaultOptions: StaticMapOptions = {
		width: 512,
		height: 512,
		padding: 0,
		scaling: true,
		tileURL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
		tileSize: 256,
		tileMaxZoom: 20,
		grayscale: false
	};
	/** Default line options */
	private static defaultLineOptions: StaticMapLineOptions = {
		strokeStyle: 'black',
		lineWidth: 1.0,
		lineCap: 'round',
		lineJoin: 'round'
	};
	/** Default circle options */
	private static defaultCircleOptions: StaticMapCircleOptions = {
		radius: 5.0,
		strokeStyle: 'rgba(128, 128, 128, 0.5)',
		lineWidth: 1.0,
		lineCap: 'round',
		lineJoin: 'round',
		fillStyle: 'rgba(0, 0, 0, 0.5)'
	};
	/** Default rect options */
	private static defaultRectOptions: StaticMapRectOptions = {
		strokeStyle: 'rgba(128, 128, 128, 0.5)',
		lineWidth: 1.0,
		lineCap: 'round',
		lineJoin: 'round',
		fillStyle: 'rgba(0, 0, 0, 0.5)'
	};
	/** Default text options */
	private static defaultTextOptions: StaticMapTextOptions = {
		px: 0,
		py: 0,
		textAlign: 'center',
		textBaseline: 'middle',
		direction: 'inherit',
		font: '12px sans-serif',
		fontKerning: 'auto',
		fontStretch: 'normal',
		fontVariantCaps: 'normal',
		lineWidth: 1.0,
		lineCap: 'round',
		lineJoin: 'round',
		fillStyle: 'black',
		textRendering: 'auto'
	};
	/** Default scale options */
	private static defaultScaleOptions: StaticMapScaleOptions = {
		units: 'metric',
		position: 'bottomleft',
		mx: 4,
		my: 4,
		height: 16,
		maxWidth: 20,
		boxStyle: {
			lineWidth: 1.0,
			lineCap: 'square',
			lineJoin: 'miter',
			strokeStyle: 'black',
			fillStyle: 'rgba(255, 255, 255, 0.3)'
		},
		textStyle: {
			font: '12px sans-serif',
			lineWidth: 1.0,
			lineCap: 'round',
			lineJoin: 'round',
			fillStyle: 'black'
		}
	};

	/** The options provided to this instance */
	readonly options: StaticMapOptions;

	/** A tile cache, if desired */
	private cache?: TileCache;
	/** An array of overlays */
	private overlays: StaticMapOverlay[];

	/**
	 * Construct a new StaticMap object with options
	 * @param options Options to configure this instance
	 */
	constructor(options?: Partial<StaticMapOptions>) {
		this.options = merge({}, StaticMap.defaultOptions, options);
		this.cache = this.options.tileCache ? new TileCache(this.options.tileCache) : undefined;
		this.overlays = [];
	}

	/**
	 * The extent of this map. Either as specified explicitly in the options ({@link StaticMapOptions}) or computed
	 * from the image overlays ({@link StaticMapImage})
	 */
	get extent(): LatLngBounds | undefined {
		return this.options.extent ?? this.calculateExtent();
	}

	get paddingLeft(): number {
		return this.options.paddingLeft ?? this.options.paddingX ?? this.options.padding;
	}
	get paddingRight(): number {
		return this.options.paddingRight ?? this.options.paddingX ?? this.options.padding;
	}
	get paddingTop(): number {
		return this.options.paddingTop ?? this.options.paddingY ?? this.options.padding;
	}
	get paddingBottom(): number {
		return this.options.paddingBottom ?? this.options.paddingY ?? this.options.padding;
	}

	/**
	 * Render to canvas
	 * @returns A Canvas object containing the map tiles and overlays
	 */
	async renderToCanvas(): Promise<Canvas.Canvas> {
		return this.createCanvas();
	}

	/**
	 * Render image to data url
	 * @returns Data url containing the rendered map image
	 */
	async renderToDataURL(): Promise<string> {
		const canvas = await this.createCanvas();
		// FIXME: Use version w/ callbacks here but couldn't get those to work
		return canvas.toDataURL('image/png');
	}

	/**
	 * Render image to buffer
	 * @returns Buffer containing the rendered map image
	 */
	async renderToBuffer(): Promise<Buffer> {
		const canvas = await this.createCanvas();
		// FIXME: Use version w/ callbacks here but couldn't get those to work
		return canvas.toBuffer('image/png');
	}

	/**
	 * Add an overlay
	 * @param overlay Overlay to add
	 * @returns `this`
	 */
	addOverlay(overlay: StaticMapOverlay): StaticMap {
		this.overlays.push(overlay);
		return this;
	}

	/**
	 * Add an image overlay
	 * @param src The source URL of this image
	 * @param bounds The bounds of this image
	 */
	addImage(src: string, bounds: LatLngBounds): StaticMap {
		return this.addOverlay({ type: 'image', src, bounds });
	}

	/**
	 * Add lines
	 * @param points The points to be connected by lines
	 * @param options The drawing style of the line (optional)
	 * @returns `this`
	 */
	addLines(points: LatLng[], options?: Partial<StaticMapLineOptions>): StaticMap {
		if (points.length >= 2) {
			return this.addOverlay({
				type: 'line',
				points,
				options: merge({}, StaticMap.defaultLineOptions, options)
			});
		}
		return this;
	}

	/**
	 * Add a single line
	 * @param src The origin of the line
	 * @param dst The destination of the line
	 * @param options The drawing style of the line (optional)
	 * @returns `this`
	 */
	addLine(src: LatLng, dst: LatLng, options?: Partial<StaticMapLineOptions>): StaticMap {
		return this.addLines([src, dst], options);
	}

	/**
	 * Add a circle
	 * @param center The center of the circle
	 * @param options Options how to draw the circle (optional)
	 * @returns `this`
	 */
	addCircle(center: LatLng, options?: Partial<StaticMapCircleOptions>): StaticMap {
		return this.addOverlay({
			type: 'circle',
			center,
			options: merge({}, StaticMap.defaultCircleOptions, options)
		});
	}

	/**
	 * Add a rectangle
	 * @param origin The origin of this rectangle (south-west corner)
	 * @param size The size of this rectangle (width and height in degrees)
	 * @returns `this`
	 */
	addRectangle(bounds: LatLngBounds, options?: Partial<StaticMapRectOptions>): StaticMap {
		return this.addOverlay({
			type: 'rect',
			bounds,
			options: merge({}, StaticMap.defaultRectOptions, options)
		});
	}

	/**
	 * Add a polygon
	 * @param points The polygon points
	 * @param options The drawing style of the polygon (optional)
	 * @returns `this`
	 */
	addPolygon(points: LatLng[], options?: Partial<StaticMapPolygonOptions>): StaticMap {
		if (points.length >= 2) {
			return this.addOverlay({
				type: 'polygon',
				points,
				options: merge({}, StaticMap.defaultLineOptions, options)
			});
		}
		return this;
	}

	/**
	 * Add some text
	 * @param text The text to add
	 * @param anchor The anchor point for the text
	 * @param options Options how to draw the text (optional)
	 * @returns `this`
	 */
	addText(text: string, anchor: LatLng, options?: Partial<StaticMapTextOptions>): StaticMap {
		return this.addOverlay({
			type: 'text',
			text,
			anchor,
			options: merge({}, StaticMap.defaultTextOptions, options)
		});
	}

	/**
	 * Add a scale
	 * @param options Options how to draw the scale (optional)
	 * @returns `this`
	 */
	addScale(options?: PartialDeep<StaticMapScaleOptions>): StaticMap {
		return this.addOverlay({
			type: 'scale',
			options: merge({}, StaticMap.defaultScaleOptions, options)
		});
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

	/** Transform geo coordinate to tile numbers */
	private latlngToXY(geo: LatLng, zoom: number): Point {
		return {
			x: this.lngToX(geo.lng, zoom),
			y: this.latToY(geo.lat, zoom)
		};
	}

	/** Transform horizontal tile number to pixel coordinate */
	private xToPx(x: number, centerX: number, scale: number = 1.0): number {
		return Math.round(
			(x - centerX) * this.options.tileSize * scale
			+ (this.options.width + this.paddingLeft - this.paddingRight) / 2
		);
	}

	/** Transform vertical tile number to pixel coordinate */
	private yToPy(y: number, centerY: number, scale: number = 1.0): number {
		return Math.round(
			(y - centerY) * this.options.tileSize * scale
			+ (this.options.height + this.paddingTop - this.paddingBottom) / 2
		);
	}

	/** Transform tile numbers to pixel coordinates */
	private xyToPxPy(p: Point, center: Point, scale: number = 1.0): Point {
		return {
			x: this.xToPx(p.x, center.x, scale),
			y: this.yToPy(p.y, center.y, scale)
		};
	}

	/** Transform longitude to horizontal pixel coordinate */
	private lngToPx(lng: number, zoom: number, centerX: number, scale: number = 1.0): number {
		return this.xToPx(this.lngToX(lng, zoom), centerX, scale);
	}

	/** Transform latitude to vertical pixel coordinate */
	private latToPy(lat: number, zoom: number, centerY: number, scale: number = 1.0): number {
		return this.yToPy(this.latToY(lat, zoom), centerY, scale);
	}

	/** Transform geo coordinates to pixel coordinates */
	private latlngToPxPy(latlng: LatLng, zoom: number, center: Point, scale: number = 1.0): Point {
		return {
			x: this.lngToPx(latlng.lng, zoom, center.x, scale),
			y: this.latToPy(latlng.lat, zoom, center.y, scale)
		};
	}

	/** Transform tile number to lng */
	private xToLng(x: number, zoom: number): number {
		return x / Math.pow(2, zoom) * 360.0 - 180.0;
	}

	/** Transform tile number to lat */
	private yToLat(y: number, zoom: number): number {
		return Math.atan(Math.sinh(Math.PI * (1 - 2 * y / Math.pow(2, zoom)))) / Math.PI * 180.0;
	}

	/** Latitude in radians */
	private latToRad(lat: number): number {
		return 2.0 * Math.PI * lat / 360.0;
	}

	/** Longitude in radians */
	private lngToRad(lng: number): number {
		return 2.0 * Math.PI * lng / 360.0;
	}

	/**
	 * Calculates the central angle between two coordinates (in radians)
	 * @param from the location from which the angle should be computed
	 * @param to the location wrt which the angle should be computed
	 * @returns the central angle in radians
	 */
	private ang(from: LatLng, to: LatLng): number {
		const l1 = this.lngToRad(from.lng);
		const p1 = this.latToRad(from.lat);
		const l2 = this.lngToRad(to.lng);
		const p2 = this.latToRad(to.lat);
		const dl = Math.abs(l1 - l2);
		const dp = Math.abs(p1 - p2);
		const s1 = Math.sin(dp / 2.0);
		const s2 = Math.sin(dl / 2.0);
		return 2.0 * Math.asin(Math.sqrt(
			s1 * s1 + Math.cos(p1) * Math.cos(p2) * s2 * s2
		));
	}

	/**
	 * Calculates the distance (in meters) between two locations.
	 * **Note**: This uses spherical coordinates and the mean earth radius, so
	 * it's off by about 0.5%
	 * @param from the location from which to calculate the distance
	 * @param to the location to calculate the distance to
	 * @returns distance in meters
	 */
	private distance(from: LatLng, to: LatLng): number {
		return Math.abs(EARTH_RADIUS_MEAN * this.ang(from, to));
	}

	/**
	 * Calculates the rounded distance (in meters) suitable for scale display
	 * @param value in m
	 * @returns rounded value in m
	 */
	private scaleDistance(value: number): number {
		const p = Math.pow(10, Math.floor(value).toString().length - 1);
		let d = value / p;
		d = (d >= 10) ? 10 : (d >= 5) ? 5 : (d >= 3) ? 3 : (d >= 2) ? 2 : 1;
		return p * d;
	}

	/**
	 * Calculate extent of a single overlay
	 * @param overlay The overlay to check
	 * @returns Maximal enclosing bounds of this overlay
	 */
	private overlayExtent(overlay: StaticMapOverlay): LatLngBounds | undefined {
		const type = overlay.type;
		switch (type) {
			case 'image':
				return (overlay as StaticMapImage).bounds;
			case 'circle': {
				const c = (overlay as StaticMapCircle).center;
				return { min: c, max: c };
			}
			case 'rect':
				return (overlay as StaticMapRect).bounds;
			case 'line':
			case 'polygon': {
				const min = (arr: Array<number>): number => arr.reduce((prev, curr) => ((curr < prev) ? curr : prev));
				const max = (arr: Array<number>): number => arr.reduce((prev, curr) => ((curr > prev) ? curr : prev));
				const bounds = (points: Array<LatLng>): LatLngBounds => ({
					min: {
						lat: min(points.map(p => p.lat)),
						lng: min(points.map(p => p.lng))
					},
					max: {
						lat: max(points.map(p => p.lat)),
						lng: max(points.map(p => p.lng))
					}
				});
				return bounds((overlay as StaticMapLine).points);
			}
			case 'text': {
				const a = (overlay as StaticMapText).anchor;
				return { min: a, max: a };
			}
			case 'scale': {
				return undefined;
			}
			default:
				throw new Error(`Unknown overlay type "${type}"`);
		}
	}

	/**
	 * Calculate extent of this map from overlays
	 * @returns Maximal enclosing bounds of all overlays or `undefined` if no overlays exist
	 */
	private calculateExtent(): LatLngBounds | undefined {
		if (this.overlays.length < 1) {
			return undefined;
		}
		if (this.overlays.length < 2) {
			return this.overlayExtent(this.overlays[0]);
		}
		const min = (arr: Array<number>): number => arr.reduce((prev, curr) => ((curr < prev) ? curr : prev));
		const max = (arr: Array<number>): number => arr.reduce((prev, curr) => ((curr > prev) ? curr : prev));
		const union = (arr: Array<LatLngBounds>): LatLngBounds => ({
			min: {
				lat: min(arr.map(b => b.min.lat)),
				lng: min(arr.map(b => b.min.lng))
			},
			max: {
				lat: max(arr.map(b => b.max.lat)),
				lng: max(arr.map(b => b.max.lng))
			}
		});
		return union(compactMap(this.overlays, this.overlayExtent.bind(this)));
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
			if (w > (this.options.width - (this.paddingLeft + this.paddingRight))) {
				continue;
			}
			const h = (this.latToY(extent.min.lat, z) - this.latToY(extent.max.lat, z)) * this.options.tileSize;
			// console.log(`zoom=${z} -> (w, h)=(${w}, ${h})`);
			if (h > (this.options.height - (this.paddingTop + this.paddingBottom))) {
				continue;
			}
			return z;
		}
		return 0;
	}

	/**
	 * Load a tile image
	 * @param zoom The zoom level of the tile
	 * @param tileX The x coordinate
	 * @param tileY The y coordinate
	 * @returns An image object
	 */
	private async loadTile(zoom: number, tileX: number, tileY: number): Promise<Canvas.Image> {
		const url = this.options.tileURL
			.replace('{z}', zoom.toString())
			.replace('{x}', tileX.toString())
			.replace('{y}', tileY.toString());
		let src = url;
		if (this.cache !== undefined) {
			const td: TileData = { z: zoom, x: tileX, y: tileY };
			try {
				const csrc = await this.cache.pass(td, () => base64img(src, 'image/png', this.options.userAgent));
				if (csrc !== undefined) {
					src = csrc;
				}
			} catch (error) {
				console.error(error);
				throw error;
			}
		} else {
			src = await base64img(src, 'image/png', this.options.userAgent);
		}
		const image = await Canvas.loadImage(src);
		return image;
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
		const { width, height, scaling, backgroundColor, grayscale, tileSize } = this.options;
		const canvas = Canvas.createCanvas(width, height);
		const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
		// backgound
		if (backgroundColor !== undefined) {
			ctx.fillStyle = backgroundColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
		// tiles
		const zoom = this.calculateZoom(extent);
		const center = this.boundsCenter(extent);
		const centerXY: Point = this.latlngToXY(center, zoom);
		let scale: number | undefined;
		if (scaling) {
			const scaleX = (width - (this.paddingLeft + this.paddingRight)) / Math.abs(
				this.lngToPx(extent.max.lng, zoom, centerXY.x) - this.lngToPx(extent.min.lng, zoom, centerXY.x)
			);
			const scaleY = (height - (this.paddingTop + this.paddingBottom)) / Math.abs(
				this.latToPy(extent.min.lat, zoom, centerXY.y) - this.latToPy(extent.max.lat, zoom, centerXY.y)
			);
			scale = Math.min(scaleX, scaleY);
		}
		// console.log(`scale=(${scaleX}, ${scaleY}) => ${scale}`);
		const minX = Math.floor(centerXY.x - 0.5 * width / tileSize);
		const maxX = Math.ceil(centerXY.x + 0.5 * width / tileSize);
		const minY = Math.floor(centerXY.y - 0.5 * height / tileSize);
		const maxY = Math.ceil(centerXY.y + 0.5 * height / tileSize);
		const maxTile = Math.pow(2, zoom);
		for (let x = minX; x < maxX; x++) {
			for (let y = minY; y < maxY; y++) {
				const tileX = (x + maxTile) % maxTile;
				const tileY = (y + maxTile) % maxTile;
				const image = await this.loadTile(zoom, tileX, tileY);
				const p = this.xyToPxPy({ x, y }, centerXY, scale);
				const dx = this.xToPx(x + 1, centerXY.x, scale) - p.x;
				const dy = this.yToPy(y + 1, centerXY.y, scale) - p.y;
				// console.log(`url='${url}', imgcoord=(${p.x}, ${p.y}, ${dx}, ${dy})`);
				ctx.drawImage(image as unknown as CanvasImageSource, p.x, p.y, dx, dy);
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
		// overlays
		for (const overlay of this.overlays) {
			const type = overlay.type;
			switch (type) {
				case 'image': {
					// const img = await Canvas.loadImage(imgdata.src);
					let img: Canvas.Image | HTMLImageElement;
					try {
						img = new Canvas.Image();
					} catch {
						img = new Image();
						img.crossOrigin = 'anonymous';
					}
					const draw = async () => new Promise<void>((resolve, reject) => {
						img.onload = () => {
							const x = this.lngToPx(overlay.bounds.min.lng, zoom, centerXY.x, scale);
							const y = this.latToPy(overlay.bounds.max.lat, zoom, centerXY.y, scale);
							const dx = this.lngToPx(overlay.bounds.max.lng, zoom, centerXY.x, scale) - x;
							const dy = this.latToPy(overlay.bounds.min.lat, zoom, centerXY.y, scale) - y;
							// console.log(`Image (x, y, dx, dy) = (${x}, ${y}, ${dx}, ${dy})`);
							ctx.drawImage(img as CanvasImageSource, x, y, dx, dy);
							resolve();
						};
						img.onerror = reject;
						img.src = overlay.src;
					});
					await draw();
					break;
				}
				case 'line': {
					if (overlay.points.length > 1) {
						const p0 = this.latlngToPxPy(overlay.points[0], zoom, centerXY, scale);
						// console.log(`[line] moving to (${x0}, ${y0})`);
						ctx.beginPath();
						ctx.moveTo(p0.x, p0.y);
						for (const p of overlay.points.slice(1)) {
							const pxy = this.latlngToPxPy(p, zoom, centerXY, scale);
							// console.log(`[line] drawing to (${px}, ${py})`);
							ctx.lineTo(pxy.x, pxy.y);
						}
						ctx.strokeStyle = overlay.options.strokeStyle;
						ctx.lineWidth = overlay.options.lineWidth;
						ctx.lineCap = overlay.options.lineCap;
						ctx.lineJoin = overlay.options.lineJoin;
						ctx.stroke();
					}
					break;
				}
				case 'polygon': {
					if (overlay.points.length > 1) {
						const p0 = this.latlngToPxPy(overlay.points[0], zoom, centerXY, scale);
						// console.log(`[line] moving to (${x0}, ${y0})`);
						ctx.beginPath();
						ctx.moveTo(p0.x, p0.y);
						for (const p of overlay.points.slice(1)) {
							const pxy = this.latlngToPxPy(p, zoom, centerXY, scale);
							// console.log(`[line] drawing to (${px}, ${py})`);
							ctx.lineTo(pxy.x, pxy.y);
						}
						ctx.closePath()
						if (overlay.options.fillStyle) {
							ctx.fillStyle = overlay.options.fillStyle;
							ctx.fill();
						}
						if (overlay.options.strokeStyle && overlay.options.lineWidth > 0) {
							ctx.strokeStyle = overlay.options.strokeStyle;
							ctx.lineWidth = overlay.options.lineWidth;
							ctx.lineCap = overlay.options.lineCap;
							ctx.lineJoin = overlay.options.lineJoin;
							ctx.stroke();
						}
					}
					break;
				}
				case 'circle': {
					const ccenter = this.latlngToPxPy(overlay.center, zoom, centerXY, scale);
					ctx.beginPath();
					ctx.arc(ccenter.x, ccenter.y, overlay.options.radius, 0, 2 * Math.PI, false);
					if (overlay.options.fillStyle) {
						ctx.fillStyle = overlay.options.fillStyle;
						ctx.fill();
					}
					if (overlay.options.strokeStyle && overlay.options.lineWidth > 0) {
						ctx.strokeStyle = overlay.options.strokeStyle;
						ctx.lineWidth = overlay.options.lineWidth;
						ctx.stroke();
					}
					break;
				}
				case 'rect': {
					ctx.beginPath();
					const min = this.latlngToPxPy(overlay.bounds.min, zoom, centerXY, scale);
					const max = this.latlngToPxPy(overlay.bounds.max, zoom, centerXY, scale);
					ctx.rect(min.x, min.y, max.x - min.x, max.y - min.y);
					if (overlay.options.fillStyle) {
						ctx.fillStyle = overlay.options.fillStyle;
						ctx.fill();
					}
					if (overlay.options.strokeStyle && overlay.options.lineWidth > 0) {
						ctx.strokeStyle = overlay.options.strokeStyle;
						ctx.lineWidth = overlay.options.lineWidth;
						ctx.lineJoin = overlay.options.lineJoin;
						ctx.lineCap = overlay.options.lineCap;
						ctx.stroke();
					}
					break;
				}
				case 'text': {
					const anchor = this.latlngToPxPy(overlay.anchor, zoom, centerXY, scale);
					const opts = overlay.options;
					ctx.textAlign = opts.textAlign;
					ctx.textBaseline = opts.textBaseline;
					ctx.direction = opts.direction;
					ctx.font = opts.font;
					if (opts.fillStyle) {
						ctx.fillStyle = opts.fillStyle;
						ctx.fillText(overlay.text, anchor.x + opts.px, anchor.y + opts.py, opts.maxWidth);
					}
					if (opts.strokeStyle) {
						ctx.strokeStyle = opts.strokeStyle;
						ctx.strokeText(overlay.text, anchor.x + opts.px, anchor.y + opts.py, opts.maxWidth);
					}
					break;
				}
				case 'scale': {
					const midLeft: LatLng = { lat: center.lat, lng: extent.min.lng };
					const midRight: LatLng = { lat: center.lat, lng: extent.max.lng };
					const mapWidth = this.distance(midLeft, midRight);
					const maxDist = mapWidth * overlay.options.maxWidth / 100;
					let label: string;
					let ratio: number;
					if (overlay.options.units === 'metric') {
						const scaleLen = this.scaleDistance(maxDist);
						label = (scaleLen > 1000) ? `${scaleLen / 1000} km` : `${scaleLen} m`;
						ratio = scaleLen / maxDist;
					} else {
						const maxFeet = maxDist * FEET_PER_METER;
						if (maxFeet > FEET_PER_MILE) {
							const maxMiles = maxFeet / FEET_PER_MILE;
							const scaleLen = this.scaleDistance(maxMiles);
							label = `${scaleLen} mi`;
							ratio = scaleLen / maxMiles;
						} else {
							const scaleLen = this.scaleDistance(maxFeet);
							label = `${scaleLen} ft`;
							ratio = scaleLen / maxFeet;
						}
					}
					const midLeftP = this.latlngToPxPy(midLeft, zoom, centerXY, scale);
					const midRightP = this.latlngToPxPy(midRight, zoom, centerXY, scale);
					const widthP = Math.abs(midRightP.x - midLeftP.x);
					const dx = widthP * ratio * overlay.options.maxWidth / 100;
					let p0: Point = { x: 0, y: 0 };
					const mpx = Math.max(overlay.options.mx * width / 100, overlay.options.my * height / 100);
					const margin: Point = { x: mpx, y: mpx };
					switch (overlay.options.position) {
						case 'bottomleft': {
							p0 = { x: margin.x, y: height - margin.y - overlay.options.height };
							break;
						}
						case 'bottomright': {
							p0 = { x: width - dx - margin.x, y: height - margin.y - overlay.options.height };
							break;
						}
						case 'topleft': {
							p0 = { x: margin.x, y: margin.y };
							break;
						}
						case 'topright': {
							p0 = { x: width - dx - margin.x, y: margin.y };
							break;
						}
						default: break;
					}
					const p1 = { x: p0.x + dx, y: p0.y + overlay.options.height };
					// box
					const boxStyle = overlay.options.boxStyle;
					if (boxStyle.fillStyle !== undefined) {
						ctx.fillStyle =boxStyle.fillStyle;
						ctx.fillRect(p0.x, p0.y, Math.abs(p1.x - p0.x), Math.abs(p1.y - p0.y));
					}
					if (boxStyle.strokeStyle !== undefined) {
						ctx.beginPath();
						ctx.moveTo(p0.x, p0.y);
						ctx.lineTo(p0.x, p1.y);
						ctx.lineTo(p1.x, p1.y);
						ctx.lineTo(p1.x, p0.y);
						ctx.strokeStyle = boxStyle.strokeStyle;
						ctx.lineWidth = boxStyle.lineWidth;
						ctx.lineCap = boxStyle.lineCap;
						ctx.lineJoin = boxStyle.lineJoin;
						ctx.stroke();
					}
					// text
					const anchor: Point = { x: 0.5 * (p0.x + p1.x), y: p1.y - 3 };
					const textStyle = overlay.options.textStyle;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'bottom';
					ctx.direction = 'ltr';
					ctx.font = textStyle.font;
					if (textStyle.fillStyle) {
						ctx.fillStyle = textStyle.fillStyle;
						ctx.fillText(label, anchor.x, anchor.y, p1.x - p0.x);
					}
					if (textStyle.strokeStyle) {
						ctx.strokeStyle = textStyle.strokeStyle;
						ctx.strokeText(label, anchor.x, anchor.y, p1.x - p0.x);
					}

					break;
				}
				default:
					throw new Error(`Unknown overlay type "${type}"`);
			}
		}
		// done
		return canvas;
	}

}
