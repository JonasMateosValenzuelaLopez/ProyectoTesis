import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { TemaProvider } from './context/TemaContext'
import { SesionProvider } from './context/SesionContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Tema claro u oscuro según la preferencia de cada persona; incluye CssBaseline con el color de fondo */}
    <TemaProvider>
      <SesionProvider>
        <App />
      </SesionProvider>
    </TemaProvider>
  </React.StrictMode>,
)
