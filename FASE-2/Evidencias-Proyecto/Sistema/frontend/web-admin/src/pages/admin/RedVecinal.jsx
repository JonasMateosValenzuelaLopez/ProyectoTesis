import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, TextField, Typography,
} from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useAdmin } from '../../context/AdminContext';
import { useConserjeria } from '../../context/ConserjeriaContext';
import Encabezado from '../../components/ui/Encabezado';
import { conEspacios, espaciosActivos, espaciosValidos, hora, reservasAfectadas } from '../../utils/espacios';
import { fechaCompleta, nombreUnidad } from '../../utils/formato';
import EditorEspacios from '../../components/admin/EditorEspacios';
import Tarjeta from '../../components/ui/Tarjeta';

// Columnas de `redes_vecinales` que edita la administración. Los datos de transferencia
// los muestra la app cuando el residente va a pagar.
const BANCARIOS = [
  ['banco', 'Banco'], ['tipo_cuenta', 'Tipo de cuenta'], ['numero_cuenta', 'Número de cuenta'],
  ['titular_cuenta', 'Titular'], ['rut_titular', 'RUT del titular'], ['correo_pagos', 'Correo para comprobantes'],
];
const desde = (c) => ({
  nombre: c.nombre, direccion: c.direccion ?? '',
  ...Object.fromEntries(BANCARIOS.map(([k]) => [k, c[k] ?? ''])),
  // Lo que se edita de cada espacio activo: nombre, capacidad, descripción y bloques
  espacios: espaciosActivos(c).map(({ id_espacio, nombre, descripcion, capacidad, espacios_bloques }) => ({ id_espacio, nombre, descripcion, capacidad, espacios_bloques })),
});

// Datos generales de la comunidad: los ve el residente en la app y se usan en el plano.
export default function RedVecinal() {
  const { comunidad } = useSesion();
  const { acciones } = useAdmin();
  const { reservas, unidadPorId, espacioDe, acciones: conserjeria } = useConserjeria();
  const [form, setForm] = useState(() => desde(comunidad));
  // Reservas que se cancelarán si se confirma el guardado (null = sin confirmación pendiente)
  const [porCancelar, setPorCancelar] = useState(null);
  const original = desde(comunidad);
  const cambios = JSON.stringify(form) !== JSON.stringify(original);
  const valido = form.nombre.trim() && form.direccion.trim() && espaciosValidos(form.espacios);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const espaciosForm = () => form.espacios.map((x) => ({ ...x, nombre: x.nombre.trim() }));
  const aplicar = (afectadas) => {
    acciones.guardarComunidad({
      nombre: form.nombre.trim(), direccion: form.direccion.trim(), espacios_comunes: conEspacios(comunidad, espaciosForm()),
      ...Object.fromEntries(BANCARIOS.map(([k]) => [k, form[k].trim() || null])),
    });
    // Como la API: quitar un espacio o cambiar un horario cancela sus reservas y avisa a los residentes
    conserjeria.cancelarPorEspacios(afectadas);
    setPorCancelar(null);
  };
  const guardar = (e) => {
    e.preventDefault();
    if (!valido) return;
    const afectadas = reservasAfectadas(espaciosActivos(comunidad), espaciosForm(), reservas);
    if (afectadas.length) setPorCancelar(afectadas);
    else aplicar([]);
  };

  return (
    <Box component="form" onSubmit={guardar} sx={{ maxWidth: 820 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Datos de la comunidad"
        descripcion="Los residentes ven estos datos en la app. Los espacios comunes también aparecen en el plano, y sus horarios son los que se pueden reservar."
      />

      <Box sx={{ display: 'grid', gap: 2.5 }}>
        <Tarjeta titulo="General">
          <TextField required label="Nombre" name="nombre" value={form.nombre} onChange={cambiar} />
          <TextField required label="Dirección" name="direccion" value={form.direccion} onChange={cambiar} />
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.default' }}>
            <Typography variant="body2" color="text.secondary">Tipo de comunidad</Typography>
            <Typography sx={{ fontWeight: 700 }}>{comunidad.tipo} · {comunidad.unidades.length} unidades</Typography>
            <Typography variant="body2" color="text.secondary">El tipo define el plano y los módulos sugeridos. Solo el equipo de EntreCasas puede cambiarlo.</Typography>
          </Paper>
        </Tarjeta>

        <Tarjeta titulo="Datos para transferencias" extra="La app se los muestra al residente cuando va a pagar">
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {BANCARIOS.map(([k, etiqueta]) => <TextField key={k} label={etiqueta} name={k} value={form[k]} onChange={cambiar} />)}
          </Box>
        </Tarjeta>

        <Tarjeta titulo="Espacios comunes" extra="Con sus horarios reservables, si el módulo de reservas está activo">
          <EditorEspacios espacios={form.espacios} onCambio={(espacios) => setForm({ ...form, espacios })} />
        </Tarjeta>

        {/* Sin cambios el botón queda al final del formulario; con cambios, una barra fija recuerda guardarlos */}
        <Box sx={{
          display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap',
          ...(cambios && { position: 'sticky', bottom: 16, zIndex: 1, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1.5, px: 2, py: 1.25 }),
        }}>
          {cambios && <Typography variant="body2" sx={{ fontWeight: 700, mr: 'auto' }}>Tienes cambios sin guardar</Typography>}
          {cambios && <Button onClick={() => setForm(original)}>Descartar</Button>}
          <Button type="submit" variant="contained" disabled={!cambios || !valido}>Guardar cambios</Button>
        </Box>
      </Box>

      {porCancelar && (
        <Dialog open onClose={() => setPorCancelar(null)} fullWidth maxWidth="sm">
          <DialogTitle>
            Se {porCancelar.length === 1 ? 'cancelará 1 reserva' : `cancelarán ${porCancelar.length} reservas`}
          </DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2 }}>
            <Typography color="text.secondary">
              Quitaste un espacio o cambiaste horarios que ya tienen reservas. Si guardas, estas reservas se cancelan y sus residentes reciben un correo con el motivo.
            </Typography>
            <Paper variant="outlined" sx={{ borderRadius: 1.5, maxHeight: 280, overflowY: 'auto' }}>
              {porCancelar.map(({ reserva: r, motivo }, i) => (
                <Box key={r.id_reserva} sx={{ px: 2, py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    {espacioDe(r)} · {fechaCompleta(r.fecha_reserva)} · {hora(r.hora_inicio)} a {hora(r.hora_fin)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{nombreUnidad(unidadPorId[r.id_unidad])} · {motivo}</Typography>
                </Box>
              ))}
            </Paper>
            <Alert severity="warning" variant="outlined">No se puede deshacer: aunque vuelvas a agregar el horario, las reservas quedan canceladas.</Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setPorCancelar(null)} autoFocus>Volver a editar</Button>
            <Button variant="contained" color="error" onClick={() => aplicar(porCancelar)}>Guardar y cancelar reservas</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
