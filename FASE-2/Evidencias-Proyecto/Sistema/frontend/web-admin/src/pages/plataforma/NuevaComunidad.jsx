import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, IconButton, InputAdornment, Paper, Step, StepLabel, Stepper, Switch, TextField, Typography,
} from '@mui/material';
import { Add as AddIcon, CheckCircleOutlined as ListoIcon } from '@mui/icons-material';
import { usePlataforma } from '../../context/PlataformaContext';
import { useSesion } from '../../context/SesionContext';
import { DETALLE_MODULOS, MODULOS, MODULOS_POR_TIPO } from '../../config/modulos';
import { CLAVE_PRUEBA } from '../../data/cuentasDemo';
import { generarEstructura } from '../../utils/unidades';
import { formatearRut, rutValido } from '../../utils/rut';
import { roles } from '../../tokens';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';
import PlanoComunidad from '../../components/marca/PlanoComunidad';
import SelloCargo from '../../components/marca/SelloCargo';
import ElegirTipo from '../../components/plataforma/ElegirTipo';

const PASOS = ['Datos', 'Unidades', 'Módulos y espacios', 'Responsable'];
const ESPACIOS_POR_TIPO = { Edificio: ['Quincho', 'Sala multiuso'], Condominio: ['Quincho'], Villa: ['Sede vecinal'] };
const ESTRUCTURA = { torre: 'A', pisos: 8, porPiso: 4, norte: 10, sur: 10, manzanas: 3, casasPorManzana: 20 };
const correoValido = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);

function PasoUnidades({ tipo, e, cambiar, unidades, vista }) {
  const campo = (name, label, extra = {}) => (
    <TextField label={label} name={name} value={e[name]} onChange={cambiar} type={name === 'torre' ? 'text' : 'number'} slotProps={{ htmlInput: { min: 0 } }} {...extra} />
  );
  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Typography color="text.secondary">
        {tipo === 'Edificio' && 'Se crea un departamento por número en cada piso: 4 deptos en el piso 3 generan 301, 302, 303 y 304. Otras torres se agregan después desde Unidades.'}
        {tipo === 'Condominio' && 'Las casas se numeran seguidas: primero las de un lado del pasaje y luego las del otro.'}
        {tipo === 'Villa' && 'Cada manzana lleva una letra (A, B, C…) y las casas se numeran seguidas de una manzana a la otra.'}
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
        {tipo === 'Edificio' && <>{campo('torre', 'Torre', { slotProps: { htmlInput: { maxLength: 3 } } })}{campo('pisos', 'Pisos')}{campo('porPiso', 'Deptos por piso')}</>}
        {tipo === 'Condominio' && <>{campo('norte', 'Casas en el lado norte')}{campo('sur', 'Casas en el lado sur')}</>}
        {tipo === 'Villa' && <>{campo('manzanas', 'Manzanas')}{campo('casasPorManzana', 'Casas por manzana')}</>}
      </Box>
      <Tarjeta titulo="Así quedará el plano" extra={unidades.length === 1 ? '1 unidad' : `${unidades.length.toLocaleString('es-CL')} unidades`}>
        <PlanoComunidad comunidad={vista} />
      </Tarjeta>
    </Box>
  );
}

function PasoModulos({ tipo, modulos, setModulos, espacios, setEspacios }) {
  const [espacio, setEspacio] = useState('');
  const sugeridos = MODULOS_POR_TIPO[tipo];
  const agregar = () => {
    const nombre = espacio.trim();
    if (nombre && !espacios.some((x) => x.toLowerCase() === nombre.toLowerCase())) setEspacios([...espacios, nombre]);
    setEspacio('');
  };
  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Paper variant="outlined" sx={{ borderRadius: 1.5 }}>
        {Object.entries(MODULOS).map(([clave, nombre], i) => (
          <Box key={clave} component="label" sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, alignItems: 'center', px: 2.5, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider', cursor: 'pointer' }}>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 700 }}>{nombre}</Typography>
                {!sugeridos.includes(clave) && <Chip size="small" variant="outlined" label={`Poco común en ${tipo.toLowerCase()}s`} />}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '62ch' }}>{DETALLE_MODULOS[clave]}</Typography>
            </Box>
            <Switch
              checked={modulos.includes(clave)} inputProps={{ 'aria-label': nombre }}
              onChange={(ev) => setModulos(ev.target.checked ? [...modulos, clave] : modulos.filter((m) => m !== clave))}
            />
          </Box>
        ))}
      </Paper>
      <Tarjeta titulo="Espacios comunes" extra="Se pueden reservar si el módulo de reservas está activo">
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {espacios.map((x) => <Chip key={x} label={x} onDelete={() => setEspacios(espacios.filter((y) => y !== x))} />)}
          {espacios.length === 0 && <Typography color="text.secondary">Sin espacios comunes.</Typography>}
        </Box>
        <TextField
          size="small" label="Agregar espacio" value={espacio} onChange={(ev) => setEspacio(ev.target.value)}
          onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); agregar(); } }} sx={{ maxWidth: 360 }}
          slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton aria-label="Agregar espacio" onClick={agregar} edge="end"><AddIcon /></IconButton></InputAdornment> } }}
        />
      </Tarjeta>
    </Box>
  );
}

// Asistente para dar de alta una comunidad nueva y su primer responsable.
export default function NuevaComunidad() {
  const navigate = useNavigate();
  const { acciones } = usePlataforma();
  const { cuentas } = useSesion();
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState({ nombre: '', direccion: '', tipo: '' });
  const [e, setE] = useState(ESTRUCTURA);
  const [modulos, setModulos] = useState([]);
  const [espacios, setEspacios] = useState([]);
  const [resp, setResp] = useState({ nombre: '', apellido: '', rut: '', correo: '' });
  const [intento, setIntento] = useState(false);
  const [creada, setCreada] = useState(null);

  const tipo = datos.tipo;
  const unidades = tipo ? generarEstructura(tipo, e) : [];
  const vista = { tipo, unidades, espaciosComunes: espacios, calle: 'Pasaje', calles: [] };
  const cargo = modulos.includes('administrador_externo') ? 'administrador' : 'presidente';
  const rutUsado = rutValido(resp.rut) && cuentas.some((c) => c.rut === formatearRut(resp.rut));

  const errores = [
    !datos.nombre.trim() || !datos.direccion.trim() || !tipo,
    unidades.length === 0,
    false,
    !resp.nombre.trim() || !resp.apellido.trim() || !rutValido(resp.rut) || rutUsado || !correoValido(resp.correo),
  ];

  const elegirTipo = (t) => {
    // Al cambiar de tipo se cargan los módulos y espacios sugeridos para ese tipo
    if (t !== tipo) {
      setModulos(MODULOS_POR_TIPO[t]);
      setEspacios(ESPACIOS_POR_TIPO[t]);
    }
    setDatos({ ...datos, tipo: t });
  };

  const siguiente = () => {
    setIntento(true);
    if (errores[paso]) return;
    setIntento(false);
    if (paso < PASOS.length - 1) {
      setPaso(paso + 1);
      return;
    }
    const red = {
      nombre: datos.nombre.trim(), tipo, direccion: datos.direccion.trim(), modulos, unidades, espaciosComunes: espacios,
      ...(tipo === 'Condominio' ? { calle: 'Pasaje' } : {}), ...(tipo === 'Villa' ? { calles: [] } : {}),
    };
    const responsable = { nombre: resp.nombre.trim(), apellido: resp.apellido.trim(), rut: formatearRut(resp.rut), correo: resp.correo.trim(), cargo };
    const id = acciones.crear(red, responsable);
    setCreada({ id, red, responsable });
  };

  const cambiarDatos = (ev) => setDatos({ ...datos, [ev.target.name]: ev.target.value });
  const cambiarE = (ev) => setE({ ...e, [ev.target.name]: ev.target.value });
  const cambiarResp = (ev) => setResp({ ...resp, [ev.target.name]: ev.target.value });
  const marcar = (malo) => intento && malo;

  if (creada) {
    const r = creada.responsable;
    return (
      <Box sx={{ maxWidth: 720 }}>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 1.5, display: 'grid', gap: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', '& svg': { fontSize: 36, color: 'success.main' } }}>
            <ListoIcon />
            <Typography variant="h4" component="h1">{creada.red.nombre} quedó creada</Typography>
          </Box>
          <Typography color="text.secondary">
            {creada.red.unidades.length.toLocaleString('es-CL')} unidades y {creada.red.modulos.length} módulos. Enviamos a {r.correo} el enlace para que {r.nombre} defina su clave y empiece a invitar a los vecinos.
          </Typography>
          <Box sx={{ display: 'grid', gap: 1, p: 2, borderRadius: 1, bgcolor: 'marca.signalSoft', color: 'marca.signalInk' }}>
            <Typography sx={{ fontWeight: 700 }}>Para probarlo en la demo</Typography>
            <Typography>Cierra sesión y entra con el RUT <b>{r.rut}</b> y la clave <b>{CLAVE_PRUEBA}</b>. Verás el panel de {roles[r.cargo].label.toLowerCase()} de la comunidad recién creada, sin datos.</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={() => navigate(`/plataforma/comunidades/${creada.id}`)}>Ver la ficha</Button>
            <Button onClick={() => { setCreada(null); setPaso(0); setDatos({ nombre: '', direccion: '', tipo: '' }); setE(ESTRUCTURA); setResp({ nombre: '', apellido: '', rut: '', correo: '' }); }}>Crear otra comunidad</Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Encabezado titulo="Nueva comunidad" descripcion="Se crea con sus unidades y su primer responsable. Él invita después a la directiva y a los vecinos." />
      <Stepper activeStep={paso} alternativeLabel sx={{ mb: 3 }}>
        {PASOS.map((p) => <Step key={p}><StepLabel>{p}</StepLabel></Step>)}
      </Stepper>

      <Box component="form" noValidate onSubmit={(ev) => { ev.preventDefault(); siguiente(); }} sx={{ display: 'grid', gap: 3 }}>
        {paso === 0 && (
          <Box sx={{ display: 'grid', gap: 2.5 }}>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <TextField label="Nombre de la comunidad" name="nombre" value={datos.nombre} onChange={cambiarDatos} placeholder="Condominio Los Robles" error={marcar(!datos.nombre.trim())} helperText={marcar(!datos.nombre.trim()) ? 'Escribe el nombre' : ' '} />
              <TextField label="Dirección" name="direccion" value={datos.direccion} onChange={cambiarDatos} placeholder="Av. Los Robles 1200, Temuco" error={marcar(!datos.direccion.trim())} helperText={marcar(!datos.direccion.trim()) ? 'Escribe la dirección' : ' '} />
            </Box>
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>Tipo de comunidad</Typography>
              <ElegirTipo valor={tipo} onChange={elegirTipo} />
              {marcar(!tipo) && <Typography variant="body2" color="error.main">Elige el tipo de comunidad.</Typography>}
            </Box>
          </Box>
        )}
        {paso === 1 && <PasoUnidades tipo={tipo} e={e} cambiar={cambiarE} unidades={unidades} vista={vista} />}
        {paso === 1 && marcar(unidades.length === 0) && <Alert severity="error">Con estos números no se crea ninguna unidad.</Alert>}
        {paso === 2 && <PasoModulos tipo={tipo} modulos={modulos} setModulos={setModulos} espacios={espacios} setEspacios={setEspacios} />}
        {paso === 3 && (
          <Box sx={{ display: 'grid', gap: 2.5 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <SelloCargo cargo={cargo} size={32} />
              <Typography>
                {cargo === 'administrador'
                  ? <>La comunidad tiene <b>administrador externo</b>, así que el primer responsable entra como <b>Administrador</b>.</>
                  : <>Sin administrador externo, el primer responsable entra como <b>Presidente</b> y ve también las opciones de administración.</>}
              </Typography>
            </Paper>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <TextField label="Nombre" name="nombre" value={resp.nombre} onChange={cambiarResp} error={marcar(!resp.nombre.trim())} helperText={marcar(!resp.nombre.trim()) ? 'Escribe el nombre' : ' '} />
              <TextField label="Apellido" name="apellido" value={resp.apellido} onChange={cambiarResp} error={marcar(!resp.apellido.trim())} helperText={marcar(!resp.apellido.trim()) ? 'Escribe el apellido' : ' '} />
              <TextField
                label="RUT" name="rut" value={resp.rut} onChange={cambiarResp} placeholder="12.345.678-5"
                onBlur={() => rutValido(resp.rut) && setResp({ ...resp, rut: formatearRut(resp.rut) })}
                error={rutUsado || marcar(!rutValido(resp.rut)) || (resp.rut.length > 3 && !rutValido(resp.rut))}
                helperText={rutUsado ? 'Este RUT ya tiene cuenta en EntreCasas' : (resp.rut.length > 3 && !rutValido(resp.rut)) || marcar(!rutValido(resp.rut)) ? 'RUT no válido' : ' '}
              />
              <TextField label="Correo" name="correo" type="email" value={resp.correo} onChange={cambiarResp} error={marcar(!correoValido(resp.correo))} helperText={marcar(!correoValido(resp.correo)) ? 'Revisa el correo' : 'Aquí le llega el enlace para definir su clave'} />
            </Box>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.default' }}>
              <Typography sx={{ fontWeight: 700 }}>{datos.nombre || 'Comunidad sin nombre'} · {tipo}</Typography>
              <Typography variant="body2" color="text.secondary">
                {datos.direccion} · {unidades.length.toLocaleString('es-CL')} unidades · {modulos.length} módulos · {espacios.length ? espacios.join(', ') : 'sin espacios comunes'}
              </Typography>
            </Paper>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Button onClick={() => (paso ? setPaso(paso - 1) : navigate('/plataforma'))}>{paso ? 'Atrás' : 'Cancelar'}</Button>
          <Button type="submit" variant="contained">{paso === PASOS.length - 1 ? 'Crear comunidad' : 'Siguiente'}</Button>
        </Box>
      </Box>
    </Box>
  );
}
