import { useState } from 'react';
import { Alert, Box, Chip, Paper, Switch, Typography } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as admin from '../../api/admin';
import { useConsulta } from '../../api/useConsulta';
import Encabezado from '../../components/ui/Encabezado';
import EstadoCarga from '../../components/ui/EstadoCarga';

// Módulos de la comunidad (GET/PUT comunidad/modulos): la administración elige qué secciones usa la comunidad.
// Apagar un módulo lo oculta del panel y de la app; los datos no se borran y vuelven al encenderlo.
// «Administrador externo» solo lo cambia el equipo EntreCasas (viene con editable: false).
export default function Modulos() {
  const { comunidad, recargarPerfil } = useSesion();
  const { avisar, avisarError } = useAviso();
  const modulos = useConsulta(admin.listarModulos, [comunidad.idRed]);
  const [cambiando, setCambiando] = useState(null);

  const cambiar = async (m, activo) => {
    setCambiando(m.codigo);
    try {
      modulos.setDatos(await admin.cambiarModuloComunidad(m.codigo, activo));
      // El menú y la app leen los módulos del perfil: se vuelve a pedir para que el cambio se vea al tiro
      await recargarPerfil().catch(() => {});
      avisar(activo ? `«${m.nombre}» activado.` : `«${m.nombre}» desactivado. Sus datos se conservan.`);
    } catch (err) {
      avisarError(err.message);
    } finally {
      setCambiando(null);
    }
  };

  const encabezado = (
    <Encabezado
      contexto={comunidad.nombre}
      titulo="Módulos"
      descripcion="Elige qué secciones usa tu comunidad. Al apagar un módulo desaparece del panel y de la app, pero sus datos se conservan y vuelven al encenderlo."
    />
  );
  if (!modulos.datos) return <Box sx={{ maxWidth: 820 }}>{encabezado}<EstadoCarga cargando={modulos.cargando} error={modulos.error} onReintentar={modulos.recargar} /></Box>;

  return (
    <Box sx={{ maxWidth: 820 }}>
      {encabezado}
      {modulos.error && <Alert severity="error" sx={{ mb: 2 }}>{modulos.error.message}</Alert>}
      <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
        {modulos.datos.map((m, i) => (
          <Box key={m.codigo} sx={{ display: 'flex', gap: 2, alignItems: 'center', px: 2.5, py: 2, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
            <Box sx={{ flex: 1, minWidth: 0, display: 'grid', gap: 0.25 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 700 }}>{m.nombre}</Typography>
                {!m.editable && <Chip size="small" variant="outlined" label="Lo cambia el equipo EntreCasas" />}
              </Box>
              {m.descripcion && <Typography variant="body2" color="text.secondary">{m.descripcion}</Typography>}
            </Box>
            <Switch
              checked={m.activo} disabled={!m.editable || cambiando !== null}
              onChange={(e) => cambiar(m, e.target.checked)}
              slotProps={{ input: { 'aria-label': `${m.nombre}: ${m.activo ? 'activo' : 'inactivo'}` } }}
            />
          </Box>
        ))}
      </Paper>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>Cada cambio queda registrado en la bitácora de la comunidad.</Typography>
    </Box>
  );
}
