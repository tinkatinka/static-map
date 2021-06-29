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
			.addImage({
				src: 'https://api.tetraeder.solar/render_detail_images/berlin/details/2000/radiation_2541_300x200.png',
				bounds: {
					min: { lat: 52.5129470739252, lng: 13.2986032091238 },
					max: { lat: 52.5133773418867, lng: 13.2988693235785 }
				}
			});
		const buffer = await map.renderToBuffer();
		writeFileSync('/tmp/map_zille.png', buffer);
	});
});
