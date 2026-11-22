import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/styles.css';
import './styles/auth.css';
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
