'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Library', href: '/' },
  { label: 'Add New', href: '/books/new' },
]

export function NavLinks() {
  const pathName = usePathname()

  return (
    <>
      {navItems.map(({ label, href }) => {
        const active =
          href === '/'
            ? pathName === '/'
            : pathName === href || pathName.startsWith(`${href}/`)

        return (
          <Link
            href={href}
            key={label}
            className={cn(
              'nav-link-base',
              active ? 'nav-link-active' : 'text-black hover:opacity-70'
            )}
          >
            {label}
          </Link>
        )
      })}
    </>
  )
}
