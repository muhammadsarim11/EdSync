// Thin Daily.co REST client (https://docs.daily.co/reference/rest-api). Rooms
// are private: nobody can join without a meeting token minted here, and the
// tokens carry the user's identity and whether they are the room owner.

const DAILY_API = 'https://api.daily.co/v1';

export const getDailyConfig = () => {
  const apiKey = process.env.DAILY_API_KEY;
  const domain = process.env.DAILY_DOMAIN;
  if (!apiKey || !domain) return null;
  return { apiKey, domain };
};

export const liveRoomName = (lectureId) => `edsync-${lectureId}`;

const dailyFetch = async (config, path, { method = 'GET', body } = {}) => {
  const res = await fetch(`${DAILY_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
};

// Creates the room, or reuses it if a previous "start" already did (Daily
// answers 400 "already exists"), so starting a class is idempotent.
export const ensureRoom = async (config, roomName, expiresAtSeconds) => {
  const created = await dailyFetch(config, '/rooms', {
    method: 'POST',
    body: {
      name: roomName,
      privacy: 'private',
      properties: { exp: expiresAtSeconds, eject_at_room_exp: true, enable_chat: false }
    }
  });
  if (created.ok) return created.data.url;

  const existing = await dailyFetch(config, `/rooms/${roomName}`);
  if (existing.ok) return existing.data.url;

  throw new Error(`Daily room creation failed (${created.status})`);
};

export const createMeetingToken = async (
  config,
  { roomName, userId, userName, isOwner, expiresAtSeconds }
) => {
  const res = await dailyFetch(config, '/meeting-tokens', {
    method: 'POST',
    body: {
      properties: {
        room_name: roomName,
        user_id: userId,
        user_name: userName,
        is_owner: isOwner,
        exp: expiresAtSeconds
      }
    }
  });
  if (!res.ok) throw new Error(`Daily token creation failed (${res.status})`);
  return res.data.token;
};

export const deleteRoom = async (config, roomName) => {
  const res = await dailyFetch(config, `/rooms/${roomName}`, { method: 'DELETE' });
  // 404 means it is already gone, which is what we wanted.
  if (!res.ok && res.status !== 404) throw new Error(`Daily room deletion failed (${res.status})`);
};
