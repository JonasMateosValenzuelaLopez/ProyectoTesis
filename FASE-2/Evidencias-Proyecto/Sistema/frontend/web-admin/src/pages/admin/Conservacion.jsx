import { useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, TextField, Typography,
} from '@mui/material';
import { AddOutlined as AgregarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as porteria from '../../api/porteria';
import { useConsulta } from '../../api/useConsulta';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';
import EstadoCarga from '../../components/ui/EstadoCarga';
import { fecha, fechaHora } from '../../utils/formato';
import {
  MAX_DIAS_RETENCION, MAX_MOTIVO_RETENCION, RETENCION_MESES, diaISO, diasCubiertos, errorRetencion, limiteConservacion,
} from '../../utils/conservacion';

// Retener un período (POST porteria/retenciones): fechas no futuras, hasta 31 días y dentro del plazo de conservación
function DialogoRetencion({ meses, onClose, onCreada }) {
  const { avisar } = useAviso();
  const [f, setF] = useState({ desde: '', hasta: '', motivo: '' });
  const [intento, setIntento] = useState(false);
  const [errorApi, setErrorApi] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const error = errorRetencion(f, meses);
  const cambiar = (e) => setF({ ...f, [e.target.name]: e.target.value });
  const guardar = async (e) => {
    e.preventDefault();
    setIntento(true);
    if (error) return;
    setEnviando(true);
    setErrorApi(null);
    try {
      await porteria.crearRetencion({ desde: f.desde, hasta: f.hasta, motivo: f.motivo.trim().replace(/\s+/g, ' ') });
      avisar('Retención creada. Esos registros no se anonimizarán mientras esté activa.');
      onCreada();
      onClose();
    } catch (err) {
      setErrorApi(err.message);
    } finally {
      setEnviando(false);
    }
  };
  const ayuda = (campo, texto) => (intento && error?.[campo]) || texto;
  const minimo = limiteConservacion(new Date(), meses);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={guardar}>
      <DialogTitle>Retener registros de visitas</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <Typography color="text.secondary">
          Los ingresos y salidas de esos días no se anonimizarán mientras la retención esté activa. Úsala solo por un incidente concreto.
        </Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField
            required type="date" label="Desde" name="desde" value={f.desde} onChange={cambiar}
            error={intento && !!error?.desde} helperText={ayuda('desde', ' ')}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: minimo, max: diaISO() } }}
          />
          <TextField
            required type="date" label="Hasta" name="hasta" value={f.hasta} onChange={cambiar}
            error={intento && !!error?.hasta} helperText={ayuda('hasta', f.desde && f.hasta ? `${diasCubiertos(f.desde, f.hasta)} de ${MAX_DIAS_RETENCION} días como máximo` : `Hasta ${MAX_DIAS_RETENCION} días`)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: f.desde || minimo, max: diaISO() } }}
          />
        </Box>
        <TextField
          required multiline minRows={3} label="Incidente que lo justifica" name="motivo" value={f.motivo} onChange={cambiar}
          placeholder="Robo de una bicicleta en el estacionamiento; Carabineros pidió los ingresos de esos días"
          error={intento && !!error?.motivo} helperText={ayuda('motivo', `${f.motivo.trim().length}/${MAX_MOTIVO_RETENCION} · al menos 10 caracteres`)}
          slotProps={{ htmlInput: { maxLength: MAX_MOTIVO_RETENCION } }}
        />
        {errorApi && <Alert severity="error">{errorApi}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" loading={enviando}>Retener</Button>
      </DialogActions>
    </Dialog>
  );
}

function DialogoLiberar({ retencion, onClose, onLiberada }) {
  const { avisar } = useAviso();
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const liberar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await porteria.liberarRetencion(retencion.idRetencion);
      avisar('Retención liberada.');
      onLiberada();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>¿Liberar la retención?</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <Typography>
          Los registros del {fecha(retencion.desde)} al {fecha(retencion.hasta)} vuelven a la regla normal: si superan el plazo de conservación, se anonimizan esta noche y no se pueden recuperar.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="error" loading={enviando} onClick={liberar}>Liberar</Button>
      </DialogActions>
    </Dialog>
  );
}

// Conservación de datos de visitantes (Ley 21.719, GET porteria/retenciones): pasado el plazo, los registros de
// visitas se anonimizan solos cada noche. La administración puede retener un período por un incidente y liberarlo después.
export default function Conservacion() {
  const { comunidad } = useSesion();
  const { datos, cargando, error, recargar } = useConsulta(porteria.listarRetenciones, [comunidad.idRed]);
  const [nueva, setNueva] = useState(false);
  const [porLiberar, setPorLiberar] = useState(null);
  const meses = datos?.conservacionMeses ?? RETENCION_MESES;
  const retenciones = datos?.retenciones ?? [];
  const activas = retenciones.filter((r) => r.activa);

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Conservación de datos"
        descripcion={`Por la Ley 21.719, los registros de visitas se guardan ${meses} meses. Después se borran el nombre, el RUT y la patente, y la visita queda como «Visita anonimizada».`}
        acciones={<Button variant="contained" startIcon={<AgregarIcon />} onClick={() => setNueva(true)} disabled={!datos}>Retener un período</Button>}
      />

      {!datos ? <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} /> : (
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <Alert severity="info" variant="outlined">
            Hoy se conservan los registros desde el {fecha(limiteConservacion(new Date(), meses))}. Si hubo un incidente (un robo, un daño, un reclamo),
            retén esos días antes de que pasen {meses} meses: mientras la retención esté activa, no se anonimizan.
          </Alert>

          <Tarjeta titulo="Retenciones" extra={activas.length ? `${activas.length} ${activas.length === 1 ? 'activa' : 'activas'}` : 'Ninguna activa'}>
            {retenciones.length === 0 && <Typography color="text.secondary">No hay retenciones. Todos los registros se anonimizan al cumplir {meses} meses.</Typography>}
            {retenciones.map((r) => {
              const dias = diasCubiertos(r.desde, r.hasta);
              return (
                <Paper key={r.idRetencion} variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'grid', gap: 1, opacity: r.activa ? 1 : 0.75 }}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 700, flex: 1, minWidth: 200 }}>
                      {r.desde === r.hasta ? fecha(r.desde) : `${fecha(r.desde)} al ${fecha(r.hasta)}`}
                      <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}> · {dias} {dias === 1 ? 'día' : 'días'}</Box>
                    </Typography>
                    <Chip size="small" variant="outlined" color={r.activa ? 'success' : 'default'} label={r.activa ? 'Activa' : 'Liberada'} />
                  </Box>
                  <Typography>{r.motivo}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Creada por {r.creadaPor?.nombre ?? 'la administración'} el {fechaHora(r.creadaEn)}
                    {r.liberadaEn && ` · liberada por ${r.liberadaPor?.nombre ?? 'la administración'} el ${fechaHora(r.liberadaEn)}`}
                  </Typography>
                  {r.activa && <Box><Button color="inherit" onClick={() => setPorLiberar(r)}>Liberar</Button></Box>}
                </Paper>
              );
            })}
          </Tarjeta>
        </Box>
      )}

      {nueva && <DialogoRetencion meses={meses} onClose={() => setNueva(false)} onCreada={recargar} />}
      {porLiberar && <DialogoLiberar retencion={porLiberar} onClose={() => setPorLiberar(null)} onLiberada={recargar} />}
    </Box>
  );
}
