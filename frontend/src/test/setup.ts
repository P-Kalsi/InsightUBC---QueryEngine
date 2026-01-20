import '@testing-library/jest-dom';

global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

HTMLCanvasElement.prototype.getContext = () => ({
	fillRect: () => {},
	clearRect: () => {},
	getImageData: () => ({ data: [] }),
	putImageData: () => {},
	createImageData: () => [],
	setTransform: () => {},
	drawImage: () => {},
	save: () => {},
	restore: () => {},
	beginPath: () => {},
	moveTo: () => {},
	lineTo: () => {},
	closePath: () => {},
	stroke: () => {},
	translate: () => {},
	scale: () => {},
	rotate: () => {},
	arc: () => {},
	fill: () => {},
	measureText: () => ({ width: 0 }),
	transform: () => {},
	rect: () => {},
	clip: () => {},
}) as any;

