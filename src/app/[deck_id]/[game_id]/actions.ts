'use server';

import { getSession, updateSession, getAllActiveSessions, heartbeatSession } from '@/lib/session';

export async function getSessionInfo() {
  const session = await getSession();
  return {
    sessionId: session.id,
    playerName: session.data.player_name || 'Anonymous',
    createdAt: session.created_at.toISOString(),
  };
}

export async function setPlayerName(name: string) {
  const session = await getSession();
  await updateSession(session.id, {
    ...session.data,
    player_name: name,
  });
  return { success: true };
}

export async function getAllSessions() {
  const currentSession = await getSession();
  const allSessions = await getAllActiveSessions();

  return {
    currentSessionId: currentSession.id,
    sessions: allSessions.map((session) => ({
      sessionId: session.id,
      playerName: session.data.player_name || 'Anonymous',
      updatedAt: session.updated_at.toISOString(),
      createdAt: session.created_at.toISOString(),
    })),
  };
}

export async function sendHeartbeat() {
  await heartbeatSession();
  return { success: true };
}
