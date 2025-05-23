const base64img = async (
	url: string, mimetype: string = 'image/png',
	userAgent: string = 'StaticMap/2'
): Promise<string> => {
	const response = await fetch(url, {
		headers: {
			'User-Agent': userAgent
		}
	});
	if (response.status !== 200) {
		throw new Error(`Server status ${response.status} for request '${url}'`);
	}
	const buf: ArrayBuffer = await response.arrayBuffer();
	const imgstr = Buffer.from(buf).toString('base64');
	const dataurl = 'data:' + mimetype.trim() + ';base64,' + imgstr;
	return dataurl;
};

export default base64img;
