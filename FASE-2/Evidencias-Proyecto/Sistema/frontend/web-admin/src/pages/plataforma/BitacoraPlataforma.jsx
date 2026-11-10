import { useState } from 'react';
import { Box, Button, MenuItem, Paper, TextField, Typography } from '@mui/material';
import * as plataforma from '../../api/plataforma';
import { useConsulta } from '../../api/useConsulta';
import { useAviso } from '../../context/AvisoContext';
import { MODULOS } from '../../config/modulos';
import { fechaHora } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import EstadoCarga from '../../components/ui/EstadoCarga';

// Acciones del equipo EntreCasas que registra la API (plataforma.service.ts y alta-comunidad.service.ts)
const TEXTO_ACCION = {
  crear_comunidad: 'Creó la comunidad',
  abrir_ficha_comunidad: 'Abrió la ficha en modo soporte',
  suspender_comunidad: 'Suspendió la comunidad',
  reactivar_comunidad: 'Reactivó la comunidad',
  activar_modulo: 'Activó un módulo',
  desactivar_modulo: 'Desactivó un módulo',
  cambiar_tipo_comunidad: 'Cambió el tipo de comunidad',
};
const textoAccion = (accion) => TEXTO_ACCION[accion] ?? accion.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

// Lo más útil del `detalle` de cada acción, en una línea
function textoDetalle({ accion, detalle }) {
  if (!detalle) return null;
  switch (accion) {
    case 'crear_comunidad':
      return `${detalle.tipo} · ${detalle.unidades} unidades · ${detalle.modulos?.length ?? 0} módulos${detalle.responsable ? ` · responsable: ${detalle.responsable.cargo}${detalle.responsable.cuentaNueva ? ' (cuenta nueva)' : ''}` : ''}`;
    case 'suspender_comunidad':
      return `Motivo: ${detalle.motivo}`;
    case 'reactivar_comunidad':
      return detalle.motivoAnterior ? `Estaba suspendida por: ${detalle.motivoAnterior}` : null;
    case 'activar_modulo':
    case 'desactivar_modulo':
      return MODULOS[detalle.modulo] ?? detalle.modulo;
    case 'cambiar_tipo_comunidad':
      return `De ${detalle.anterior} a ${detalle.nuevo}`;
    default:
      return null;
  }
}

// Todo lo que hace el equipo EntreCasas queda registrado (GET plataforma/bitacora): crear, suspender,
// cambiar módulos o el tipo y abrir fichas en modo soporte. Se cargan de a 50, la más nueva primero.
export default function BitacoraPlataforma() {
  const { avisarError } = useAviso();
  const { datos: redes } = useConsulta(plataforma.listarComunidades);
  const [comunidad, setComunidad] = useState('todas');
  const filtro = comunidad === 'todas' ? undefined : comunidad;
  const { datos, cargando, error, recargar } = useConsulta(() => plataforma.bitacoraPlataforma({ comunidad: filtro }), [filtro]);
  // Páginas anteriores que se pidieron con «Ver anteriores». Valen solo para el filtro con que se pidieron:
  // al cambiarlo, se vuelve a la primera página.
  const [mas, setMas] = useState({ filtro, registros: [], siguiente: undefined });
  const [cargandoMas, setCargandoMas] = useState(false);
  const extra = mas.filtro === filtro && !cargando ? mas : { registros: [], siguiente: undefined };
  const registros = [...(datos?.registros ?? []), ...extra.registros];
  const siguiente = extra.siguiente === undefined ? datos?.siguiente : extra.siguiente;

  const verMas = async () => {
    setCargandoMas(true);
    try {
      const r = await plataforma.bitacoraPlataforma({ comunidad: filtro, antesDe: siguiente });
      setMas({ filtro, registros: [...extra.registros, ...r.registros], siguiente: r.siguiente });
    } catch (e) {
      avisarError(e.message);
    } finally {
      setCargandoMas(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Encabezado titulo="Bitácora" descripcion="Registro de las acciones del equipo EntreCasas sobre las comunidades." />
      <TextField select size="small" label="Comunidad" value={comunidad} onChange={(e) => setComunidad(e.target.value)} sx={{ minWidth: 260, mb: 2 }}>
        <MenuItem value="todas">Todas</MenuItem>
        <MenuItem value="ninguna">Sin comunidad</MenuItem>
        {(redes ?? []).map((r) => <MenuItem key={r.idRed} value={String(r.idRed)}>{r.nombre}</MenuItem>)}
      </TextField>
      {!datos ? <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} /> : (
        <Paper variant="outlined" sx={{ borderRadius: 1.5 }}>
          {registros.map((b, i) => (
            <Box key={b.idBitacora} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '150px 1fr' }, gap: { xs: 0.25, sm: 2 }, px: 2.5, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>{fechaHora(b.fecha)}</Typography>
              <Box sx={{ minWidth: 0 }}>
                <Typography><b>{b.usuario?.nombre ?? 'Equipo EntreCasas'}</b> · {textoAccion(b.accion)}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                  {[b.comunidad?.nombre, textoDetalle(b)].filter(Boolean).join(' · ')}
                </Typography>
              </Box>
            </Box>
          ))}
          {registros.length === 0 && <Typography color="text.secondary" sx={{ p: 3 }}>Sin registros.</Typography>}
          {siguiente && (
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
              <Button onClick={verMas} loading={cargandoMas}>Ver anteriores</Button>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
