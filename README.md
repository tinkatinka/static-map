# static-map
A node library to generate static map images

## Installation
```bash
$ npm install static-map
```

## Usage
```ts
import { StaticMap, StaticMapOptions } from 'static-map';
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

## License

(The MIT License)

Copyright (c) 2021 Florian Gmeiner <florian@tinkatinka.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
