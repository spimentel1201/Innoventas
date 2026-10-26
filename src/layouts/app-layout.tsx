import { Outlet } from 'react-router-dom'
import { Footer } from './footer'
import { Header } from './header'
import { ChatWidget } from '@/features/chat/chat-widget'
import { SetupBanner } from '@/components/common/setup-banner'
import { isSupabaseConfigured } from '@/lib/supabase'

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <main className="flex-1">
        <div className="container pt-6 md:pt-8">
          {!isSupabaseConfigured && <SetupBanner />}
        </div>
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
