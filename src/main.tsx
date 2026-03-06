import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'  // ← ahora se usa App.tsx
import './index.css'
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider'
import { ThemeProvider } from './lib/ThemeContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MiniKitProvider appId="app_6a98c88249208506dcd4e04b529111fc">
      <ThemeProvider>
        <App />  // ← App.tsx maneja routes y verify
      </ThemeProvider>
    </MiniKitProvider>
  </React.StrictMode>
)
