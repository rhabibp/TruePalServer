import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <CurrencyProvider>
        <App />
        <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          dismissible: true,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            dismissible: true,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            dismissible: true,
            iconTheme: {
              primary: '#f87171',
              secondary: '#fff',
            },
          },
        }}
      />
      </CurrencyProvider>
    </AuthProvider>
  </React.StrictMode>,
)