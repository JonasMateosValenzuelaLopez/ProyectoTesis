import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box, Button, ButtonBase, Link as MuiLink, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { AddHomeWorkOutlined as NuevaIcon } from '@mui/icons-material';
import { usePlataforma } from '../../context/PlataformaContext';
import { fecha, fechaHora } from '../../utils/formato';
import { roles } from '../../tokens';
import Encabezado from '../../components/ui/Encabezado';
import FranjaKpi from '../../components/ui/FranjaKpi';
import SelloCargo from '../../components/marca/SelloCargo';
import EstadoComunidad from '../../components/plataforma/EstadoComunidad';
import { MODULOS } from '../../config/modulos';

const TIPOS = ['Todos', 'Edificio', 'Condominio', 'Villa'];
const INICIAL_TIPO = { Edificio: 'E', Condominio: 'C', Villa: 'V' };
const TOTAL_MODULOS = Object.keys(MODULOS).length;

// Monograma neutro: la placa de bronce queda solo para las viviendas
function Monograma({ tipo }) {
  return (
    <Box aria-hidden sx={{ width: 36, height: 36, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1, bgcolor: 'primary.light', fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800 }}>
      {INICIAL_TIPO[tipo]}
    </Box>
  );
}

// Todas las comunidades de EntreCasas, con su responsable y su actividad.
export default function Comunidades() {
  const { redes, responsableDe, usuariosDe } = usePlataforma();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');

  const texto = busqueda.trim().toLowerCase();
  const filas = redes
    .map((r) => ({ red: r, responsable: responsableDe(r), personas: usuariosDe(r).filter((u) => u.estado !== 'desactivado').length }))
    .filter(({ red }) => tipo === 'Todos' || red.tipo === tipo)
    .filter(({ red, responsable }) => !texto || [red.nombre, red.direccion, responsable?.nombre].join(' ').toLowerCase().includes(texto))
    .sort((a, b) => b.red.ultimaActividad.localeCompare(a.red.ultimaActividad));

  const activas = redes.filter((r) => r.estado !== 'suspendida');
  const unidades = redes.reduce((s, r) => s + r.unidades.length, 0);
  const personas = redes.reduce((s, r) => s + usuariosDe(r).filter((u) => u.estado !== 'desactivado').length, 0);

  return (
    <Box sx={{ maxWidth: 1300 }}>
      <Encabezado
        titulo="Comunidades"
        descripcion="Cada comunidad tiene sus propios datos, su directiva y sus módulos. Desde aquí se crean y se atiende a su responsable."
        acciones={<Button variant="contained" startIcon={<NuevaIcon />} onClick={() => navigate('/plataforma/nueva')}>Nueva comunidad</Button>}
      />
      <FranjaKpi items={[
        { etiqueta: 'Comunidades activas', valor: activas.length, nota: `de ${redes.length} en total` },
        { etiqueta: 'Unidades', valor: unidades.toLocaleString('es-CL') },
        { etiqueta: 'Personas registradas', valor: personas.toLocaleString('es-CL') },
        { etiqueta: 'Suspendidas', valor: redes.length - activas.length, color: redes.length - activas.length ? 'error.main' : undefined },
      ]} />

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
        <TextField size="small" label="Buscar por nombre, dirección o responsable" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} sx={{ flex: '1 1 280px', maxWidth: 420 }} />
        <TextField select size="small" label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} sx={{ minWidth: 160 }}>
          {TIPOS.map((t) => <MenuItem key={t} value={t}>{t === 'Todos' ? 'Todos los tipos' : t}</MenuItem>)}
        </TextField>
      </Box>

      {/* En pantallas angostas cada comunidad es una fila; la tabla completa queda para escritorio */}
      <Paper variant="outlined" sx={{ display: { xs: 'block', md: 'none' }, borderRadius: 1.5, overflow: 'hidden' }}>
        {filas.map(({ red, responsable, personas: n }, i) => (
          <ButtonBase key={red.id} onClick={() => navigate(`/plataforma/comunidades/${red.id}`)} sx={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 1.5, alignItems: 'start', width: '100%', textAlign: 'left', px: 2, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider', '&:active': { bgcolor: 'action.hover' } }}>
            <Monograma tipo={red.tipo} />
            <Box sx={{ minWidth: 0, display: 'grid', gap: 0.25 }}>
              <Typography sx={{ fontWeight: 700 }}>{red.nombre}</Typography>
              <Typography variant="body2" color="text.secondary">{red.unidades.length} unidades · {n} {n === 1 ? 'persona' : 'personas'}</Typography>
              <Typography variant="body2" color={responsable ? 'text.secondary' : 'error.main'}>
                {responsable ? `${responsable.nombre}, ${roles[responsable.cargo].label.toLowerCase()}` : 'Sin responsable'}
              </Typography>
              <Typography variant="body2" color="text.secondary">Última actividad {fechaHora(red.ultimaActividad)}</Typography>
            </Box>
            <EstadoComunidad estado={red.estado} />
          </ButtonBase>
        ))}
        {filas.length === 0 && <Typography color="text.secondary" sx={{ p: 2 }}>Ninguna comunidad calza con la búsqueda.</Typography>}
      </Paper>

      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 1.5 }}>
        <Table sx={{ minWidth: 820 }}>
          <TableHead>
            <TableRow>
              <TableCell>Comunidad</TableCell>
              <TableCell align="right">Unidades y personas</TableCell>
              <TableCell>Responsable</TableCell>
              <TableCell align="right">Módulos</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Última actividad</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filas.map(({ red, responsable, personas: n }) => (
              <TableRow key={red.id} hover onClick={() => navigate(`/plataforma/comunidades/${red.id}`)} sx={{ cursor: 'pointer' }}>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Monograma tipo={red.tipo} />
                    <Box sx={{ minWidth: 0 }}>
                      {/* El nombre es el enlace: así la fila también se abre con el teclado */}
                      <MuiLink component={RouterLink} to={`/plataforma/comunidades/${red.id}`} color="text.primary" underline="hover" onClick={(e) => e.stopPropagation()} sx={{ fontWeight: 700 }}>{red.nombre}</MuiLink>
                      <Typography variant="body2" color="text.secondary">{red.tipo} · {red.direccion} · desde {fecha(red.creadaEn)}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {red.unidades.length}
                  <Typography variant="body2" color="text.secondary">{n} {n === 1 ? 'persona' : 'personas'}</Typography>
                </TableCell>
                <TableCell>
                  {responsable ? (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <SelloCargo cargo={responsable.cargo} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{responsable.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary">{roles[responsable.cargo].label}</Typography>
                      </Box>
                    </Box>
                  ) : <Typography variant="body2" color="error.main">Sin responsable</Typography>}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{red.modulos.length} de {TOTAL_MODULOS}</TableCell>
                <TableCell><EstadoComunidad estado={red.estado} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fechaHora(red.ultimaActividad)}</TableCell>
              </TableRow>
            ))}
            {filas.length === 0 && (
              <TableRow><TableCell colSpan={6}><Typography color="text.secondary" sx={{ py: 2 }}>Ninguna comunidad calza con la búsqueda.</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
