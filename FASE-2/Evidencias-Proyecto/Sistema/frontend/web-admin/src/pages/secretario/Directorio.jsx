import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import { Add as AddIcon, DeleteOutlined as QuitarIcon, EditOutlined as EditIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as admin from '../../api/admin';
import { useConsulta } from '../../api/useConsulta';
import { EMERGENCIAS } from '../../config/comunidad';
import { RolUsuario, rolesEfectivos } from '../../config/roles';
import { fecha, nombreCompleto, nombreUnidad, telefono as verTelefono } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';
import EstadoCarga from '../../components/ui/EstadoCarga';
import SelloCargo from '../../components/marca/SelloCargo';

const vacio = { nombre: '', detalle: '', telefono: '', horario: '' };
// Como la API (EsTelefono): + y entre 8 y 14 dígitos. Un celular de 9 dígitos se completa con +56.
const normalizarTelefonoContacto = (t) => {
  const limpio = t.replace(/[^\d+]/g, '');
  if (limpio.startsWith('+')) return limpio;
  if (limpio.startsWith('56') && limpio.length >= 10) return `+${limpio}`;
  return limpio.length === 9 ? `+56${limpio}` : limpio;
};
const telefonoValido = (t) => /^\+\d{8,14}$/.test(t);

// POST comunidad/contactos o PUT comunidad/contactos/:id
function DialogoContacto({ contacto, onClose, onGuardado }) {
  const { avisar } = useAviso();
  const [form, setForm] = useState(contacto ? { nombre: contacto.nombre, detalle: contacto.detalle ?? '', telefono: verTelefono(contacto.telefono), horario: contacto.horario ?? '' } : vacio);
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const tel = normalizarTelefonoContacto(form.telefono);
  const telMal = !!form.telefono.trim() && !telefonoValido(tel);
  const valido = form.nombre.trim() && telefonoValido(tel);
  const cambiar = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(null); };
  const guardar = async (e) => {
    e.preventDefault();
    setIntento(true);
    if (!valido) return;
    setEnviando(true);
    const datos = {
      nombre: form.nombre.trim(), telefono: tel, visible: contacto?.visible ?? true,
      ...(form.detalle.trim() ? { detalle: form.detalle.trim() } : {}),
      ...(form.horario.trim() ? { horario: form.horario.trim() } : {}),
    };
    try {
      const guardado = contacto ? await admin.actualizarContacto(contacto.idContacto, datos) : await admin.crearContacto(datos);
      avisar(contacto ? 'Contacto actualizado.' : 'Contacto agregado. Ya aparece en la app.');
      onGuardado(guardado);
      onClose();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={guardar} noValidate>
      <DialogTitle>{contacto ? 'Editar contacto' : 'Nuevo contacto'}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField required label="Nombre" name="nombre" value={form.nombre} onChange={cambiar} placeholder="Ej: Gasfitería Don Hugo"
          error={intento && !form.nombre.trim()} slotProps={{ htmlInput: { maxLength: 100 } }} />
        <TextField label="Para qué sirve" name="detalle" value={form.detalle} onChange={cambiar} placeholder="Ej: Gasfíter de confianza del condominio" slotProps={{ htmlInput: { maxLength: 150 } }} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField required label="Teléfono" name="telefono" type="tel" value={form.telefono} onChange={cambiar} placeholder="+56 9 1234 5678"
            error={telMal || (intento && !form.telefono.trim())} helperText={telMal ? 'Con código de país, por ejemplo +56 9 1234 5678 o +56 45 221 0890' : ' '} />
          <TextField label="Horario" name="horario" value={form.horario} onChange={cambiar} placeholder="Ej: Lunes a viernes" slotProps={{ htmlInput: { maxLength: 100 } }} />
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" loading={enviando}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}

// La directiva vigente sale de Residentes y cargos (GET residentes), que la API muestra solo a la administración
function DirectivaVigente() {
  const { comunidad } = useSesion();
  const { datos: personas, cargando, error, recargar } = useConsulta(admin.listarResidentes);
  // Las viviendas de cada persona traen el número; el tipo sale de la comunidad
  const vivienda = (v) => nombreUnidad({ ...v, tipo: comunidad.tipo === 'Edificio' ? 'Departamento' : 'Casa' });
  if (!personas) return <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />;
  const directiva = personas
    .filter((p) => p.estado !== 'Desactivado')
    .flatMap((p) => p.cargos.map((c) => ({ ...c, persona: p })))
    .sort((a, b) => [RolUsuario.PRESIDENTE, RolUsuario.SECRETARIO, RolUsuario.TESORERO, RolUsuario.ADMINISTRADOR, RolUsuario.CONSERJE].indexOf(a.idRol)
      - [RolUsuario.PRESIDENTE, RolUsuario.SECRETARIO, RolUsuario.TESORERO, RolUsuario.ADMINISTRADOR, RolUsuario.CONSERJE].indexOf(b.idRol));
  if (directiva.length === 0) return <Typography color="text.secondary">Todavía no hay cargos asignados en esta comunidad.</Typography>;
  return (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
      {directiva.map((m) => (
        <Box key={`${m.idRol}-${m.persona.idUsuario}`} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1.5, display: 'grid', gap: 0.75, alignContent: 'start' }}>
          <SelloCargo cargo={m.idRol} conTexto sx={{ fontSize: '0.85rem', color: 'text.secondary' }} />
          <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>{nombreCompleto(m.persona)}</Typography>
          <Typography variant="body2" color="text.secondary">
            {m.persona.viviendas[0] ? vivienda(m.persona.viviendas[0]) : 'Personal'}{m.hasta ? ` · hasta ${fecha(m.hasta)} ${m.hasta.slice(0, 4)}` : ''}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// Directorio oficial que ven los residentes en la app (GET comunidad/contactos): contactos útiles y emergencias.
// Administración, Presidencia y Secretaría los editan; los ocultos no aparecen en la app.
export default function Directorio() {
  const { comunidad, cargo } = useSesion();
  const { avisar, avisarError } = useAviso();
  const esAdministracion = rolesEfectivos(cargo, comunidad).includes(RolUsuario.ADMINISTRADOR);
  const { datos: contactos, cargando, error, recargar, setDatos } = useConsulta(admin.listarContactos);
  const [edicion, setEdicion] = useState(null); // { contacto } o { contacto: null }
  const [enCurso, setEnCurso] = useState(null);

  const reemplazar = (k) => setDatos((lista) => (lista.some((x) => x.idContacto === k.idContacto) ? lista.map((x) => (x.idContacto === k.idContacto ? k : x)) : [...lista, k]));
  const cambiarVisible = async (k, visible) => {
    setEnCurso(k.idContacto);
    try {
      reemplazar(await admin.actualizarContacto(k.idContacto, {
        nombre: k.nombre, telefono: k.telefono, visible, ...(k.detalle ? { detalle: k.detalle } : {}), ...(k.horario ? { horario: k.horario } : {}),
      }));
      avisar(visible ? `${k.nombre} ahora aparece en la app.` : `${k.nombre} ya no aparece en la app.`);
    } catch (err) {
      avisarError(err.message);
    } finally {
      setEnCurso(null);
    }
  };
  const eliminar = async (k) => {
    setEnCurso(k.idContacto);
    try {
      await admin.eliminarContacto(k.idContacto);
      setDatos((lista) => lista.filter((x) => x.idContacto !== k.idContacto));
      avisar(`Quitamos a ${k.nombre} del directorio.`);
    } catch (err) {
      avisarError(err.message);
    } finally {
      setEnCurso(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Directorio oficial"
        descripcion="Esta información aparece en la app de los residentes. Mantenla al día cuando cambie un proveedor o un número."
      />

      <Box sx={{ display: 'grid', gap: 2.5 }}>
        {esAdministracion && (
          <Tarjeta titulo="Directiva vigente" extra="Los cargos se asignan en Residentes y cargos">
            <DirectivaVigente />
          </Tarjeta>
        )}

        <Tarjeta
          titulo="Contactos de la comunidad"
          extra={<Button size="small" startIcon={<AddIcon />} disabled={!contactos} onClick={() => setEdicion({ contacto: null })}>Agregar contacto</Button>}
        >
          {!contactos ? <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} /> : (
            <>
              {contactos.length === 0 && <Typography color="text.secondary">Agrega la administración, proveedores de confianza o el plan cuadrante del sector.</Typography>}
              <Box sx={{ display: 'grid' }}>
                {contactos.map((k, i) => (
                  <Box key={k.idContacto} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', sm: '1fr 200px auto' }, gap: { xs: 1, sm: 2 }, alignItems: 'center', py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
                    <Box sx={{ minWidth: 0, opacity: k.visible ? 1 : 0.6 }}>
                      <Typography sx={{ fontWeight: 700 }}>{k.nombre}</Typography>
                      <Typography variant="body2" color="text.secondary">{[k.detalle, k.horario].filter(Boolean).join(' · ')}</Typography>
                      <Typography variant="body2" sx={{ display: { sm: 'none' }, fontVariantNumeric: 'tabular-nums' }}>{verTelefono(k.telefono)}</Typography>
                    </Box>
                    <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontVariantNumeric: 'tabular-nums', opacity: k.visible ? 1 : 0.6 }}>{verTelefono(k.telefono)}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Tooltip title={k.visible ? 'Visible en la app' : 'Oculto en la app'}>
                        <Switch checked={!!k.visible} disabled={enCurso === k.idContacto} slotProps={{ input: { 'aria-label': `${k.nombre} visible en la app` } }} onChange={(e) => cambiarVisible(k, e.target.checked)} />
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton aria-label={`Editar ${k.nombre}`} onClick={() => setEdicion({ contacto: k })}><EditIcon /></IconButton>
                      </Tooltip>
                      <Tooltip title="Quitar">
                        <IconButton aria-label={`Quitar ${k.nombre}`} disabled={enCurso === k.idContacto} onClick={() => eliminar(k)}><QuitarIcon /></IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Tarjeta>

        <Tarjeta titulo="Emergencias" extra="Siempre visibles en la app">
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
            {EMERGENCIAS.map((e) => (
              <Paper key={e.telefono} variant="outlined" sx={{ p: 1.5, borderRadius: 1, display: 'grid' }}>
                <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.6rem', lineHeight: 1.1 }}>{e.telefono}</Typography>
                <Typography variant="body2" color="text.secondary">{e.nombre}</Typography>
              </Paper>
            ))}
          </Box>
        </Tarjeta>
      </Box>

      {edicion && (
        <DialogoContacto key={edicion.contacto?.idContacto ?? 'nuevo'} contacto={edicion.contacto} onClose={() => setEdicion(null)} onGuardado={reemplazar} />
      )}
    </Box>
  );
}
