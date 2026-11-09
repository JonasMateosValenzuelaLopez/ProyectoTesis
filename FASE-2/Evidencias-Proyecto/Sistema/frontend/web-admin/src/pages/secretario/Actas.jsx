import { useState } from 'react';
import {
  Alert, Box, Button, ButtonBase, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, TextField, Typography,
} from '@mui/material';
import { Add as AddIcon, FileDownloadOutlined as DescargarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as votacionesApi from '../../api/votaciones';
import * as admin from '../../api/admin';
import { useConsulta } from '../../api/useConsulta';
import { fecha, fechaCompleta, lineas } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import EstadoCarga from '../../components/ui/EstadoCarga';
import DialogoActa from '../../components/directiva/DialogoActa';

const ESTADO = {
  Borrador: { texto: 'Borrador', color: 'warning' },
  Publicada: { texto: 'Publicada', color: 'success' },
};

// Texto plano del acta para descargar o imprimir.
function actaComoTexto(acta, comunidad, totalUnidades) {
  const l = [
    `${comunidad.nombre.toUpperCase()}`,
    `ACTA N° ${acta.numero} · ${acta.tipo.toUpperCase()}`,
    '',
    `Fecha: ${fechaCompleta(acta.fecha)}`,
    `Lugar: ${acta.lugar}`,
  ];
  if (acta.unidadesPresentes != null) l.push(`Unidades presentes: ${acta.unidadesPresentes}${totalUnidades != null ? ` de ${totalUnidades}` : ''}`);
  l.push('', 'ASISTENTES', ...lineas(acta.asistentes).map((a) => `- ${a}`));
  l.push('', 'TEMAS TRATADOS', ...lineas(acta.temas).map((t, i) => `${i + 1}. ${t}`));
  l.push('', 'ACUERDOS', ...acta.acuerdos.map((a, i) => `${i + 1}. ${a.texto}${a.responsable ? ` Responsable: ${a.responsable}.` : ''}${a.plazo ? ` Plazo: ${fechaCompleta(a.plazo)}.` : ''}`));
  l.push('', `Redactada por ${acta.redactor?.nombre ?? 'la directiva'}${acta.publicadaEn ? ` · publicada el ${fechaCompleta(acta.publicadaEn)}` : ''}`);
  return l.join('\n');
}

function descargar(acta, comunidad, totalUnidades) {
  const url = URL.createObjectURL(new Blob([actaComoTexto(acta, comunidad, totalUnidades)], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `acta-${acta.numero}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function Seccion({ titulo, children }) {
  return (
    <Box sx={{ display: 'grid', gap: 0.75, alignContent: 'start' }}>
      <Typography variant="overline" color="text.secondary" component="h3" sx={{ lineHeight: 1.6 }}>{titulo}</Typography>
      {children}
    </Box>
  );
}

function DetalleActa({ acta, totalUnidades, onEditar, onPublicar, onEliminar }) {
  const { comunidad } = useSesion();
  const borrador = acta.estado === 'Borrador';
  const asistentes = lineas(acta.asistentes);
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 1.5, display: 'grid', gap: 2.5, alignContent: 'start' }}>
      <Box sx={{ display: 'grid', gap: 0.5 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">Acta N° {acta.numero}</Typography>
          <Chip size="small" variant="outlined" color={ESTADO[acta.estado].color} label={ESTADO[acta.estado].texto} />
        </Box>
        <Typography variant="h5" component="h2">{acta.tipo}</Typography>
        <Typography color="text.secondary">
          {fechaCompleta(acta.fecha)} · {acta.lugar}
          {acta.unidadesPresentes != null && ` · ${acta.unidadesPresentes}${totalUnidades != null ? ` de ${totalUnidades}` : ''} unidades presentes`}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Seccion titulo="Asistentes">
          {asistentes.length ? asistentes.map((a, i) => <Typography key={i}>{a}</Typography>) : <Typography color="text.secondary">Sin registrar</Typography>}
        </Seccion>
        <Seccion titulo="Temas tratados">
          <Box component="ol" sx={{ m: 0, pl: 0, listStylePosition: 'inside', display: 'grid', gap: 0.75, '& li::marker': { color: 'text.secondary' } }}>
            {lineas(acta.temas).map((t, i) => <Typography component="li" key={i}>{t}</Typography>)}
          </Box>
        </Seccion>
      </Box>

      <Seccion titulo="Acuerdos">
        {acta.acuerdos.length === 0 && <Typography color="text.secondary">Sin acuerdos.</Typography>}
        {acta.acuerdos.map((a, i) => (
          <Box key={a.idAcuerdo} sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1.5, py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
            <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, color: 'bronce.main', minWidth: '1.5ch' }}>{i + 1}</Typography>
            <Box>
              <Typography>{a.texto}</Typography>
              {(a.responsable || a.plazo) && (
                <Typography variant="body2" color="text.secondary">
                  {[a.responsable, a.plazo && `plazo ${fecha(a.plazo)}`].filter(Boolean).join(' · ')}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Seccion>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', pt: 2, borderTop: 1, borderColor: 'divider' }}>
        {borrador ? (
          <>
            <Button variant="contained" onClick={() => onPublicar(acta)}>Publicar acta</Button>
            <Button variant="outlined" onClick={() => onEditar(acta)}>Editar</Button>
            <Button color="error" onClick={() => onEliminar(acta)}>Eliminar borrador</Button>
            {acta.redactor && <Typography variant="body2" color="text.secondary">Redactada por {acta.redactor.nombre}</Typography>}
          </>
        ) : (
          <>
            <Button variant="outlined" startIcon={<DescargarIcon />} onClick={() => descargar(acta, comunidad, totalUnidades)}>Descargar</Button>
            <Typography variant="body2" color="text.secondary" sx={{ flex: '1 1 260px' }}>
              Publicada el {fecha(acta.publicadaEn)}. Ya no se puede editar: para corregirla, redacta un acta rectificatoria.
            </Typography>
          </>
        )}
      </Box>
    </Paper>
  );
}

// Confirmar publicar (POST actas/:id/publicacion) o eliminar un borrador (DELETE actas/:id)
function DialogoConfirmar({ confirmar, onClose, onHecho }) {
  const { avisar } = useAviso();
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const publicar = confirmar.tipo === 'publicar';
  const ejecutar = async () => {
    setEnviando(true);
    setError(null);
    try {
      if (publicar) await votacionesApi.publicarActa(confirmar.acta.idActa);
      else await votacionesApi.eliminarActa(confirmar.acta.idActa);
      avisar(publicar ? `Acta N° ${confirmar.acta.numero} publicada. Los residentes ya la ven en la app.` : 'Borrador eliminado.');
      onHecho(confirmar);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>{publicar ? `¿Publicar el acta N° ${confirmar.acta.numero}?` : '¿Eliminar este borrador?'}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <DialogContentText>
          {publicar ? 'Todos los residentes podrán leerla en la app. Después de publicarla no se puede editar.' : 'El borrador se borra por completo. Esta acción no se puede deshacer.'}
        </DialogContentText>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color={publicar ? 'primary' : 'error'} loading={enviando} onClick={ejecutar}>{publicar ? 'Publicar' : 'Eliminar'}</Button>
      </DialogActions>
    </Dialog>
  );
}

// Libro de actas (GET actas): la directiva ve también los borradores; los residentes, solo las publicadas.
export default function Actas() {
  const { comunidad } = useSesion();
  const actas = useConsulta(votacionesApi.listarActas, [comunidad.idRed]);
  const unidades = useConsulta(admin.listarUnidades, [comunidad.idRed]);
  const [idSeleccionada, setIdSeleccionada] = useState(null);
  const [edicion, setEdicion] = useState(null); // { acta } o { acta: null } para una nueva
  const [confirmar, setConfirmar] = useState(null); // { tipo: 'publicar' | 'eliminar', acta }
  const [busqueda, setBusqueda] = useState('');
  const totalUnidades = unidades.datos?.length ?? null;

  const encabezado = (
    <Encabezado
      contexto={comunidad.nombre}
      titulo="Libro de actas"
      descripcion="Las actas publicadas las ven todos los residentes en la app y no se pueden modificar."
      acciones={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEdicion({ acta: null })}>Nueva acta</Button>}
    />
  );
  if (!actas.datos) return <Box sx={{ maxWidth: 1300 }}>{encabezado}<EstadoCarga cargando={actas.cargando} error={actas.error} onReintentar={actas.recargar} /></Box>;

  const todas = actas.datos;
  const texto = busqueda.trim().toLowerCase();
  const lista = todas.filter((a) => !texto || [a.tipo, a.lugar, a.temas, ...a.acuerdos.map((x) => x.texto)].join(' ').toLowerCase().includes(texto));
  const seleccionada = todas.find((a) => a.idActa === idSeleccionada) ?? lista[0];

  return (
    <Box sx={{ maxWidth: 1300 }}>
      {encabezado}
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <TextField size="small" label="Buscar en temas y acuerdos" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
            {lista.length === 0 && <Typography color="text.secondary" sx={{ p: 2 }}>{todas.length ? 'Ninguna acta coincide.' : 'Todavía no hay actas.'}</Typography>}
            {lista.map((a, i) => {
              const activa = seleccionada?.idActa === a.idActa;
              return (
                <ButtonBase
                  key={a.idActa} onClick={() => setIdSeleccionada(a.idActa)} aria-current={activa || undefined}
                  sx={{
                    width: '100%', textAlign: 'left', justifyContent: 'stretch', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 1.5, alignItems: 'center',
                    px: 2, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider',
                    bgcolor: activa ? 'bronce.light' : 'transparent', '&:hover': { bgcolor: activa ? 'bronce.light' : 'action.hover' },
                  }}
                >
                  <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: '1.15rem', color: activa ? 'bronce.main' : 'text.secondary', minWidth: '2ch' }}>
                    {a.numero}
                  </Typography>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }} noWrap>{a.tipo}</Typography>
                    <Typography variant="body2" color="text.secondary">{fecha(a.fecha)}</Typography>
                  </Box>
                  {a.estado === 'Borrador' && <Chip size="small" variant="outlined" color="warning" label="Borrador" />}
                </ButtonBase>
              );
            })}
          </Paper>
        </Box>

        {seleccionada && (
          <DetalleActa
            acta={seleccionada} totalUnidades={totalUnidades}
            onEditar={(acta) => setEdicion({ acta })}
            onPublicar={(acta) => setConfirmar({ tipo: 'publicar', acta })}
            onEliminar={(acta) => setConfirmar({ tipo: 'eliminar', acta })}
          />
        )}
      </Box>

      {edicion && (
        <DialogoActa
          key={edicion.acta?.idActa ?? 'nueva'} acta={edicion.acta} totalUnidades={totalUnidades}
          onClose={() => setEdicion(null)} onGuardada={(acta) => { actas.recargar(); setIdSeleccionada(acta.idActa); }}
        />
      )}
      {confirmar && (
        <DialogoConfirmar
          confirmar={confirmar} onClose={() => setConfirmar(null)}
          onHecho={(c) => { actas.recargar(); if (c.tipo === 'eliminar') setIdSeleccionada(null); }}
        />
      )}
    </Box>
  );
}
