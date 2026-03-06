import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { ThemeProvider } from './lib/ThemeContext'
import HomePage from './pages/HomePage.tsx'
import ChatPage from './pages/chat/ChatPage.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MiniKitProvider appId="app_6a98c88249208506dcd4e04b529111fc">
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </MiniKitProvider>
  </React.StrictMode>
)
