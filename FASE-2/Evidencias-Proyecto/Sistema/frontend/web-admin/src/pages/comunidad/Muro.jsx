import { useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Tab, Tabs, TextField,
  ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { DeleteOutlined as EliminarIcon, EditNoteOutlined as RedactarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as muroApi from '../../api/muro';
import { useConsulta } from '../../api/useConsulta';
import { usePaginado } from '../../api/usePaginado';
import { RolUsuario, rolesEfectivos } from '../../config/roles';
import { fecha } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import EstadoCarga from '../../components/ui/EstadoCarga';
import PublicacionModerada from '../../components/comunidad/PublicacionModerada';

const MAX_TITULO = 150;
const MIN_TEXTO = 20;
const MAX_TEXTO = 5000;
const idPublicacion = (p) => p.idPublicacion;
const ESTADO_OFICIAL = { Pendiente: { texto: 'Esperando aprobación', color: 'warning' }, Rechazada: { texto: 'Devuelto', color: 'error' } };
const autorConCargo = (a) => (a ? [a.nombre ?? 'Sin nombre', a.cargo].filter(Boolean).join(' · ') : 'Sin autor');

// Redactar un comunicado o una norma (POST muro/oficiales). Desde la Presidencia se publica al tiro y se avisa
// por correo; desde otro cargo queda esperando la aprobación de la Presidencia.
function DialogoRedactar({ directo, onClose, onPublicada }) {
  const { avisar } = useAviso();
  const [form, setForm] = useState({ tipo: 'Comunicado', titulo: '', contenido: '' });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const largo = form.contenido.trim().length;
  const valido = form.titulo.trim() && largo >= MIN_TEXTO;
  const enviar = async (e) => {
    e.preventDefault();
    if (!valido) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await muroApi.publicarOficial({ tipo: form.tipo, titulo: form.titulo.trim(), contenido: form.contenido.trim() });
      avisar(r.estadoAprobacion === 'Aprobada'
        ? `Publicado. Se enviará un correo a ${r.correos} ${r.correos === 1 ? 'persona' : 'personas'}.`
        : 'Enviado a la Presidencia. Se publica cuando lo apruebe.');
      onPublicada();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={enviar}>
      <DialogTitle>Redactar publicación oficial</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <ToggleButtonGroup exclusive fullWidth value={form.tipo} onChange={(_, v) => v && setForm({ ...form, tipo: v })}>
          <ToggleButton value="Comunicado">Comunicado</ToggleButton>
          <ToggleButton value="Norma">Norma</ToggleButton>
        </ToggleButtonGroup>
        <TextField required label="Título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} slotProps={{ htmlInput: { maxLength: MAX_TITULO } }} />
        <TextField
          required label="Texto" value={form.contenido} onChange={(e) => setForm({ ...form, contenido: e.target.value })} multiline minRows={5}
          slotProps={{ htmlInput: { maxLength: MAX_TEXTO } }}
          helperText={largo < MIN_TEXTO ? `Escribe al menos ${MIN_TEXTO} caracteres.` : `${largo}/${MAX_TEXTO} caracteres`}
        />
        <Alert severity="info" variant="outlined">
          {directo
            ? 'Desde la Presidencia se publica de inmediato y se avisa por correo a los residentes.'
            : 'Se envía a la Presidencia. Cuando lo apruebe, se publica y se avisa por correo a los residentes.'}
        </Alert>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido} loading={enviando}>{directo ? 'Publicar' : 'Enviar a aprobación'}</Button>
      </DialogActions>
    </Dialog>
  );
}

// Confirmación antes de borrar un comunicado o norma (DELETE muro/oficiales/:id): desaparece del muro y de la app
function DialogoEliminarOficial({ publicacion, onClose, onEliminada }) {
  const { avisar } = useAviso();
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const eliminar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await muroApi.eliminarOficial(publicacion.idPublicacion);
      avisar(`«${publicacion.titulo}» eliminado.`);
      onEliminada();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>¿Eliminar {publicacion.tipo === 'Norma' ? 'esta norma' : 'este comunicado'}?</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <Typography>«{publicacion.titulo}» dejará de verse en el muro y en la app de los residentes. Queda registrado en la bitácora y no se puede deshacer.</Typography>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} autoFocus>Cancelar</Button>
        <Button variant="contained" color="error" loading={enviando} onClick={eliminar}>Eliminar {publicacion.tipo.toLowerCase()}</Button>
      </DialogActions>
    </Dialog>
  );
}

function Oficiales({ oficiales, puedeEliminar, onEliminar }) {
  if (oficiales.length === 0) return <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}><Typography color="text.secondary">Todavía no hay publicaciones oficiales.</Typography></Paper>;
  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      {oficiales.map((x) => {
        const publicada = x.estadoAprobacion === 'Aprobada';
        const estado = ESTADO_OFICIAL[x.estadoAprobacion];
        return (
          <Paper key={x.idPublicacion} variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, display: 'grid', gap: 1, borderWidth: publicada ? 1.5 : 1, borderColor: publicada ? 'info.main' : 'divider' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip size="small" label={x.tipo} sx={{ bgcolor: 'info.light', color: 'info.main' }} />
              <Typography variant="body2" color="text.secondary">{autorConCargo(x.autor)} · {fecha(x.fecha)}</Typography>
              {estado && <Chip size="small" variant="outlined" color={estado.color} label={estado.texto} />}
            </Box>
            <Typography variant="h6" component="h2">{x.titulo}</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: '68ch', whiteSpace: 'pre-line' }}>{x.contenido}</Typography>
            {x.aprobadoPor && x.aprobadoPor.idUsuario !== x.autor?.idUsuario && (
              <Typography variant="body2" color="text.secondary">{publicada ? 'Aprobado' : 'Devuelto'} por {autorConCargo(x.aprobadoPor)} · {fecha(x.aprobadoEn)}</Typography>
            )}
            {puedeEliminar(x) && (
              <Box>
                <Button size="small" color="error" startIcon={<EliminarIcon />} onClick={() => onEliminar(x)} aria-label={`Eliminar ${x.tipo.toLowerCase()} ${x.titulo}`}>Eliminar</Button>
              </Box>
            )}
          </Paper>
        );
      })}
    </Box>
  );
}

// Muro de la comunidad. La administración modera lo que publican los vecinos (GET muro/moderacion);
// la directiva redacta comunicados y normas (GET/POST muro/oficiales). Las demás ven el muro como en la app.
export default function Muro() {
  const { usuario, comunidad, cargo } = useSesion();
  const modera = rolesEfectivos(cargo, comunidad).includes(RolUsuario.ADMINISTRADOR);
  const presidente = cargo === RolUsuario.PRESIDENTE;
  const oficiales = useConsulta(muroApi.listarOficiales, [comunidad.idRed]);
  const vecinos = usePaginado(modera ? muroApi.moderacionMuro : muroApi.listarMuro, [comunidad.idRed, modera], 'publicaciones', idPublicacion);
  const [pestana, setPestana] = useState(modera ? 'reportadas' : 'oficiales');
  const [redactar, setRedactar] = useState(false);
  const [eliminando, setEliminando] = useState(null);

  const deVecinos = (vecinos.items ?? []).filter((p) => p.tipo === 'Vecino');
  const reportadas = deVecinos.filter((p) => p.estadoModeracion === 'Publicada' && p.reportes?.length);
  const lista = pestana === 'reportadas' ? reportadas : deVecinos;
  const puedeEliminar = (x) => presidente || x.autor?.idUsuario === usuario.idUsuario;

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Muro y comunicados"
        descripcion={modera ? 'Revisa lo que reportan los vecinos y publica comunicados oficiales.' : 'Los comunicados y normas oficiales que se publican en la app.'}
        acciones={<Button variant="contained" startIcon={<RedactarIcon />} onClick={() => setRedactar(true)}>Redactar comunicado</Button>}
      />

      <Tabs value={pestana} onChange={(_, v) => setPestana(v)} sx={{ mb: 2 }} variant="scrollable" allowScrollButtonsMobile>
        {modera && <Tab value="reportadas" label={`Reportadas${vecinos.items ? ` (${reportadas.length})` : ''}`} />}
        <Tab value="oficiales" label="Oficiales" />
        <Tab value="vecinos" label="De vecinos" />
      </Tabs>

      {pestana === 'oficiales' ? (
        !oficiales.datos ? <EstadoCarga cargando={oficiales.cargando} error={oficiales.error} onReintentar={oficiales.recargar} />
          : <Oficiales oficiales={oficiales.datos} puedeEliminar={puedeEliminar} onEliminar={setEliminando} />
      ) : !vecinos.items ? <EstadoCarga cargando={vecinos.cargando} error={vecinos.error} onReintentar={vecinos.recargar} /> : (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {lista.length === 0 && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
              <Typography color="text.secondary">{pestana === 'reportadas' ? 'No hay publicaciones reportadas. Todo en orden.' : 'Todavía no hay publicaciones de vecinos.'}</Typography>
            </Paper>
          )}
          {lista.map((p) => <PublicacionModerada key={p.idPublicacion} item={p} lugar="muro" moderar={modera} onCambio={vecinos.reemplazar} />)}
          {vecinos.siguiente && (
            <Button sx={{ justifySelf: 'center' }} loading={vecinos.cargandoMas} onClick={vecinos.cargarMas}>
              {pestana === 'reportadas' ? 'Revisar publicaciones más antiguas' : 'Ver más'}
            </Button>
          )}
          {vecinos.errorMas && <Typography color="error" sx={{ textAlign: 'center' }}>{vecinos.errorMas.message}</Typography>}
        </Box>
      )}

      {redactar && <DialogoRedactar directo={presidente} onClose={() => setRedactar(false)} onPublicada={oficiales.recargar} />}
      {eliminando && <DialogoEliminarOficial publicacion={eliminando} onClose={() => setEliminando(null)} onEliminada={oficiales.recargar} />}
    </Box>
  );
}
