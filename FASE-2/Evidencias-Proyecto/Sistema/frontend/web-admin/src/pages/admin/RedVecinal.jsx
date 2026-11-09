import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, TextField, Typography,
} from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as admin from '../../api/admin';
import { useConsulta } from '../../api/useConsulta';
import { rolesEfectivos, RolUsuario } from '../../config/roles';
import { AVISADOS_CAMBIO_CUENTA, TIPOS_CUENTA, enmascararCuenta, erroresDatosComunidad, limpiarNumeroCuenta, maxLargo } from '../../utils/comunidad';
import { espaciosParaGuardar, espaciosValidos, hora } from '../../utils/espacios';
import { formatearRut } from '../../utils/rut';
import { roles } from '../../tokens';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';
import EstadoCarga from '../../components/ui/EstadoCarga';
import EditorEspacios from '../../components/admin/EditorEspacios';

// Campos de la cuenta para transferencias, con los nombres de la API. La app se los muestra al residente.
const BANCARIOS = [
  ['banco', 'Banco'], ['tipoCuenta', 'Tipo de cuenta'], ['numeroCuenta', 'Número de cuenta'],
  ['titularCuenta', 'Titular'], ['identificadorTitular', 'RUT del titular'], ['correoTransferencias', 'Correo para comprobantes'],
];
const rutVisible = (v) => (v && /^\d{7,8}-[\dK]$/.test(v) ? formatearRut(v) : v ?? '');
const desde = (datos, espacios) => ({
  nombre: datos.nombre, direccion: datos.direccion ?? '',
  ...Object.fromEntries(BANCARIOS.map(([k]) => [k, k === 'identificadorTitular' ? rutVisible(datos[k]) : datos[k] ?? ''])),
  espacios: espacios.map(({ idEspacio, nombre, descripcion, capacidad, bloques }) => ({
    idEspacio, nombre, descripcion, capacidad, bloques: bloques.map(({ idBloque, horaInicio, horaFin }) => ({ idBloque, horaInicio: hora(horaInicio), horaFin: hora(horaFin) })),
  })),
});
// Cómo se envía cada dato de la cuenta (la API limpia el número y normaliza el RUT); vacío = null
const limpio = (k, v) => {
  const t = v.trim().replace(/\s+/g, ' ');
  if (!t) return null;
  if (k === 'numeroCuenta') return limpiarNumeroCuenta(t);
  if (k === 'identificadorTitular') return formatearRut(t);
  if (k === 'correoTransferencias') return t.toLowerCase();
  return t;
};
// ¿Se quitó un espacio o cambió algún horario de uno que ya existía? Esas reservas futuras se cancelan.
function afectaReservas(antes, despues) {
  return antes.some((a) => {
    const d = despues.find((x) => x.idEspacio === a.idEspacio);
    if (!d) return true;
    const bloques = (e) => e.bloques.map((b) => `${hora(b.horaInicio)}-${hora(b.horaFin)}`).sort().join(',');
    return bloques(a) !== bloques(d);
  });
}

// Datos generales de la comunidad (GET/PUT comunidad/datos) y sus espacios comunes (GET/PUT reservas/espacios).
// Como la API: la directiva (Presidente, Tesorero, Secretario) los ve sin editar; solo la administración los cambia.
export default function RedVecinal() {
  const { comunidad, cargo, recargarPerfil } = useSesion();
  const puedeEditar = rolesEfectivos(cargo, comunidad).includes(RolUsuario.ADMINISTRADOR);
  const datos = useConsulta(admin.datosComunidad);
  const espacios = useConsulta(admin.listarEspacios);
  const unidades = useConsulta(admin.listarUnidades);

  if (!datos.datos || !espacios.datos) {
    const pendiente = !datos.datos ? datos : espacios;
    return (
      <Box sx={{ maxWidth: 820 }}>
        <Encabezado contexto={comunidad.nombre} titulo="Datos de la comunidad" />
        <EstadoCarga cargando={pendiente.cargando} error={pendiente.error} onReintentar={pendiente.recargar} />
      </Box>
    );
  }
  const totalUnidades = unidades.datos?.length;
  if (!puedeEditar) return <DatosSoloLectura datos={datos.datos} espacios={espacios.datos} totalUnidades={totalUnidades} />;
  return (
    <Formulario
      key={`${datos.datos.nombre}-${JSON.stringify(espacios.datos)}`}
      datos={datos.datos} espacios={espacios.datos} totalUnidades={totalUnidades}
      onGuardado={(nuevos, nuevosEspacios) => {
        if (nuevos) { datos.setDatos(nuevos); recargarPerfil().catch(() => {}); }
        if (nuevosEspacios) espacios.setDatos(nuevosEspacios);
      }}
    />
  );
}

function Formulario({ datos, espacios, totalUnidades, onGuardado }) {
  const { avisar, avisarError } = useAviso();
  const [form, setForm] = useState(() => desde(datos, espacios));
  const [intento, setIntento] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const original = desde(datos, espacios);
  const errores = erroresDatosComunidad(form);
  const valido = !Object.keys(errores).length && espaciosValidos(form.espacios);
  const cambianDatos = JSON.stringify({ ...form, espacios: null }) !== JSON.stringify({ ...original, espacios: null });
  const cambianEspacios = JSON.stringify(form.espacios) !== JSON.stringify(original.espacios);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const aplicar = async () => {
    setEnviando(true);
    setConfirmar(false);
    const mensajes = [];
    let nuevos = null;
    let nuevosEspacios = null;
    try {
      if (cambianDatos) {
        const bancarios = Object.fromEntries(BANCARIOS.map(([k]) => [k, limpio(k, form[k])]));
        nuevos = await admin.guardarDatosComunidad({ nombre: form.nombre.trim().replace(/\s+/g, ' '), direccion: form.direccion.trim(), ...bancarios });
        // Si cambió la cuenta, la API avisa por correo al Administrador, al Presidente y al Tesorero
        if (BANCARIOS.some(([k]) => (bancarios[k] ?? null) !== (datos[k] ?? null))) {
          const quienes = AVISADOS_CAMBIO_CUENTA.map((r) => roles[r].label).join(', ').replace(/, ([^,]*)$/, ' y $1');
          mensajes.push(`Avisamos por correo a ${quienes} que la cuenta para transferencias cambió (${bancarios.numeroCuenta ? `${bancarios.banco}, ${enmascararCuenta(bancarios.numeroCuenta)}` : 'ahora sin cuenta'}).`);
        }
      }
      if (cambianEspacios) {
        const r = await admin.guardarEspacios(espaciosParaGuardar(form.espacios));
        nuevosEspacios = r.espacios;
        if (r.reservasCanceladas) mensajes.push(`Se ${r.reservasCanceladas === 1 ? 'canceló 1 reserva' : `cancelaron ${r.reservasCanceladas} reservas`} y se avisó a sus residentes.`);
      }
      avisar(['Datos guardados.', ...mensajes].join(' '));
      onGuardado(nuevos, nuevosEspacios);
    } catch (err) {
      // Si los datos se guardaron pero los espacios no, se conservan los datos nuevos
      if (nuevos) onGuardado(nuevos, null);
      avisarError(err.message);
      setEnviando(false);
    }
  };
  const guardar = (e) => {
    e.preventDefault();
    setIntento(true);
    if (!valido || (!cambianDatos && !cambianEspacios)) return;
    if (cambianEspacios && afectaReservas(original.espacios, form.espacios)) setConfirmar(true);
    else aplicar();
  };

  const cambios = cambianDatos || cambianEspacios;
  const campo = (k) => ({
    name: k, value: form[k], onChange: cambiar, error: intento && !!errores[k], helperText: intento && errores[k],
    slotProps: { htmlInput: { maxLength: maxLargo(k) } },
  });

  return (
    <Box component="form" onSubmit={guardar} sx={{ maxWidth: 820 }}>
      <Encabezado
        contexto={datos.nombre}
        titulo="Datos de la comunidad"
        descripcion="Los residentes ven estos datos en la app. Los espacios comunes también aparecen en el plano, y sus horarios son los que se pueden reservar."
      />

      <Box sx={{ display: 'grid', gap: 2.5 }}>
        <Tarjeta titulo="General">
          <TextField required label="Nombre" {...campo('nombre')} />
          <TextField required label="Dirección" {...campo('direccion')} />
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.default' }}>
            <Typography variant="body2" color="text.secondary">Tipo de comunidad</Typography>
            <Typography sx={{ fontWeight: 700 }}>{datos.tipo}{totalUnidades != null ? ` · ${totalUnidades} unidades` : ''}</Typography>
            <Typography variant="body2" color="text.secondary">El tipo define el plano y los módulos sugeridos. Solo el equipo de EntreCasas puede cambiarlo.</Typography>
          </Paper>
        </Tarjeta>

        <Tarjeta titulo="Datos para transferencias" extra="La app se los muestra al residente cuando va a pagar">
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {BANCARIOS.map(([k, etiqueta]) => (k === 'tipoCuenta' ? (
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
          <EditorEspacios espacios={form.espacios} onCambio={(lista) => setForm({ ...form, espacios: lista })} />
        </Tarjeta>

        {/* Sin cambios el botón queda al final del formulario; con cambios, una barra fija recuerda guardarlos */}
        <Box sx={{
          display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap',
          ...(cambios && { position: 'sticky', bottom: 16, zIndex: 1, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1.5, px: 2, py: 1.25 }),
        }}>
          {cambios && <Typography variant="body2" sx={{ fontWeight: 700, mr: 'auto' }}>Tienes cambios sin guardar</Typography>}
          {cambios && <Button onClick={() => setForm(original)} disabled={enviando}>Descartar</Button>}
          <Button type="submit" variant="contained" loading={enviando} disabled={!cambios}>Guardar cambios</Button>
        </Box>
      </Box>

      {confirmar && (
        <Dialog open onClose={() => setConfirmar(false)} fullWidth maxWidth="sm">
          <DialogTitle>¿Guardar los cambios en los espacios?</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2 }}>
            <Typography color="text.secondary">
              Quitaste un espacio o cambiaste horarios. Si hay reservas futuras en lo que cambió, se cancelan y sus residentes reciben un correo con el motivo.
            </Typography>
            <Alert severity="warning" variant="outlined">No se puede deshacer: aunque vuelvas a agregar el horario, las reservas quedan canceladas.</Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setConfirmar(false)} autoFocus>Volver a editar</Button>
            <Button variant="contained" color="error" onClick={aplicar}>Guardar</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

// Lo que ve la directiva: los mismos datos, sin poder cambiarlos
function DatosSoloLectura({ datos, espacios, totalUnidades }) {
  const dato = (etiqueta, valor) => (
    <Box key={etiqueta}>
      <Typography variant="body2" color="text.secondary">{etiqueta}</Typography>
      <Typography sx={{ fontWeight: 700 }}>{valor || '—'}</Typography>
    </Box>
  );
  return (
    <Box sx={{ maxWidth: 820 }}>
      <Encabezado contexto={datos.nombre} titulo="Datos de la comunidad" descripcion="Los residentes ven estos datos en la app. Solo la administración puede cambiarlos." />
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        <Tarjeta titulo="General">
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {dato('Nombre', datos.nombre)}
            {dato('Dirección', datos.direccion)}
            {dato('Tipo de comunidad', `${datos.tipo}${totalUnidades != null ? ` · ${totalUnidades} unidades` : ''}`)}
          </Box>
        </Tarjeta>
        <Tarjeta titulo="Datos para transferencias" extra="La app se los muestra al residente cuando va a pagar">
          {datos.numeroCuenta ? (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              {BANCARIOS.map(([k, etiqueta]) => dato(etiqueta, k === 'identificadorTitular' ? rutVisible(datos[k]) : datos[k]))}
            </Box>
          ) : <Typography color="text.secondary">La comunidad no muestra una cuenta para transferencias.</Typography>}
        </Tarjeta>
        <Tarjeta titulo="Espacios comunes">
          {espacios.length
            ? espacios.map((e) => dato(e.nombre, [e.capacidad ? `Capacidad ${e.capacidad}` : null, e.bloques.map((b) => `${hora(b.horaInicio)}–${hora(b.horaFin)}`).join(', '), e.descripcion].filter(Boolean).join(' · ')))
            : <Typography color="text.secondary">Sin espacios comunes.</Typography>}
        </Tarjeta>
        <Alert severity="info" variant="outlined">Si algún dato está mal, pídele a la administración que lo corrija.</Alert>
      </Box>
    </Box>
  );
}
