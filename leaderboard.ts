interface PlayerRow {
  telegram_id: string;
  username: string;
  level: number;
  total_ore: number;
  coins: number;
  plasma: number;
}

interface Env {
  DB: D1Database;
}

const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function isValidScore(input: any): boolean {
  return !!input &&
    typeof input.telegram_id === "string" &&
    /^[a-zA-Z0-9_-]{1,100}$/.test(input.telegram_id) &&
    typeof input.username === "string" &&
    input.username.trim().length >= 2 &&
    input.username.length <= 32 &&
    !/[\u0000-\u001f\u007f]/.test(input.username) &&
    Number.isSafeInteger(input.level) &&
    input.level >= 1 &&
    input.level <= 2147483647 &&
    Number.isSafeInteger(input.total_ore) &&
    input.total_ore >= 0 &&
    [input.coins ?? 0, input.plasma ?? 0].every(
      (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0
    );
}

export async function onRequest(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const request = context.request;
  const db = context.env.DB;

  if (request.method !== "GET" && request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...headers, Allow: "GET, POST" },
    });
  }

  if (request.method === "GET") {
    try {
      const result = await db.prepare(`
        SELECT
          player_id AS telegram_id,
          username,
          level,
          total_ore,
          coins,
          plasma
        FROM players
        ORDER BY level DESC, total_ore DESC, player_id ASC
        LIMIT 20
      `).all<PlayerRow>();

      return json(result.results ?? []);
    } catch {
      return json({ error: "Leaderboard temporarily unavailable" }, 503);
    }
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Forbidden" }, 403);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 4096) return json({ error: "Payload too large" }, 413);

  let input: any;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return json({ error: "Payload too large" }, 413);
    input = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!isValidScore(input)) return json({ error: "Invalid player score" }, 400);

  const playerId = input.telegram_id as string;
  const username = (input.username as string).trim();
  const level = input.level as number;
  const totalOre = input.total_ore as number;
  const coins = (input.coins ?? 0) as number;
  const plasma = (input.plasma ?? 0) as number;

  try {
    const nicknameOwner = await db.prepare(`
      SELECT player_id FROM players
      WHERE lower(trim(username)) = lower(trim(?1))
        AND player_id <> ?2
      LIMIT 1
    `).bind(username, playerId).first<{ player_id: string }>();

    if (nicknameOwner) return json({ error: "Nickname already taken" }, 409);

    await db.prepare(`
      INSERT INTO players
        (player_id, username, level, total_ore, coins, plasma, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)
      ON CONFLICT(player_id) DO UPDATE SET
        username = excluded.username,
        level = excluded.level,
        total_ore = excluded.total_ore,
        coins = excluded.coins,
        plasma = excluded.plasma,
        updated_at = CURRENT_TIMESTAMP
    `).bind(playerId, username, level, totalOre, coins, plasma).run();

    return json({ saved: true });
  } catch (error) {
    const message = String(error);
    if (/UNIQUE constraint failed|players_username_unique/i.test(message)) {
      return json({ error: "Nickname already taken" }, 409);
    }
    return json({ error: "Leaderboard temporarily unavailable" }, 503);
  }
}
