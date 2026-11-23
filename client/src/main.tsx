import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { followSystemTheme } from './theme.ts'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

followSystemTheme()

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
