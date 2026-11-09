import { useState } from 'react';
import { Box, Button, IconButton, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import { Add as AddIcon, DeleteOutlined as QuitarIcon, Close as CerrarIcon } from '@mui/icons-material';
import {
  MAX_BLOQUES, MAX_CAPACIDAD, MAX_DESCRIPCION, MAX_ESPACIOS, MAX_NOMBRE, erroresBloques, hora,
} from '../../utils/espacios';

// Espacios comunes con sus horarios (`bloques`) mientras se editan, con los nombres de la API.
// Las horas se editan y se envían como 13:00. Un espacio sin horarios no se puede reservar.

function Espacio({ e, onCambio, onQuitar }) {
  const errores = erroresBloques(e.bloques);
  const cambiarBloque = (i, campo, valor) => onCambio({
    ...e, bloques: e.bloques.map((b, j) => (j === i ? { ...b, [campo]: valor } : b)),
  });
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'grid', gap: 2 }}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 140px auto' }, alignItems: 'start' }}>
        <TextField
          required size="small" label="Nombre" value={e.nombre} onChange={(ev) => onCambio({ ...e, nombre: ev.target.value.slice(0, MAX_NOMBRE) })}
          error={!e.nombre.trim()} helperText={e.nombre.trim() ? ' ' : 'El nombre es obligatorio'} slotProps={{ htmlInput: { maxLength: MAX_NOMBRE } }}
        />
        <TextField
          size="small" label="Capacidad" type="number" value={e.capacidad ?? ''} helperText={`Personas, opcional (hasta ${MAX_CAPACIDAD})`}
          onChange={(ev) => onCambio({ ...e, capacidad: ev.target.value === '' ? null : Math.min(MAX_CAPACIDAD, Math.max(1, Math.floor(Number(ev.target.value)))) })}
          slotProps={{ htmlInput: { min: 1, max: MAX_CAPACIDAD, step: 1 } }}
        />
        <Button color="error" startIcon={<QuitarIcon />} onClick={onQuitar} aria-label={`Quitar ${e.nombre || 'espacio'}`}>Quitar</Button>
      </Box>
      <TextField
        size="small" label="Descripción (opcional)" value={e.descripcion ?? ''} onChange={(ev) => onCambio({ ...e, descripcion: ev.target.value.slice(0, MAX_DESCRIPCION) || null })}
        multiline maxRows={3} slotProps={{ htmlInput: { maxLength: MAX_DESCRIPCION } }}
        helperText={(e.descripcion ?? '').length > MAX_DESCRIPCION - 100 ? `${(e.descripcion ?? '').length}/${MAX_DESCRIPCION}` : ' '}
      />
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>Horarios que se pueden reservar</Typography>
        {e.bloques.length === 0 && (
          <Typography variant="body2" color="warning.main">Sin horarios: los residentes no podrán reservarlo hasta que agregues uno.</Typography>
        )}
        {e.bloques.map((b, i) => (
          <Box key={b.idBloque ?? `n${i}`} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField size="small" type="time" label="Desde" value={hora(b.horaInicio)} onChange={(ev) => cambiarBloque(i, 'horaInicio', ev.target.value)}
              error={!!errores[i]} slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 1800 } }} sx={{ width: 140 }} />
            <TextField size="small" type="time" label="Hasta" value={hora(b.horaFin)} onChange={(ev) => cambiarBloque(i, 'horaFin', ev.target.value)}
              error={!!errores[i]} helperText={errores[i] ?? ' '} slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 1800 } }} sx={{ width: 220 }} />
            <IconButton aria-label={`Quitar horario ${i + 1} de ${e.nombre}`} onClick={() => onCambio({ ...e, bloques: e.bloques.filter((_, j) => j !== i) })}>
              <CerrarIcon />
            </IconButton>
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button size="small" startIcon={<AddIcon />} disabled={e.bloques.length >= MAX_BLOQUES} onClick={() => {
            // Propone el siguiente bloque a continuación del último
            const ultimo = [...e.bloques].sort((a, b) => hora(a.horaFin).localeCompare(hora(b.horaFin))).at(-1);
            const inicio = ultimo?.horaFin && hora(ultimo.horaFin) < '21:00' ? hora(ultimo.horaFin) : '10:00';
            const fin = `${String(Math.min(Number(inicio.slice(0, 2)) + 2, 23)).padStart(2, '0')}${inicio.slice(2)}`;
            onCambio({ ...e, bloques: [...e.bloques, { idBloque: null, horaInicio: inicio, horaFin: fin }] });
          }}>Agregar horario</Button>
          {e.bloques.length >= MAX_BLOQUES && (
            <Typography variant="body2" color="text.secondary">Un espacio puede tener hasta {MAX_BLOQUES} horarios.</Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

// Espacios comunes de la comunidad con su capacidad y sus horarios reservables
export default function EditorEspacios({ espacios, onCambio }) {
  const [nuevo, setNuevo] = useState('');
  const lleno = espacios.length >= MAX_ESPACIOS;
  const agregar = () => {
    const nombre = nuevo.trim();
    if (nombre && !lleno && !espacios.some((x) => x.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
      onCambio([...espacios, { idEspacio: null, nombre, descripcion: null, capacidad: null, bloques: [] }]);
    }
    setNuevo('');
  };
  return (
    <>
      {espacios.length === 0 && <Typography color="text.secondary">Sin espacios comunes.</Typography>}
      {espacios.map((e, i) => (
        <Espacio
          key={e.idEspacio ?? `nuevo-${e.nombre}`} e={e}
          onCambio={(x) => onCambio(espacios.map((y, j) => (j === i ? x : y)))}
          onQuitar={() => onCambio(espacios.filter((_, j) => j !== i))}
        />
      ))}
      <TextField
        size="small" label="Agregar espacio" value={nuevo} onChange={(ev) => setNuevo(ev.target.value.slice(0, MAX_NOMBRE))} placeholder="Ej: Sala de eventos"
        onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); agregar(); } }} sx={{ maxWidth: 360 }} disabled={lleno}
        helperText={lleno ? `Puedes tener hasta ${MAX_ESPACIOS} espacios comunes.` : ' '}
        slotProps={{
          htmlInput: { maxLength: MAX_NOMBRE },
          input: { endAdornment: <InputAdornment position="end"><IconButton aria-label="Agregar espacio" edge="end" onClick={agregar} disabled={!nuevo.trim() || lleno}><AddIcon /></IconButton></InputAdornment> },
        }}
      />
    </>
  );
}

