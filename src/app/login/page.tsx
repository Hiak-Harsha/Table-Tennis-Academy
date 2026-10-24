import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-guard'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const user = await getCurrentUser()

  if (user) {
    if (user.role === 'ADMIN') {
      redirect('/admin')
    } else {
      redirect('/student')
    }
  }

  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100dvh',
            display: 'grid',
            placeItems: 'center',
            background: 'hsl(var(--bg-primary))',
            color: '#fff',
            fontSize: '0.85rem',
          }}
        >
          Loading portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
