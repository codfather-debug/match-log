import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

export default async function PlayersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', user!.id)
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Players</h1>
        <Button asChild size="sm">
          <Link href="/players/new">
            <Plus className="h-4 w-4" />
            Add player
          </Link>
        </Button>
      </div>

      {players && players.length > 0 ? (
        <div className="space-y-2">
          {players.map((player) => (
            <Card key={player.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium">
                  {player.name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{player.name}</div>
                  <div className="text-xs text-zinc-500">
                    {[player.handedness && `${player.handedness}-handed`, player.nationality]
                      .filter(Boolean)
                      .join(' · ') || 'No details'}
                  </div>
                </div>
                <div className="text-xs text-zinc-600">{formatDate(player.created_at)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <User className="h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-400">No players yet.</p>
            <Button asChild size="sm">
              <Link href="/players/new">
                <Plus className="h-4 w-4" />
                Add player
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
