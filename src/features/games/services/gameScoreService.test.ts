import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryResult, resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { gameScoreService } from './gameScoreService'

vi.mock('@/core/supabase/client', () => import('@/test/supabaseMockModule'))

const run = (owner: string, score: number) => ({
  owner_id: owner,
  score,
  created_at: `2026-10-19T00:00:${String(score).padStart(2, '0')}Z`,
})

/** Route `from('game_score')` and `from('user')` to separate canned results. */
function routeTables(tables: Record<string, ReturnType<typeof queryResult>[]>) {
  supabaseMock.from.mockImplementation((table: string) => {
    const next = tables[table].shift()
    if (!next) throw new Error(`unexpected query on ${table}`)
    return next
  })
}

describe('gameScoreService', () => {
  beforeEach(resetSupabaseMock)

  describe('getFlapFlapTopPlayers', () => {
    it('ranks the best run per player with trimmed names', async () => {
      routeTables({
        game_score: [
          queryResult({ data: [run('a', 30), run('b', 20), run('a', 10), run('c', 5)] }),
        ],
        user: [
          queryResult({
            data: [
              { id: 'a', name: '  Ann ' },
              { id: 'b', name: '' },
              { id: 'c', name: null },
            ],
          }),
        ],
      })

      const top = await gameScoreService.getFlapFlapTopPlayers('org', 3)

      expect(top.map((e) => [e.rank, e.ownerId, e.playerName, e.score])).toEqual([
        [1, 'a', 'Ann', 30],
        [2, 'b', 'anonymous', 20],
        [3, 'c', 'anonymous', 5],
      ])
    })

    it('limits to the requested number of unique players', async () => {
      routeTables({
        game_score: [queryResult({ data: [run('a', 9), run('b', 8), run('c', 7)] })],
        user: [queryResult({ data: [] })],
      })
      const top = await gameScoreService.getFlapFlapTopPlayers('org', 2)
      expect(top.map((e) => e.ownerId)).toEqual(['a', 'b'])
    })

    it('pages through scores until enough unique players are found', async () => {
      const fullPage = Array.from({ length: 50 }, (_, i) => run('a', 100 - i))
      routeTables({
        game_score: [queryResult({ data: fullPage }), queryResult({ data: [run('b', 1)] })],
        user: [queryResult({ data: [] })],
      })

      const top = await gameScoreService.getFlapFlapTopPlayers('org', 2)

      expect(top.map((e) => e.ownerId)).toEqual(['a', 'b'])
      expect(supabaseMock.from).toHaveBeenCalledTimes(3)
    })

    it('does not look up names when there are no scores', async () => {
      routeTables({ game_score: [queryResult({ data: [] })], user: [] })
      await expect(gameScoreService.getFlapFlapTopPlayers('org')).resolves.toEqual([])
      expect(supabaseMock.from).toHaveBeenCalledTimes(1)
    })

    it('throws when the scores query fails', async () => {
      routeTables({ game_score: [queryResult({ error: { message: 'down' } })], user: [] })
      await expect(gameScoreService.getFlapFlapTopPlayers('org')).rejects.toThrow(
        'Failed to fetch leaderboard scores: down',
      )
    })

    it('throws when the names query fails', async () => {
      routeTables({
        game_score: [queryResult({ data: [run('a', 1)] })],
        user: [queryResult({ error: { message: 'nope' } })],
      })
      await expect(gameScoreService.getFlapFlapTopPlayers('org')).rejects.toThrow(
        'Failed to fetch leaderboard player names: nope',
      )
    })
  })

  describe('getUserHighestFlapFlapScore', () => {
    it("returns the user's best score", async () => {
      const query = queryResult({ data: [{ score: 42 }] })
      supabaseMock.from.mockReturnValue(query)

      await expect(gameScoreService.getUserHighestFlapFlapScore('u', 'org')).resolves.toBe(42)
      expect(query.eq).toHaveBeenCalledWith('owner_id', 'u')
      expect(query.eq).toHaveBeenCalledWith('game_id', 'flapflap')
    })

    it('returns null when the user has no scores', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ data: [] }))
      await expect(gameScoreService.getUserHighestFlapFlapScore('u', 'org')).resolves.toBeNull()
    })

    it('throws on error', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'bad' } }))
      await expect(gameScoreService.getUserHighestFlapFlapScore('u', 'org')).rejects.toThrow(
        'Failed to fetch user high score: bad',
      )
    })
  })
})
