import type { JSX } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import FramePage from './pages/FramePage.tsx'
import UploadPage from './pages/UploadPage.tsx'

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/frame" element={<FramePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
