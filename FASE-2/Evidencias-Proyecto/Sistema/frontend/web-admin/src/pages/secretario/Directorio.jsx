import { useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import { Add as AddIcon, DeleteOutlined as QuitarIcon, EditOutlined as EditIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useDirectiva } from '../../context/DirectivaContext';
import { useAdmin } from '../../context/AdminContext';
import { EMERGENCIAS } from '../../data/directivaMock';
import { fecha } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';
import SelloCargo from '../../components/marca/SelloCargo';

const vacio = { nombre: '', detalle: '', telefono: '', horario: '' };

function DialogoContacto({ contacto, onClose, onGuardar }) {
  const [form, setForm] = useState(contacto ?? vacio);
  const valido = form.nombre.trim() && form.telefono.trim();
  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const guardar = (e) => {
    e.preventDefault();
    if (!valido) return;
    onGuardar({ ...form, nombre: form.nombre.trim(), detalle: form.detalle.trim(), telefono: form.telefono.trim(), horario: form.horario.trim() });
    onClose();
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={guardar}>
      <DialogTitle>{contacto ? 'Editar contacto' : 'Nuevo contacto'}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField required label="Nombre" name="nombre" value={form.nombre} onChange={cambiar} placeholder="Ej: Gasfitería Don Hugo" />
        <TextField label="Para qué sirve" name="detalle" value={form.detalle} onChange={cambiar} placeholder="Ej: Gasfíter de confianza del condominio" />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField required label="Teléfono" name="telefono" type="tel" value={form.telefono} onChange={cambiar} placeholder="+56 9 1234 5678" />
          <TextField label="Horario" name="horario" value={form.horario} onChange={cambiar} placeholder="Ej: Lunes a viernes" />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}

// Directorio oficial que ven los residentes en la app: directiva vigente, contactos útiles y emergencias.
export default function Directorio() {
  const { comunidad } = useSesion();
  const { contactos, acciones } = useDirectiva();
  const { directiva } = useAdmin();
  const [edicion, setEdicion] = useState(null); // { contacto } o { contacto: null }

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Directorio oficial"
        descripcion="Esta información aparece en la app de los residentes. Mantenla al día cuando cambie un proveedor o un número."
      />

      <Box sx={{ display: 'grid', gap: 2.5 }}>
        <Tarjeta titulo="Directiva vigente" extra="Los cargos los asigna Administración">
          {directiva.length === 0 ? (
            <Typography color="text.secondary">Todavía no hay cargos asignados en esta comunidad.</Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
              {directiva.map((m) => (
                <Box key={`${m.cargo}-${m.idUsuario}`} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2.5, display: 'grid', gap: 0.75, alignContent: 'start' }}>
                  <SelloCargo cargo={m.cargo} conTexto sx={{ fontSize: '0.85rem', color: 'text.secondary' }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>{m.nombre}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {m.unidad}{m.hasta ? ` · hasta ${fecha(m.hasta)} ${m.hasta.slice(0, 4)}` : ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Contactos de la comunidad"
          extra={<Button size="small" startIcon={<AddIcon />} onClick={() => setEdicion({ contacto: null })}>Agregar contacto</Button>}
        >
          {contactos.length === 0 && <Typography color="text.secondary">Agrega la administración, proveedores de confianza o el plan cuadrante del sector.</Typography>}
          <Box sx={{ display: 'grid' }}>
            {contactos.map((k, i) => (
              <Box key={k.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', sm: '1fr 200px auto' }, gap: { xs: 1, sm: 2 }, alignItems: 'center', py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
                <Box sx={{ minWidth: 0, opacity: k.visible ? 1 : 0.6 }}>
                  <Typography sx={{ fontWeight: 700 }}>{k.nombre}</Typography>
                  <Typography variant="body2" color="text.secondary">{[k.detalle, k.horario].filter(Boolean).join(' · ')}</Typography>
                  <Typography variant="body2" sx={{ display: { sm: 'none' }, fontVariantNumeric: 'tabular-nums' }}>{k.telefono}</Typography>
                </Box>
                <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontVariantNumeric: 'tabular-nums', opacity: k.visible ? 1 : 0.6 }}>{k.telefono}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title={k.visible ? 'Visible en la app' : 'Oculto en la app'}>
                    <Switch checked={k.visible} inputProps={{ 'aria-label': `${k.nombre} visible en la app` }} onChange={(e) => acciones.guardarContacto({ ...k, visible: e.target.checked })} />
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton aria-label={`Editar ${k.nombre}`} onClick={() => setEdicion({ contacto: k })}><EditIcon /></IconButton>
                  </Tooltip>
                  <Tooltip title="Quitar">
                    <IconButton aria-label={`Quitar ${k.nombre}`} onClick={() => acciones.eliminarContacto(k)}><QuitarIcon /></IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        </Tarjeta>

        <Tarjeta titulo="Emergencias" extra="Siempre visibles en la app">
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
            {EMERGENCIAS.map((e) => (
              <Paper key={e.telefono} variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'grid' }}>
                <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.6rem', lineHeight: 1.1 }}>{e.telefono}</Typography>
                <Typography variant="body2" color="text.secondary">{e.nombre}</Typography>
              </Paper>
            ))}
          </Box>
        </Tarjeta>
      </Box>

      {edicion && (
        <DialogoContacto
          key={edicion.contacto?.id ?? 'nuevo'} contacto={edicion.contacto}
          onClose={() => setEdicion(null)} onGuardar={acciones.guardarContacto}
        />
      )}
    </Box>
  );
}
