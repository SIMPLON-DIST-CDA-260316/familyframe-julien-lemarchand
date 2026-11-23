import type { JSX } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { RequireAuth } from './auth/RequireAuth.tsx'
import FramePage from './pages/FramePage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import UploadPage from './pages/UploadPage.tsx'

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <UploadPage />
              </RequireAuth>
            }
          />
          <Route
            path="/frame"
            element={
              <RequireAuth>
                <FramePage />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
