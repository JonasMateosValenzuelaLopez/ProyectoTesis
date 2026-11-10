import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { TemaProvider } from './context/TemaContext'
import { SesionProvider } from './context/SesionContext'
import { AvisoProvider } from './context/AvisoContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Tema claro u oscuro según la preferencia de cada persona; incluye CssBaseline con el color de fondo */}
    <TemaProvider>
      <SesionProvider>
        <AvisoProvider>
          <App />
        </AvisoProvider>
      </SesionProvider>
    </TemaProvider>
  </React.StrictMode>,
)
