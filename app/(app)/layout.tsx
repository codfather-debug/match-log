export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, LayoutDashboard, Users, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
            Match Log
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Home" />
            <NavLink href="/matches" icon={<ListChecks className="h-4 w-4" />} label="Matches" />
            <NavLink href="/players" icon={<Users className="h-4 w-4" />} label="Players" />
            <form action="/api/auth/signout" method="post">
              <SignOutButton />
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  )
}

function SignOutButton() {
  return (
    <button
      formAction={async () => {
        'use server'
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()
        await supabase.auth.signOut()
        redirect('/login')
      }}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  )
}
