import { writeFileSync } from 'fs';
import { StaticMap } from '../src';


describe('Test map rendering', () => {
	it('should render a berlin map', async () => {
		const map = new StaticMap({
			extent: {
				min: { lat: 52.4, lng: 13.3 },
				max: { lat: 52.6, lng: 13.5 }
			},
			tileCache: '/tmp/tiles'
		});
		const buffer = await map.renderToBuffer();
		writeFileSync('/tmp/map_berlin.png', buffer);
	});
	it('should render a map with an image', async () => {
		const map = new StaticMap({
			width: 512,
			height: 512,
			paddingX: 64,
			paddingY: 64,
			tileCache: '/tmp/tiles',
			grayscale: true
		})
			.addImage(
				'https://api.tetraeder.solar/render_detail_images/berlin/details/2000/radiation_2541_300x200.png',
				{
					min: { lat: 52.5129470739252, lng: 13.2986032091238 },
					max: { lat: 52.5133773418867, lng: 13.2988693235785 }
				}
			);
		const buffer = await map.renderToBuffer();
		writeFileSync('/tmp/map_zille.png', buffer);
	});
	it('should render a map with a blue line from Paris to Berlin to Munich and back and a red dot on Hamburg', async () => {
		const map = new StaticMap({
			paddingX: 32,
			paddingY: 32,
			scaling: false,
			tileCache: '/tmp/tiles'
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
		writeFileSync('/tmp/map_line.png', buffer);
	});
	it('should render a map of Berlin with custom drawing', async () => {
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
		writeFileSync('/tmp/map_text.png', buffer);
	});
});
