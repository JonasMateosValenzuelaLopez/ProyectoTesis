import react from '@vitejs/plugin-react'
import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'

// Política de seguridad de contenido (CSP) del build de producción: solo se ejecutan los scripts del propio panel
// y solo se conecta a la API (VITE_API_URL). Así, un XSS no puede cargar scripts de otro sitio ni enviar la sesión afuera.
// - Los estilos permiten 'unsafe-inline' porque MUI (Emotion) inserta sus estilos en etiquetas <style>.
// - No se aplica en `npm run dev`: Vite usa ahí scripts en línea para recargar al guardar.
// - `frame-ancestors` (evitar que el panel se muestre dentro de otro sitio) no funciona en una etiqueta <meta>:
//   hay que enviarlo como cabecera desde el servidor donde se publique.
function politicaDeContenido(urlApi) {
  let origenApi = '';
  try { origenApi = new URL(urlApi).origin } catch { /* sin VITE_API_URL válida: solo el mismo origen */ }
  const reglas = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    'img-src': ["'self'", 'data:', 'blob:'],
    'connect-src': ["'self'", origenApi].filter(Boolean),
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  }
  return Object.entries(reglas).map(([regla, fuentes]) => `${regla} ${fuentes.join(' ')}`).join('; ')
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [
      react(),
      {
        name: 'entrecasas-csp',
        apply: 'build',
        transformIndexHtml: () => [
          { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: politicaDeContenido(env.VITE_API_URL) }, injectTo: 'head-prepend' },
        ],
      },
    ],
  }
})
