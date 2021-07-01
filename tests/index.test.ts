// import * as fs from 'fs';
import * as path from 'path';
import { MatchImageSnapshotOptions, toMatchImageSnapshot } from 'jest-image-snapshot';

import { StaticMap } from '../src';


// image snapshots
expect.extend({ toMatchImageSnapshot });
const iso = (id: string): MatchImageSnapshotOptions => ({
	customSnapshotsDir: path.resolve(__dirname, './snapshots'),
	customDiffDir: path.resolve(__dirname, './diffs'),
	customSnapshotIdentifier: id,
	comparisonMethod: 'ssim',
	failureThreshold: 0.02,
	failureThresholdType: 'percent'
});

// path to tile cache
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
		expect(buffer).toMatchImageSnapshot(iso('map_berlin'));
		// fs.writeFileSync('/tmp/map_berlin.png', buffer);
	});
	it('should render a map with an image', async () => {
		const map = new StaticMap({
			width: 512,
			height: 512,
			paddingX: 64,
			paddingY: 64,
			tileCache: cachePath,
			grayscale: true
		})
			.addImage(
				`${__dirname}/roof.png`,
				{
					min: { lat: 52.5129470739252, lng: 13.2986032091238 },
					max: { lat: 52.5133773418867, lng: 13.2988693235785 }
				}
			);
		const buffer = await map.renderToBuffer();
		expect(buffer).toMatchImageSnapshot(iso('map_zille'));
		// writeFileSync('/tmp/map_zille.png', buffer);
	});
	it('should render a map with a blue line from Paris to Berlin to Munich and back and a red dot on Hamburg', async () => {
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
			});
		const buffer = await map.renderToBuffer();
		expect(buffer).toMatchImageSnapshot(iso('map_line'));
		// writeFileSync('/tmp/map_line.png', buffer);
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
		ctx.fillText('© OpenStreetMap contributors', canvas.width-8, canvas.height-8);
		const buffer = await canvas.toBuffer();
		expect(buffer).toMatchImageSnapshot(iso('map_text'));
		// writeFileSync('/tmp/map_text.png', buffer);
	});
});
