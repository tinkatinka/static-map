export const fetch = (typeof window === 'undefined' || window?.fetch === undefined)
	? require('node-fetch')
	: window.fetch.bind(window);
