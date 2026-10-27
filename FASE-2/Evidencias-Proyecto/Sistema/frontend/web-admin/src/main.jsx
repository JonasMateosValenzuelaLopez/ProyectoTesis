import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider, CssBaseline } from '@mui/material'
import theme from './theme'
import { SesionProvider } from './context/SesionContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Esto resetea los márgenes por defecto del navegador e inyecta tu color de fondo */}
      <SesionProvider>
        <App />
      </SesionProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
