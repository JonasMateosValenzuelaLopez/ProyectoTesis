import { Box, ButtonBase, Tooltip, Typography } from '@mui/material';
import { ESTADOS_OCUPACION, ESTADOS_PAGO } from '../../config/estadosPago';
import { espaciosActivos } from '../../utils/espacios';
import { grupoDe, pisoDe } from '../../utils/unidades';

const textoEstado = (e) => (ESTADOS_PAGO[e] ?? ESTADOS_OCUPACION[e])?.texto;

// El condominio dibujado según su tipo: torre por pisos, casas a lo largo de un
// pasaje o manzanas separadas por calles. Cada unidad se pinta según su estado de pago.
// Las hileras y manzanas salen de `unidades.calle_pasaje`; el piso, del número del depto.

const estiloUnidad = (estado) => {
  switch (estado) {
    case 'pagado':
      return { borderColor: 'success.main', color: 'success.main' };
    case 'pendiente':
      return {
        borderColor: 'warning.main', color: 'warning.main',
        background: (t) => `repeating-linear-gradient(-45deg, ${t.palette.warning.light} 0 5px, transparent 5px 10px)`,
      };
    case 'moroso':
      return { borderColor: 'error.main', bgcolor: 'error.main', color: 'background.paper' };
    case 'exencion':
      return {
        borderColor: 'info.main', color: 'info.main',
        background: (t) => `repeating-linear-gradient(45deg, ${t.palette.info.light} 0 5px, transparent 5px 10px)`,
      };
    case 'ocupada':
      return { borderColor: 'marca.lineStrong', color: 'text.primary' };
    case 'arrendada':
      return { borderColor: 'bronce.main', bgcolor: 'bronce.light', color: 'bronce.main' };
    case 'vacia':
      return { borderStyle: 'dashed', borderColor: 'text.disabled', color: 'text.secondary' };
    default:
      return { borderColor: 'divider', color: 'text.secondary' };
  }
};

function Unidad({ unidad, tipo, estado, onSelect, mini = false, sx }) {
  const etiqueta = `${tipo === 'Edificio' ? 'Departamento' : 'Casa'} ${unidad.numero_identificador}: ${textoEstado(estado) ?? 'Sin cobro'}`;
  return (
    <Tooltip title={etiqueta} disableInteractive>
      <ButtonBase
        aria-label={etiqueta}
        onClick={onSelect ? () => onSelect(unidad) : undefined}
        disabled={!onSelect}
        sx={{
          border: mini ? 1.5 : 2, borderStyle: 'solid', borderRadius: mini ? '3px' : '6px',
          fontFamily: 'Archivo, sans-serif', fontStretch: { xs: '100%', sm: '115%' }, fontWeight: 800,
          // En la villa el número se ve desde tablet: el tooltip no existe al tocar
          // En el celular las casillas son angostas: el número baja de tamaño para no tocar el borde
          fontSize: mini ? { xs: 0, md: '0.62rem' } : { xs: '0.8rem', sm: '0.95rem' }, fontVariantNumeric: 'tabular-nums',
          minWidth: 0, aspectRatio: mini ? '1' : 'auto', minHeight: mini ? 0 : 44,
          // Al marcar un pago el color cambia con una transición corta; el hover solo con mouse
          transition: 'transform 150ms ease, background-color 200ms ease, border-color 200ms ease, color 200ms ease',
          '@media (hover: hover) and (pointer: fine)': { '&:not(.Mui-disabled):hover': { transform: 'translateY(-1px)' } },
          '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
          '&.Mui-disabled': { color: 'inherit' },
          ...estiloUnidad(estado),
          ...sx,
        }}
      >
        {unidad.numero_identificador}
      </ButtonBase>
    </Tooltip>
  );
}

function Separador({ texto }) {
  return (
    <Typography
      component="div"
      sx={{
        textAlign: 'center', color: 'text.secondary', py: 0.25,
        borderBlock: '1px dashed', borderColor: 'divider',
        fontFamily: 'Archivo, sans-serif', fontStretch: '75%', fontSize: '0.66rem',
        letterSpacing: '0.35em', textTransform: 'uppercase',
      }}
    >
      {texto}
    </Typography>
  );
}

function Espacio({ nombre }) {
  return (
    <Box
      sx={{
        display: 'grid', placeItems: 'center', minHeight: 44, border: '2px dashed', borderColor: 'divider',
        borderRadius: '6px', color: 'text.secondary', fontFamily: 'Archivo, sans-serif', fontStretch: '80%',
        fontWeight: 700, fontSize: { xs: '0.5rem', sm: '0.62rem' }, letterSpacing: { xs: 0, sm: '0.06em' }, textTransform: 'uppercase',
        minWidth: 0, overflow: 'hidden', px: 0.25, textAlign: 'center', overflowWrap: 'anywhere',
      }}
    >
      {nombre}
    </Box>
  );
}

function PlanoCondominio({ comunidad, estados, onSelect }) {
  // Una hilera por cada `calle_pasaje`; el pasaje va entre la primera y la segunda
  const sectores = [...new Set(comunidad.unidades.map(grupoDe))];
  const hileras = sectores.map((s) => comunidad.unidades.filter((u) => grupoDe(u) === s));
  const espacios = espaciosActivos(comunidad);
  const columnas = Math.max(...hileras.map((h) => h.length)) + (espacios.length ? 1 : 0);
  const fila = (unidades, conEspacios) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))`, gap: { xs: 0.5, sm: 0.75 } }}>
      {unidades.map((u) => <Unidad key={u.id_unidad} unidad={u} tipo={comunidad.tipo} estado={estados[u.id_unidad]} onSelect={onSelect} />)}
      {conEspacios && espacios.map((e) => <Espacio key={e.id_espacio} nombre={e.nombre} />)}
    </Box>
  );
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {hileras.map((h, i) => (
        <Box key={sectores[i]} sx={{ display: 'grid', gap: 1 }}>
          {i === 1 && <Separador texto="Pasaje" />}
          {fila(h, i === 0)}
        </Box>
      ))}
    </Box>
  );
}

function PlanoEdificio({ comunidad, estados, onSelect }) {
  const pisos = [...new Set(comunidad.unidades.map(pisoDe))].sort((a, b) => b - a);
  const porPiso = Math.max(...pisos.map((p) => comunidad.unidades.filter((u) => pisoDe(u) === p).length));
  return (
    <Box sx={{ display: 'grid', gap: 0.5 }}>
      {pisos.map((piso) => (
        <Box key={piso} sx={{ display: 'grid', gridTemplateColumns: `48px repeat(${porPiso}, minmax(0, 1fr))`, gap: 0.5, alignItems: 'center' }}>
          <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.66rem' }}>Piso {piso}</Typography>
          {comunidad.unidades.filter((u) => pisoDe(u) === piso).map((u) => (
            <Unidad key={u.id_unidad} unidad={u} tipo={comunidad.tipo} estado={estados[u.id_unidad]} onSelect={onSelect} sx={{ minHeight: 32, fontSize: '0.8rem' }} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

function PlanoVilla({ comunidad, estados, onSelect }) {
  const manzanas = [...new Set(comunidad.unidades.map(grupoDe))].sort();
  return (
    <Box sx={{ display: 'grid', gap: 0.75 }}>
      {manzanas.map((m, i) => (
        <Box key={m} sx={{ display: 'grid', gap: 0.75 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(12, minmax(0, 1fr))', md: 'repeat(24, minmax(0, 1fr))' }, gap: 0.5 }}>
            {comunidad.unidades.filter((u) => grupoDe(u) === m).map((u) => (
              <Unidad key={u.id_unidad} unidad={u} tipo={comunidad.tipo} estado={estados[u.id_unidad]} onSelect={onSelect} mini />
            ))}
          </Box>
          {i < manzanas.length - 1 && <Separador texto="Calle" />}
        </Box>
      ))}
    </Box>
  );
}

export function LeyendaPlano({ estados = ['pagado', 'pendiente', 'moroso', 'exencion'] }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, color: 'text.secondary', fontSize: '0.78rem' }}>
      {estados.map((e) => (
        <Box key={e} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '3px', border: 1.5, borderStyle: 'solid', ...estiloUnidad(e) }} />
          {textoEstado(e)}
        </Box>
      ))}
    </Box>
  );
}

export default function PlanoComunidad({ comunidad, estados = {}, onSelect }) {
  const props = { comunidad, estados, onSelect };
  if (!comunidad.unidades.length) {
    return <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center', border: '2px dashed', borderColor: 'divider', borderRadius: 1 }}>Todavía no hay unidades para dibujar.</Typography>;
  }
  if (comunidad.tipo === 'Edificio') return <PlanoEdificio {...props} />;
  if (comunidad.tipo === 'Villa') return <PlanoVilla {...props} />;
  return <PlanoCondominio {...props} />;
}
