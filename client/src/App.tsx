import type { JSX } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import UploadPage from './pages/UploadPage.tsx'

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
