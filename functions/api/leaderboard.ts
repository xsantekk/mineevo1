interface Env {
  DB?: D1Database;
}

interface Player {
  player_id: string;
  username: string;
  level: number;
  total_ore: number;
  coins: number;
  plasma: number;
  updated_at: string;
}

function errorResponse(error: unknown): Response {
  const details =
    error instanceof Error ? error.message : String(error);

  console.error("LEADERBOARD DB ERROR:", details);

  return Response.json(
    {
      error: "Database unavailable",
      details
    },
    { status: 500 }
  );
}

export const onRequestGet: PagesFunction<Env> = async ({
  env
}) => {
  try {
    if (!env.DB) {
      throw new Error("D1 binding DB is missing");
    }

    const result = await env.DB
      .prepare(`
        SELECT player_id, username, level, total_ore,
               coins, plasma, updated_at
        FROM players
        ORDER BY level DESC, total_ore DESC
        LIMIT 20
      `)
      .all<Player>();

    return Response.json(result.results ?? []);
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({
  request,
  env
}) => {
  try {
    if (!env.DB) {
      throw new Error("D1 binding DB is missing");
    }

    const body = await request.json() as Partial<Player>;

    const playerId = String(body.player_id ?? "").trim();
    const username = String(body.username ?? "").trim();
    const level = Math.max(
      1,
      Math.floor(Number(body.level) || 1)
    );
    const totalOre = Math.max(
      0,
      Math.floor(Number(body.total_ore) || 0)
    );
    const coins = Math.max(
      0,
      Math.floor(Number(body.coins) || 0)
    );
    const plasma = Math.max(
      0,
      Math.floor(Number(body.plasma) || 0)
    );

    if (!playerId || !username) {
      return Response.json(
        { error: "player_id and username are required" },
        { status: 400 }
      );
    }

    if (username.length > 32 || playerId.length > 128) {
      return Response.json(
        { error: "Username or player ID is too long" },
        { status: 400 }
      );
    }

    await env.DB.prepare(`
      INSERT INTO players
        (player_id, username, level, total_ore, coins, plasma, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(player_id) DO UPDATE SET
        username = excluded.username,
        level = excluded.level,
        total_ore = excluded.total_ore,
        coins = excluded.coins,
        plasma = excluded.plasma,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      playerId,
      username,
      level,
      totalOre,
      coins,
      plasma
    ).run();

    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
};
