import type { LucideIcon } from 'lucide-react'
import {
  Cable,
  HardDrive,
  Headphones,
  Keyboard,
  Laptop,
  Monitor,
  Mouse,
  Package,
  Printer,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS: Record<string, LucideIcon> = {
  Laptop,
  Monitor,
  Keyboard,
  Mouse,
  Headphones,
  Printer,
  HardDrive,
  Cable,
}

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Package
  return <Icon className={cn('h-6 w-6', className)} aria-hidden />
}
