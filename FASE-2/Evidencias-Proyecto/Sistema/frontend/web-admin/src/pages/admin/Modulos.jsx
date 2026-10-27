import { Box, Chip, Paper, Switch, Typography } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useAdmin } from '../../context/AdminContext';
import { DETALLE_MODULOS, MODULOS, MODULOS_POR_TIPO } from '../../config/modulos';
import Encabezado from '../../components/ui/Encabezado';

export default function Modulos() {
  const { comunidad } = useSesion();
  const { acciones } = useAdmin();
  const sugeridos = MODULOS_POR_TIPO[comunidad.tipo];

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Encabezado
        contexto={`${comunidad.nombre} · ${comunidad.tipo}`}
        titulo="Módulos"
        descripcion="Activa solo lo que la comunidad usa. Al apagar un módulo desaparece del panel y de la app, pero sus datos se conservan."
      />
      <Paper variant="outlined" sx={{ borderRadius: 1.5 }}>
        {Object.entries(MODULOS).map(([clave, nombre], i) => {
          const activo = comunidad.modulos.includes(clave);
          return (
            <Box key={clave} component="label" sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, alignItems: 'center', px: 2.5, py: 2, borderTop: i ? 1 : 0, borderColor: 'divider', cursor: 'pointer' }}>
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 700 }}>{nombre}</Typography>
                  {!sugeridos.includes(clave) && <Chip size="small" variant="outlined" label={`Poco común en ${comunidad.tipo.toLowerCase()}s`} />}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '62ch' }}>{DETALLE_MODULOS[clave]}</Typography>
              </Box>
              <Switch checked={activo} onChange={(e) => acciones.cambiarModulo(clave, e.target.checked)} inputProps={{ 'aria-label': nombre }} />
            </Box>
          );
        })}
      </Paper>
    </Box>
  );
}
