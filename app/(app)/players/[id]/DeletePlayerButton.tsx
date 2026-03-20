'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function DeletePlayerButton({ playerId, matchCount }: { playerId: string; matchCount: number }) {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('players').delete().eq('id', playerId)
    if (error) {
      alert('Delete failed: ' + error.message)
      setDeleting(false)
      setConfirm(false)
      return
    }
    router.push('/players')
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setConfirm(false)}
          disabled={deleting}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          Cancel
        </button>
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : matchCount > 0 ? `Delete (${matchCount} matches kept)` : 'Delete'}
        </Button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Delete
    </button>
  )
}
