import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import type { Pool, RowDataPacket } from 'mysql2/promise'

interface ColumnRow extends RowDataPacket {
  Field: string
  Type?: string
}

const CATEGORY_ENUM = "'MEDICATION','SOP','QUIZ','MEMO','INTERVIEW','TRANSCRIPT'"

const migrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'migrations/001_initial.sql',
)

function splitStatements(sql: string) {
  return sql
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean)
}

async function hasOwnerColumn(pool: Pool) {
  const [columns] = await pool.query<ColumnRow[]>(
    'SHOW COLUMNS FROM audio_records LIKE "user_id"',
  )
  return columns.length > 0
}

async function addOwnerColumn(pool: Pool) {
  await pool.query('ALTER TABLE audio_records ADD COLUMN user_id CHAR(36) NULL AFTER audio_id')
  await pool.query(
    'ALTER TABLE audio_records ADD INDEX idx_audio_owner_created (user_id, created_at)',
  )
  await pool.query(
    'ALTER TABLE audio_records ADD CONSTRAINT fk_audio_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  )
}

/** Extends pre-existing category enums when interview/transcript scenes are added. */
async function ensureCategoryValues(pool: Pool) {
  const [columns] = await pool.query<ColumnRow[]>(
    'SHOW COLUMNS FROM scene_payloads LIKE "category"',
  )
  if (columns[0]?.Type?.includes('INTERVIEW')) return

  await pool.query(
    `ALTER TABLE audio_records MODIFY COLUMN category ENUM(${CATEGORY_ENUM}) NULL`,
  )
  await pool.query(
    `ALTER TABLE scene_payloads MODIFY COLUMN category ENUM(${CATEGORY_ENUM}) NOT NULL`,
  )
}

export async function initializeDatabase(pool: Pool) {
  const sql = await readFile(migrationPath, 'utf8')
  for (const statement of splitStatements(sql)) {
    await pool.query(statement)
  }

  // Older databases predate the per-user owner column.
  if (!(await hasOwnerColumn(pool))) {
    await addOwnerColumn(pool)
  }

  await ensureCategoryValues(pool)
}
