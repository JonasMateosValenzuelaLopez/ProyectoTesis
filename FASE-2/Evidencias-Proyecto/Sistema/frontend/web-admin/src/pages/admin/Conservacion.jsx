import { useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, TextField, Typography,
} from '@mui/material';
import { AddOutlined as AgregarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAdmin } from '../../context/AdminContext';
import { useConserjeria } from '../../context/ConserjeriaContext';
import { diaISO } from '../../data/conserjeriaMock';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';
import { fecha, fechaHora, nombreCorto, nombreUnidad } from '../../utils/formato';
import {
  MAX_DIAS_RETENCION, MAX_MOTIVO_RETENCION, RETENCION_MESES, diasCubiertos, errorRetencion, limiteConservacion,
} from '../../utils/conservacion';

const vacio = { desde: '', hasta: '', motivo: '' };

// Retener un período: fechas no futuras, hasta 31 días y dentro de los últimos 12 meses
function DialogoRetencion({ onClose }) {
  const { acciones } = useConserjeria();
  const [f, setF] = useState(vacio);
  const [intento, setIntento] = useState(false);
  const error = errorRetencion(f);
  const cambiar = (e) => setF({ ...f, [e.target.name]: e.target.value });
  const guardar = (e) => {
    e.preventDefault();
    setIntento(true);
    if (!error && acciones.crearRetencion(f)) onClose();
  };
  const ayuda = (campo, texto) => (intento && error?.[campo]) || texto;
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
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: limiteConservacion(), max: diaISO() } }}
          />
          <TextField
            required type="date" label="Hasta" name="hasta" value={f.hasta} onChange={cambiar}
            error={intento && !!error?.hasta} helperText={ayuda('hasta', f.desde && f.hasta ? `${diasCubiertos(f.desde, f.hasta)} de ${MAX_DIAS_RETENCION} días como máximo` : `Hasta ${MAX_DIAS_RETENCION} días`)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: f.desde || limiteConservacion(), max: diaISO() } }}
          />
        </Box>
        <TextField
          required multiline minRows={3} label="Incidente que lo justifica" name="motivo" value={f.motivo} onChange={cambiar}
          placeholder="Robo de una bicicleta en el estacionamiento; Carabineros pidió los ingresos de esos días"
          error={intento && !!error?.motivo} helperText={ayuda('motivo', `${f.motivo.trim().length}/${MAX_MOTIVO_RETENCION} · al menos 10 caracteres`)}
          slotProps={{ htmlInput: { maxLength: MAX_MOTIVO_RETENCION } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained">Retener</Button>
      </DialogActions>
    </Dialog>
  );
}

// Conservación de datos de visitantes (Ley 21.719): pasados 12 meses, los registros de visitas se
// anonimizan solos cada noche. La administración puede retener un período por un incidente y liberarlo después.
export default function Conservacion() {
  const { comunidad } = useSesion();
  const { usuarioPorId, unidadPorId } = useAdmin();
  const { retenciones, historialAntiguo, acciones } = useConserjeria();
  const [nueva, setNueva] = useState(false);
  const [porLiberar, setPorLiberar] = useState(null);
  const nombre = (id) => nombreCorto(usuarioPorId[id]) || 'La administración';
  const activas = retenciones.filter((r) => !r.liberada_en);

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Conservación de datos"
        descripcion={`Por la Ley 21.719, los registros de visitas se guardan ${RETENCION_MESES} meses. Después se borran el nombre, el RUT y la patente, y la visita queda como «Visita anonimizada».`}
        acciones={<Button variant="contained" startIcon={<AgregarIcon />} onClick={() => setNueva(true)}>Retener un período</Button>}
      />

      <Box sx={{ display: 'grid', gap: 2.5 }}>
        <Alert severity="info" variant="outlined">
          Hoy se conservan los registros desde el {fecha(limiteConservacion())}. Si hubo un incidente (un robo, un daño, un reclamo),
          retén esos días antes de que pasen 12 meses: mientras la retención esté activa, no se anonimizan.
        </Alert>

        <Tarjeta titulo="Retenciones" extra={activas.length ? `${activas.length} ${activas.length === 1 ? 'activa' : 'activas'}` : 'Ninguna activa'}>
          {retenciones.length === 0 && <Typography color="text.secondary">No hay retenciones. Todos los registros se anonimizan al cumplir 12 meses.</Typography>}
          {retenciones.map((r) => (
            <Paper key={r.id_retencion} variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'grid', gap: 1, opacity: r.liberada_en ? 0.75 : 1 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 700, flex: 1, minWidth: 200 }}>
                  {r.desde === r.hasta ? fecha(r.desde) : `${fecha(r.desde)} al ${fecha(r.hasta)}`}
                  <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}> · {diasCubiertos(r.desde, r.hasta)} {diasCubiertos(r.desde, r.hasta) === 1 ? 'día' : 'días'}</Box>
                </Typography>
                <Chip size="small" variant="outlined" color={r.liberada_en ? 'default' : 'success'} label={r.liberada_en ? 'Liberada' : 'Activa'} />
              </Box>
              <Typography>{r.motivo}</Typography>
              <Typography variant="body2" color="text.secondary">
                Creada por {nombre(r.creada_por)} el {fechaHora(r.fecha_creacion)}
                {r.liberada_en && ` · liberada por ${nombre(r.liberada_por)} el ${fechaHora(r.liberada_en)}`}
              </Typography>
              {!r.liberada_en && (
                <Box><Button color="inherit" onClick={() => setPorLiberar(r)}>Liberar</Button></Box>
              )}
            </Paper>
          ))}
        </Tarjeta>

        <Tarjeta titulo="Registros de más de 12 meses" extra="Lo que queda de cada visita">
          {historialAntiguo.length === 0 && <Typography color="text.secondary">No hay registros de visitas con más de 12 meses.</Typography>}
          {historialAntiguo.map((a, i) => (
            <Box key={a.id_acceso} sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', pt: i ? 1.5 : 0, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
              <Box sx={{ flex: 1, minWidth: 220 }}>
                <Typography sx={{ fontWeight: 700, fontStyle: a.anonimizado ? 'italic' : 'normal' }}>{a.persona}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {a.categoria} · {nombreUnidad(unidadPorId[a.id_unidad])} · {fechaHora(a.fecha_creacion)}{a.patente ? ` · ${a.patente}` : ''}
                </Typography>
              </Box>
              <Chip size="small" variant="outlined" color={a.anonimizado ? 'default' : 'success'} label={a.anonimizado ? 'Anonimizada' : 'Retenida'} />
            </Box>
          ))}
        </Tarjeta>
      </Box>

      {nueva && <DialogoRetencion onClose={() => setNueva(false)} />}
      {porLiberar && (
        <Dialog open onClose={() => setPorLiberar(null)} fullWidth maxWidth="xs">
          <DialogTitle>¿Liberar la retención?</DialogTitle>
          <DialogContent>
            <Typography>
              Los registros del {fecha(porLiberar.desde)} al {fecha(porLiberar.hasta)} vuelven a la regla normal: si tienen más de 12 meses, se anonimizan esta noche y no se pueden recuperar.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setPorLiberar(null)}>Cancelar</Button>
            <Button variant="contained" color="error" onClick={() => { acciones.liberarRetencion(porLiberar); setPorLiberar(null); }}>Liberar</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
