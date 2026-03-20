'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Player } from '@/types/tennis'

export default function NewMatchPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [matchType, setMatchType] = useState<'singles' | 'doubles'>('singles')
  const [player1, setPlayer1] = useState('')
  const [player2, setPlayer2] = useState('')
  const [player3, setPlayer3] = useState('')
  const [player4, setPlayer4] = useState('')
  const [sets, setSets] = useState<'3' | '5'>('3')
  const [tiebreak, setTiebreak] = useState(true)
  const [superTiebreak, setSuperTiebreak] = useState(false)
  const [noAd, setNoAd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('players').select('*').eq('user_id', user.id).order('name').then(({ data }) => {
          setPlayers(data ?? [])
        })
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!player1 || !player2) return setError('Select both players.')
    if (player1 === player2) return setError('Players must be different.')
    if (matchType === 'doubles' && (!player3 || !player4)) return setError('Select all 4 players for doubles.')

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .insert({
        user_id: user!.id,
        match_type: matchType,
        status: 'in_progress',
        format: { sets: Number(sets), tiebreak, superTiebreak, noAd },
        player1_id: player1,
        player2_id: player2,
        player3_id: matchType === 'doubles' ? player3 : null,
        player4_id: matchType === 'doubles' ? player4 : null,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (matchErr || !match) {
      setError(matchErr?.message ?? 'Failed to create match')
      setLoading(false)
      return
    }

    // Create first set and first game
    const { data: set } = await supabase
      .from('sets')
      .insert({ match_id: match.id, set_number: 1 })
      .select()
      .single()

    if (set) {
      await supabase.from('games').insert({
        set_id: set.id,
        match_id: match.id,
        game_number: 1,
        server: 'player1',
      })
    }

    router.push(`/matches/${match.id}/live`)
  }

  const playerOptions = players.map((p) => (
    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
  ))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/matches" className="text-zinc-400 hover:text-zinc-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold">New match</h1>
      </div>

      {players.length < 2 && (
        <Card>
          <CardContent className="py-4 text-sm text-zinc-400">
            You need at least 2 players.{' '}
            <Link href="/players/new" className="text-zinc-100 underline">Add players first.</Link>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Match type */}
        <div className="space-y-1.5">
          <Label>Match type</Label>
          <div className="flex gap-2">
            {(['singles', 'doubles'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMatchType(t)}
                className={`flex-1 rounded-md border py-2 text-sm capitalize transition-colors ${
                  matchType === t
                    ? 'border-zinc-100 bg-zinc-800 text-zinc-100'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Players */}
        <div className="space-y-3">
          <Label>Players</Label>
          <div className={`grid gap-3 ${matchType === 'doubles' ? 'grid-cols-2' : 'grid-cols-2'}`}>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">{matchType === 'doubles' ? 'Team 1 · Player A' : 'Player 1'}</p>
              <Select value={player1} onValueChange={setPlayer1}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{playerOptions}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">{matchType === 'doubles' ? 'Team 2 · Player A' : 'Player 2'}</p>
              <Select value={player2} onValueChange={setPlayer2}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{playerOptions}</SelectContent>
              </Select>
            </div>
            {matchType === 'doubles' && (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500">Team 1 · Player B</p>
                  <Select value={player3} onValueChange={setPlayer3}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{playerOptions}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500">Team 2 · Player B</p>
                  <Select value={player4} onValueChange={setPlayer4}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{playerOptions}</SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Format */}
        <div className="space-y-3">
          <Label>Format</Label>
          <div className="space-y-2">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Sets</p>
              <div className="flex gap-2">
                {(['3', '5'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSets(s)}
                    className={`flex-1 rounded-md border py-2 text-sm transition-colors ${
                      sets === s
                        ? 'border-zinc-100 bg-zinc-800 text-zinc-100'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    Best of {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Toggle label="Tiebreak at 6-6" value={tiebreak} onChange={setTiebreak} />
              <Toggle label="Super tiebreak (final set)" value={superTiebreak} onChange={setSuperTiebreak} />
              <Toggle label="No-Ad scoring" value={noAd} onChange={setNoAd} />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" className="w-full" size="lg" disabled={loading || players.length < 2}>
          {loading ? 'Starting…' : 'Start match'}
        </Button>
      </form>
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2.5 text-sm transition-colors hover:border-zinc-700"
    >
      <span className="text-zinc-300">{label}</span>
      <div className={`h-5 w-9 rounded-full transition-colors ${value ? 'bg-white' : 'bg-zinc-700'}`}>
        <div className={`m-0.5 h-4 w-4 rounded-full bg-zinc-950 transition-transform ${value ? 'translate-x-4' : ''}`} />
      </div>
    </button>
  )
}
