import { GlobeAltIcon } from '@heroicons/react/24/solid'
import { useRouteContext, useRouterState } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { deLocalizeHref, localizeHref, setLocale } from '@/paraglide/runtime'
import { cn } from '@/lib/shared/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface LanguageSwitcherProps {
  compact?: boolean
  align?: 'start' | 'center' | 'end'
  className?: string
}

const supportedLocales = ['en', 'es'] as const

export function LanguageSwitcher({
  compact = false,
  align = 'end',
  className,
}: LanguageSwitcherProps) {
  const { locale } = useRouteContext({ from: '__root__' })
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const searchStr = useRouterState({ select: (state) => state.location.searchStr })

  const currentLocale = locale ?? 'en'
  const localeLabels = {
    en: m.locale_en(),
    es: m.locale_es(),
  }

  const handleLocaleChange = (nextLocale: string) => {
    if (nextLocale === currentLocale || typeof window === 'undefined') {
      return
    }

    setLocale(nextLocale, { reload: false })

    const currentHref = `${pathname}${searchStr}${window.location.hash}`
    const baseHref = deLocalizeHref(currentHref)
    const localizedHref = localizeHref(baseHref, { locale: nextLocale })

    window.location.assign(localizedHref)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? 'icon' : 'sm'}
          className={cn(compact ? 'h-9 w-9' : 'h-9 gap-2 px-3', className)}
          aria-label={m.locale_switcher()}
        >
          <GlobeAltIcon className="h-4 w-4" />
          {!compact && <span className="uppercase">{currentLocale}</span>}
          <span className="sr-only">{m.locale_switcher()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44">
        <DropdownMenuLabel>{m.locale_label()}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={currentLocale} onValueChange={handleLocaleChange}>
          {supportedLocales.map((supportedLocale) => (
            <DropdownMenuRadioItem key={supportedLocale} value={supportedLocale}>
              {localeLabels[supportedLocale]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
