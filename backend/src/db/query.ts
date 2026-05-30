import { QueryResultRow } from 'pg'
import pool from './pool'

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: Array<string | number | boolean | null> = []
) {
  const result = await pool.query<T>(text, params)
  return result
}
