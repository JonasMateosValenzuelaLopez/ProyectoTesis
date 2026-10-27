import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import { resultado } from '../../utils/votaciones';
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
  if (votacion.estado === 'cerrada') return <>Cerró el {fecha(votacion.cierre)}</>;
  const dias = diasHasta(votacion.cierre);
  if (dias <= 0) return <>Cierra hoy</>;
  return <>Cierra el {fecha(votacion.cierre)} · {dias === 1 ? 'queda 1 día' : `quedan ${dias} días`}</>;
}

export default function TarjetaVotacion({ votacion, totalUnidades, onRecordar, onCerrar, compacta = false }) {
  const r = resultado(votacion, totalUnidades);
  const abierta = votacion.estado === 'abierta';
  const lider = Math.max(...votacion.opciones.map((o) => o.votos));

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, display: 'grid', gap: 2, alignContent: 'start' }}>
      <Box sx={{ display: 'grid', gap: 0.75 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip size="small" label={votacion.tipo === 'votacion' ? 'Votación' : 'Encuesta'} sx={{ bgcolor: 'info.light', color: 'info.main' }} />
          <Typography variant="body2" color="text.secondary"><Plazo votacion={votacion} /></Typography>
        </Box>
        <Typography variant="h6" component="h3">{votacion.titulo}</Typography>
        {!compacta && votacion.descripcion && <Typography color="text.secondary" sx={{ maxWidth: '65ch' }}>{votacion.descripcion}</Typography>}
      </Box>

      <Box sx={{ display: 'grid', gap: 1.25 }}>
        {votacion.opciones.map((o) => {
          const p = r.votos ? (o.votos / r.votos) * 100 : 0;
          const gana = o.votos === lider && o.votos > 0;
          return (
            <Box key={o.id} sx={{ display: 'grid', gap: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography sx={{ fontWeight: gana ? 700 : 400 }}>{o.texto}</Typography>
                <Typography color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>{o.votos} · {pct(p)}</Typography>
              </Box>
              <Barra valor={p} color={gana ? 'info.main' : 'text.disabled'} />
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'grid', gap: 0.75, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2"><b>{r.votos} de {totalUnidades}</b> unidades votaron ({pct(r.participacion)})</Typography>
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
          {!r.alcanzaQuorum
            ? 'No se alcanzó el quórum: la votación no es válida.'
            : r.ganadora ? `Resultado: ${r.ganadora.texto}` : 'Resultado: empate'}
        </Typography>
      )}

      {abierta && (onRecordar || onCerrar) && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {onRecordar && (
            <Button variant="outlined" disabled={r.faltan === 0} onClick={() => onRecordar(votacion)}>
              Recordar a {r.faltan} {r.faltan === 1 ? 'unidad' : 'unidades'}
            </Button>
          )}
          {onCerrar && <Button color="inherit" onClick={() => onCerrar(votacion)}>Cerrar ahora</Button>}
          {votacion.recordatorios > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
              {votacion.recordatorios === 1 ? '1 recordatorio enviado' : `${votacion.recordatorios} recordatorios enviados`}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}
