import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, Paper, TextField,
  ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { SearchOutlined as BuscarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as plataforma from '../../api/plataforma';
import { usePaginado } from '../../api/usePaginado';
import { fecha, telefono } from '../../utils/formato';
import { enmascararRut, formatearRut } from '../../utils/rut';
import Encabezado from '../../components/ui/Encabezado';
import EstadoCarga from '../../components/ui/EstadoCarga';

const MAX_MOTIVO = 255;
const idUsuario = (p) => p.idUsuario;

// Espera a que se deje de escribir antes de buscar
function useRetrasado(valor, ms) {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return retrasado;
}

// Bloquear una cuenta (POST plataforma/personas/:id/bloqueo): no puede entrar al panel ni a la app hasta que se desbloquee
function DialogoBloquear({ persona, onClose, onHecho }) {
  const { avisar } = useAviso();
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const bloquear = async () => {
    setEnviando(true);
    setError(null);
    try {
      onHecho(await plataforma.bloquearPersona(persona.idUsuario, motivo.trim()));
      avisar(`Cuenta de ${persona.nombre} bloqueada.`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Bloquear a {persona.nombre}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <Typography color="text.secondary">No podrá entrar al panel ni a la app, en ninguna comunidad, hasta que el equipo EntreCasas la desbloquee. Queda en la bitácora de Plataforma.</Typography>
        <TextField
          autoFocus required multiline minRows={2} label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}
          slotProps={{ htmlInput: { maxLength: MAX_MOTIVO } }} helperText={`${motivo.length}/${MAX_MOTIVO}`}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="error" disabled={!motivo.trim()} loading={enviando} onClick={bloquear}>Bloquear cuenta</Button>
      </DialogActions>
    </Dialog>
  );
}

function FilaPersona({ p, esYo, primera, onCambio, onBloquear }) {
  const { avisar, avisarError } = useAviso();
  const [enviando, setEnviando] = useState(null);
  const [verRut, setVerRut] = useState(false);
  const rut = p.pais === 'CL' ? formatearRut(p.identificador) : p.identificador;

  const reenviar = async () => {
    setEnviando('acceso');
    try {
      const r = await plataforma.reenviarAcceso(p.idUsuario);
      const que = r.tipo === 'Activacion' ? 'un enlace para activar su cuenta (vale 3 días)' : 'un enlace para crear una contraseña nueva (vale 1 hora)';
      avisar(r.correoEnviado ? `Le enviamos a ${p.correo} ${que}.` : `Se generó ${que}, pero el correo no se pudo enviar. Revisa la configuración de correo.`);
    } catch (err) {
      avisarError(err.message);
    } finally {
      setEnviando(null);
    }
  };
  const desbloquear = async () => {
    setEnviando('desbloqueo');
    try {
      onCambio(await plataforma.desbloquearPersona(p.idUsuario));
      avisar(`Cuenta de ${p.nombre} desbloqueada.`);
    } catch (err) {
      avisarError(err.message);
    } finally {
      setEnviando(null);
    }
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto' }, gap: 1.5, px: 2.5, py: 2, borderTop: primera ? 0 : 1, borderColor: 'divider', opacity: p.bloqueado ? 0.85 : 1 }}>
      <Box sx={{ minWidth: 0, display: 'grid', gap: 0.5 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 700 }}>{p.nombre}</Typography>
          {esYo && <Chip size="small" label="Tú" />}
          {p.esPlataforma && <Chip size="small" label="Equipo EntreCasas" sx={{ bgcolor: 'marca.signal', color: 'marca.signalInk' }} />}
          {p.bloqueado && <Chip size="small" color="error" variant="outlined" label="Bloqueada" />}
          {!p.accesoActivado && <Chip size="small" color="warning" variant="outlined" label="Invitación pendiente" />}
        </Box>
        <Typography variant="body2" color="text.secondary" component="div" sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{verRut ? rut : enmascararRut(p.identificador, p.pais)}</span>
          <Button size="small" onClick={() => setVerRut(!verRut)} sx={{ minWidth: 0, py: 0 }}>{verRut ? 'Ocultar' : 'Mostrar'}</Button>
          <span>· {p.correo}{p.telefono ? ` · ${telefono(p.telefono)}` : ''} · desde el {fecha(p.fechaCreacion)}</span>
        </Typography>
        <Typography variant="body2">
          {p.comunidades.length
            ? p.comunidades.map((c) => `${c.nombre}${c.estado !== 'Activa' ? ` (${c.estado.toLowerCase()})` : ''}: ${c.cargos.join(', ')}`).join(' · ')
            : 'Sin comunidades'}
        </Typography>
        {p.bloqueado && p.motivoBloqueo && <Typography variant="body2" color="error.main">Motivo del bloqueo: {p.motivoBloqueo}</Typography>}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: { md: 'flex-end' } }}>
        {!p.bloqueado && (
          <Button size="small" variant="outlined" loading={enviando === 'acceso'} disabled={!!enviando} onClick={reenviar}>
            {p.accesoActivado ? 'Enviar recuperación' : 'Reenviar invitación'}
          </Button>
        )}
        {p.bloqueado
          ? <Button size="small" variant="outlined" loading={enviando === 'desbloqueo'} disabled={!!enviando} onClick={desbloquear}>Desbloquear</Button>
          : !esYo && <Button size="small" color="error" disabled={!!enviando} onClick={() => onBloquear(p)}>Bloquear</Button>}
      </Box>
    </Box>
  );
}

// Personas de todas las comunidades (GET plataforma/personas, solo el equipo EntreCasas): buscar, ver dónde
// participa cada una, bloquear o desbloquear su cuenta y reenviarle el acceso. Todo queda en la bitácora de Plataforma.
export default function Personas() {
  const { usuario } = useSesion();
  const [texto, setTexto] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [bloqueando, setBloqueando] = useState(null);
  const escrito = useRetrasado(texto.trim(), 350);
  // La API pide de 2 a 100 caracteres: con menos, se lista sin buscar
  const buscar = escrito.length >= 2 ? escrito.slice(0, 100) : undefined;
  const personas = usePaginado((antesDe) => plataforma.listarPersonas({ buscar, filtro, antesDe }), [buscar, filtro], 'personas', idUsuario);
  const lista = personas.items ?? [];

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Encabezado
        contexto="Plataforma"
        titulo="Personas"
        descripcion="Todas las cuentas de EntreCasas. Busca por nombre, correo o RUT (con o sin puntos)."
      />
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField
          size="small" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar persona" sx={{ flex: '1 1 260px', maxWidth: 420 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><BuscarIcon /></InputAdornment> }, htmlInput: { maxLength: 100, 'aria-label': 'Buscar persona' } }}
        />
        <ToggleButtonGroup size="small" exclusive value={filtro} onChange={(_, v) => v && setFiltro(v)}>
          <ToggleButton value="todas">Todas</ToggleButton>
          <ToggleButton value="bloqueadas">Bloqueadas</ToggleButton>
          <ToggleButton value="plataforma">Equipo EntreCasas</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {!personas.items ? <EstadoCarga cargando={personas.cargando} error={personas.error} onReintentar={personas.recargar} /> : (
        <>
          {personas.error && <Alert severity="error" sx={{ mb: 2 }}>{personas.error.message}</Alert>}
          <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden', opacity: personas.cargando ? 0.6 : 1 }}>
            {lista.length === 0 && (
              <Typography color="text.secondary" sx={{ p: 2.5 }}>
                {buscar ? `Nadie coincide con «${buscar}».` : filtro === 'bloqueadas' ? 'No hay cuentas bloqueadas.' : 'No hay personas.'}
              </Typography>
            )}
            {lista.map((p, i) => (
              <FilaPersona key={p.idUsuario} p={p} esYo={p.idUsuario === usuario.idUsuario} primera={i === 0} onCambio={personas.reemplazar} onBloquear={setBloqueando} />
            ))}
          </Paper>
          {personas.siguiente && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button loading={personas.cargandoMas} onClick={personas.cargarMas}>Ver más</Button>
              {personas.errorMas && <Typography color="error">{personas.errorMas.message}</Typography>}
            </Box>
          )}
        </>
      )}

      {bloqueando && <DialogoBloquear persona={bloqueando} onClose={() => setBloqueando(null)} onHecho={personas.reemplazar} />}
    </Box>
  );
}
