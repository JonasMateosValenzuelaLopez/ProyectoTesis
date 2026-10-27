import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControlLabel, Switch, Typography, Chip,
} from '@mui/material';
import { useFinanzas } from '../../context/FinanzasContext';
import { residentes } from '../../data/finanzasMock';
import { clp, fechaHora, nombreUnidad } from '../../utils/formato';
import PlacaUnidad from '../marca/PlacaUnidad';
import EstadoPago from '../marca/EstadoPago';

// Detalle de pagos de una unidad. El pago ocurre fuera de la plataforma
// (transferencia); aquí el Tesorero o el Administrador solo lo registran.
export default function DialogoUnidad({ unidad, onClose, soloLectura = false }) {
  const { datos, cobrosDelPeriodo, estadoUnidad, acciones } = useFinanzas();
  if (!unidad) return null;
  const deuda = datos.deudaAnterior[unidad.id] ?? 0;
  const exencion = datos.exenciones.find((e) => e.idUnidad === unidad.id && e.estado === 'pendiente');

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <PlacaUnidad tipo={unidad.tipo} numero={unidad.numero} size="sm" />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" component="span" sx={{ display: 'block' }}>{nombreUnidad(unidad)}</Typography>
          <Typography variant="body2" color="text.secondary">{residentes[unidad.id] ?? 'Sin residente registrado'}</Typography>
        </Box>
        <EstadoPago estado={estadoUnidad(unidad.id)} />
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
        <Typography variant="overline" color="text.secondary">Cobros de {datos.nombrePeriodo}</Typography>
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {cobrosDelPeriodo.map((c) => {
            const cu = datos.cobroUnidades[c.id]?.[unidad.id];
            if (!cu) return null;
            return (
              <Box key={c.id} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }}>{c.concepto}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {clp(c.montoPorUnidad)}
                    {cu.estado === 'pagado' && cu.marcadoPor && ` · marcado por ${cu.marcadoPor}, ${fechaHora(cu.marcadoEn)}`}
                  </Typography>
                </Box>
                {cu.estado === 'exento' ? (
                  <Chip size="small" label="Exento" color="info" variant="outlined" />
                ) : (
                  <FormControlLabel
                    labelPlacement="start"
                    label={cu.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                    disabled={soloLectura}
                    control={<Switch color="success" checked={cu.estado === 'pagado'} onChange={(e) => acciones.marcarPago(c.id, unidad.id, e.target.checked)} />}
                  />
                )}
              </Box>
            );
          })}
        </Box>
        {exencion && (
          <Alert severity="info" variant="outlined">
            Exención en revisión por Presidencia: «{exencion.motivo}». Mientras no se apruebe, el cobro sigue vigente.
          </Alert>
        )}
        {deuda > 0 && (
          <>
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>Deuda de meses anteriores</Typography>
                <Typography color="error.main" sx={{ fontWeight: 800, fontSize: '1.25rem' }}>{clp(deuda)}</Typography>
              </Box>
              {!soloLectura && (
                <Button variant="outlined" color="success" onClick={() => acciones.saldarDeuda(unidad.id)}>
                  Registrar pago de la deuda
                </Button>
              )}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
        <Typography variant="caption" color="text.secondary">
          {soloLectura ? 'Solo Tesorería y Administración pueden marcar pagos.' : 'Los pagos se hacen por transferencia; aquí solo se registran.'}
        </Typography>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
