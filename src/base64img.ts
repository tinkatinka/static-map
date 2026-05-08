export function mimeFromURL(url: string) {
	const str = url.toLowerCase();
	if (/png$/.test(str)) {
		return 'image/png';
	} else if (/(jpg)|(jpeg)$/.test(str)) {
		return 'image/jpeg';
	} else if (/svg$/.test(str)) {
		return 'image/svg+xml';
	} else {
		return 'application/octet-stream';
	}
}

export async function base64img(
	url: string,
	userAgent: string,
	timeout: number = 0
): Promise<string> {
	let timeoutId: NodeJS.Timeout | undefined;
	try {
		const controller = new AbortController();
		if (timeout > 1) {
			timeoutId = setTimeout(() => controller.abort(), timeout);
		}
		const response = await fetch(url, {
			headers: {
				'User-Agent': userAgent
			},
			signal: controller.signal
		});
		if (!response.ok) {
			throw new Error(`Server status ${response.status} for request '${url}'`);
		}
		const buf: ArrayBuffer = await response.arrayBuffer();
		const imgstr = Buffer.from(buf).toString('base64');
		const mimetype = response.headers.get('Content-Type')?.toLowerCase() ?? mimeFromURL(url);
		const dataurl = 'data:' + mimetype.trim() + ';base64,' + imgstr;
		return dataurl;
	} finally {
		clearTimeout(timeoutId);
	}
};
