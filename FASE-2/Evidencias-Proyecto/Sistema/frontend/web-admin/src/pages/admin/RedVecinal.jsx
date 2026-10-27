import { useState } from 'react';
import { Box, Button, Chip, IconButton, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAdmin } from '../../context/AdminContext';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';

const desde = (c) => ({
  nombre: c.nombre, direccion: c.direccion ?? '', calle: c.calle ?? '',
  calles: (c.calles ?? []).join('\n'), espaciosComunes: c.espaciosComunes ?? [],
});

// Datos generales de la comunidad: los ve el residente en la app y se usan en el plano.
export default function RedVecinal() {
  const { comunidad } = useSesion();
  const { acciones } = useAdmin();
  const [form, setForm] = useState(() => desde(comunidad));
  const [espacio, setEspacio] = useState('');
  const original = desde(comunidad);
  const cambios = JSON.stringify(form) !== JSON.stringify(original);
  const valido = form.nombre.trim() && form.direccion.trim();

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const agregarEspacio = () => {
    const nombre = espacio.trim();
    if (nombre && !form.espaciosComunes.some((x) => x.toLowerCase() === nombre.toLowerCase())) {
      setForm({ ...form, espaciosComunes: [...form.espaciosComunes, nombre] });
    }
    setEspacio('');
  };
  const guardar = (e) => {
    e.preventDefault();
    if (!valido) return;
    const datos = { nombre: form.nombre.trim(), direccion: form.direccion.trim(), espaciosComunes: form.espaciosComunes };
    if (comunidad.tipo === 'Condominio') datos.calle = form.calle.trim();
    if (comunidad.tipo === 'Villa') datos.calles = form.calles.split('\n').map((x) => x.trim()).filter(Boolean);
    acciones.guardarComunidad(datos);
  };

  return (
    <Box component="form" onSubmit={guardar} sx={{ maxWidth: 820 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Datos de la comunidad"
        descripcion="Los residentes ven estos datos en la app. Los nombres de calles y espacios también aparecen en el plano."
      />

      <Box sx={{ display: 'grid', gap: 2.5 }}>
        <Tarjeta titulo="General">
          <TextField required label="Nombre" name="nombre" value={form.nombre} onChange={cambiar} />
          <TextField required label="Dirección" name="direccion" value={form.direccion} onChange={cambiar} />
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}>
            <Typography variant="body2" color="text.secondary">Tipo de comunidad</Typography>
            <Typography sx={{ fontWeight: 700 }}>{comunidad.tipo} · {comunidad.unidades.length} unidades</Typography>
            <Typography variant="body2" color="text.secondary">El tipo define el plano y los módulos sugeridos. Solo el equipo de EntreCasas puede cambiarlo.</Typography>
          </Paper>
        </Tarjeta>

        {comunidad.tipo === 'Condominio' && (
          <Tarjeta titulo="Plano">
            <TextField label="Nombre del pasaje o calle interior" name="calle" value={form.calle} onChange={cambiar} />
          </Tarjeta>
        )}
        {comunidad.tipo === 'Villa' && (
          <Tarjeta titulo="Plano">
            <TextField label="Calles entre manzanas" name="calles" value={form.calles} onChange={cambiar} multiline minRows={3} helperText="Una por línea, en orden: la primera separa las manzanas A y B." />
          </Tarjeta>
        )}

        <Tarjeta titulo="Espacios comunes" extra="Se pueden reservar si el módulo de reservas está activo">
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {form.espaciosComunes.length === 0 && <Typography color="text.secondary">Sin espacios comunes.</Typography>}
            {form.espaciosComunes.map((x) => (
              <Chip key={x} label={x} onDelete={() => setForm({ ...form, espaciosComunes: form.espaciosComunes.filter((y) => y !== x) })} />
            ))}
          </Box>
          <TextField
            size="small" label="Agregar espacio" value={espacio} onChange={(e) => setEspacio(e.target.value)} placeholder="Ej: Sala de eventos"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarEspacio(); } }} sx={{ maxWidth: 360 }}
            slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton aria-label="Agregar espacio" edge="end" onClick={agregarEspacio} disabled={!espacio.trim()}><AddIcon /></IconButton></InputAdornment> } }}
          />
        </Tarjeta>

        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', position: 'sticky', bottom: 16 }}>
          {cambios && <Button onClick={() => setForm(original)} sx={{ bgcolor: 'background.paper' }}>Descartar cambios</Button>}
          <Button type="submit" variant="contained" disabled={!cambios || !valido}>Guardar cambios</Button>
        </Box>
      </Box>
    </Box>
  );
}
