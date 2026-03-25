'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

const STORAGE_KEY = 'matchlog_you_player_id'

type Player = {
  id: string
  name: string
  handedness: string | null
  nationality: string | null
  avatar_url: string | null
  created_at: string
}

export function PlayersListClient({ players }: { players: Player[] }) {
  const [youId, setYouId] = useState<string | null>(null)

  useEffect(() => {
    setYouId(localStorage.getItem(STORAGE_KEY))
  }, [])

  return (
    <div className="space-y-2">
      {players.map((player) => (
        <Link key={player.id} href={`/players/${player.id}`}>
          <Card className="hover:border-zinc-700 transition-colors">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium overflow-hidden flex-shrink-0">
                {player.avatar_url
                  ? <img src={player.avatar_url} alt={player.name} className="h-full w-full object-cover" />
                  : player.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{player.name}</span>
                  {youId === player.id && (
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs text-zinc-500 truncate">
                  {[player.handedness && `${player.handedness}-handed`, player.nationality]
                    .filter(Boolean)
                    .join(' · ') || 'No details'}
                </div>
              </div>
              <div className="text-xs text-zinc-600 flex-shrink-0">{formatDate(player.created_at)}</div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
