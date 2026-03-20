'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewPlayerPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [handedness, setHandedness] = useState<'right' | 'left' | ''>('')
  const [nationality, setNationality] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('players').insert({
      user_id: user!.id,
      name,
      handedness: handedness || null,
      nationality: nationality || null,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/players')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/players" className="text-zinc-400 hover:text-zinc-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold">Add player</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            placeholder="Player name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Handedness</Label>
          <Select value={handedness} onValueChange={(v) => setHandedness(v as 'right' | 'left')}>
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="right">Right-handed</SelectItem>
              <SelectItem value="left">Left-handed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nationality">Nationality</Label>
          <Input
            id="nationality"
            placeholder="e.g. USA"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Adding…' : 'Add player'}
        </Button>
      </form>
    </div>
  )
}
