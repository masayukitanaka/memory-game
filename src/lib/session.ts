import postgres from 'postgres';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'memory_game_session';
const SESSION_DURATION_DAYS = 7;

// PostgreSQL client
function getDB() {
  const connectionString = process.env.SUPABASE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('SUPABASE_CONNECTION_STRING is not defined');
  }
  return postgres(connectionString);
}

export interface SessionData {
  player_name?: string;
  [key: string]: any;
}

export interface Session {
  id: string;
  data: SessionData;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Generate a random session ID
 */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get or create a session
 */
export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  const sql = getDB();

  try {
    if (sessionId) {
      // Try to get existing session
      const [session] = await sql`
        SELECT * FROM memory_game.sessions
        WHERE id = ${sessionId}
        AND expires_at > NOW()
      `;

      if (session) {
        return {
          id: session.id,
          data: session.data || {},
          expires_at: new Date(session.expires_at),
          created_at: new Date(session.created_at),
          updated_at: new Date(session.updated_at),
        };
      }
    }

    // Create new session
    const newSessionId = generateSessionId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    const [newSession] = await sql`
      INSERT INTO memory_game.sessions (id, data, expires_at)
      VALUES (${newSessionId}, '{}', ${expiresAt.toISOString()})
      RETURNING *
    `;

    // Set cookie
    cookieStore.set(SESSION_COOKIE_NAME, newSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return {
      id: newSession.id,
      data: newSession.data || {},
      expires_at: new Date(newSession.expires_at),
      created_at: new Date(newSession.created_at),
      updated_at: new Date(newSession.updated_at),
    };
  } finally {
    await sql.end();
  }
}

/**
 * Update session data
 */
export async function updateSession(sessionId: string, data: SessionData): Promise<void> {
  const sql = getDB();

  try {
    await sql`
      UPDATE memory_game.sessions
      SET data = ${sql.json(data)}, updated_at = NOW()
      WHERE id = ${sessionId}
    `;
  } finally {
    await sql.end();
  }
}

/**
 * Get session data value
 */
export function getSessionData<T = any>(session: Session, key: string, defaultValue?: T): T | undefined {
  return (session.data[key] as T) ?? defaultValue;
}

/**
 * Get all active sessions (within last 5 minutes for more lenient filtering)
 */
export async function getAllActiveSessions(): Promise<Session[]> {
  const sql = getDB();

  try {
    const sessions = await sql`
      SELECT * FROM memory_game.sessions
      WHERE expires_at > NOW()
      AND updated_at > NOW() - INTERVAL '5 minutes'
      ORDER BY updated_at DESC
    `;

    return sessions.map((session) => ({
      id: session.id,
      data: session.data || {},
      expires_at: new Date(session.expires_at),
      created_at: new Date(session.created_at),
      updated_at: new Date(session.updated_at),
    }));
  } finally {
    await sql.end();
  }
}

/**
 * Update session timestamp (heartbeat)
 */
export async function heartbeatSession(): Promise<void> {
  const session = await getSession();
  const sql = getDB();

  try {
    await sql`
      UPDATE memory_game.sessions
      SET updated_at = NOW()
      WHERE id = ${session.id}
    `;
  } finally {
    await sql.end();
  }
}
