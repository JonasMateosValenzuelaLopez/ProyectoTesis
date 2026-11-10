import { useState } from 'react';
import { Alert, Box, Button, IconButton, Paper, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { Add as AddIcon, Check as CheckIcon, Close as CloseIcon, EditOutlined as EditIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as finanzas from '../../api/finanzas';
import { useConsulta } from '../../api/useConsulta';
import { MAX_CATEGORIA } from '../../utils/finanzas';
import Encabezado from '../../components/ui/Encabezado';
import EstadoCarga from '../../components/ui/EstadoCarga';

// Categorías de cobro y de egreso (solo Tesorería las crea y edita). El nombre no se repite en la comunidad
// (el backend responde «Ya existe la categoría…»). Una inactiva no aparece al crear cobros ni egresos.
export default function Categorias() {
  const { comunidad } = useSesion();
  const { avisar, avisarError } = useAviso();
  const categorias = useConsulta(finanzas.listarCategorias, [comunidad.idRed]);
  const cobros = useConsulta(finanzas.listarCobros, [comunidad.idRed]);
  const [nueva, setNueva] = useState('');
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(null);

  const encabezado = (
    <Encabezado
      contexto={comunidad.nombre}
      titulo="Categorías de cobro"
      descripcion="Cada cobro y cada egreso pertenece a una categoría. Una categoría inactiva no aparece al crear cobros, pero sus cobros anteriores se mantienen."
    />
  );
  if (!categorias.datos) {
    return <Box sx={{ maxWidth: 760 }}>{encabezado}<EstadoCarga cargando={categorias.cargando} error={categorias.error} onReintentar={categorias.recargar} /></Box>;
  }

  const lista = categorias.datos;
  const usos = (id) => (cobros.datos ?? []).filter((c) => c.categoria?.idCategoria === id).length;
  const repetida = (nombre, id) => lista.some((c) => c.idCategoria !== id && c.nombre.toLowerCase() === nombre.trim().toLowerCase());
  // Reemplaza en la lista la categoría que devolvió el backend, y la mantiene ordenada por nombre como GET
  const poner = (cat) => categorias.setDatos((l) => [...l.filter((c) => c.idCategoria !== cat.idCategoria), cat].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));

  const agregar = async (e) => {
    e.preventDefault();
    if (!nueva.trim() || repetida(nueva)) return;
    setEnviando('nueva');
    setError(null);
    try {
      const cat = await finanzas.crearCategoria(nueva.trim());
      poner(cat);
      avisar(`Categoría «${cat.nombre}» creada.`);
      setNueva('');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(null);
    }
  };
  const editar = async (id, cambios, mensaje) => {
    setEnviando(id);
    try {
      poner(await finanzas.editarCategoria(id, cambios));
      avisar(mensaje);
      return true;
    } catch (err) {
      avisarError(err.message);
      return false;
    } finally {
      setEnviando(null);
    }
  };
  const guardarNombre = async () => {
    const nombre = editando.nombre.trim();
    const actual = lista.find((c) => c.idCategoria === editando.idCategoria);
    if (!nombre || nombre === actual.nombre) { setEditando(null); return; }
    if (repetida(nombre, editando.idCategoria)) return;
    if (await editar(editando.idCategoria, { nombre }, 'Nombre actualizado.')) setEditando(null);
  };

  return (
    <Box sx={{ maxWidth: 760 }}>
      {encabezado}

      <Paper variant="outlined" component="form" onSubmit={agregar} sx={{ p: 2, borderRadius: 1.5, display: 'flex', gap: 1.5, mb: 2, alignItems: 'flex-start' }}>
        <TextField
          size="small" fullWidth label="Nueva categoría" value={nueva} onChange={(e) => { setNueva(e.target.value); setError(null); }}
          error={(!!nueva && repetida(nueva)) || !!error} helperText={nueva && repetida(nueva) ? 'Ya existe una categoría con ese nombre.' : error ?? undefined}
          slotProps={{ htmlInput: { maxLength: MAX_CATEGORIA } }}
        />
        <Button type="submit" variant="contained" startIcon={<AddIcon />} loading={enviando === 'nueva'} disabled={!nueva.trim() || repetida(nueva)} sx={{ flexShrink: 0, height: 40 }}>
          Agregar
        </Button>
      </Paper>

      {lista.length === 0 && <Alert severity="info">Todavía no hay categorías. Crea la primera (por ejemplo, «Gasto común» o «Fondo de reserva») para poder emitir cobros.</Alert>}
      {lista.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 1.5 }}>
          {lista.map((c, i) => (
            <Box key={c.idCategoria} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
              {editando?.idCategoria === c.idCategoria ? (
                <>
                  <TextField
                    size="small" autoFocus fullWidth value={editando.nombre}
                    onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); guardarNombre(); } if (e.key === 'Escape') setEditando(null); }}
                    error={repetida(editando.nombre, c.idCategoria)} helperText={repetida(editando.nombre, c.idCategoria) ? 'Ya existe una categoría con ese nombre.' : undefined}
                    slotProps={{ htmlInput: { maxLength: MAX_CATEGORIA } }}
                  />
                  <IconButton aria-label="Guardar nombre" onClick={guardarNombre} disabled={enviando === c.idCategoria}><CheckIcon /></IconButton>
                  <IconButton aria-label="Cancelar" onClick={() => setEditando(null)}><CloseIcon /></IconButton>
                </>
              ) : (
                <>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, color: c.activa ? 'text.primary' : 'text.secondary' }}>{c.nombre}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {cobros.datos ? (usos(c.idCategoria) === 1 ? '1 cobro' : `${usos(c.idCategoria)} cobros`) : ' '}
                      {!c.activa && ' · inactiva, no aparece al crear cobros'}
                    </Typography>
                  </Box>
                  <Tooltip title="Cambiar nombre">
                    <IconButton aria-label={`Cambiar nombre de ${c.nombre}`} onClick={() => setEditando({ idCategoria: c.idCategoria, nombre: c.nombre })}><EditIcon /></IconButton>
                  </Tooltip>
                  <Switch
                    checked={c.activa} disabled={enviando === c.idCategoria} slotProps={{ input: { 'aria-label': `${c.nombre} activa` } }}
                    onChange={(e) => editar(c.idCategoria, { activa: e.target.checked }, e.target.checked ? `«${c.nombre}» activada.` : `«${c.nombre}» desactivada.`)}
                  />
                </>
              )}
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}
