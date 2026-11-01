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
  const usos = (id) => datos.cobros.filter((c) => c.id_categoria === id).length;
  const repetida = (nombre, id) => datos.categorias_cobro.some((c) => c.id_categoria !== id && c.nombre.toLowerCase() === nombre.trim().toLowerCase());

  const agregar = (e) => {
    e.preventDefault();
    if (!nueva.trim() || repetida(nueva)) return;
    acciones.guardarCategoria({ nombre: nueva.trim() });
    setNueva('');
  };
  const guardarEdicion = () => {
    if (editando.nombre.trim() && !repetida(editando.nombre, editando.id_categoria)) {
      acciones.guardarCategoria({ id_categoria: editando.id_categoria, nombre: editando.nombre.trim() });
    }
    setEditando(null);
  };

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Categorías de cobro"
        descripcion="Cada cobro pertenece a una categoría. Una categoría inactiva no aparece al crear cobros, pero sus cobros anteriores se mantienen."
      />

      <Paper variant="outlined" component="form" onSubmit={agregar} sx={{ p: 2, borderRadius: 1.5, display: 'flex', gap: 1.5, mb: 2, alignItems: 'flex-start' }}>
        <TextField
          size="small" fullWidth label="Nueva categoría" value={nueva} onChange={(e) => setNueva(e.target.value)}
          error={Boolean(nueva) && repetida(nueva)} helperText={nueva && repetida(nueva) ? 'Ya existe una categoría con ese nombre.' : undefined}
        />
        <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={!nueva.trim() || repetida(nueva)} sx={{ flexShrink: 0, height: 40 }}>
          Agregar
        </Button>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 1.5 }}>
        {datos.categorias_cobro.map((c, i) => (
          <Box key={c.id_categoria} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
            {editando?.id_categoria === c.id_categoria ? (
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
                  <Typography variant="body2" color="text.secondary">{usos(c.id_categoria) === 1 ? '1 cobro' : `${usos(c.id_categoria)} cobros`}{!c.activa && ' · inactiva, no aparece al crear cobros'}</Typography>
                </Box>
                <Tooltip title="Cambiar nombre">
                  <IconButton aria-label={`Cambiar nombre de ${c.nombre}`} onClick={() => setEditando({ id_categoria: c.id_categoria, nombre: c.nombre })}><EditIcon /></IconButton>
                </Tooltip>
                <Switch
                  checked={Boolean(c.activa)} slotProps={{ input: { 'aria-label': `${c.nombre} activa` } }}
                  onChange={(e) => acciones.guardarCategoria({ id_categoria: c.id_categoria, nombre: c.nombre, activa: e.target.checked ? 1 : 0 })}
                />
              </>
            )}
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
