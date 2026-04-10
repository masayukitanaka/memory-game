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
			GameRoom: '/Users/mtanaka/Dev/WebProjects/memory-game/src/durable-objects/GameRoom.ts',
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
