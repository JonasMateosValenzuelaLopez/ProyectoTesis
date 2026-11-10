import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, IconButton, InputAdornment, Paper, Step, StepLabel, Stepper, Switch, TextField, Typography,
} from '@mui/material';
import { Add as AddIcon, CheckCircleOutlined as ListoIcon } from '@mui/icons-material';
import { crearComunidad } from '../../api/plataforma';
import { ID_ROL_POR_NOMBRE, RolUsuario } from '../../config/roles';
import { DETALLE_MODULOS, MODULOS, MODULOS_POR_TIPO } from '../../config/modulos';
import { errorEstructura, estructuraPara, generarUnidades } from '../../utils/unidades';
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
// Límites de la API (crear-comunidad.dto.ts)
const MAX_ESPACIOS = 20;
const MAX_NOMBRE_ESPACIO = 100;
// Campos del responsable con los nombres del backend (ResponsableDto)
const RESP_VACIO = { nombre: '', primerApellido: '', segundoApellido: '', identificador: '', correo: '' };

function PasoUnidades({ tipo, e, cambiar, unidades, vista, error }) {
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
      {error && <Alert severity="warning" variant="outlined">{error}</Alert>}
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
    const nombre = espacio.trim().replace(/\s+/g, ' ').slice(0, MAX_NOMBRE_ESPACIO);
    if (nombre && espacios.length < MAX_ESPACIOS && !espacios.some((x) => x.toLowerCase() === nombre.toLowerCase())) setEspacios([...espacios, nombre]);
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
              checked={modulos.includes(clave)} slotProps={{ input: { 'aria-label': nombre } }}
              onChange={(ev) => setModulos(ev.target.checked ? [...modulos, clave] : modulos.filter((m) => m !== clave))}
            />
          </Box>
        ))}
      </Paper>
      <Tarjeta titulo="Espacios comunes" extra={`Hasta ${MAX_ESPACIOS}. Sus horarios se definen después en Datos de la comunidad`}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {espacios.map((x) => <Chip key={x} label={x} onDelete={() => setEspacios(espacios.filter((y) => y !== x))} />)}
          {espacios.length === 0 && <Typography color="text.secondary">Sin espacios comunes.</Typography>}
        </Box>
        <TextField
          size="small" label="Agregar espacio" value={espacio} disabled={espacios.length >= MAX_ESPACIOS} onChange={(ev) => setEspacio(ev.target.value)}
          onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); agregar(); } }} sx={{ maxWidth: 360 }}
          slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton aria-label="Agregar espacio" onClick={agregar} edge="end"><AddIcon /></IconButton></InputAdornment> } }}
        />
      </Tarjeta>
    </Box>
  );
}

// Asistente para dar de alta una comunidad nueva y su primer responsable (POST plataforma/comunidades).
// La API crea las unidades, los módulos, los espacios y la cuenta del responsable (o usa la que ya tiene),
// y le envía por correo el enlace para crear su contraseña.
export default function NuevaComunidad() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState({ nombre: '', direccion: '', tipo: '' });
  const [e, setE] = useState(ESTRUCTURA);
  const [modulos, setModulos] = useState([]);
  const [espacios, setEspacios] = useState([]);
  const [resp, setResp] = useState(RESP_VACIO);
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorApi, setErrorApi] = useState(null);
  const [creada, setCreada] = useState(null);

  const tipo = datos.tipo;
  const unidades = generarUnidades(tipo, e);
  const errorUnidades = tipo ? errorEstructura(tipo, e) : null;
  const vista = { tipo, unidades };
  // Como la API: con administración externa el responsable es Administrador; si no, Presidente
  const cargo = modulos.includes('administrador_externo') ? RolUsuario.ADMINISTRADOR : RolUsuario.PRESIDENTE;

  const errores = [
    !datos.nombre.trim() || !datos.direccion.trim() || !tipo,
    !!errorUnidades || unidades.length === 0,
    false,
    !resp.nombre.trim() || !resp.primerApellido.trim() || !rutValido(resp.identificador) || !correoValido(resp.correo.trim()),
  ];

  const elegirTipo = (t) => {
    // Al cambiar de tipo se cargan los módulos y espacios sugeridos para ese tipo
    if (t !== tipo) {
      setModulos(MODULOS_POR_TIPO[t]);
      setEspacios(ESPACIOS_POR_TIPO[t]);
    }
    setDatos({ ...datos, tipo: t });
  };

  const crear = async () => {
    setEnviando(true);
    setErrorApi(null);
    try {
      const resumen = await crearComunidad({
        nombre: datos.nombre.trim().replace(/\s+/g, ' '),
        direccion: datos.direccion.trim(),
        tipo,
        estructura: estructuraPara(tipo, e),
        modulos,
        espacios,
        responsable: {
          identificador: formatearRut(resp.identificador),
          nombre: resp.nombre.trim(),
          primerApellido: resp.primerApellido.trim(),
          ...(resp.segundoApellido.trim() ? { segundoApellido: resp.segundoApellido.trim() } : {}),
          correo: resp.correo.trim().toLowerCase(),
        },
      });
      setCreada(resumen);
    } catch (err) {
      setErrorApi(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const siguiente = () => {
    setIntento(true);
    if (errores[paso]) return;
    setIntento(false);
    if (paso < PASOS.length - 1) setPaso(paso + 1);
    else crear();
  };

  const cambiarDatos = (ev) => setDatos({ ...datos, [ev.target.name]: ev.target.value });
  const cambiarE = (ev) => setE({ ...e, [ev.target.name]: ev.target.value });
  const cambiarResp = (ev) => { setResp({ ...resp, [ev.target.name]: ev.target.value }); setErrorApi(null); };
  const marcar = (malo) => intento && malo;

  if (creada) {
    const r = creada.responsable;
    return (
      <Box sx={{ maxWidth: 720 }}>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 1.5, display: 'grid', gap: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', '& svg': { fontSize: 36, color: 'success.main' } }}>
            <ListoIcon />
            <Typography variant="h4" component="h1">{creada.nombre} quedó creada</Typography>
          </Box>
          <Typography color="text.secondary">
            {creada.totalUnidades.toLocaleString('es-CL')} unidades y {creada.modulos.length} módulos.
            {r && ` ${r.nombre} entra como ${roles[ID_ROL_POR_NOMBRE[r.cargo]]?.label.toLowerCase() ?? r.cargo}.`}
          </Typography>
          {creada.correoEnviado ? (
            <Alert severity="success" variant="outlined">
              Enviamos a {r?.correo} el correo de bienvenida. Si su cuenta es nueva, trae el enlace para crear su contraseña (válido por 3 días); si ya tenía cuenta, entra con la que usa.
            </Alert>
          ) : (
            <Alert severity="warning" variant="outlined">
              La comunidad quedó creada, pero el correo para {r?.correo} no se pudo enviar. Sin servidor de correo, en desarrollo el backend muestra el enlace en su consola.
            </Alert>
          )}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={() => navigate(`/plataforma/comunidades/${creada.idRed}`)}>Ver la ficha</Button>
            <Button onClick={() => { setCreada(null); setPaso(0); setDatos({ nombre: '', direccion: '', tipo: '' }); setE(ESTRUCTURA); setModulos([]); setEspacios([]); setResp(RESP_VACIO); }}>Crear otra comunidad</Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  const rutMal = resp.identificador.length > 3 && !rutValido(resp.identificador);
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
              <TextField label="Nombre de la comunidad" name="nombre" value={datos.nombre} onChange={cambiarDatos} placeholder="Condominio Los Robles" error={marcar(!datos.nombre.trim())} helperText={marcar(!datos.nombre.trim()) ? 'Escribe el nombre' : ' '} slotProps={{ htmlInput: { maxLength: 100 } }} />
              <TextField label="Dirección" name="direccion" value={datos.direccion} onChange={cambiarDatos} placeholder="Av. Los Robles 1200, Temuco" error={marcar(!datos.direccion.trim())} helperText={marcar(!datos.direccion.trim()) ? 'Escribe la dirección' : ' '} slotProps={{ htmlInput: { maxLength: 150 } }} />
            </Box>
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>Tipo de comunidad</Typography>
              <ElegirTipo valor={tipo} onChange={elegirTipo} />
              {marcar(!tipo) && <Typography variant="body2" color="error.main">Elige el tipo de comunidad.</Typography>}
            </Box>
          </Box>
        )}
        {paso === 1 && <PasoUnidades tipo={tipo} e={e} cambiar={cambiarE} unidades={unidades} vista={vista} error={errorUnidades} />}
        {paso === 2 && <PasoModulos tipo={tipo} modulos={modulos} setModulos={setModulos} espacios={espacios} setEspacios={setEspacios} />}
        {paso === 3 && (
          <Box sx={{ display: 'grid', gap: 2.5 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <SelloCargo cargo={cargo} size={32} />
              <Typography>
                {cargo === RolUsuario.ADMINISTRADOR
                  ? <>La comunidad tiene <b>administrador externo</b>, así que el primer responsable entra como <b>Administrador/a</b>.</>
                  : <>Sin administrador externo, el primer responsable entra como <b>Presidente/a</b> y ve también las opciones de administración.</>}
              </Typography>
            </Paper>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <TextField label="Nombre" name="nombre" value={resp.nombre} onChange={cambiarResp} error={marcar(!resp.nombre.trim())} helperText={marcar(!resp.nombre.trim()) ? 'Escribe el nombre' : ' '} slotProps={{ htmlInput: { maxLength: 50 } }} />
              <TextField label="Primer apellido" name="primerApellido" value={resp.primerApellido} onChange={cambiarResp} error={marcar(!resp.primerApellido.trim())} helperText={marcar(!resp.primerApellido.trim()) ? 'Escribe el apellido' : ' '} slotProps={{ htmlInput: { maxLength: 50 } }} />
              <TextField label="Segundo apellido" name="segundoApellido" value={resp.segundoApellido} onChange={cambiarResp} helperText="Opcional" slotProps={{ htmlInput: { maxLength: 50 } }} />
              <TextField
                label="RUT" name="identificador" value={resp.identificador} onChange={cambiarResp} placeholder="12.345.678-5"
                onBlur={() => rutValido(resp.identificador) && setResp({ ...resp, identificador: formatearRut(resp.identificador) })}
                error={rutMal || marcar(!rutValido(resp.identificador))}
                helperText={rutMal || marcar(!rutValido(resp.identificador)) ? 'RUT no válido' : 'Si ya tiene cuenta en EntreCasas, se le suma esta comunidad'}
              />
              <TextField label="Correo" name="correo" type="email" value={resp.correo} onChange={cambiarResp} error={marcar(!correoValido(resp.correo.trim()))} helperText={marcar(!correoValido(resp.correo.trim())) ? 'Revisa el correo' : 'Aquí le llega el enlace para definir su clave'} slotProps={{ htmlInput: { maxLength: 100 } }} />
            </Box>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.default' }}>
              <Typography sx={{ fontWeight: 700 }}>{datos.nombre || 'Comunidad sin nombre'} · {tipo}</Typography>
              <Typography variant="body2" color="text.secondary">
                {datos.direccion} · {unidades.length.toLocaleString('es-CL')} unidades · {modulos.length} módulos · {espacios.length ? espacios.join(', ') : 'sin espacios comunes'}
              </Typography>
            </Paper>
            {errorApi && <Alert severity="error">{errorApi}</Alert>}
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Button onClick={() => (paso ? setPaso(paso - 1) : navigate('/plataforma'))} disabled={enviando}>{paso ? 'Atrás' : 'Cancelar'}</Button>
          <Button type="submit" variant="contained" loading={enviando}>{paso === PASOS.length - 1 ? 'Crear comunidad' : 'Siguiente'}</Button>
        </Box>
      </Box>
    </Box>
  );
}
