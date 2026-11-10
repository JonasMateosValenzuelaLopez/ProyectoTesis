import { useState } from 'react';
import { Alert, Box, Button, Chip, TextField, Typography } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as finanzas from '../../api/finanzas';
import * as admin from '../../api/admin';
import * as muroApi from '../../api/muro';
import { useConsulta } from '../../api/useConsulta';
import { tieneModulo } from '../../config/modulos';
import { MAX_UMBRAL_VISADO } from '../../utils/comunidad';
import { soloDigitos } from '../../utils/finanzas';
import { clp, fecha, nombreUnidad } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';
import EstadoCarga from '../../components/ui/EstadoCarga';
import PlacaUnidad from '../../components/marca/PlacaUnidad';
import DialogoDecision from '../../components/finanzas/DialogoDecision';

function Fila({ children, acciones, primera }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' }, gap: 2, alignItems: 'center', py: 2, borderTop: primera ? 0 : 1, borderColor: 'divider' }}>
      <Box sx={{ minWidth: 0, display: 'grid', gap: 0.5 }}>{children}</Box>
      <Box sx={{ display: 'flex', gap: 1 }}>{acciones}</Box>
    </Box>
  );
}

const Decision = ({ onAprobar, onRechazar, aprobar = 'Aprobar', rechazar = 'Rechazar', sinAprobar = false }) => (
  <>
    <Button variant="contained" onClick={onAprobar} disabled={sinAprobar}>{aprobar}</Button>
    <Button color="inherit" onClick={onRechazar}>{rechazar}</Button>
  </>
);

// Monto desde el que un egreso necesita el visado de la Presidencia (PUT comunidad/umbral-visado),
// un entero entre 1 y MAX_UMBRAL_VISADO. Solo afecta a los egresos que se registren después.
function UmbralVisado({ umbral, onCambio }) {
  const { avisar } = useAviso();
  const [editando, setEditando] = useState(false);
  const [monto, setMonto] = useState('');
  const [errorApi, setErrorApi] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const valor = Number(monto);
  const error = !monto ? 'Escribe un monto' : valor < 1 || valor > MAX_UMBRAL_VISADO ? `Debe ser entre $1 y ${clp(MAX_UMBRAL_VISADO)}` : '';
  const guardar = async (e) => {
    e.preventDefault();
    if (error) return;
    if (valor === umbral) { setEditando(false); return; }
    setEnviando(true);
    setErrorApi(null);
    try {
      await admin.cambiarUmbralVisado(valor);
      avisar(`Desde ahora, los egresos de ${clp(valor)} o más esperan tu visado.`);
      onCambio();
      setEditando(false);
    } catch (err) {
      setErrorApi(err.message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Tarjeta titulo="Umbral de visado" extra="Solo la Presidencia lo cambia">
      {!editando ? (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ flex: 1, minWidth: 240 }}>
            Los egresos de <b>{clp(umbral)}</b> o más esperan tu visto bueno antes de contar en los reportes. Los de menos los registra Tesorería directamente.
          </Typography>
          <Button variant="outlined" onClick={() => { setMonto(String(umbral)); setErrorApi(null); setEditando(true); }}>Cambiar monto</Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={guardar} sx={{ display: 'grid', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              autoFocus label="Visar desde" value={monto} onChange={(e) => setMonto(soloDigitos(e.target.value))}
              error={!!monto && !!error} helperText={monto && !error ? clp(valor) : error || ' '}
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: String(MAX_UMBRAL_VISADO).length } }} sx={{ minWidth: 220 }}
            />
            <Button type="submit" variant="contained" disabled={!!error} loading={enviando} sx={{ mt: 1 }}>Guardar</Button>
            <Button onClick={() => setEditando(false)} sx={{ mt: 1 }}>Cancelar</Button>
          </Box>
          {errorApi && <Alert severity="error">{errorApi}</Alert>}
        </Box>
      )}
    </Tarjeta>
  );
}

// Lo que necesita la firma de la Presidencia: egresos sobre el umbral, exenciones que Tesorería ya revisó
// y comunicados o normas que redactó otro cargo de la directiva.
export default function PorAprobar() {
  const { usuario, comunidad } = useSesion();
  const conCobros = tieneModulo(comunidad, 'cobros');
  const sinModulo = () => Promise.resolve([]);
  const egresos = useConsulta(conCobros ? finanzas.listarEgresos : sinModulo, [comunidad.idRed, conCobros]);
  const exenciones = useConsulta(conCobros ? finanzas.listarExenciones : sinModulo, [comunidad.idRed, conCobros]);
  const datos = useConsulta(admin.datosComunidad, [comunidad.idRed]);
  const conMuro = tieneModulo(comunidad, 'muro');
  const oficiales = useConsulta(conMuro ? muroApi.listarOficiales : sinModulo, [comunidad.idRed, conMuro]);
  const [decision, setDecision] = useState(null);

  const porVisar = (egresos.datos ?? []).filter((e) => e.estadoVisado === 'Pendiente');
  const porAprobar = (exenciones.datos ?? []).filter((e) => e.estado === 'Por aprobar');
  const comunicados = (oficiales.datos ?? []).filter((x) => x.estadoAprobacion === 'Pendiente');
  const total = porVisar.length + porAprobar.length + comunicados.length;
  const umbral = datos.datos?.umbralVisado;
  const cargado = egresos.datos && exenciones.datos && oficiales.datos;
  const decidirOficial = (x, aprobado) => setDecision({
    titulo: aprobado ? 'Aprobar y publicar' : 'Devolver',
    detalle: aprobado
      ? `«${x.titulo}» se publica en el muro y se avisa por correo a los residentes.`
      : `«${x.titulo}» vuelve a quien lo redactó y no se publica.`,
    aprobado, etiqueta: aprobado ? 'Aprobar y publicar' : 'Devolver',
    mensaje: aprobado ? 'Publicado en el muro.' : 'Comunicado devuelto.',
    hacer: (comentario) => muroApi.decidirOficial(x.idPublicacion, aprobado, comentario),
    recargar: oficiales.recargar,
  });
  const unidadDe = (e) => ({ tipo: comunidad.tipo === 'Edificio' ? 'Departamento' : 'Casa', numeroIdentificador: e.unidad?.numeroIdentificador ?? '?' });

  const visar = (e, aprobado) => setDecision({
    titulo: aprobado ? 'Visar egreso' : 'Rechazar egreso',
    detalle: `${e.descripcion} · ${clp(e.monto)}${aprobado ? '. Contará en los reportes.' : '. No contará en los reportes.'}`,
    aprobado, etiqueta: aprobado ? 'Visar' : 'Rechazar',
    mensaje: aprobado ? 'Egreso visado.' : 'Egreso rechazado.',
    hacer: (comentario) => finanzas.visarEgreso(e.idEgreso, aprobado, comentario),
    recargar: egresos.recargar,
  });
  const resolver = (e, aprobado) => setDecision({
    titulo: aprobado ? 'Aprobar exención' : 'Rechazar exención',
    detalle: aprobado
      ? `«${e.concepto}» de ${nombreUnidad(unidadDe(e))} (${clp(e.monto)}) queda exento: la unidad ya no lo debe.`
      : `«${e.concepto}» de ${nombreUnidad(unidadDe(e))} sigue vigente.`,
    aprobado, etiqueta: aprobado ? 'Aprobar' : 'Rechazar',
    mensaje: aprobado ? 'Exención aprobada. El cobro quedó exento.' : 'Exención rechazada.',
    hacer: (comentario) => finanzas.resolverExencion(e.idExencion, aprobado, comentario),
    recargar: exenciones.recargar,
  });

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Por aprobar"
        descripcion={!cargado ? 'Lo que espera tu decisión.' : total
          ? `${total} ${total === 1 ? 'elemento espera' : 'elementos esperan'} tu decisión. Cada decisión queda registrada en la bitácora.`
          : 'No hay nada esperando tu decisión.'}
      />

      <Box sx={{ display: 'grid', gap: 2.5 }}>
        {umbral != null && <UmbralVisado umbral={umbral} onCambio={datos.recargar} />}
        {datos.error && <Alert severity="error">{datos.error.message}</Alert>}

        {conCobros && (
          <Tarjeta titulo="Egresos por visar" extra={umbral != null ? `Requieren visado desde ${clp(umbral)}` : undefined}>
            {!egresos.datos ? <EstadoCarga cargando={egresos.cargando} error={egresos.error} onReintentar={egresos.recargar} />
              : porVisar.length === 0 ? <Typography color="text.secondary">Sin egresos por visar.</Typography>
                : porVisar.map((e, i) => (
                  <Fila key={e.idEgreso} primera={i === 0} acciones={<Decision aprobar="Visar" sinAprobar={e.creadoPor?.idUsuario === usuario.idUsuario} onAprobar={() => visar(e, true)} onRechazar={() => visar(e, false)} />}>
                    <Typography sx={{ fontWeight: 700 }}>{e.descripcion}</Typography>
                    <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: '1.3rem' }}>{clp(e.monto)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {e.categoria?.nombre ?? 'Sin categoría'}{e.proveedor ? ` · ${e.proveedor}` : ''} · {fecha(e.fechaEgreso)} · registrado por {e.creadoPor?.nombre ?? 'sin nombre'}
                    </Typography>
                    {e.comprobanteUrl && <Typography variant="body2"><a href={e.comprobanteUrl} target="_blank" rel="noopener noreferrer">Ver comprobante</a></Typography>}
                    {e.creadoPor?.idUsuario === usuario.idUsuario && (
                      <Typography variant="body2" color="warning.main">Lo registraste tú: lo debe visar otra persona de la directiva. Puedes rechazarlo si fue un error.</Typography>
                    )}
                  </Fila>
                ))}
          </Tarjeta>
        )}

        {conCobros && (
          <Tarjeta titulo="Exenciones de cobro" extra="Ya revisadas por Tesorería">
            {!exenciones.datos ? <EstadoCarga cargando={exenciones.cargando} error={exenciones.error} onReintentar={exenciones.recargar} />
              : porAprobar.length === 0 ? <Typography color="text.secondary">Sin exenciones por decidir.</Typography>
                : porAprobar.map((e, i) => (
                  <Fila key={e.idExencion} primera={i === 0} acciones={<Decision onAprobar={() => resolver(e, true)} onRechazar={() => resolver(e, false)} />}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <PlacaUnidad unidad={unidadDe(e)} size="sm" />
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{e.concepto}</Typography>
                        <Typography variant="body2" color="text.secondary">{clp(e.monto)}</Typography>
                      </Box>
                    </Box>
                    <Typography color="text.secondary">«{e.motivo}»</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pedida por {e.solicitadaPor?.nombre ?? 'sin nombre'} · {fecha(e.fechaSolicitud)}
                      {e.revisadaPor && e.revisadaPor.idUsuario !== e.solicitadaPor?.idUsuario ? ` · revisada por ${e.revisadaPor.nombre}` : ''}
                    </Typography>
                  </Fila>
                ))}
            {porAprobar.length > 0 && (
              <Alert severity="info" variant="outlined">Al aprobar, el cobro de esa unidad queda exento. Al rechazar, sigue vigente.</Alert>
            )}
          </Tarjeta>
        )}

        {conMuro && (
          <Tarjeta titulo="Comunicados oficiales y normas" extra="Se publican y se avisan por correo al aprobarlos">
            {!oficiales.datos ? <EstadoCarga cargando={oficiales.cargando} error={oficiales.error} onReintentar={oficiales.recargar} />
              : comunicados.length === 0 ? <Typography color="text.secondary">Sin comunicados por aprobar.</Typography>
                : comunicados.map((x, i) => (
                  <Fila key={x.idPublicacion} primera={i === 0} acciones={<Decision aprobar="Aprobar y publicar" rechazar="Devolver" onAprobar={() => decidirOficial(x, true)} onRechazar={() => decidirOficial(x, false)} />}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip size="small" label={x.tipo} sx={{ bgcolor: 'info.light', color: 'info.main' }} />
                      <Typography sx={{ fontWeight: 700 }}>{x.titulo}</Typography>
                    </Box>
                    <Typography color="text.secondary" sx={{ maxWidth: '65ch', whiteSpace: 'pre-line' }}>{x.contenido}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Redactado por {[x.autor?.nombre ?? 'sin nombre', x.autor?.cargo].filter(Boolean).join(' · ')} · {fecha(x.fecha)}
                    </Typography>
                  </Fila>
                ))}
          </Tarjeta>
        )}
      </Box>

      {decision && <DialogoDecision decision={decision} onClose={() => setDecision(null)} onHecho={decision.recargar} />}
    </Box>
  );
}
