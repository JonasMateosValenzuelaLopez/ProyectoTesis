import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, Tab, Tabs, Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as votacionesApi from '../../api/votaciones';
import * as admin from '../../api/admin';
import { useConsulta } from '../../api/useConsulta';
import Encabezado from '../../components/ui/Encabezado';
import EstadoCarga from '../../components/ui/EstadoCarga';
import DialogoVotacion from '../../components/directiva/DialogoVotacion';
import TarjetaVotacion from '../../components/directiva/TarjetaVotacion';

// Cerrar una votación antes de tiempo (POST votaciones/:id/cierre): queda publicado el resultado
function DialogoCerrar({ votacion, onClose, onCerrada }) {
  const { avisar } = useAviso();
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const cerrar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await votacionesApi.cerrarVotacion(votacion.idVotacion);
      avisar(`«${votacion.titulo}» cerrada. El resultado ya está publicado.`);
      onCerrada();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>¿Cerrar «{votacion.titulo}»?</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <DialogContentText>Nadie más podrá votar y el resultado quedará publicado para los residentes. No se puede volver a abrir.</DialogContentText>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" loading={enviando} onClick={cerrar}>Cerrar votación</Button>
      </DialogActions>
    </Dialog>
  );
}

// Votaciones y encuestas de la comunidad (GET votaciones). Los residentes votan desde la app: una vivienda, un voto,
// a través de su titular. La Secretaría y la Presidencia las abren, recuerdan y cierran.
export default function Votaciones() {
  const { comunidad } = useSesion();
  const votaciones = useConsulta(votacionesApi.listarVotaciones, [comunidad.idRed]);
  const unidades = useConsulta(admin.listarUnidades, [comunidad.idRed]);
  const [pestana, setPestana] = useState('Abierta');
  const [nueva, setNueva] = useState(false);
  const [porCerrar, setPorCerrar] = useState(null);

  const encabezado = (
    <Encabezado
      contexto={comunidad.nombre}
      titulo="Votaciones y encuestas"
      descripcion="Los residentes votan desde la app. Cada unidad tiene un voto y los resultados se publican al cerrar."
      acciones={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setNueva(true)} disabled={!unidades.datos}>Abrir votación</Button>}
    />
  );
  if (!votaciones.datos) {
    return <Box sx={{ maxWidth: 1200 }}>{encabezado}<EstadoCarga cargando={votaciones.cargando} error={votaciones.error} onReintentar={votaciones.recargar} /></Box>;
  }
  const lista = votaciones.datos.filter((v) => v.estado === pestana);
  const abiertas = votaciones.datos.filter((v) => v.estado === 'Abierta').length;

  return (
    <Box sx={{ maxWidth: 1200 }}>
      {encabezado}
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
          {lista.map((v) => <TarjetaVotacion key={v.idVotacion} votacion={v} onCambio={votaciones.recargar} onCerrar={setPorCerrar} />)}
        </Box>
      )}

      {nueva && <DialogoVotacion unidades={unidades.datos} onClose={() => setNueva(false)} onCreada={votaciones.recargar} />}
      {porCerrar && <DialogoCerrar votacion={porCerrar} onClose={() => setPorCerrar(null)} onCerrada={votaciones.recargar} />}
    </Box>
  );
}
