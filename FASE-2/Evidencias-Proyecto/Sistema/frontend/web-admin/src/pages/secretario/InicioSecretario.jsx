import { useNavigate } from 'react-router-dom';
import { Box, Button, Chip, Typography } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useMuro } from '../../context/MuroContext';
import { useDirectiva } from '../../context/DirectivaContext';
import { resultado } from '../../utils/votaciones';
import { diasHasta, fecha, hoyTexto, saludo } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import FranjaKpi from '../../components/ui/FranjaKpi';
import Tarjeta from '../../components/ui/Tarjeta';
import TarjetaVotacion from '../../components/directiva/TarjetaVotacion';
import { tieneModulo } from '../../config/modulos';

const ESTADO_PUBLICACION = {
  Pendiente: { texto: 'En revisión', color: 'warning' },
  Aprobada: { texto: 'Publicado', color: 'success' },
  Rechazada: { texto: 'Devuelto', color: 'error' },
};

// Inicio de la Secretaría: votaciones en curso, actas por publicar, acuerdos que vencen
// y el estado de los comunicados enviados al Presidente.
export default function InicioSecretario() {
  const navigate = useNavigate();
  const { usuario, comunidad } = useSesion();
  const { oficiales } = useMuro();
  const { actas, votacionesAbiertas, actasBorrador, totalUnidades, acciones } = useDirectiva();
  const conVotaciones = tieneModulo(comunidad, 'votaciones');
  // Comunicados y normas que redactó esta persona, los más recientes primero
  const enviados = oficiales.filter((x) => x.id_usuario === usuario.id_usuario);
  const comunicados = tieneModulo(comunidad, 'muro') ? enviados.slice(0, 4) : [];
  const enRevision = enviados.filter((x) => x.estado_aprobacion === 'Pendiente').length;

  const participacion = votacionesAbiertas.length
    ? votacionesAbiertas.reduce((s, v) => s + resultado(v, totalUnidades).participacion, 0) / votacionesAbiertas.length
    : 0;

  // Acuerdos con plazo próximo o vencido hace menos de una semana, los más urgentes primero
  const acuerdos = actas
    .flatMap((a) => a.acuerdos.filter((x) => x.plazo && diasHasta(x.plazo) >= -7).map((x) => ({ ...x, acta: a.numero })))
    .sort((a, b) => a.plazo.localeCompare(b.plazo))
    .slice(0, 5);

  const kpis = [];
  if (conVotaciones) {
    kpis.push(
      { etiqueta: 'Votaciones en curso', valor: votacionesAbiertas.length, nota: votacionesAbiertas.length ? `participación promedio ${Math.round(participacion)}%` : 'ninguna abierta' },
      { etiqueta: 'Actas en borrador', valor: actasBorrador.length, color: actasBorrador.length ? 'warning.main' : undefined, nota: actasBorrador.length ? 'falta publicarlas' : 'todo publicado' },
    );
  }
  if (comunicados.length) kpis.push({ etiqueta: 'Comunicados en revisión', valor: enRevision, nota: 'esperan a la Presidencia' });

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Encabezado
        contexto={`${comunidad.nombre} · ${hoyTexto()}`}
        titulo={`${saludo()}, ${usuario.nombre}`}
        acciones={conVotaciones && <Button variant="contained" onClick={() => navigate('/panel/actas')}>Ir al libro de actas</Button>}
      />

      {kpis.length > 0 && <FranjaKpi items={kpis} />}

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1.3fr 1fr' }, alignItems: 'start' }}>
        {conVotaciones && (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
              <Typography variant="h6" component="h2">Votaciones en curso</Typography>
              <Button size="small" onClick={() => navigate('/panel/votaciones')}>Ver todas</Button>
            </Box>
            {votacionesAbiertas.length === 0 && (
              <Tarjeta><Typography color="text.secondary">No hay votaciones abiertas.</Typography></Tarjeta>
            )}
            {votacionesAbiertas.slice(0, 2).map((v) => (
              <TarjetaVotacion key={v.id_votacion} votacion={v} totalUnidades={totalUnidades} onRecordar={acciones.recordarVotacion} compacta />
            ))}
          </Box>
        )}

        <Box sx={{ display: 'grid', gap: 2.5 }}>
          {conVotaciones && (
            <Tarjeta titulo="Acuerdos por cumplir" extra="De las actas">
              {acuerdos.length === 0 ? <Typography color="text.secondary">No hay acuerdos con plazo próximo.</Typography> : acuerdos.map((a, i) => {
                const dias = diasHasta(a.plazo);
                return (
                  <Box key={`${a.acta}-${i}`} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, py: 1, borderTop: i ? 1 : 0, borderColor: 'divider', mt: i ? 0 : -1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography>{a.texto}</Typography>
                      <Typography variant="body2" color="text.secondary">{a.responsable} · acta N° {a.acta}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', color: dias < 0 ? 'error.main' : dias <= 3 ? 'warning.main' : 'text.secondary' }}>
                      {dias < 0 ? `venció ${fecha(a.plazo)}` : dias === 0 ? 'vence hoy' : fecha(a.plazo)}
                    </Typography>
                  </Box>
                );
              })}
            </Tarjeta>
          )}

          {comunicados.length > 0 && (
            <Tarjeta titulo="Comunicados y normas enviados">
              {comunicados.map((x, i) => (
                <Box key={x.id_publicacion} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, alignItems: 'center', py: 1, borderTop: i ? 1 : 0, borderColor: 'divider', mt: i ? 0 : -1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{x.titulo}</Typography>
                    <Typography variant="body2" color="text.secondary">{x.tipo} · enviado el {fecha(x.fecha_creacion)}</Typography>
                  </Box>
                  <Chip size="small" variant="outlined" color={ESTADO_PUBLICACION[x.estado_aprobacion].color} label={ESTADO_PUBLICACION[x.estado_aprobacion].texto} />
                </Box>
              ))}
            </Tarjeta>
          )}
        </Box>
      </Box>
    </Box>
  );
}
