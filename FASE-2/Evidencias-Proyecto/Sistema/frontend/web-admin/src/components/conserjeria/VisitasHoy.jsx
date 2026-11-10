import { useState } from 'react';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as porteria from '../../api/porteria';
import { horaMinuto, nombreUnidad } from '../../utils/formato';
import { conTipo } from '../../utils/unidades';
import PlacaUnidad from '../marca/PlacaUnidad';

const TOLERANCIA_MS = 15 * 60000;

function Lista({ titulo, extra, vacia, children }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 1.5 }}>
      <Box sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
        <Typography variant="h6" component="h2">{titulo}</Typography>
        <Typography variant="body2" color="text.secondary">{extra}</Typography>
      </Box>
      {children.length ? children : <Typography color="text.secondary" sx={{ p: 2.5 }}>{vacia}</Typography>}
    </Paper>
  );
}

// Visitas con invitación para hoy que aún no llegan (`esperadas`) y las personas que están adentro (`adentro`).
// «Dejar pasar» sirve cuando el QR no se puede leer (POST porteria/invitaciones/:id/ingreso).
// `ahora` (milisegundos) lo entrega la garita, que lo actualiza junto con el resumen.
export default function VisitasHoy({ esperadas, adentro, ahora, onCambio }) {
  const { comunidad } = useSesion();
  const { avisar, avisarError } = useAviso();
  const [enviando, setEnviando] = useState(null);

  const hacer = async (clave, accion, mensaje) => {
    setEnviando(clave);
    try {
      await accion();
      avisar(mensaje);
      onCambio();
    } catch (err) {
      avisarError(err.message);
      onCambio();
    } finally {
      setEnviando(null);
    }
  };

  const fila = (i, { clave, u, nombre, detalle, horario, chip, accion }) => (
    <Box key={clave} sx={{ display: 'grid', gridTemplateColumns: { xs: 'auto 1fr', sm: '64px auto 1fr auto' }, gap: { xs: 1.5, sm: 2 }, alignItems: 'center', px: 2.5, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>{horario}</Box>
      {u ? <PlacaUnidad unidad={u} size="sm" /> : <span />}
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700 }}>{nombre}</Typography>
        <Typography variant="body2" color="text.secondary">{detalle}</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end', gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
        {chip}
        {accion}
      </Box>
    </Box>
  );

  return (
    <>
      <Lista titulo="Visitas de hoy" extra={`${esperadas.length} por llegar`} vacia="No hay más visitas con invitación para hoy.">
        {esperadas.map((v, i) => {
          const u = conTipo(v.unidad, comunidad);
          const temprano = ahora < new Date(v.validaDesde).getTime() - TOLERANCIA_MS;
          return fila(i, {
            clave: v.idInvitacion, u, nombre: v.nombreVisita,
            detalle: `${v.categoria} de ${v.invitadaPor?.nombre ?? (u ? nombreUnidad(u) : 'la vivienda')}${v.patente ? ` · ${v.patente}` : ''}`,
            horario: (
              <>
                <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{horaMinuto(v.validaDesde)}</Typography>
                <Typography variant="caption" color="text.secondary">a {horaMinuto(v.validaHasta)}</Typography>
              </>
            ),
            chip: <Chip size="small" variant="outlined" color={temprano ? 'default' : 'warning'} label={temprano ? 'Más tarde' : 'Esperada'} />,
            accion: !temprano && (
              <Button size="small" variant="outlined" loading={enviando === `i${v.idInvitacion}`} disabled={!!enviando}
                onClick={() => hacer(`i${v.idInvitacion}`, () => porteria.ingresoPorInvitacion(v.idInvitacion), `Ingreso de ${v.nombreVisita} registrado.`)}>
                Dejar pasar
              </Button>
            ),
          });
        })}
      </Lista>
      <Lista titulo="Adentro" extra={`${adentro.length} ${adentro.length === 1 ? 'persona' : 'personas'}`} vacia="No hay visitas adentro.">
        {adentro.map((a, i) => {
          const u = conTipo(a.unidad, comunidad);
          return fila(i, {
            clave: a.idAcceso, u, nombre: a.visitante,
            detalle: `${a.categoria}${u ? ` · ${nombreUnidad(u)}` : ''}${a.patente ? ` · ${a.patente}` : ''}`,
            horario: (
              <>
                <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{horaMinuto(a.ingresoEn)}</Typography>
                <Typography variant="caption" color="text.secondary">entró</Typography>
              </>
            ),
            chip: <Chip size="small" variant="outlined" color="success" label="Adentro" />,
            accion: (
              <Button size="small" variant="outlined" loading={enviando === `a${a.idAcceso}`} disabled={!!enviando}
                onClick={() => hacer(`a${a.idAcceso}`, () => porteria.registrarSalida(a.idAcceso), `Salida de ${a.visitante} registrada.`)}>
                Registrar salida
              </Button>
            ),
          });
        })}
      </Lista>
    </>
  );
}
