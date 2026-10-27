import { useState } from 'react';
import {
  Box, Button, ButtonBase, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, TextField, Typography,
} from '@mui/material';
import { Add as AddIcon, FileDownloadOutlined as DescargarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useDirectiva } from '../../context/DirectivaContext';
import { fecha, fechaCompleta } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import DialogoActa from '../../components/directiva/DialogoActa';

const ESTADO = {
  borrador: { texto: 'Borrador', color: 'warning' },
  publicada: { texto: 'Publicada', color: 'success' },
};

// Texto plano del acta para descargar o imprimir.
function actaComoTexto(acta, comunidad) {
  const l = [
    `${comunidad.nombre.toUpperCase()}`,
    `ACTA N° ${acta.numero} · ${acta.tipo.toUpperCase()}`,
    '',
    `Fecha: ${fechaCompleta(acta.fecha)}`,
    `Lugar: ${acta.lugar}`,
  ];
  if (acta.unidadesPresentes != null) l.push(`Unidades presentes: ${acta.unidadesPresentes} de ${comunidad.unidades.length}`);
  l.push('', 'ASISTENTES', ...acta.asistentes.map((a) => `- ${a}`));
  l.push('', 'TEMAS TRATADOS', ...acta.temas.map((t, i) => `${i + 1}. ${t}`));
  l.push('', 'ACUERDOS', ...acta.acuerdos.map((a, i) => `${i + 1}. ${a.texto}${a.responsable ? ` Responsable: ${a.responsable}.` : ''}${a.plazo ? ` Plazo: ${fechaCompleta(a.plazo)}.` : ''}`));
  l.push('', `Redactada por ${acta.redactadaPor}${acta.publicadaEn ? ` · publicada el ${fechaCompleta(acta.publicadaEn)}` : ''}`);
  return l.join('\n');
}

function descargar(acta, comunidad) {
  const url = URL.createObjectURL(new Blob([actaComoTexto(acta, comunidad)], { type: 'text/plain;charset=utf-8' }));
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

function DetalleActa({ acta, onEditar, onPublicar, onEliminar }) {
  const { comunidad } = useSesion();
  const borrador = acta.estado === 'borrador';
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
          {acta.unidadesPresentes != null && ` · ${acta.unidadesPresentes} de ${comunidad.unidades.length} unidades presentes`}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Seccion titulo="Asistentes">
          {acta.asistentes.length ? acta.asistentes.map((a) => <Typography key={a}>{a}</Typography>) : <Typography color="text.secondary">Sin registrar</Typography>}
        </Seccion>
        <Seccion titulo="Temas tratados">
          <Box component="ol" sx={{ m: 0, pl: 0, listStylePosition: 'inside', display: 'grid', gap: 0.75, '& li::marker': { color: 'text.secondary' } }}>
            {acta.temas.map((t) => <Typography component="li" key={t}>{t}</Typography>)}
          </Box>
        </Seccion>
      </Box>

      <Seccion titulo="Acuerdos">
        {acta.acuerdos.length === 0 && <Typography color="text.secondary">Sin acuerdos.</Typography>}
        {acta.acuerdos.map((a, i) => (
          <Box key={i} sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1.5, py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
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
          </>
        ) : (
          <>
            <Button variant="outlined" startIcon={<DescargarIcon />} onClick={() => descargar(acta, comunidad)}>Descargar</Button>
            <Typography variant="body2" color="text.secondary" sx={{ flex: '1 1 260px' }}>
              Publicada el {fecha(acta.publicadaEn)}. Ya no se puede editar: para corregirla, redacta un acta rectificatoria.
            </Typography>
          </>
        )}
      </Box>
    </Paper>
  );
}

export default function Actas() {
  const { comunidad } = useSesion();
  const { actas, acciones } = useDirectiva();
  const [idSeleccionada, setIdSeleccionada] = useState(null);
  const [edicion, setEdicion] = useState(null); // { acta } o { acta: null } para una nueva
  const [confirmar, setConfirmar] = useState(null); // { tipo: 'publicar' | 'eliminar', acta }
  const [busqueda, setBusqueda] = useState('');

  const texto = busqueda.trim().toLowerCase();
  const lista = actas.filter((a) => !texto || [a.tipo, ...a.temas, ...a.acuerdos.map((x) => x.texto)].join(' ').toLowerCase().includes(texto));
  const seleccionada = actas.find((a) => a.id === idSeleccionada) ?? lista[0];

  const ejecutar = () => {
    if (confirmar.tipo === 'publicar') acciones.publicarActa(confirmar.acta);
    else { acciones.eliminarActa(confirmar.acta); setIdSeleccionada(null); }
    setConfirmar(null);
  };

  return (
    <Box sx={{ maxWidth: 1300 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Libro de actas"
        descripcion="Las actas publicadas las ven todos los residentes en la app y no se pueden modificar."
        acciones={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEdicion({ acta: null })}>Nueva acta</Button>}
      />

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <TextField size="small" label="Buscar en temas y acuerdos" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
            {lista.length === 0 && <Typography color="text.secondary" sx={{ p: 2 }}>{actas.length ? 'Ninguna acta coincide.' : 'Todavía no hay actas.'}</Typography>}
            {lista.map((a, i) => {
              const activa = seleccionada?.id === a.id;
              return (
                <ButtonBase
                  key={a.id} onClick={() => setIdSeleccionada(a.id)} aria-current={activa || undefined}
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
                  {a.estado === 'borrador' && <Chip size="small" variant="outlined" color="warning" label="Borrador" />}
                </ButtonBase>
              );
            })}
          </Paper>
        </Box>

        {seleccionada && (
          <DetalleActa
            acta={seleccionada}
            onEditar={(acta) => setEdicion({ acta })}
            onPublicar={(acta) => setConfirmar({ tipo: 'publicar', acta })}
            onEliminar={(acta) => setConfirmar({ tipo: 'eliminar', acta })}
          />
        )}
      </Box>

      {edicion && <DialogoActa key={edicion.acta?.id ?? 'nueva'} open acta={edicion.acta} onClose={() => setEdicion(null)} />}

      <Dialog open={Boolean(confirmar)} onClose={() => setConfirmar(null)}>
        <DialogTitle>{confirmar?.tipo === 'publicar' ? `¿Publicar el acta N° ${confirmar?.acta.numero}?` : '¿Eliminar este borrador?'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmar?.tipo === 'publicar'
              ? 'Todos los residentes podrán leerla en la app. Después de publicarla no se puede editar.'
              : 'El borrador se borra por completo. Esta acción no se puede deshacer.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmar(null)}>Cancelar</Button>
          <Button variant="contained" color={confirmar?.tipo === 'eliminar' ? 'error' : 'primary'} onClick={ejecutar}>
            {confirmar?.tipo === 'publicar' ? 'Publicar' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
