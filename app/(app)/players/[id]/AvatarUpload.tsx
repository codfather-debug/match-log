'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Camera } from 'lucide-react'

export function AvatarUpload({
  playerId,
  userId,
  playerName,
  avatarUrl,
}: {
  playerId: string
  userId: string
  playerName: string
  avatarUrl: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(avatarUrl)
  const [uploading, setUploading] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Local preview immediately
    setPreview(URL.createObjectURL(file))
    setUploading(true)

    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${userId}/${playerId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

    await supabase.from('players').update({ avatar_url: publicUrl }).eq('id', playerId)

    setUploading(false)
    startTransition(() => router.refresh())
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="relative flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-xl font-bold overflow-hidden group"
    >
      {preview ? (
        <img src={preview} alt={playerName} className="h-full w-full object-cover" />
      ) : (
        <span>{playerName[0].toUpperCase()}</span>
      )}

      {/* Overlay on hover */}
      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
        {uploading ? (
          <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
        ) : (
          <Camera className="h-4 w-4 text-white" />
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
      />
    </button>
  )
}
