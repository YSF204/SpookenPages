import Link from 'next/link'
import Image from 'next/image'
import { NavLinks } from '@/components/nav-links'
import { NavAuth } from '@/components/nav-auth'

export default function Navbar() {
  return (
    <header className="w-full fixed z-50 bg-[var(--bg-primary)]">
      <div className="wrapper navbar-height py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-0.5">
          <Image
            src="/assets/logo.png"
            alt="Spoken Pages"
            width={42}
            height={26}
            className="rounded-full h-auto"
          />
          <span className="text-2xl font-bold logo-text">Spoken Pages</span>
        </Link>

        <nav className="flex w-fit shrink-0 items-center gap-7.5">
          <NavLinks />
          <NavAuth />
        </nav>
      </div>
    </header>
  )
}
