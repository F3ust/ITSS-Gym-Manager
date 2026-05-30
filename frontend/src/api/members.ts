import { apiGet } from './client'

export async function searchMembers(query: string) {
  return apiGet(`/members?search=${encodeURIComponent(query)}`)
}
