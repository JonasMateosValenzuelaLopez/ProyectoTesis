import { useState } from 'react';
import { Box, Button, Paper, Tab, Tabs, Typography } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import * as muroApi from '../../api/muro';
import { usePaginado } from '../../api/usePaginado';
import Encabezado from '../../components/ui/Encabezado';
import EstadoCarga from '../../components/ui/EstadoCarga';
import PublicacionModerada from '../../components/comunidad/PublicacionModerada';

const idProducto = (a) => a.idProducto;

// Avisos de compra, venta y servicios entre vecinos (GET marketplace/moderacion, solo Administración).
// Al ocultar un aviso deja de verse en la app y sus reportes quedan atendidos.
export default function Marketplace() {
  const { comunidad } = useSesion();
  const avisos = usePaginado(muroApi.moderacionMarketplace, [comunidad.idRed], 'avisos', idProducto);
  const [pestana, setPestana] = useState('reportados');

  const todos = avisos.items ?? [];
  const reportados = todos.filter((a) => a.estadoModeracion === 'Publicada' && a.reportes?.length);
  const lista = pestana === 'reportados' ? reportados : pestana === 'ocultos' ? todos.filter((a) => a.estadoModeracion === 'Oculta') : todos;

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Marketplace"
        descripcion="Avisos de compra, venta y servicios entre vecinos. EntreCasas no participa en los pagos: solo comparte el teléfono cuando el vecino acepta."
      />
      <Tabs value={pestana} onChange={(_, v) => setPestana(v)} sx={{ mb: 2 }} variant="scrollable" allowScrollButtonsMobile>
        <Tab value="reportados" label={`Reportados${avisos.items ? ` (${reportados.length})` : ''}`} />
        <Tab value="todos" label="Todos" />
        <Tab value="ocultos" label="Ocultos" />
      </Tabs>

      {!avisos.items ? <EstadoCarga cargando={avisos.cargando} error={avisos.error} onReintentar={avisos.recargar} /> : (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {lista.length === 0 && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
              <Typography color="text.secondary">
                {pestana === 'reportados' ? 'No hay avisos reportados. Todo en orden.' : pestana === 'ocultos' ? 'No hay avisos ocultos.' : 'Todavía no hay avisos.'}
              </Typography>
            </Paper>
          )}
          {lista.map((a) => <PublicacionModerada key={a.idProducto} item={a} lugar="marketplace" moderar onCambio={avisos.reemplazar} />)}
          {avisos.siguiente && (
            <Button sx={{ justifySelf: 'center' }} loading={avisos.cargandoMas} onClick={avisos.cargarMas}>Ver avisos más antiguos</Button>
          )}
        </Box>
      )}
    </Box>
  );
}
