import { useState } from 'react';
import { Box, Button, IconButton, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import { Add as AddIcon, DeleteOutlined as QuitarIcon, Close as CerrarIcon } from '@mui/icons-material';
import { erroresBloques, hora } from '../../utils/espacios';

// Filas de `espacios_comunes` con sus `espacios_bloques` mientras se editan. Las horas se editan
// como 13:00 y se guardan como TIME (13:00:00). Un espacio sin bloques no se puede reservar.
const aTime = (v) => (v ? `${v}:00` : '');

function Espacio({ e, onCambio, onQuitar }) {
  const errores = erroresBloques(e.espacios_bloques);
  const cambiarBloque = (i, campo, valor) => onCambio({
    ...e, espacios_bloques: e.espacios_bloques.map((b, j) => (j === i ? { ...b, [campo]: aTime(valor) } : b)),
  });
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'grid', gap: 2 }}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 140px auto' }, alignItems: 'start' }}>
        <TextField required size="small" label="Nombre" value={e.nombre} onChange={(ev) => onCambio({ ...e, nombre: ev.target.value })} error={!e.nombre.trim()} />
        <TextField
          size="small" label="Capacidad" type="number" value={e.capacidad ?? ''} helperText="Personas, opcional"
          onChange={(ev) => onCambio({ ...e, capacidad: ev.target.value === '' ? null : Math.max(1, Math.floor(Number(ev.target.value))) })}
          slotProps={{ htmlInput: { min: 1, step: 1 } }}
        />
        <Button color="error" startIcon={<QuitarIcon />} onClick={onQuitar} aria-label={`Quitar ${e.nombre || 'espacio'}`}>Quitar</Button>
      </Box>
      <TextField size="small" label="Descripción (opcional)" value={e.descripcion ?? ''} onChange={(ev) => onCambio({ ...e, descripcion: ev.target.value || null })} multiline maxRows={3} />
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>Horarios que se pueden reservar</Typography>
        {e.espacios_bloques.length === 0 && (
          <Typography variant="body2" color="warning.main">Sin horarios: los residentes no podrán reservarlo hasta que agregues uno.</Typography>
        )}
        {e.espacios_bloques.map((b, i) => (
          <Box key={b.id_bloque ?? `n${i}`} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField size="small" type="time" label="Desde" value={hora(b.hora_inicio)} onChange={(ev) => cambiarBloque(i, 'hora_inicio', ev.target.value)}
              error={!!errores[i]} slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 1800 } }} sx={{ width: 140 }} />
            <TextField size="small" type="time" label="Hasta" value={hora(b.hora_fin)} onChange={(ev) => cambiarBloque(i, 'hora_fin', ev.target.value)}
              error={!!errores[i]} helperText={errores[i] ?? ' '} slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 1800 } }} sx={{ width: 220 }} />
            <IconButton aria-label={`Quitar horario ${i + 1} de ${e.nombre}`} onClick={() => onCambio({ ...e, espacios_bloques: e.espacios_bloques.filter((_, j) => j !== i) })}>
              <CerrarIcon />
            </IconButton>
          </Box>
        ))}
        <Box>
          <Button size="small" startIcon={<AddIcon />} onClick={() => {
            // Propone el siguiente bloque a continuación del último
            const ultimo = [...e.espacios_bloques].sort((a, b) => a.hora_fin.localeCompare(b.hora_fin)).at(-1);
            const inicio = ultimo?.hora_fin && ultimo.hora_fin < '21:00:00' ? ultimo.hora_fin : '10:00:00';
            const fin = `${String(Math.min(Number(inicio.slice(0, 2)) + 2, 23)).padStart(2, '0')}${inicio.slice(2)}`;
            onCambio({ ...e, espacios_bloques: [...e.espacios_bloques, { id_bloque: null, id_espacio: e.id_espacio, hora_inicio: inicio, hora_fin: fin }] });
          }}>Agregar horario</Button>
        </Box>
      </Box>
    </Paper>
  );
}

// Espacios comunes de la comunidad con su capacidad y sus horarios reservables
export default function EditorEspacios({ espacios, onCambio }) {
  const [nuevo, setNuevo] = useState('');
  const agregar = () => {
    const nombre = nuevo.trim();
    if (nombre && !espacios.some((x) => x.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
      onCambio([...espacios, { id_espacio: null, nombre, descripcion: null, capacidad: null, espacios_bloques: [] }]);
    }
    setNuevo('');
  };
  return (
    <>
      {espacios.length === 0 && <Typography color="text.secondary">Sin espacios comunes.</Typography>}
      {espacios.map((e, i) => (
        <Espacio
          key={e.id_espacio ?? `nuevo-${e.nombre}`} e={e}
          onCambio={(x) => onCambio(espacios.map((y, j) => (j === i ? x : y)))}
          onQuitar={() => onCambio(espacios.filter((_, j) => j !== i))}
        />
      ))}
      <TextField
        size="small" label="Agregar espacio" value={nuevo} onChange={(ev) => setNuevo(ev.target.value)} placeholder="Ej: Sala de eventos"
        onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); agregar(); } }} sx={{ maxWidth: 360 }}
        slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton aria-label="Agregar espacio" edge="end" onClick={agregar} disabled={!nuevo.trim()}><AddIcon /></IconButton></InputAdornment> } }}
      />
    </>
  );
}

