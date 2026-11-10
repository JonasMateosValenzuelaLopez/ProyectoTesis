import { useNavigate } from 'react-router-dom';
import { Box, Button, Chip, Typography } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import * as votacionesApi from '../../api/votaciones';
import * as muroApi from '../../api/muro';
import { useConsulta } from '../../api/useConsulta';
import { tieneModulo } from '../../config/modulos';
import { diasHasta, fecha, hoyTexto, saludo } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import FranjaKpi from '../../components/ui/FranjaKpi';
import Tarjeta from '../../components/ui/Tarjeta';
import TarjetaVotacion from '../../components/directiva/TarjetaVotacion';

const nada = () => Promise.resolve(null);
const ESTADO_PUBLICACION = {
  Pendiente: { texto: 'En revisión', color: 'warning' },
  Aprobada: { texto: 'Publicado', color: 'success' },
  Rechazada: { texto: 'Devuelto', color: 'error' },
};

// Inicio de la Secretaría: votaciones en curso, actas por publicar, acuerdos que vencen
// y el estado de los comunicados que envió a la Presidencia.
export default function InicioSecretario() {
  const navigate = useNavigate();
  const { usuario, comunidad } = useSesion();
  const conVotaciones = tieneModulo(comunidad, 'votaciones');
  const conMuro = tieneModulo(comunidad, 'muro');
  const votaciones = useConsulta(conVotaciones ? votacionesApi.listarVotaciones : nada, [comunidad.idRed, conVotaciones]);
  const actas = useConsulta(conVotaciones ? votacionesApi.listarActas : nada, [comunidad.idRed, conVotaciones]);
  const oficiales = useConsulta(conMuro ? muroApi.listarOficiales : nada, [comunidad.idRed, conMuro]);

  const abiertas = (votaciones.datos ?? []).filter((v) => v.estado === 'Abierta');
  const borradores = (actas.datos ?? []).filter((a) => a.estado === 'Borrador');
  // Comunicados y normas que redactó esta persona, los más recientes primero
  const enviados = (oficiales.datos ?? []).filter((x) => x.autor?.idUsuario === usuario.idUsuario);
  const comunicados = enviados.slice(0, 4);
  const enRevision = enviados.filter((x) => x.estadoAprobacion === 'Pendiente').length;
  const participacion = abiertas.length ? abiertas.reduce((s, v) => s + (v.resultado?.participacion ?? 0), 0) / abiertas.length : 0;

  // Acuerdos con plazo próximo o vencido hace menos de una semana, los más urgentes primero
  const acuerdos = (actas.datos ?? [])
    .flatMap((a) => a.acuerdos.filter((x) => x.plazo && diasHasta(x.plazo) >= -7).map((x) => ({ ...x, acta: a.numero })))
    .sort((a, b) => a.plazo.localeCompare(b.plazo))
    .slice(0, 5);

  const kpis = [];
  if (conVotaciones) {
    kpis.push(
      { etiqueta: 'Votaciones en curso', valor: abiertas.length, nota: abiertas.length ? `participación promedio ${Math.round(participacion)}%` : 'ninguna abierta' },
      { etiqueta: 'Actas en borrador', valor: borradores.length, color: borradores.length ? 'warning.main' : undefined, nota: borradores.length ? 'falta publicarlas' : 'todo publicado' },
    );
  }
  if (conMuro) kpis.push({ etiqueta: 'Comunicados en revisión', valor: enRevision, nota: 'esperan a la Presidencia' });

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Encabezado
        contexto={`${comunidad.nombre} · ${hoyTexto()}`}
        titulo={`${saludo()}, ${usuario.nombre}`}
        acciones={conVotaciones && <Button variant="contained" onClick={() => navigate('/panel/actas')}>Ir al libro de actas</Button>}
      />

      {kpis.length > 0 && <FranjaKpi items={kpis} />}
      {!conVotaciones && !conMuro && (
        <Tarjeta><Typography color="text.secondary">Esta comunidad no usa votaciones ni el muro. Desde el menú puedes mantener el directorio y la guía de bienvenida.</Typography></Tarjeta>
      )}

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1.3fr 1fr' }, alignItems: 'start' }}>
        {conVotaciones && (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
              <Typography variant="h6" component="h2">Votaciones en curso</Typography>
              <Button size="small" onClick={() => navigate('/panel/votaciones')}>Ver todas</Button>
            </Box>
            {votaciones.datos && abiertas.length === 0 && <Tarjeta><Typography color="text.secondary">No hay votaciones abiertas.</Typography></Tarjeta>}
            {votaciones.error && <Tarjeta><Typography color="error">{votaciones.error.message}</Typography></Tarjeta>}
            {abiertas.slice(0, 2).map((v) => <TarjetaVotacion key={v.idVotacion} votacion={v} onCambio={votaciones.recargar} compacta />)}
          </Box>
        )}

        <Box sx={{ display: 'grid', gap: 2.5 }}>
          {conVotaciones && (
            <Tarjeta titulo="Acuerdos por cumplir" extra="De las actas">
              {acuerdos.length === 0 ? <Typography color="text.secondary">No hay acuerdos con plazo próximo.</Typography> : acuerdos.map((a, i) => {
                const dias = diasHasta(a.plazo);
                return (
                  <Box key={a.idAcuerdo} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, py: 1, borderTop: i ? 1 : 0, borderColor: 'divider', mt: i ? 0 : -1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography>{a.texto}</Typography>
                      <Typography variant="body2" color="text.secondary">{[a.responsable, `acta N° ${a.acta}`].filter(Boolean).join(' · ')}</Typography>
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
              {comunicados.map((x, i) => {
                const e = ESTADO_PUBLICACION[x.estadoAprobacion] ?? { texto: x.estadoAprobacion, color: 'default' };
                return (
                  <Box key={x.idPublicacion} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, alignItems: 'center', py: 1, borderTop: i ? 1 : 0, borderColor: 'divider', mt: i ? 0 : -1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>{x.titulo}</Typography>
                      <Typography variant="body2" color="text.secondary">{x.tipo} · enviado el {fecha(x.fecha)}</Typography>
                    </Box>
                    <Chip size="small" variant="outlined" color={e.color} label={e.texto} />
                  </Box>
                );
              })}
            </Tarjeta>
          )}
        </Box>
      </Box>
    </Box>
  );
}
