import { useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, Tab, Tabs, Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useDirectiva } from '../../context/DirectivaContext';
import Encabezado from '../../components/ui/Encabezado';
import DialogoVotacion from '../../components/directiva/DialogoVotacion';
import TarjetaVotacion from '../../components/directiva/TarjetaVotacion';

export default function Votaciones() {
  const { comunidad } = useSesion();
  const { votaciones, totalUnidades, acciones } = useDirectiva();
  const [pestana, setPestana] = useState('Abierta');
  const [nueva, setNueva] = useState(false);
  const [porCerrar, setPorCerrar] = useState(null);
  const lista = votaciones.filter((v) => v.estado === pestana);
  const abiertas = votaciones.filter((v) => v.estado === 'Abierta').length;

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Votaciones y encuestas"
        descripcion="Los residentes votan desde la app. Cada unidad tiene un voto y los resultados se publican al cerrar."
        acciones={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setNueva(true)}>Abrir votación</Button>}
      />

      <Tabs value={pestana} onChange={(_, v) => setPestana(v)} sx={{ mb: 2 }}>
        <Tab value="Abierta" label={`En curso (${abiertas})`} />
        <Tab value="Cerrada" label="Cerradas" />
      </Tabs>

      {lista.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
          <Typography color="text.secondary">{pestana === 'Abierta' ? 'No hay votaciones en curso.' : 'Todavía no hay votaciones cerradas.'}</Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
          {lista.map((v) => (
            <TarjetaVotacion key={v.id_votacion} votacion={v} totalUnidades={totalUnidades} onRecordar={acciones.recordarVotacion} onCerrar={setPorCerrar} />
          ))}
        </Box>
      )}

      <DialogoVotacion open={nueva} onClose={() => setNueva(false)} />

      <Dialog open={Boolean(porCerrar)} onClose={() => setPorCerrar(null)}>
        <DialogTitle>¿Cerrar «{porCerrar?.titulo}»?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Nadie más podrá votar y el resultado quedará publicado para los residentes. No se puede volver a abrir.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPorCerrar(null)}>Cancelar</Button>
          <Button variant="contained" onClick={() => { acciones.cerrarVotacion(porCerrar); setPorCerrar(null); }}>Cerrar votación</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
