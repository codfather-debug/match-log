import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PlayersListClient } from './PlayersListClient'

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
        <PlayersListClient players={players} />
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
