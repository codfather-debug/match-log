'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import type { Player, MatchType } from '@/types/tennis'

export default function NewMatchPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [matchType, setMatchType] = useState<MatchType>('singles')
  const [player1, setPlayer1] = useState('')
  const [player3, setPlayer3] = useState('')   // doubles partner (team 1 player B)
  const [opp2Name, setOpp2Name] = useState('Opponent')
  const [opp4Name, setOpp4Name] = useState('Opponent')
  const [sets, setSets] = useState<'3' | '5'>('3')
  const [tiebreak, setTiebreak] = useState(true)
  const [superTiebreak, setSuperTiebreak] = useState(false)
  const [noAd, setNoAd] = useState(false)
  const [surface, setSurface] = useState<string>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [logDepth, setLogDepthState] = useState<{ rallyLength: boolean; shotDetail: boolean }>(() => {
    try { return JSON.parse(localStorage.getItem('matchlog_log_depth') ?? 'null') ?? { rallyLength: true, shotDetail: true } }
    catch { return { rallyLength: true, shotDetail: true } }
  })

  function setLogDepth(update: Partial<{ rallyLength: boolean; shotDetail: boolean }>) {
    setLogDepthState(prev => {
      const next = { ...prev, ...update }
      localStorage.setItem('matchlog_log_depth', JSON.stringify(next))
      return next
    })
  }

  // Inline add player
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerHand, setNewPlayerHand] = useState<'right' | 'left' | ''>('')
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [addPlayerError, setAddPlayerError] = useState('')

  const [youPlayerId, setYouPlayerId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('players').select('*').eq('user_id', user.id).order('name')
        setPlayers(data ?? [])
      }
    }
    load()
    setYouPlayerId(localStorage.getItem('matchlog_you_player_id'))
  }, [])

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!newPlayerName.trim()) return
    setAddingPlayer(true)
    setAddPlayerError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('players')
      .insert({ user_id: user!.id, name: newPlayerName.trim(), handedness: newPlayerHand || null })
      .select()
      .single()
    if (error) { setAddPlayerError(error.message); setAddingPlayer(false); return }
    setPlayers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setNewPlayerName('')
    setNewPlayerHand('')
    setShowAddPlayer(false)
    setAddingPlayer(false)
  }

  async function resolveOpponent(name: string, supabase: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
    const trimmed = (name || 'Opponent').trim()
    const existing = players.find(p => p.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing.id
    const { data } = await supabase.from('players').insert({ user_id: userId, name: trimmed }).select().single()
    if (data) setPlayers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data?.id ?? null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!player1) return setError('Select yourself as Player 1.')
    if (matchType === 'doubles' && !player3) return setError('Select your partner for Team 1.')

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const p2id = matchType !== 'practice' ? await resolveOpponent(opp2Name, supabase, user!.id) : null
    const p4id = matchType === 'doubles' ? await resolveOpponent(opp4Name, supabase, user!.id) : null

    // Fetch weather silently — never blocks match creation
    let weather = null
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
      )
      const { latitude: lat, longitude: lon } = pos.coords
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m` +
        `&wind_speed_unit=mph&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto`
      const data = await (await fetch(url)).json()
      const c = data.current
      const WMO: Record<number, string> = {
        0:'Clear',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',
        45:'Fog',48:'Icy fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',
        61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',
        80:'Rain showers',81:'Heavy showers',82:'Violent showers',95:'Thunderstorm',
      }
      weather = {
        temp: Math.round(c.temperature_2m),
        feels_like: Math.round(c.apparent_temperature),
        wind_mph: Math.round(c.wind_speed_10m),
        gust_mph: Math.round(c.wind_gusts_10m),
        precip_in: c.precipitation,
        condition: WMO[c.weather_code] ?? 'Unknown',
      }
    } catch { /* geolocation denied or fetch failed */ }

    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .insert({
        user_id: user!.id,
        match_type: matchType,
        status: 'in_progress',
        format: { sets: Number(sets), tiebreak, superTiebreak, noAd },
        player1_id: player1,
        player2_id: p2id,
        player3_id: matchType === 'doubles' ? player3 : null,
        player4_id: p4id,
        started_at: new Date().toISOString(),
        weather,
        surface: surface || null,
      })
      .select()
      .single()

    if (matchErr || !match) {
      setError(matchErr?.message ?? 'Failed to create match')
      setLoading(false)
      return
    }

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

  const isPractice = matchType === 'practice'

  const sortedPlayers = youPlayerId
    ? [...players].sort((a, b) => (a.id === youPlayerId ? -1 : b.id === youPlayerId ? 1 : 0))
    : players

  const playerOptions = sortedPlayers.map((p) => {
    const isYou = p.id === youPlayerId
    return (
      <SelectItem key={p.id} value={p.id} className={isYou ? 'text-amber-400 font-medium' : ''}>
        {isYou ? `★ ${p.name}` : p.name}
      </SelectItem>
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/matches" className="text-zinc-400 hover:text-zinc-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold">New match</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Match type */}
        <div className="space-y-1.5">
          <Label>Match type</Label>
          <div className="flex gap-2">
            {(['singles', 'doubles', 'practice'] as const).map((t) => (
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

        {/* Court surface */}
        <div className="space-y-1.5">
          <Label>Court surface</Label>
          <div className="flex gap-2 flex-wrap">
            {(['Hard', 'Clay', 'Grass', 'Indoor'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSurface(prev => prev === s ? '' : s)}
                className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                  surface === s
                    ? 'border-zinc-100 bg-zinc-800 text-zinc-100'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Players */}
        <div className="space-y-3">
          <Label>Players</Label>

          {showAddPlayer ? (
            <div className="rounded-md border border-zinc-700 bg-zinc-900/50 p-3 space-y-2">
              <Input
                placeholder="Player name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlayer(e as unknown as React.FormEvent) } }}
                autoFocus
              />
              <div className="flex gap-2">
                {(['right', 'left', ''] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setNewPlayerHand(h)}
                    className={`flex-1 rounded border py-1.5 text-xs transition-colors ${
                      newPlayerHand === h
                        ? 'border-zinc-100 bg-zinc-700 text-zinc-100'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    {h === '' ? 'Unknown' : h === 'right' ? 'Right-handed' : 'Left-handed'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={addingPlayer || !newPlayerName.trim()} onClick={(e) => handleAddPlayer(e as unknown as React.FormEvent)} className="flex-1">
                  {addingPlayer ? '…' : 'Add player'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddPlayer(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddPlayer(true)}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-zinc-700 py-2.5 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add new player
            </button>
          )}
          {addPlayerError && <p className="text-xs text-red-400">{addPlayerError}</p>}

          <div className="grid grid-cols-2 gap-3">
            {/* Team 1 — green */}
            <div className="space-y-2 rounded-xl border border-green-700 p-3" style={{ backgroundColor: 'rgba(20, 83, 45, 0.45)' }}>
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wider">
                {matchType === 'doubles' ? 'Team 1' : isPractice ? 'You' : 'Team 1'}
              </p>
              <div className="space-y-1">
                <p className="text-xs text-zinc-400">{matchType === 'doubles' ? 'Player A' : 'Player'}</p>
                <Select value={player1} onValueChange={setPlayer1}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{playerOptions}</SelectContent>
                </Select>
              </div>
              {matchType === 'doubles' && (
                <div className="space-y-1">
                  <p className="text-xs text-zinc-400">Player B</p>
                  <Select value={player3} onValueChange={setPlayer3}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{playerOptions}</SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Team 2 — red, free-text opponent with autocomplete */}
            {!isPractice && (
              <div className="space-y-2 rounded-xl border border-red-700 p-3" style={{ backgroundColor: 'rgba(127, 29, 29, 0.45)' }}>
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                  {matchType === 'doubles' ? 'Team 2' : 'Opponent'}
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-400">{matchType === 'doubles' ? 'Player A' : 'Name'}</p>
                  <OpponentInput value={opp2Name} onChange={setOpp2Name} players={players} />
                </div>
                {matchType === 'doubles' && (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-400">Player B</p>
                    <OpponentInput value={opp4Name} onChange={setOpp4Name} players={players} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isPractice && (
          <div className="rounded-md border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400">
            Practice sessions log points without game scoring. Stats are tracked the same way — great for drills and warm-ups.
          </div>
        )}

        {/* Format */}
        {!isPractice && (
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
        )}

        {/* Point logging depth */}
        <div className="space-y-2">
          <Label>Point logging</Label>
          <p className="text-xs text-zinc-500">Choose which steps to log per point — can also be changed mid-match.</p>
          <div className="flex flex-col gap-2">
            <Toggle label="Rally length" value={logDepth.rallyLength} onChange={(v) => setLogDepth({ rallyLength: v })} />
            <Toggle label="Shot detail (type, direction, error location)" value={logDepth.shotDetail} onChange={(v) => setLogDepth({ shotDetail: v })} />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" className="w-full" size="lg" disabled={loading || players.length === 0 || !player1}>
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

function OpponentInput({ value, onChange, players }: { value: string; onChange: (v: string) => void; players: Player[] }) {
  const [open, setOpen] = useState(false)
  const suggestions = players.filter(
    p => !value || p.name.toLowerCase().includes(value.toLowerCase())
  ).slice(0, 6)

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-9 w-full rounded-md border border-zinc-700 bg-transparent px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 shadow-lg">
          {suggestions.map(p => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => { onChange(p.name); setOpen(false) }}
              className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 first:rounded-t-md last:rounded-b-md"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
