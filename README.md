# static-map
A node library to generate static map images.

## Acknowledgements
The code is heavily inspired by the python-based library [staticmap](https://github.com/komoot/staticmap).

To generate the final image [node-canvas](https://github.com/Automattic/node-canvas) is being used.

## Installation
```bash
$ npm install @tinkatinka/static-map
```

## Usage
```ts
import { StaticMap } from '@tinkatinka/static-map';
const map = new StaticMap(...);
```
The constructor can be called with an optional `StaticMapOptions` object, overriding the defaults:

```ts
{
  width: number;            // width of the image in pixels [default: 512]
  height: number;           // height of the image in pixels [default: 512]
  padding: number;          // padding in pixels [default: 0]
  paddingX?: number;        // horizontal padding (overrides `padding`)
  paddingY?: number;        // vertical padding (overrides `paddings`)
  paddingLeft?: number;     // left padding (overrides `paddingX`)
  paddingRight?: number;    // right padding (overrides `paddingX`)
  paddingTop?: number;      // top padding (overrides `paddingY`)
  paddingBottom?: number;   // bottom padding (overrides `paddingY`)
  extent?: LatLngBounds;    // extent of the map [default: `undefined`]
  scaling: boolean;         // scale image to match size and padding exactly [default: `true`]
  tileURL: string;          // template string for tile URL [default: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png']
  tileSize: number;         // size of tiles [default: 256]
  tileMaxZoom: number;      // maximum zoom available for tiles [default: 20]
  tileCache?: string;       // path to a cache directory for tiles [default: `undefined`]
  backgroundColor?: string; // image background color (CSS string) [default: `undefined`]
  grayscale: boolean;       // apply a grayscale filter to map tiles (not overlays) [default: `false`]
}
```
**Note**: Either an explicit `extent` of the map *or* at least one overlay (see below) **must** be defined,
otherwise the image generation will fail.

### Types

#### LatLng
```ts
{
  lat: number; // latitude
  lng: number; // longitude
}
```

#### LatLngBounds
```ts
{ 
  min: LatLng; // minimum point
  max: LatLng; // maximum point
}
```

### Overlays

#### Lines
```ts
.addLine(src: LatLng, dst: LatLng, options?: Partial<StaticMapLineOptions>);

.addLines(points: LatLng[], options?: Partial<StaticMapLineOptions>);
```

Options:

```ts
interface StaticMapLineOptions {
  strokeStyle: string;                   // css stroke style [default: 'black']
  lineWidth: number;                     // line width in pixels [default: 1.0]
  lineCap: 'butt' | 'round' | 'square';  // [default: 'round']
  lineJoin: 'bevel' | 'round' | 'miter'; // [default: 'round']
}
```

#### Circles
```ts
.addCircle(center: LatLng, options?: Partial<StaticMapCircleOptions>);
```

Options:

```ts
interface StaticMapCircleOptions {
  radius: number;       // in pixels [default: 5.0]
  strokeStyle?: string; // css stroke style or undefined for no stroke [default: 'black']
  lineWidth: number;    // line width in pixels [default: 1.0]
  fillStyle?: string;   // css fill style or undefined for no fill [default: 'rgba(0, 0, 0, 0.3)']
}
```

#### Rectangles
```ts
.addRectangle(bounds; LatLngBounds, options?: Parital<StaticMapRectOptions>);
```

Options:

```ts
interface StaticMapRectOptions {
  strokeStyle: string;                   // css stroke style [default: 'black']
  lineWidth: number;                     // line width in pixels [default: 1.0]
  lineCap: 'butt' | 'round' | 'square';  // [default: 'round']
  lineJoin: 'bevel' | 'round' | 'miter'; // [default: 'round']
}
```

#### Polygons
```ts
addPolygon(points: LatLng[], options?: Partial<StaticMapPolygonOptions>);
```

Options:

```ts
interface StaticMapPolygonOptions {
  strokeStyle: string;                   // css stroke style [default: 'black']
  lineWidth: number;                     // line width in pixels [default: 1.0]
  lineCap: 'butt' | 'round' | 'square';  // [default: 'round']
  lineJoin: 'bevel' | 'round' | 'miter'; // [default: 'round']
}
```

#### Text
```ts
.addText(text: string, anchor: LatLng, options?: Partial<StaticMapTextOptions>);
```

Options:

```ts
interface StaticMapTextOptions {
  px: number;           // padding x [default: 0]
  py: number;           // padding y [default: 0]
  maxWidth?: number;    // text max width [default: undefined]
  direction: string;    // default: 'ltr'
  font: string;         // default: '12px sans-serif'
  textAlign: string;    // default: 'center'
  textBaseline: string; // default: 'middle'
  strokeStyle?: string; // css stroke style or undefined for no stroke [default: undefined]
  lineWidth: number;    // line width in pixels [default: 1.0]
  fillStyle?: string;   // css fill style or undefined for no fill [default: 'black']
}
```

#### Images
```ts
.addImage(src: string, bounds: LatLngBounds);
```

#### Scales
```ts
.addScale(options?: PartialDeep<StaticMapScaleOptions>);
```

Options:

```ts
export interface StaticMapScaleOptions {
  units: 'metric' | 'imperial';            // [default: 'metric']
  position: '(bottom|top)(left|right)';    // [default: 'bottomleft']
  height: number;                          // in pixels [default: 16]
  maxWidth: number;                        // percent [default: 20]
  mx: number;                              // margin x in percent [default: 4]
  my: number;                              // margin y in percent [default: 4]
  boxStyle: {                              // drawing style of the box
    lineWidth: number;                     // line width in pixels [default: 1.0]
    lineCap: 'butt' | 'round' | 'square';  // [default: 'square']
    lineJoin: 'bevel' | 'round' | 'miter'; // [default: 'miter']
    strokeStyle: string;                   // css stroke style [default: 'black']
    fillStyle: string;                     // css fill style [default: 'rgba(255, 255, 255, 0.3)']
  };
  textStyle: {                             // drawing style of the label
    font: string;                          // [default: '12px sans-serif']
    lineWidth: number;                     // line width in pixels [default: 1.0]
    lineCap: 'butt' | 'round' | 'square';  // [default: 'square']
    lineJoin: 'bevel' | 'round' | 'miter'; // [default: 'miter']
    strokeStyle: string;                   // css stroke style [default: 'black']
    fillStyle: string;                     // css fill style [default: 'rgba(255, 255, 255, 0.3)']
  };
}
```

### Output
Can be obtained via async functions

```ts
.renderToDataURL(): Promise<string>

.renderToBuffer(): Promise<Buffer>

.renderToCanvas(): Promise<Canvas>
```

All of them will fail if the `.extent` of the map is not explicitly defined or cannot be computed (because there are
no overlays).

## Examples

### with explicit extent
```ts
import { StaticMap } from '@tinkatinka/static-map';
const map = new StaticMap({
  width: 512,
  height: 512,
  extent: {
  	min: { lat: 52.4, lng: 13.3 },
  	max: { lat: 52.6, lng: 13.5 }
  }
});
const src = await map.renderToDataURL();
...
```

### with overlay image and computed extent
```ts
import { StaticMap } from '@tinkatinka/static-map';
const map = new StaticMap({
  width: 512,
  height: 512,
  paddingX: 32,
  paddingY: 32,
  tileCache: '/tmp/tiles'
})
  .addImage('https://my.funky.src/image.png', {
  	min: { lat: 1.0, lng: 2.0 },
  	max: { lat: 2.0, lng: 3.0 }
  });
const buffer = await map.renderToBuffer();
...
```

### rendering to Canvas for custom drawing
```ts
import { StaticMap } from '@tinkatinka/static-map'
const map = new StaticMap({
  extent: {
  	min: { lat: 52.4, lng: 13.3 },
  	max: { lat: 52.6, lng: 13.5 }
  },
  grayscale: true,
  tileCache: '/tmp/tiles'
});
const canvas = await map.renderToCanvas();
const ctx = canvas.getContext('2d');
ctx.textAlign = 'end';
ctx.textBaseline = 'bottom';
ctx.font = '16px sans-serif';
ctx.fillStyle = 'blue';
ctx.fillText('© OpenStreetMap contributors', canvas.width-8, canvas.height-8);
const buffer = await canvas.toBuffer();
...
```

## Attribution
Depending on which tiles are being used, attribution of the data has to be provided. When using the static map image
you are responsible to do so.

E.g. see [OpenStreetMap](https://www.openstreetmap.org/copyright) for information regarding the copyright and
attribution of OpenStreetMap tiles.
