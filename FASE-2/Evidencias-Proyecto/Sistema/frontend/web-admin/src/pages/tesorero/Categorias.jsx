import { useState } from 'react';
import { Box, Button, IconButton, Paper, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { Add as AddIcon, Check as CheckIcon, Close as CloseIcon, EditOutlined as EditIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import Encabezado from '../../components/ui/Encabezado';

export default function Categorias() {
  const { comunidad } = useSesion();
  const { datos, acciones } = useFinanzas();
  const [nueva, setNueva] = useState('');
  const [editando, setEditando] = useState(null);
  const usos = (id) => datos.cobros.filter((c) => c.idCategoria === id).length;
  const repetida = (nombre, id) => datos.categorias.some((c) => c.id !== id && c.nombre.toLowerCase() === nombre.trim().toLowerCase());

  const agregar = (e) => {
    e.preventDefault();
    if (!nueva.trim() || repetida(nueva)) return;
    acciones.guardarCategoria({ nombre: nueva.trim() });
    setNueva('');
  };
  const guardarEdicion = () => {
    if (editando.nombre.trim() && !repetida(editando.nombre, editando.id)) {
      acciones.guardarCategoria({ id: editando.id, nombre: editando.nombre.trim() });
    }
    setEditando(null);
  };

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Categorías de gasto"
        descripcion="Cada cobro pertenece a una categoría. Una categoría inactiva no aparece al crear cobros, pero sus cobros anteriores se mantienen."
      />

      <Paper variant="outlined" component="form" onSubmit={agregar} sx={{ p: 2, borderRadius: 3, display: 'flex', gap: 1.5, mb: 2, alignItems: 'flex-start' }}>
        <TextField
          size="small" fullWidth label="Nueva categoría" value={nueva} onChange={(e) => setNueva(e.target.value)}
          error={Boolean(nueva) && repetida(nueva)} helperText={nueva && repetida(nueva) ? 'Ya existe una categoría con ese nombre.' : ' '}
        />
        <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={!nueva.trim() || repetida(nueva)} sx={{ flexShrink: 0, mt: 0.25 }}>
          Agregar
        </Button>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3 }}>
        {datos.categorias.map((c, i) => (
          <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
            {editando?.id === c.id ? (
              <>
                <TextField
                  size="small" autoFocus fullWidth value={editando.nombre}
                  onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') guardarEdicion(); if (e.key === 'Escape') setEditando(null); }}
                />
                <IconButton aria-label="Guardar nombre" onClick={guardarEdicion}><CheckIcon /></IconButton>
                <IconButton aria-label="Cancelar" onClick={() => setEditando(null)}><CloseIcon /></IconButton>
              </>
            ) : (
              <>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, color: c.activa ? 'text.primary' : 'text.secondary' }}>{c.nombre}</Typography>
                  <Typography variant="body2" color="text.secondary">{usos(c.id) === 1 ? '1 cobro' : `${usos(c.id)} cobros`}</Typography>
                </Box>
                <Tooltip title="Cambiar nombre">
                  <IconButton aria-label={`Cambiar nombre de ${c.nombre}`} onClick={() => setEditando({ id: c.id, nombre: c.nombre })}><EditIcon /></IconButton>
                </Tooltip>
                <Switch
                  checked={c.activa} inputProps={{ 'aria-label': `${c.nombre} activa` }}
                  onChange={(e) => acciones.guardarCategoria({ id: c.id, nombre: c.nombre, activa: e.target.checked })}
                />
              </>
            )}
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
