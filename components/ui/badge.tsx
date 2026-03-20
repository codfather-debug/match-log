import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-zinc-700 text-zinc-100',
        success: 'bg-emerald-900/50 text-emerald-400 border border-emerald-800',
        warning: 'bg-amber-900/50 text-amber-400 border border-amber-800',
        destructive: 'bg-red-900/50 text-red-400 border border-red-800',
        outline: 'border border-zinc-700 text-zinc-300',
        serve: 'bg-yellow-500/20 text-yellow-400 border border-yellow-600/50',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
