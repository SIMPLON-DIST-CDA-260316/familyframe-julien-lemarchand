import type { JSX } from 'react'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { RequireAdmin } from './auth/RequireAdmin.tsx'
import { RequireAuth } from './auth/RequireAuth.tsx'
import { CollectionsProvider } from './collections/CollectionsProvider.tsx'
import { AccountBar } from './components/auth/AccountBar.tsx'
import { MobileTabBar } from './components/nav/MobileTabBar.tsx'
import { Toaster } from './components/ui/sonner.tsx'
import AdminInvitationsPage from './pages/AdminInvitationsPage.tsx'
import FramePage from './pages/FramePage.tsx'
import FriendsPage from './pages/FriendsPage.tsx'
import InvitePage from './pages/InvitePage.tsx'
import LibraryPage from './pages/LibraryPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'

// One layout route guards every logged-in page, instead of wrapping each one. The collections
// load once for all of them: the library, the menus and the frame show the same list.
function LoggedInLayout(): JSX.Element {
  return (
    <RequireAuth>
      <CollectionsProvider>
        <Outlet />
      </CollectionsProvider>
    </RequireAuth>
  )
}

// The frame is full screen: only the other pages get the account bar. A phone held sideways puts
// its notch on a side: the pages stay clear of it.
function AccountBarLayout(): JSX.Element {
  return (
    <>
      <AccountBar />
      <div className="pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
        <Outlet />
      </div>
    </>
  )
}

// The app's own pages get the phone's tab bar; the 404 page does not, it is no place to go back to.
// The pages leave room for the bar (and the home bar under it) so their end stays reachable.
function TabBarLayout(): JSX.Element {
  return (
    <>
      <div className="max-md:pb-[calc(var(--tab-bar-height)_+_env(safe-area-inset-bottom))]">
        <Outlet />
      </div>
      <MobileTabBar />
    </>
  )
}

function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route element={<LoggedInLayout />}>
        <Route path="/frame" element={<FramePage />} />
        <Route element={<AccountBarLayout />}>
          <Route element={<TabBarLayout />}>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="/admin/invitations"
              element={
                <RequireAdmin>
                  <AdminInvitationsPage />
                </RequireAdmin>
              }
            />
          </Route>
          {/* Behind RequireAuth: a logged-out visitor goes to /login, as for any other page. */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

function App(): JSX.Element {
  return (
    <>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      {/* One for the whole app: a toast outlives the page or dialog that raised it. */}
      <Toaster />
    </>
  )
}

export default App
