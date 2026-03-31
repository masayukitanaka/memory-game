export const runtime = 'edge';

export async function GET(
  request: Request,
  context: { params: Promise<{ game_id: string }> }
) {
  const { game_id: gameId } = await context.params;
  const env = (context as any).env || (globalThis as any).env;

  if (!env?.GAME_ROOM) {
    return new Response('Durable Object binding not found', { status: 500 });
  }

  // Get the Durable Object stub
  const id = env.GAME_ROOM.idFromName(gameId);
  const stub = env.GAME_ROOM.get(id);

  // Forward the WebSocket upgrade request to the Durable Object
  return stub.fetch(request);
}
