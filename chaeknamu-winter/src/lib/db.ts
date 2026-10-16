import "server-only";
import { readFileSync, readdirSync } from "fs";
import path from "path";

// DB 접속. DATABASE_URL이 있으면 실제 Postgres(Supabase), 없으면 내 컴퓨터 임시 DB(pglite)를 써요.
// 두 경우 모두 같은 SQL을 그대로 실행해요.
type Runner = (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

const g = globalThis as unknown as { __dbRunner?: Promise<Runner> };

async function init(): Promise<Runner> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: 5, ssl: { rejectUnauthorized: false } });
    return async (sql, params) => (await pool.query(sql, params as unknown[])).rows;
  }
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_DB) {
    throw new Error("배포 환경에는 DATABASE_URL이 필요해요.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = path.join(process.cwd(), ".local-db");
  const db = new PGlite(dir);
  await db.waitReady;
  const has = (await db.query<{ n: number }>("select count(*)::int n from information_schema.tables where table_name = 'branches'")).rows[0].n;
  if (!has) {
    const root = path.join(process.cwd(), "supabase");
    await db.exec(`do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
    end $$;
    create schema if not exists auth;
    create or replace function auth.jwt() returns jsonb language sql as $f$ select '{}'::jsonb $f$;`);
    for (const f of readdirSync(path.join(root, "migrations")).sort()) {
      await db.exec(readFileSync(path.join(root, "migrations", f), "utf8"));
    }
    await db.exec(readFileSync(path.join(root, "seed.sql"), "utf8"));
    await db.exec(readFileSync(path.join(root, "dev-seed.sql"), "utf8"));
  }
  return async (sql, params) => (await db.query(sql, params as unknown[])).rows as Record<string, unknown>[];
}

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  g.__dbRunner ??= init();
  const run = await g.__dbRunner;
  return (await run(sql, params)) as T[];
}
