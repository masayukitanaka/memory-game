export default {
	default: {
		override: {
			wrapper: "cloudflare-node",
			converter: "edge",
			proxyExternalRequest: "fetch",
			incrementalCache: "dummy",
			tagCache: "dummy",
			queue: "dummy",
		},
		// Export Durable Objects
		additionalExports: {
			GameRoom: './src/durable-objects/GameRoom',
		},
	},
	edgeExternals: ["node:crypto"],
	middleware: {
		external: true,
		override: {
			wrapper: "cloudflare-edge",
			converter: "edge",
			proxyExternalRequest: "fetch",
			incrementalCache: "dummy",
			tagCache: "dummy",
			queue: "dummy",
		},
	},
};
