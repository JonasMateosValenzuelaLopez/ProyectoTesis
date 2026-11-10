import { useState } from 'react';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import { FlagOutlined as ReporteIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as muroApi from '../../api/muro';
import { clp, fechaHora, nombreUnidad } from '../../utils/formato';
import { conTipo } from '../../utils/unidades';
import PlacaUnidad from '../marca/PlacaUnidad';

const ACCIONES = {
  muro: { ocultar: muroApi.ocultarPublicacion, restaurar: muroApi.restaurarPublicacion, descartar: muroApi.descartarReportesMuro },
  marketplace: { ocultar: muroApi.ocultarAviso, restaurar: muroApi.restaurarAviso, descartar: muroApi.descartarReportesAviso },
};
const MENSAJE = {
  ocultar: 'Publicación oculta. Los reportes quedaron atendidos.',
  restaurar: 'Publicación visible de nuevo.',
  descartar: 'Reportes descartados: la publicación sigue visible.',
};

// Una publicación de un vecino (muro) o un aviso (marketplace) como lo ve la administración:
// con sus reportes pendientes y las acciones ocultar, restaurar o descartar reportes.
// `lugar` = 'muro' | 'marketplace'; `onCambio(nuevo)` recibe la versión que devuelve la API.
export default function PublicacionModerada({ item, lugar, moderar, onCambio }) {
  const { comunidad } = useSesion();
  const { avisar, avisarError } = useAviso();
  const [enviando, setEnviando] = useState(null);
  const oculta = item.estadoModeracion === 'Oculta';
  const reportes = item.reportes ?? [];
  const id = lugar === 'muro' ? item.idPublicacion : item.idProducto;
  const unidad = conTipo(item.unidad, comunidad);

  const hacer = async (accion) => {
    setEnviando(accion);
    try {
      onCambio(await ACCIONES[lugar][accion](id));
      avisar(MENSAJE[accion]);
    } catch (err) {
      avisarError(err.message);
    } finally {
      setEnviando(null);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'grid', gap: 1.5, opacity: oculta ? 0.75 : 1, borderColor: reportes.length && !oculta ? 'warning.main' : 'divider' }}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
        {unidad && <PlacaUnidad unidad={unidad} size="sm" />}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{item.autor?.nombre ?? 'Vecino sin nombre'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {lugar === 'marketplace' ? `Marketplace · ${item.tipo}` : 'Muro'}{unidad ? ` · ${nombreUnidad(unidad)}` : ''} · {fechaHora(item.fecha)}
          </Typography>
        </Box>
        {item.cerradoEn && <Chip size="small" variant="outlined" label={item.tipo === 'Vendo' ? 'Vendido' : 'Cerrado'} />}
        {oculta && <Chip size="small" variant="outlined" label="Oculta" />}
      </Box>
      <Box sx={{ textDecoration: oculta ? 'line-through' : 'none' }}>
        {item.titulo && (
          <Typography sx={{ fontWeight: 700 }}>
            {item.titulo}{item.precio != null && <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}> · {clp(item.precio)}</Box>}
          </Typography>
        )}
        {(item.contenido ?? item.descripcion) && <Typography sx={{ whiteSpace: 'pre-line' }}>{item.contenido ?? item.descripcion}</Typography>}
      </Box>
      {reportes.length > 0 && (
        <Box sx={{ display: 'grid', gap: 0.5, p: 1.25, borderRadius: 1, bgcolor: 'warning.light' }}>
          {reportes.map((r) => (
            <Typography key={r.idReporte} variant="body2" sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
              <ReporteIcon sx={{ fontSize: 16 }} /> <b>{r.motivo}</b> · reportado por {r.reportadoPor?.nombre ?? 'un vecino'}{r.vivienda ? ` (${r.vivienda})` : ''} · {fechaHora(r.fecha)}
            </Typography>
          ))}
        </Box>
      )}
      {oculta && item.moderadoPor && (
        <Typography variant="body2" color="text.secondary">Oculta por {item.moderadoPor.nombre} · {fechaHora(item.moderadoEn)}.</Typography>
      )}
      {moderar && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {oculta ? (
            <Button variant="outlined" loading={enviando === 'restaurar'} disabled={!!enviando} onClick={() => hacer('restaurar')}>Restaurar</Button>
          ) : (
            <>
              <Button variant={reportes.length ? 'contained' : 'outlined'} color="error" loading={enviando === 'ocultar'} disabled={!!enviando} onClick={() => hacer('ocultar')}>Ocultar</Button>
              {reportes.length > 0 && <Button color="inherit" loading={enviando === 'descartar'} disabled={!!enviando} onClick={() => hacer('descartar')}>Descartar reportes</Button>}
            </>
          )}
        </Box>
      )}
    </Paper>
  );
}
