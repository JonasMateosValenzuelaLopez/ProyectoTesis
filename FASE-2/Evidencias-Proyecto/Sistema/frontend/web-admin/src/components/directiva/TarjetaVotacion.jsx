import { useState } from 'react';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import { useAviso } from '../../context/AvisoContext';
import * as votacionesApi from '../../api/votaciones';
import { diasHasta, fecha } from '../../utils/formato';

const pct = (n) => `${Math.round(n)}%`;

// Barra horizontal simple; `marca` dibuja la línea del quórum.
function Barra({ valor, color = 'primary.main', marca, alto = 8 }) {
  return (
    <Box sx={{ position: 'relative', height: alto }}>
      {/* scaleX en vez de width: no recalcula el layout en cada cuadro */}
      <Box sx={{ height: '100%', borderRadius: alto, bgcolor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', bgcolor: color, transformOrigin: 'left', transform: `scaleX(${Math.min(valor, 100) / 100})`, transition: 'transform 250ms var(--ease-out)' }} />
      </Box>
      {marca != null && (
        <Box aria-hidden sx={{ position: 'absolute', top: -4, bottom: -4, left: `${marca}%`, width: 2, bgcolor: 'text.primary', borderRadius: 1 }} />
      )}
    </Box>
  );
}

function Plazo({ votacion }) {
  if (votacion.estado === 'Cerrada') return <>Cerró el {fecha(votacion.fechaCierre)}</>;
  const dias = diasHasta(votacion.fechaCierre);
  if (dias <= 0) return <>Cierra hoy</>;
  return <>Cierra el {fecha(votacion.fechaCierre)} · {dias === 1 ? 'queda 1 día' : `quedan ${dias} días`}</>;
}

// Una votación o encuesta con sus resultados (la directiva siempre los ve; el backend los calcula).
// Abierta: recordar a las viviendas que faltan (POST votaciones/:id/recordatorio) y cerrar antes de tiempo.
export default function TarjetaVotacion({ votacion, onCerrar, onCambio, compacta = false }) {
  const { avisar, avisarError } = useAviso();
  const [recordando, setRecordando] = useState(false);
  const r = votacion.resultado ?? { votos: 0, participacion: 0, faltan: votacion.totalUnidades, alcanzaQuorum: false, idOpcionGanadora: null };
  const abierta = votacion.estado === 'Abierta';
  const lider = Math.max(...votacion.opciones.map((o) => o.votos ?? 0));
  const ganadora = votacion.opciones.find((o) => o.idOpcion === r.idOpcionGanadora);

  const recordar = async () => {
    setRecordando(true);
    try {
      const res = await votacionesApi.recordarVotacion(votacion.idVotacion);
      avisar(`Recordatorio enviado a ${res.destinatarios} ${res.destinatarios === 1 ? 'titular' : 'titulares'} de las viviendas que faltan.`);
      onCambio();
    } catch (err) {
      avisarError(err.message);
    } finally {
      setRecordando(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, display: 'grid', gap: 2, alignContent: 'start' }}>
      <Box sx={{ display: 'grid', gap: 0.75 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip size="small" label={votacion.tipo} sx={{ bgcolor: 'info.light', color: 'info.main' }} />
          <Typography variant="body2" color="text.secondary"><Plazo votacion={votacion} /></Typography>
        </Box>
        <Typography variant="h6" component="h3">{votacion.titulo}</Typography>
        {!compacta && votacion.descripcion && <Typography color="text.secondary" sx={{ maxWidth: '65ch', whiteSpace: 'pre-line' }}>{votacion.descripcion}</Typography>}
      </Box>

      <Box sx={{ display: 'grid', gap: 1.25 }}>
        {votacion.opciones.map((o) => {
          const votos = o.votos ?? 0;
          const p = r.votos ? (votos / r.votos) * 100 : 0;
          const gana = abierta ? votos === lider && votos > 0 : o.idOpcion === r.idOpcionGanadora;
          return (
            <Box key={o.idOpcion} sx={{ display: 'grid', gap: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography sx={{ fontWeight: gana ? 700 : 400 }}>{o.texto}</Typography>
                <Typography color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>{votos} · {pct(p)}</Typography>
              </Box>
              <Barra valor={p} color={gana ? 'info.main' : 'text.disabled'} />
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'grid', gap: 0.75, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2"><b>{r.votos} de {votacion.totalUnidades}</b> unidades votaron ({pct(r.participacion)})</Typography>
          {votacion.quorum != null && (
            <Typography variant="body2" sx={{ fontWeight: 700, color: r.alcanzaQuorum ? 'success.main' : 'warning.main' }}>
              {r.alcanzaQuorum ? 'Quórum alcanzado' : `Quórum: ${pct(votacion.quorum)}`}
            </Typography>
          )}
        </Box>
        <Barra valor={r.participacion} color={r.alcanzaQuorum ? 'success.main' : 'warning.main'} marca={votacion.quorum} alto={6} />
      </Box>

      {!abierta && (
        <Typography sx={{ fontWeight: 700 }}>
          {!r.alcanzaQuorum ? 'No se alcanzó el quórum: la votación no es válida.'
            : ganadora ? `Resultado: ${ganadora.texto}` : r.votos ? 'Resultado: empate' : 'Nadie votó.'}
        </Typography>
      )}

      {abierta && (onCerrar || onCambio) && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {onCambio && (
            <Button variant="outlined" disabled={r.faltan === 0} loading={recordando} onClick={recordar}>
              Recordar a {r.faltan} {r.faltan === 1 ? 'vivienda' : 'viviendas'}
            </Button>
          )}
          {onCerrar && <Button color="inherit" onClick={() => onCerrar(votacion)}>Cerrar ahora</Button>}
          {votacion.recordatorios > 0 && (
            <Typography variant="body2" color="text.secondary">
              {votacion.recordatorios === 1 ? '1 recordatorio enviado' : `${votacion.recordatorios} recordatorios enviados`}
            </Typography>
          )}
          {votacion.unidadesSinTitular > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ flexBasis: '100%' }}>
              {votacion.unidadesSinTitular === 1 ? '1 vivienda no tiene' : `${votacion.unidadesSinTitular} viviendas no tienen`} titular con acceso a la app y no pueden votar. Administración lo asigna en Unidades.
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}
