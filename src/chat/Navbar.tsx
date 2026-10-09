import { LogOut, MessageCircleMore, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItemProps {
  icon: LucideIcon
  label: string
  isActive?: boolean
  className?: string
  onClick?: () => void
}

function NavItem({ icon: Icon, label, isActive, className, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex w-full flex-col items-center gap-0.5 px-0.5 py-2 text-[11px]/4 tracking-[0.3px] transition-colors max-md:w-17',
        isActive ? 'text-foreground' : 'text-foreground/52 hover:text-foreground/72',
        className,
      )}
    >
      <Icon className="size-6" />
      {label}
    </button>
  )
}

interface NavbarProps {
  className?: string
  onLogout: () => void
}

export function Navbar({ className, onLogout }: NavbarProps) {
  return (
    <nav
      // на узком экране панель навигации падает под список чатов
      className={cn(
        'flex shrink-0 border-divider px-1 max-md:justify-around max-md:border-t md:w-19.25 md:flex-col md:border-r md:pt-6 md:pb-4',
        className,
      )}
    >
      <NavItem icon={MessageCircleMore} label="Чаты" isActive />
      <NavItem icon={LogOut} label="Выйти" onClick={onLogout} className="md:mt-auto" />
    </nav>
  )
}
