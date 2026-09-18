'use client'

import { memo } from 'react'
import Link from 'next/link'
import { SignInButton, SignUpButton, Show, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

function AuthControls() {
  const { user } = useUser()
  const firstName = user?.firstName

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button variant="ghost" size="sm" className="min-w-[4.25rem]">
            Sign in
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button size="sm" className="min-w-[4.5rem]">
            Sign up
          </Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <div className="nav-user-link">
          <UserButton />
          {firstName ? (
            <Link href="/profile" className="nav-user-name">
              {firstName}
            </Link>
          ) : null}
        </div>
      </Show>
    </div>
  )
}

export const NavAuth = memo(AuthControls)
