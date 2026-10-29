
interface Env {
  DB: D1Database;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function onRequest(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  if (request.method === "GET") {
    try {
      const result = await env.DB.prepare(`
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
      `).all();

      return json(result.results ?? []);
    } catch {
      return json({ error: "Database unavailable" }, 503);
    }
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const length = Number(request.headers.get("content-length") || 0);

    if (length > 4096) {
      return json({ error: "Request too large" }, 413);
    }

    const input = await request.json() as Record<string, unknown>;

    const telegramId = String(input.telegram_id ?? "").trim();
    const username = String(input.username ?? "").trim();
    const level = Number(input.level);
    const totalOre = Number(input.total_ore ?? 0);
    const coins = Number(input.coins ?? 0);
    const plasma = Number(input.plasma ?? 0);

    if (
      !telegramId ||
      telegramId.length > 100 ||
      !username ||
      username.length > 40 ||
      !Number.isSafeInteger(level) ||
      level < 1 ||
      level > 1000000 ||
      !Number.isSafeInteger(totalOre) ||
      totalOre < 0 ||
      !Number.isSafeInteger(coins) ||
      coins < 0 ||
      !Number.isSafeInteger(plasma) ||
      plasma < 0
    ) {
      return json({ error: "Invalid player data" }, 400);
    }

    const existing = await env.DB.prepare(`
      SELECT player_id
      FROM players
      WHERE LOWER(TRIM(username)) = LOWER(TRIM(?1))
        AND player_id != ?2
      LIMIT 1
    `).bind(username, telegramId).first();

    if (existing) {
      return json({ error: "Username already taken" }, 409);
    }

    await env.DB.prepare(`
      INSERT INTO players (
        player_id,
        username,
        level,
        total_ore,
        coins,
        plasma,
        updated_at
      )
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)
      ON CONFLICT(player_id) DO UPDATE SET
        username = excluded.username,
        level = excluded.level,
        total_ore = excluded.total_ore,
        coins = excluded.coins,
        plasma = excluded.plasma,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      telegramId,
      username,
      level,
      totalOre,
      coins,
      plasma
    ).run();

    return json({ saved: true });
  } catch {
    return json({ error: "Failed to save score" }, 500);
  }
}
