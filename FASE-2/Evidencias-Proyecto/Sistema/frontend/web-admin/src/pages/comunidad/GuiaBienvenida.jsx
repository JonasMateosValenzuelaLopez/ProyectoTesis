import { useState } from 'react';
import {
  Box, Button, Checkbox, FormControlLabel, FormGroup, FormLabel, Link, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext';
import { useDirectiva } from '../../context/DirectivaContext';
import { DIAS } from '../../data/guiaMock';
import { EMERGENCIAS } from '../../data/directivaMock';
import { tieneModulo } from '../../config/modulos';
import { TODAS_LAS_RUTAS, puedeVer } from '../../config/navegacion';
import { cargosDe } from '../../config/roles';
import { roles } from '../../tokens';
import { fecha, nombreCorto } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';

const lista = (x) => (x.length < 2 ? x.join('') : `${x.slice(0, -1).join(', ')} y ${x[x.length - 1]}`);
const texto = (v) => v ?? '';
const nulo = (v) => v.trim() || null;
const hora = (t) => t.slice(0, 5);

// Lo que el residente ve en el teléfono, paso por paso (misma lógica que la pantalla de la app)
function VistaPrevia({ paso, form, dias, comunidad, espacios, contactos, firma }) {
  const t = useTheme().palette.marca;
  const portada = paso === 'bienvenida';
  const etiqueta = { fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' };
  const caja = { bgcolor: t.surface, borderRadius: 2, p: 1.5, display: 'grid', gap: 0.75 };
  return (
    <Box
      role="img" aria-label={`Vista previa en el teléfono: ${paso}`}
      sx={{ width: 280, height: 540, border: 8, borderColor: t.ink, borderRadius: '34px', bgcolor: portada ? t.sidebar : t.paper, color: portada ? t.sidebarStrong : t.ink, p: 2.25, display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'hidden', boxSizing: 'border-box' }}
    >
      {portada && (
        <>
          <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', mt: 3 }}>Hola, vecino</Typography>
          <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '112%', fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.1 }}>Te damos la bienvenida a {comunidad.nombre}</Typography>
          {form.mensaje.trim() && (
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.3)', borderRadius: 2, p: 1.5, display: 'grid', gap: 0.75 }}>
              <Typography sx={{ fontSize: '0.85rem', whiteSpace: 'pre-line' }}>«{form.mensaje.trim()}»</Typography>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: t.sidebarInk }}>{firma}</Typography>
            </Box>
          )}
        </>
      )}
      {paso === 'basura' && (
        <>
          <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '112%', fontWeight: 800, fontSize: '1.35rem' }}>Basura y reciclaje</Typography>
          {dias.length > 0 && (
            <Box sx={caja}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                {DIAS.map((d) => (
                  <Box key={d} sx={{ height: 30, borderRadius: 1, display: 'grid', placeItems: 'center', fontSize: '0.75rem', fontWeight: dias.includes(d) ? 700 : 400, bgcolor: dias.includes(d) ? t.bronze : t.inkSoft, color: dias.includes(d) ? t.surface : t.ink2 }}>{d[0]}</Box>
                ))}
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{dias.length === 7 ? 'Todos los días' : lista(dias)}{form.basura_horario.trim() ? ` · ${form.basura_horario.trim().toLowerCase()}` : ''}</Typography>
              {form.basura_lugar.trim() && <Typography sx={{ fontSize: '0.8rem', color: t.ink2 }}>{form.basura_lugar.trim()}</Typography>}
            </Box>
          )}
          {form.reciclaje_lugar.trim() && (
            <Box sx={{ ...caja, bgcolor: t.patinaSoft }}>
              <Typography sx={{ ...etiqueta, color: t.patina }}>Reciclaje</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{form.reciclaje_lugar.trim()}</Typography>
              {form.reciclaje_detalle.trim() && <Typography sx={{ fontSize: '0.8rem' }}>{form.reciclaje_detalle.trim()}</Typography>}
            </Box>
          )}
          {!dias.length && !form.reciclaje_lugar.trim() && !form.basura_lugar.trim() && <Typography sx={{ fontSize: '0.85rem', color: t.ink2 }}>Sin datos: este paso no aparece en la app.</Typography>}
        </>
      )}
      {paso === 'espacios' && (
        <>
          <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '112%', fontWeight: 800, fontSize: '1.35rem' }}>Espacios comunes</Typography>
          {espacios.length === 0 && <Typography sx={{ fontSize: '0.85rem', color: t.ink2 }}>Sin espacios o sin módulo de reservas: este paso no aparece en la app.</Typography>}
          {espacios.map((e) => (
            <Box key={e.id_espacio} sx={caja}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{e.nombre}{e.capacidad ? ` · hasta ${e.capacidad}` : ''}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: t.ink2 }}>{(e.espacios_bloques ?? []).map((b) => `${hora(b.hora_inicio)}–${hora(b.hora_fin)}`).join(' · ')}</Typography>
            </Box>
          ))}
        </>
      )}
      {paso === 'contactos' && (
        <>
          <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '112%', fontWeight: 800, fontSize: '1.35rem' }}>Contactos útiles</Typography>
          {contactos.map((k) => (
            <Box key={k.id_contacto} sx={caja}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{k.nombre}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: t.ink2 }}>{k.telefono}</Typography>
            </Box>
          ))}
          <Typography sx={{ fontSize: '0.75rem', color: t.ink2 }}>Emergencias: {EMERGENCIAS.map((e) => e.telefono).join(', ')}</Typography>
        </>
      )}
    </Box>
  );
}

// Guía de bienvenida (P8): lo que ven los residentes nuevos la primera vez que entran a la app.
// Aquí se editan basura, reciclaje y el mensaje; espacios y contactos salen de sus propias páginas.
export default function GuiaBienvenida() {
  const { comunidad } = useSesion();
  // Al cambiar de comunidad el formulario parte de nuevo con su guía
  return <Editor key={comunidad.id_red} />;
}

function Editor() {
  const { comunidad, cuentas, cargo } = useSesion();
  const { guia, contactos, acciones } = useDirectiva();
  const inicial = {
    mensaje: texto(guia.mensaje), basura_horario: texto(guia.basura_horario), basura_lugar: texto(guia.basura_lugar),
    reciclaje_lugar: texto(guia.reciclaje_lugar), reciclaje_detalle: texto(guia.reciclaje_detalle),
  };
  const diasIniciales = guia.basura_dias ? guia.basura_dias.split(',') : [];
  const [form, setForm] = useState(inicial);
  const [dias, setDias] = useState(diasIniciales);
  const [paso, setPaso] = useState('bienvenida');

  const espacios = tieneModulo(comunidad, 'reservas') ? (comunidad.espacios_comunes ?? []).filter((e) => e.estado) : [];
  const visibles = contactos.filter((k) => k.visible === 1);
  const autor = cuentas.find((c) => c.id_usuario === guia.id_usuario_actualiza);
  const cargoAutor = autor ? cargosDe(autor, comunidad.id_red)[0] : null;
  const firma = autor ? `${nombreCorto(autor)}${cargoAutor ? ` · ${roles[cargoAutor]?.label ?? ''}` : ''}` : 'La administración';
  const ordenados = DIAS.filter((d) => dias.includes(d));
  const cambio = JSON.stringify([form, ordenados]) !== JSON.stringify([inicial, DIAS.filter((d) => diasIniciales.includes(d))]);

  // Enlace a la página donde se edita, solo si este cargo la ve en su menú
  const enlace = (ruta, textoEnlace) => {
    const item = TODAS_LAS_RUTAS.find((i) => i.ruta === ruta);
    return item && puedeVer(item, cargo, comunidad) ? <Link component={RouterLink} to={ruta}>{textoEnlace}</Link> : null;
  };
  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const alternar = (d) => setDias((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]));
  const guardar = (e) => {
    e.preventDefault();
    acciones.guardarGuia({
      mensaje: nulo(form.mensaje), basura_dias: ordenados.length ? ordenados.join(',') : null, basura_horario: nulo(form.basura_horario),
      basura_lugar: nulo(form.basura_lugar), reciclaje_lugar: nulo(form.reciclaje_lugar), reciclaje_detalle: nulo(form.reciclaje_detalle),
    });
  };

  return (
    <Box component="form" onSubmit={guardar} sx={{ maxWidth: 1180 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Guía de bienvenida"
        descripcion="Los residentes la ven al entrar por primera vez a la app con su vivienda, y después la encuentran en Perfil."
        acciones={<Button type="submit" variant="contained" disabled={!cambio}>Guardar cambios</Button>}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
        <Box sx={{ flex: '1 1 460px', minWidth: 0, display: 'grid', gap: 2.5 }}>
          <Tarjeta titulo="1. Mensaje de bienvenida" extra={guia.fecha_actualizacion ? `Lo firma quien guarda · última vez ${fecha(guia.fecha_actualizacion)}` : 'Lo firma quien guarda'}>
            <TextField
              name="mensaje" label="Mensaje (opcional)" value={form.mensaje} onChange={cambiar} onFocus={() => setPaso('bienvenida')} multiline minRows={3}
              placeholder="Ej: Somos 15 casas y nos gusta conocernos…" slotProps={{ htmlInput: { maxLength: 500 } }} helperText={`${form.mensaje.length} de 500`}
            />
          </Tarjeta>

          <Tarjeta titulo="2. Basura y reciclaje" extra="Si no llenas nada, este paso no aparece">
            <Box component="fieldset" sx={{ border: 0, p: 0, m: 0 }}>
              <FormLabel component="legend" sx={{ mb: 0.5 }}>Días de retiro</FormLabel>
              <FormGroup row>
                {DIAS.map((d) => (
                  <FormControlLabel key={d} label={d} control={<Checkbox checked={dias.includes(d)} onChange={() => { alternar(d); setPaso('basura'); }} />} />
                ))}
              </FormGroup>
              <Typography variant="body2" color="text.secondary">
                {dias.length > 0 && dias.length < 7 ? 'Esos días los residentes ven en Inicio «Hoy pasa el camión de la basura».' : dias.length === 7 ? 'Todos los días: no se muestra aviso en Inicio.' : 'Sin días marcados no hay aviso en Inicio.'}
              </Typography>
            </Box>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <TextField name="basura_horario" label="Horario" value={form.basura_horario} onChange={cambiar} onFocus={() => setPaso('basura')} placeholder="Ej: Desde las 21:00" slotProps={{ htmlInput: { maxLength: 60 } }} />
              <TextField name="basura_lugar" label="Dónde se deja" value={form.basura_lugar} onChange={cambiar} onFocus={() => setPaso('basura')} placeholder={comunidad.tipo === 'Edificio' ? 'Ej: Shaft de tu piso' : 'Ej: Contenedor de la entrada'} slotProps={{ htmlInput: { maxLength: 150 } }} />
              <TextField name="reciclaje_lugar" label="Dónde se recicla" value={form.reciclaje_lugar} onChange={cambiar} onFocus={() => setPaso('basura')} placeholder="Ej: Punto limpio junto al quincho" slotProps={{ htmlInput: { maxLength: 150 } }} />
              <TextField name="reciclaje_detalle" label="Qué recibe" value={form.reciclaje_detalle} onChange={cambiar} onFocus={() => setPaso('basura')} placeholder="Ej: Vidrio, latas y cartón" slotProps={{ htmlInput: { maxLength: 255 } }} />
            </Box>
          </Tarjeta>

          <Tarjeta titulo="3 y 4. Se toman de otras páginas">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Typography>
                Espacios comunes: {espacios.length ? <b>{lista(espacios.map((e) => e.nombre))}</b> : tieneModulo(comunidad, 'reservas') ? 'ninguno cargado' : 'el módulo de reservas está apagado'}
              </Typography>
              {enlace('/panel/reservas', 'Ver en Reservas')}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', borderTop: 1, borderColor: 'divider', pt: 2 }}>
              <Typography>Contactos visibles: <b>{visibles.length}</b> más los números de emergencia</Typography>
              {enlace('/panel/directorio', 'Editar en Directorio')}
            </Box>
          </Tarjeta>
        </Box>

        <Box component="aside" aria-label="Vista previa" sx={{ flex: '0 1 300px', display: 'grid', gap: 1.5, justifyItems: 'center', position: { md: 'sticky' }, top: { md: 88 } }}>
          <Typography variant="overline" color="text.secondary">Así lo ve el residente</Typography>
          <ToggleButtonGroup size="small" exclusive value={paso} onChange={(_, v) => v && setPaso(v)} aria-label="Paso de la guía">
            <ToggleButton value="bienvenida">Inicio</ToggleButton>
            <ToggleButton value="basura">Basura</ToggleButton>
            <ToggleButton value="espacios">Espacios</ToggleButton>
            <ToggleButton value="contactos">Contactos</ToggleButton>
          </ToggleButtonGroup>
          <VistaPrevia paso={paso} form={form} dias={ordenados} comunidad={comunidad} espacios={espacios} contactos={visibles} firma={firma} />
        </Box>
      </Box>
    </Box>
  );
}
