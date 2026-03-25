'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'

const STORAGE_KEY = 'matchlog_you_player_id'

export function FavoriteButton({ playerId }: { playerId: string }) {
  const [isYou, setIsYou] = useState(false)

  useEffect(() => {
    setIsYou(localStorage.getItem(STORAGE_KEY) === playerId)
  }, [playerId])

  function toggle() {
    if (isYou) {
      localStorage.removeItem(STORAGE_KEY)
      setIsYou(false)
    } else {
      localStorage.setItem(STORAGE_KEY, playerId)
      setIsYou(true)
    }
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
        isYou
          ? 'border-amber-400/50 bg-amber-400/10 text-amber-400'
          : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
      }`}
    >
      <Star className={`h-3.5 w-3.5 ${isYou ? 'fill-amber-400' : ''}`} />
      {isYou ? 'This is you' : 'Mark as you'}
    </button>
  )
}
