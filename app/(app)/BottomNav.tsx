'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, ListChecks, Users, LogOut } from 'lucide-react'

export function BottomNav({ signOut }: { signOut: () => Promise<void> }) {
  const pathname = usePathname()

  // Hide on the live tracker — it has its own full-screen UI
  if (pathname.endsWith('/live')) return null

  const links = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { href: '/matches', icon: ListChecks, label: 'Matches' },
    { href: '/players', icon: Users, label: 'Players' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-around px-2">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors ${active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
        <form action={signOut} className="flex flex-1 flex-col items-center">
          <button
            type="submit"
            className="flex flex-1 w-full flex-col items-center justify-center gap-1 py-2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <LogOut className="h-6 w-6" />
            <span className="text-xs font-medium">Sign out</span>
          </button>
        </form>
      </div>
    </nav>
  )
}
