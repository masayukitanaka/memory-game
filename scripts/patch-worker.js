#!/usr/bin/env node

/**
 * This script patches the generated worker.js to:
 * 1. Export the GameRoom Durable Object class
 * 2. Add WebSocket routing logic
 */

const fs = require('fs');
const path = require('path');

const workerPath = path.join(__dirname, '../.open-next/worker.js');

if (!fs.existsSync(workerPath)) {
  console.error('Error: .open-next/worker.js not found. Please run the build first.');
  process.exit(1);
}

let content = fs.readFileSync(workerPath, 'utf8');
let modified = false;

// 1. Add GameRoom export
if (!content.includes('export { GameRoom }')) {
  const bucketCachePurgeExport = 'export { BucketCachePurge } from "./.build/durable-objects/bucket-cache-purge.js";';
  const gameRoomExport = '//@ts-expect-error: Will be resolved by wrangler build\nexport { GameRoom } from "../src/durable-objects/GameRoom.js";';

  if (content.includes(bucketCachePurgeExport)) {
    content = content.replace(
      bucketCachePurgeExport,
      bucketCachePurgeExport + '\n' + gameRoomExport
    );
    console.log('✓ Added GameRoom export to worker.js');
    modified = true;
  } else {
    console.error('Error: Could not find the expected export line in worker.js');
    process.exit(1);
  }
} else {
  console.log('✓ GameRoom export already exists');
}

// 2. Add WebSocket routing logic
if (!content.includes('Handle WebSocket requests for game rooms')) {
  const fetchStart = 'const url = new URL(request.url);';
  const wsRouting = `const url = new URL(request.url);

            // Handle WebSocket requests for game rooms
            const wsMatch = url.pathname.match(/^\\/api\\/game\\/([^\\/]+)\\/ws$/);
            if (wsMatch && env.GAME_ROOM) {
                const gameId = wsMatch[1];
                const id = env.GAME_ROOM.idFromName(gameId);
                const stub = env.GAME_ROOM.get(id);
                return stub.fetch(request);
            }
`;

  if (content.includes(fetchStart)) {
    content = content.replace(fetchStart, wsRouting);
    console.log('✓ Added WebSocket routing logic to worker.js');
    modified = true;
  } else {
    console.error('Error: Could not find the expected fetch handler in worker.js');
    process.exit(1);
  }
} else {
  console.log('✓ WebSocket routing logic already exists');
}

if (modified) {
  fs.writeFileSync(workerPath, content, 'utf8');
  console.log('✓ Successfully patched worker.js');
} else {
  console.log('✓ No changes needed, worker.js is already patched');
}
