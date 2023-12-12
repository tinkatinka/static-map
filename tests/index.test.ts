import * as fs from 'fs';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as path from 'path';
import * as url from 'url';

import { StaticMap } from '../src/index.js';


// path to tile cache
// eslint-disable-next-line @typescript-eslint/naming-convention, no-underscore-dangle
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const cachePath = path.resolve(__dirname, '..', '.cache');


describe('Test map rendering', () => {
	it('should render a berlin map', async () => {
		const map = new StaticMap({
			extent: {
				min: { lat: 52.4, lng: 13.3 },
				max: { lat: 52.6, lng: 13.5 }
			},
			tileCache: cachePath
		});
		const buffer = await map.renderToBuffer();
		assert(buffer.length > 0);
		fs.writeFileSync('/tmp/map_berlin.png', buffer);
	});
	it('should render a map with an image', async () => {
		const map = new StaticMap({
			width: 512,
			height: 512,
			padding: 64,
			tileCache: cachePath,
			grayscale: true
		})
			.addImage(
				`${__dirname}../../tests/roof.png`,
				{
					min: { lat: 52.5129470739252, lng: 13.2986032091238 },
					max: { lat: 52.5133773418867, lng: 13.2988693235785 }
				}
			);
		const buffer = await map.renderToBuffer();
		assert(buffer.length > 0);
		fs.writeFileSync('/tmp/map_zille.png', buffer);
	});
	it(
		'should render a map with a blue line from Paris to Berlin to Munich ' +
		'and back and a red dot on Hamburg and a rectangle on Cologne',
		async () => {
			const map = new StaticMap({
				paddingX: 32,
				paddingY: 32,
				scaling: false,
				tileCache: cachePath
			})
				.addLines([
					{ lat: 52.5, lng: 13.4 },
					{ lat: 48.9, lng: 2.3 },
					{ lat: 48.1, lng: 11.6 },
					{ lat: 52.5, lng: 13.4 }
				], {
					strokeStyle: 'blue'
				})
				.addCircle({ lat: 53.6, lng: 10.0 }, {
					strokeStyle: 'red',
					fillStyle: 'rgba(255,0,0,0.3)'
				})
				.addRectangle({
					min: { lat: 50.711, lng: 6.727 },
					max: { lat: 51.161, lng: 7.177 }
				}, {
					strokeStyle: 'yellow',
					fillStyle: 'rgba(255,255,0,0.3)'
				});
			const buffer = await map.renderToBuffer();
			assert(buffer.length > 0);
			fs.writeFileSync('/tmp/map_line.png', buffer);
		});
	it('should render a map with text', async () => {
		const map = new StaticMap({
			extent: {
				min: { lat: 52.4, lng: 13.3 },
				max: { lat: 52.6, lng: 13.5 }
			},
			grayscale: true,
			tileCache: cachePath
		})
			.addText('© OpenStreetMap contributors', { lat: 52.4, lng: 13.5645 }, {
				textAlign: 'end',
				textBaseline: 'bottom',
				font: '16px sans-serif',
				fillStyle: 'blue',
				px: -8,
				py: -7
			});
		const buffer = await map.renderToBuffer();
		assert(buffer.length > 0);
		fs.writeFileSync('/tmp/map_text.png', buffer);
	});
	it('should render a map of Berlin with custom drawing', async () => {
		const map = new StaticMap({
			extent: {
				min: { lat: 52.4, lng: 13.3 },
				max: { lat: 52.6, lng: 13.5 }
			},
			grayscale: true,
			tileCache: cachePath
		});
		const canvas = await map.renderToCanvas();
		const ctx = canvas.getContext('2d');
		ctx.textAlign = 'end';
		ctx.textBaseline = 'bottom';
		ctx.font = '16px sans-serif';
		ctx.fillStyle = 'blue';
		ctx.fillText('© OpenStreetMap contributors', canvas.width - 8, canvas.height - 8);
		const buffer = canvas.toBuffer();
		assert(buffer.length > 0);
		fs.writeFileSync('/tmp/map_custom.png', buffer);
	});
	it('should render a map of Berlin with scales', async () => {
		const map = new StaticMap({
			extent: {
				min: { lat: 52.4, lng: 13.3 },
				max: { lat: 52.6, lng: 13.5 }
			},
			grayscale: false,
			tileCache: cachePath
		})
			.addScale()
			.addScale({ position: 'topleft', boxStyle: { fillStyle: 'rgba(255, 0, 0, 0.3)' } })
			.addScale({ position: 'topright', boxStyle: { fillStyle: 'rgba(0, 255, 0, 0.3)' } })
			.addScale({ position: 'bottomright', boxStyle: { fillStyle: 'rgba(0, 0, 255, 0.3)' } });
		const buffer = await map.renderToBuffer();
		assert(buffer.length > 0);
		fs.writeFileSync('/tmp/map_scales.png', buffer);
	});
});
