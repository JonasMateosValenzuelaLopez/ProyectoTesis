import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, TextField, Typography,
} from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { cargosEfectivos } from '../../config/navegacion';
import { AVISADOS_CAMBIO_CUENTA, TIPOS_CUENTA, enmascararCuenta, erroresDatosComunidad, limpiarNumeroCuenta, maxLargo } from '../../utils/comunidad';
import { formatearRut } from '../../utils/rut';
import { roles } from '../../tokens';
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

// Cómo se guarda cada dato de la cuenta (la API limpia espacios y puntos del número y da formato al RUT)
const limpio = (k, v) => {
  const t = v.trim().replace(/\s+/g, ' ');
  if (!t) return null;
  if (k === 'numero_cuenta') return limpiarNumeroCuenta(t);
  if (k === 'rut_titular') return formatearRut(t);
  if (k === 'correo_pagos') return t.toLowerCase();
  return t;
};

// Datos generales de la comunidad: los ve el residente en la app y se usan en el plano.
// Como la API: la directiva (Presidente, Tesorero, Secretario) los ve sin editar; solo la administración los cambia.
export default function RedVecinal() {
  const { comunidad, cargo } = useSesion();
  const { acciones } = useAdmin();
  const { reservas, unidadPorId, espacioDe, acciones: conserjeria } = useConserjeria();
  const puedeEditar = cargosEfectivos(cargo, comunidad).includes('administrador');
  const [form, setForm] = useState(() => desde(comunidad));
  const [intento, setIntento] = useState(false);
  // Reservas que se cancelarán si se confirma el guardado (null = sin confirmación pendiente)
  const [porCancelar, setPorCancelar] = useState(null);
  const original = desde(comunidad);
  const cambios = JSON.stringify(form) !== JSON.stringify(original);
  const errores = erroresDatosComunidad(form);
  const valido = !Object.keys(errores).length && espaciosValidos(form.espacios);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const espaciosForm = () => form.espacios.map((x) => ({ ...x, nombre: x.nombre.trim() }));
  const aplicar = (afectadas) => {
    const bancarios = Object.fromEntries(BANCARIOS.map(([k]) => [k, limpio(k, form[k])]));
    // Si cambió la cuenta, la API avisa por correo al Administrador, al Presidente y al Tesorero
    const cambioCuenta = BANCARIOS.some(([k]) => bancarios[k] !== (comunidad[k] ?? null));
    const quienes = AVISADOS_CAMBIO_CUENTA.map((c) => roles[c].label).join(', ').replace(/, ([^,]*)$/, ' y $1');
    acciones.guardarComunidad({
      nombre: form.nombre.trim().replace(/\s+/g, ' '), direccion: form.direccion.trim(), espacios_comunes: conEspacios(comunidad, espaciosForm()),
      ...bancarios,
    }, cambioCuenta
      ? `Datos guardados. Avisamos por correo a ${quienes} que la cuenta para transferencias cambió (${bancarios.numero_cuenta ? `${bancarios.banco}, ${enmascararCuenta(bancarios.numero_cuenta)}` : 'ahora sin cuenta'}).`
      : undefined);
    // Como la API: quitar un espacio o cambiar un horario cancela sus reservas y avisa a los residentes
    conserjeria.cancelarPorEspacios(afectadas);
    setPorCancelar(null);
  };
  const guardar = (e) => {
    e.preventDefault();
    setIntento(true);
    if (!valido) return;
    const afectadas = reservasAfectadas(espaciosActivos(comunidad), espaciosForm(), reservas);
    if (afectadas.length) setPorCancelar(afectadas);
    else aplicar([]);
  };

  if (!puedeEditar) return <DatosSoloLectura comunidad={comunidad} />;

  const campo = (k) => ({
    name: k, value: form[k], onChange: cambiar, error: intento && !!errores[k], helperText: intento && errores[k],
    slotProps: { htmlInput: { maxLength: maxLargo(k) } },
  });

  return (
    <Box component="form" onSubmit={guardar} sx={{ maxWidth: 820 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Datos de la comunidad"
        descripcion="Los residentes ven estos datos en la app. Los espacios comunes también aparecen en el plano, y sus horarios son los que se pueden reservar."
      />

      <Box sx={{ display: 'grid', gap: 2.5 }}>
        <Tarjeta titulo="General">
          <TextField required label="Nombre" {...campo('nombre')} />
          <TextField required label="Dirección" {...campo('direccion')} />
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.default' }}>
            <Typography variant="body2" color="text.secondary">Tipo de comunidad</Typography>
            <Typography sx={{ fontWeight: 700 }}>{comunidad.tipo} · {comunidad.unidades.length} unidades</Typography>
            <Typography variant="body2" color="text.secondary">El tipo define el plano y los módulos sugeridos. Solo el equipo de EntreCasas puede cambiarlo.</Typography>
          </Paper>
        </Tarjeta>

        <Tarjeta titulo="Datos para transferencias" extra="La app se los muestra al residente cuando va a pagar">
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {BANCARIOS.map(([k, etiqueta]) => (k === 'tipo_cuenta' ? (
              <TextField key={k} select label={etiqueta} {...campo(k)}>
                <MenuItem value=""><em>Sin cuenta</em></MenuItem>
                {TIPOS_CUENTA.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            ) : <TextField key={k} label={etiqueta} {...campo(k)} />))}
          </Box>
          {intento && errores.cuenta && <Alert severity="warning" variant="outlined">{errores.cuenta}</Alert>}
          <Typography variant="body2" color="text.secondary">
            Si cambias la cuenta, avisamos por correo al Administrador, al Presidente y al Tesorero, para que nadie desvíe los pagos sin que la directiva lo sepa.
          </Typography>
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
          <Button type="submit" variant="contained" disabled={!cambios}>Guardar cambios</Button>
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

// Lo que ve la directiva: los mismos datos, sin poder cambiarlos
function DatosSoloLectura({ comunidad }) {
  const dato = (etiqueta, valor) => (
    <Box key={etiqueta}>
      <Typography variant="body2" color="text.secondary">{etiqueta}</Typography>
      <Typography sx={{ fontWeight: 700 }}>{valor || '—'}</Typography>
    </Box>
  );
  const espacios = espaciosActivos(comunidad);
  return (
    <Box sx={{ maxWidth: 820 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Datos de la comunidad"
        descripcion="Los residentes ven estos datos en la app. Solo la administración puede cambiarlos."
      />
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        <Tarjeta titulo="General">
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {dato('Nombre', comunidad.nombre)}
            {dato('Dirección', comunidad.direccion)}
            {dato('Tipo de comunidad', `${comunidad.tipo} · ${comunidad.unidades.length} unidades`)}
          </Box>
        </Tarjeta>
        <Tarjeta titulo="Datos para transferencias" extra="La app se los muestra al residente cuando va a pagar">
          {comunidad.numero_cuenta ? (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              {BANCARIOS.map(([k, etiqueta]) => dato(etiqueta, comunidad[k]))}
            </Box>
          ) : <Typography color="text.secondary">La comunidad no muestra una cuenta para transferencias.</Typography>}
        </Tarjeta>
        <Tarjeta titulo="Espacios comunes">
          {espacios.length
            ? espacios.map((e) => dato(e.nombre, [e.capacidad ? `Capacidad ${e.capacidad}` : null, e.descripcion].filter(Boolean).join(' · ')))
            : <Typography color="text.secondary">Sin espacios comunes.</Typography>}
        </Tarjeta>
        <Alert severity="info" variant="outlined">Si algún dato está mal, pídele a la administración que lo corrija.</Alert>
      </Box>
    </Box>
  );
}
