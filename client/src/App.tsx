import type { JSX } from 'react'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { RequireAdmin } from './auth/RequireAdmin.tsx'
import { RequireAuth } from './auth/RequireAuth.tsx'
import { AccountBar } from './components/auth/AccountBar.tsx'
import AdminInvitationsPage from './pages/AdminInvitationsPage.tsx'
import FramePage from './pages/FramePage.tsx'
import FriendsPage from './pages/FriendsPage.tsx'
import InvitePage from './pages/InvitePage.tsx'
import LibraryPage from './pages/LibraryPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'

// One layout route guards every logged-in page, instead of wrapping each one.
function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route
        element={
          <RequireAuth>
            <Outlet />
          </RequireAuth>
        }
      >
        <Route path="/frame" element={<FramePage />} />
        {/* The frame is full screen: only the other pages get the account bar. */}
        <Route
          element={
            <>
              <AccountBar />
              <Outlet />
            </>
          }
        >
          <Route path="/" element={<LibraryPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route
            path="/admin/invitations"
            element={
              <RequireAdmin>
                <AdminInvitationsPage />
              </RequireAdmin>
            }
          />
          {/* Behind RequireAuth: a logged-out visitor goes to /login, as for any other page. */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
