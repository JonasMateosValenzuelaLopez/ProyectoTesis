import { useState } from 'react';
import { keyframes } from '@emotion/react';
import { Box, Button, Chip, Dialog, Typography, useMediaQuery } from '@mui/material';
import { CheckCircle as OkIcon, PlaceOutlined as DondeIcon } from '@mui/icons-material';
import { roles } from '../../tokens';
import { pasosTutorial } from '../../config/tutorial';
import { modulosActivos } from '../../config/modulos';
import SelloCargo from '../marca/SelloCargo';
import { PLATAFORMA, RolUsuario } from '../../config/roles';
import Escena from './Escenas';

const entra = keyframes`from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; }`;

// Tutorial del panel para el cargo con que se está trabajando. Como la API lo marca visto por persona
// (`tutorialPanelVisto`), se abre solo la primera vez que alguien entra al panel; después, desde el botón «?».
// `primeraVez` cambia «Cerrar» por «Saltar» y el último botón por «Empezar a trabajar».
export default function TutorialPanel({ open, onClose, usuario, cargo, comunidad, primeraVez }) {
  const [n, setN] = useState(0);
  const angosto = useMediaQuery((t) => t.breakpoints.down('sm'));
  const pasos = pasosTutorial(cargo, comunidad);
  const total = pasos.length + 1;
  const portada = n === 0;
  const paso = portada ? null : pasos[n - 1];
  const ultimo = n === total - 1;
  const cerrar = () => { onClose(); setN(0); };
  const opciones = {
    modulos: Object.fromEntries(modulosActivos(comunidad).map((m) => [m, true])),
    espacio: comunidad?.espacios_comunes?.[0]?.nombre,
    recordar: cargo === RolUsuario.SECRETARIO,
  };
  const rol = roles[cargo]?.label ?? '';

  return (
    <Dialog
      open={open} onClose={cerrar} fullScreen={angosto} maxWidth="md" fullWidth
      aria-labelledby="tutorial-titulo"
      slotProps={{ paper: { sx: { borderRadius: angosto ? 0 : 4, overflow: 'hidden' } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, pt: 2.5, gap: 2 }}>
        <Box role="progressbar" aria-label={`Paso ${n + 1} de ${total}`} aria-valuenow={n + 1} aria-valuemin={1} aria-valuemax={total} sx={{ display: 'flex', gap: 0.75 }}>
          {Array.from({ length: total }, (_, i) => (
            <Box key={i} sx={{ width: 22, height: 6, borderRadius: 99, bgcolor: i === n ? 'text.primary' : i < n ? 'info.main' : 'divider', transition: 'background-color .2s' }} />
          ))}
        </Box>
        {!ultimo && <Button onClick={cerrar} color="inherit" sx={{ color: 'text.secondary' }}>{primeraVez ? 'Saltar' : 'Cerrar'}</Button>}
      </Box>

      <Box key={n} sx={{ px: 3, py: 2.5, animation: `${entra} .25s ease-out`, '@media (prefers-reduced-motion: reduce)': { animation: 'none' }, flex: 1, overflowY: 'auto' }}>
        {portada ? (
          <Box sx={{ display: 'grid', gap: 2, py: { md: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <SelloCargo cargo={cargo} size={34} />
              <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
                {cargo === PLATAFORMA ? 'Equipo EntreCasas' : `${rol} · ${comunidad?.nombre}`}
              </Typography>
            </Box>
            <Typography id="tutorial-titulo" variant="h2" component="h2">
              {primeraVez ? `Hola, ${usuario?.nombre}. Así se usa tu panel.` : 'Cómo usar el panel'}
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
              {pasos.length} cosas que vas a hacer seguido, cada una con una muestra de cómo se ve. Toma un par de minutos.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {pasos.map((p, i) => (
                <Chip key={p.clave} label={`${i + 1}. ${p.titulo}`} variant="outlined" onClick={() => setN(i + 1)} />
              ))}
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '5fr 6fr' }, gap: 3, alignItems: 'start' }}>
            <Box sx={{ display: 'grid', gap: 1.25 }}>
              <Typography variant="overline" color="text.secondary">Paso {n} de {pasos.length}</Typography>
              <Typography id="tutorial-titulo" variant="h3" component="h2">{paso.titulo}</Typography>
              <Typography color="text.secondary">{paso.texto}</Typography>
              {paso.donde && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                  <DondeIcon sx={{ fontSize: 18, color: 'info.main' }} />
                  <Typography variant="body2"><Box component="span" sx={{ color: 'text.secondary' }}>En el menú: </Box><b>{paso.donde}</b></Typography>
                </Box>
              )}
            </Box>
            <Escena clave={paso.clave} opciones={opciones} />
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', alignItems: 'center', px: 3, pb: 2.5, pt: 1 }}>
        {ultimo && !portada && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mr: 'auto' }}>
            <OkIcon sx={{ fontSize: 18, color: 'success.main' }} />
            <Typography variant="body2" color="text.secondary">Lo vuelves a ver con el botón «?» de arriba.</Typography>
          </Box>
        )}
        {n > 0 && <Button variant="outlined" onClick={() => setN(n - 1)}>Atrás</Button>}
        <Button variant="contained" onClick={() => (ultimo ? cerrar() : setN(n + 1))} autoFocus>
          {portada ? 'Empezar' : !ultimo ? 'Siguiente' : primeraVez ? 'Empezar a trabajar' : 'Listo'}
        </Button>
      </Box>
    </Dialog>
  );
}
