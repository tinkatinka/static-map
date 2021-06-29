# static-map
A node library to generate static map images.

## Acknowledgements
The code is heavily inspired by the python-based library [staticmap](https://github.com/komoot/staticmap).

To generate the final image [node-canvas](https://github.com/Automattic/node-canvas) is being used.

## Installation
```bash
$ npm install static-map
```

## Usage
```ts
import { StaticMap } from 'static-map';
const map = new StaticMap(...);
```
The constructor can be called with an optional `StaticMapOptions` object, overriding the defaults:

```ts
{
	width: number;            // width of the image in pixels [default: 512]
	height: number;           // height of the image in pixels [default: 512]
	paddingX: number;         // horizontal padding in pixels [default: 0]
	paddingY: number;         // vertical padding in pixels [default: 0]
	extent?: {                // extent of the map [default: `undefined`]
		min: { lat: number; lng: number; }
		max: { lat: number; lng: number; }
	}
	tileURL: string;          // template string for tile URL [default: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png']
	tileSize: number;         // size of tiles [default: 256]
	tileMaxZoom: number;      // maximum zoom available for tiles [default: 20]
	tileCache?: string;       // path to a cache directory for tiles [default: `undefined`]
	backgroundColor?: string; // image background color (CSS string) [default: `undefined`]
	grayscale: boolean;       // apply a grayscale filter to map tiles (not overlays) [default: `false`]
}
```
**Note**: Either an explicit `extent` of the map *or* at least one overlay image (see below) **must** be defined,
otherwise the image generation will fail.

### Overlay images
Can be added using

```ts
.addImage({
	src: string,
	bounds: {
		min: { lat: number; lng: number },
		max: { lat: number; lng: number }
	}
});
```

### Map image
Can be obtained via async functions

```ts
.renderToDataURL(): Promise<string>
	/* or */
.renderToBuffer(): Promise<Buffer>
```
Both of them will fail if the `.extent` of the map is not explicitly defined or cannot be computed (because there are
no overlay images).

### Examples

#### with explicit extent
```ts
import { StaticMap, StaticMapOptions } from 'static-map';
const mapopt: StaticMapOptions = {
	width: 512,
	height: 512,
	extent: {
		min: { lat: 52.4, lng: 13.3 },
		max: { lat: 52.6, lng: 13.5 }
	}
};
const map = new StaticMap(mapopt)
const src = await map.renderToDataURL();
...
```

#### with overlay image and computed extent
```ts
import { StaticMap, StaticMapImage, StaticMapOptions } from 'static-map';
const mapopt: StaticMapOptions = {
	width: 512,
	height: 512,
	paddingX: 32,
	paddingY: 32,
	tileCache: '/tmp/tiles'
};
const img: StaticMapImage = {
	src: 'https://my.funky.src/image.png',
	bounds: {
		min: { lat: 1.0, lng: 2.0 },
		max: { lat: 2.0, lng: 3.0 }
	}
};
const map = new StaticMap(mapopt).addImage(img);
const buffer = await map.renderToBuffer();
...
```

## Attribution
Depending on which tiles are being used, attribution of the data has to be provided. When using the static map image
you are responsible to do so.

E.g. see [OpenStreetMap](https://www.openstreetmap.org/copyright) for information regarding the copyright and
attribution of OpenStreetMap tiles.
