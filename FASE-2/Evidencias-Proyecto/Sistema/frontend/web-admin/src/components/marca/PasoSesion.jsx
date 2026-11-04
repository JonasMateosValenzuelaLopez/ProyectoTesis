import { useEffect, useRef } from 'react';
import { keyframes } from '@emotion/react';
import { Box, Typography, useMediaQuery } from '@mui/material';
import PlacaUnidad from './PlacaUnidad';

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const fondo = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const placa = keyframes`from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); }`;
const texto = keyframes`from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; }`;
const sinMovimiento = { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } };

// Pausa breve al entrar o salir del panel, igual que en la app: la foto de la comunidad teñida con el color
// de la marca cubre la pantalla, aparece la placa EC con un saludo o una despedida y luego se cambia de pantalla.
// La placa llega desde 0.92 y la frase sube 6 px, con curva ease-out. Con «reducir movimiento» no anima y dura menos.
export default function PasoSesion({ tipo, nombre, detalle, alTerminar }) {
  const reducido = useMediaQuery('(prefers-reduced-motion: reduce)');
  // El temporizador parte una sola vez aunque la pantalla de abajo se vuelva a dibujar
  const terminar = useRef(alTerminar);
  useEffect(() => { terminar.current = alTerminar; });
  useEffect(() => {
    const espera = setTimeout(() => terminar.current(), reducido ? 500 : tipo === 'entrar' ? 1000 : 800);
    return () => clearTimeout(espera);
  }, [reducido, tipo]);

  return (
    <Box
      role="status" aria-live="polite"
      sx={(t) => ({
        position: 'fixed', inset: 0, zIndex: t.zIndex.modal + 10, overflow: 'hidden',
        display: 'grid', placeItems: 'center', alignContent: 'center', gap: 2.5, p: 3,
        bgcolor: 'marca.sidebar', animation: `${fondo} 200ms ${EASE_OUT} both`, ...sinMovimiento,
      })}
    >
      <Box
        aria-hidden
        sx={(t) => ({
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'url(/img/login-edificio.jpg)', backgroundSize: 'cover', backgroundPosition: 'center 30%', filter: 'grayscale(0.35)',
          '&::after': { content: '""', position: 'absolute', inset: 0, backgroundColor: t.palette.marca.sidebar, opacity: t.palette.mode === 'dark' ? 0.84 : 0.78 },
        })}
      />
      <Box sx={{ position: 'relative', animation: `${placa} 320ms ${EASE_OUT} 60ms both`, ...sinMovimiento }}>
        <PlacaUnidad tipo="" numero="EC" size="lg" invertida />
      </Box>
      <Box sx={{ position: 'relative', textAlign: 'center', display: 'grid', gap: 0.5, animation: `${texto} 260ms ${EASE_OUT} 140ms both`, ...sinMovimiento }}>
        <Typography variant="h2" component="p" sx={{ color: 'marca.sidebarStrong' }}>
          {tipo === 'entrar' ? `Hola, ${nombre}` : `Hasta pronto, ${nombre}`}
        </Typography>
        <Typography sx={{ color: 'marca.sidebarInk', fontSize: '1.05rem' }}>
          {tipo === 'entrar' ? `Entrando a ${detalle}…` : 'Cerrando tu sesión…'}
        </Typography>
      </Box>
    </Box>
  );
}
