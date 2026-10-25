import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SCHEMA_SQL_FILE, schemaSql } from '../scripts/build-schema-sql';

describe('database schema for a shared Supabase project', () => {
  const sql = schemaSql();

  it('deploy/supabase-schema.sql is the migrations, in order (after changing one: pnpm gen:schema-sql)', () => {
    expect(readFileSync(SCHEMA_SQL_FILE, 'utf8')).toBe(sql);
  });

  it('creates everything in sec_minicourse and touches nothing in public', () => {
    const creates = sql.split('\n').filter((l) => /^\s*create (or replace )?(table|function|policy|trigger|(unique )?index|view|type|sequence)\b/.test(l));
    expect(creates.length).toBeGreaterThan(40);
    for (const l of creates) expect(l, l).toMatch(/sec_minicourse\./);
    expect(sql).not.toMatch(/\bschema public\b/);
    expect(sql).not.toMatch(/\bpublic\./);
    // every function pins its search path to the app's schema
    expect(sql).not.toMatch(/search_path = (?!sec_minicourse, extensions, pg_temp)/);
  });
});
