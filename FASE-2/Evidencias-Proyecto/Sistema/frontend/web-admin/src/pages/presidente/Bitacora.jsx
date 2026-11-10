import { useState } from 'react';
import {
  Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { listarBitacora } from '../../api/bitacora';
import { usePaginado } from '../../api/usePaginado';
import { ID_ROL_POR_NOMBRE, RolUsuario } from '../../config/roles';
import { clp, fecha, fechaHora } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import EstadoCarga from '../../components/ui/EstadoCarga';
import SelloCargo from '../../components/marca/SelloCargo';

const idBitacora = (r) => r.idBitacora;

// Lo más útil del `detalle` de cada acción, en una línea. El backend guarda lo que cada servicio registra.
function textoDetalle(r) {
  const d = r.detalle;
  if (!d || typeof d !== 'object') return null;
  const partes = [
    d.titulo ?? d.concepto ?? d.nombre ?? d.espacio ?? d.descripcion,
    d.monto != null ? clp(d.monto) : d.montoPorUnidad != null ? `${clp(d.montoPorUnidad)} por unidad` : null,
    d.fecha ? fecha(d.fecha) : null,
    d.motivo ? `Motivo: ${d.motivo}` : null,
    d.comentario ? `«${d.comentario}»` : null,
    d.destinatarios != null ? `${d.destinatarios} destinatarios` : null,
  ].filter((p) => typeof p === 'string' && p);
  return partes.join(' · ') || null;
}

// Bitácora de auditoría (GET bitacora): la Presidencia supervisa las acciones del administrador externo.
// No se puede editar ni borrar. Se carga de a 50, lo más nuevo primero.
export default function Bitacora() {
  const { comunidad } = useSesion();
  const [rol, setRol] = useState(RolUsuario.ADMINISTRADOR);
  const [busqueda, setBusqueda] = useState('');
  const bitacora = usePaginado((antesDe) => listarBitacora({ rol: rol || undefined, antesDe }), [comunidad.idRed, rol], 'registros', idBitacora);
  const texto = busqueda.trim().toLowerCase();
  const lista = (bitacora.items ?? []).filter((r) => !texto || `${r.descripcion} ${textoDetalle(r) ?? ''} ${r.usuario?.nombre ?? ''}`.toLowerCase().includes(texto));
  const sello = (r) => ID_ROL_POR_NOMBRE[r.usuario?.cargo] ?? RolUsuario.RESIDENTE;
  const quien = (r) => r.usuario?.nombre ?? 'Sistema';

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Bitácora del administrador"
        descripcion="Registro de las acciones relevantes en la comunidad. No se puede editar ni borrar."
      />

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <ToggleButtonGroup size="small" exclusive value={rol} onChange={(_, v) => v !== null && setRol(v)}>
          <ToggleButton value={RolUsuario.ADMINISTRADOR}>Administración</ToggleButton>
          <ToggleButton value={0}>Todos los cargos</ToggleButton>
        </ToggleButtonGroup>
        <TextField size="small" label="Buscar en lo cargado" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} sx={{ minWidth: 240 }} />
      </Box>

      {!bitacora.items ? <EstadoCarga cargando={bitacora.cargando} error={bitacora.error} onReintentar={bitacora.recargar} /> : (
        <>
          {/* En el celular cada acción es un bloque: qué se hizo primero, quién y cuándo debajo */}
          <Paper variant="outlined" sx={{ display: { xs: 'block', md: 'none' }, borderRadius: 1.5, overflow: 'hidden' }}>
            {lista.length === 0 && <Typography color="text.secondary" sx={{ p: 2 }}>No hay acciones que coincidan.</Typography>}
            {lista.map((r, i) => (
              <Box key={r.idBitacora} sx={{ px: 2, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider', display: 'grid', gap: 0.5 }}>
                <Typography sx={{ fontWeight: 700 }}>{r.descripcion}</Typography>
                {textoDetalle(r) && <Typography variant="body2" color="text.secondary">{textoDetalle(r)}</Typography>}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <SelloCargo cargo={sello(r)} size={18} />
                  <Typography variant="body2"><b>{quien(r)}</b> · {fechaHora(r.fecha)}</Typography>
                </Box>
              </Box>
            ))}
          </Paper>

          <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 1.5 }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 160 }}>Fecha</TableCell>
                  <TableCell sx={{ width: 240 }}>Quién</TableCell>
                  <TableCell>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lista.length === 0 && (
                  <TableRow><TableCell colSpan={3}><Typography color="text.secondary">No hay acciones que coincidan.</Typography></TableCell></TableRow>
                )}
                {lista.map((r) => (
                  <TableRow key={r.idBitacora}>
                    <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{fechaHora(r.fecha)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <SelloCargo cargo={sello(r)} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{quien(r)}</Typography>
                          {r.usuario?.cargo && <Typography variant="caption" color="text.secondary">{r.usuario.cargo}</Typography>}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{r.descripcion}</Typography>
                      {textoDetalle(r) && <Typography variant="body2" color="text.secondary">{textoDetalle(r)}</Typography>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {bitacora.siguiente && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button loading={bitacora.cargandoMas} onClick={bitacora.cargarMas}>Ver anteriores</Button>
              {bitacora.errorMas && <Typography color="error">{bitacora.errorMas.message}</Typography>}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
