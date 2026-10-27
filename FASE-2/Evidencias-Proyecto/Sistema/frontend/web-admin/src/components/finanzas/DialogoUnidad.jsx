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
  const { datos, periodo, gastosPorUnidad, cobroPorId, estadoUnidad, morosos, nombreUsuario, acciones } = useFinanzas();
  if (!unidad) return null;
  const gastos = gastosPorUnidad[unidad.id_unidad] ?? [];
  const delMes = gastos.filter((g) => g.mes === periodo.mes && g.anio === periodo.anio);
  const atrasados = morosos.find((m) => m.unidad.id_unidad === unidad.id_unidad)?.atrasados ?? [];
  const deuda = atrasados.reduce((s, g) => s + g.monto_total, 0);
  const idsGastos = new Set(gastos.map((g) => g.id_gasto));
  const pagosDe = (id_gasto) => datos.pagos.filter((pg) => pg.id_gasto === id_gasto);
  const avisos = datos.pagos.filter((pg) => pg.estado_validacion === 'Pendiente' && idsGastos.has(pg.id_gasto));
  const exencion = datos.exenciones.find((e) => e.estado === 'Pendiente' && idsGastos.has(e.id_gasto));
  const concepto = (g) => cobroPorId[g.id_cobro]?.concepto ?? g.descripcion;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <PlacaUnidad unidad={unidad} size="sm" />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" component="span" sx={{ display: 'block' }}>{nombreUnidad(unidad)}</Typography>
          <Typography variant="body2" color="text.secondary">{residentes[unidad.id_unidad] ?? 'Sin residente registrado'}</Typography>
        </Box>
        <EstadoPago estado={estadoUnidad(unidad.id_unidad)} />
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
        {avisos.length > 0 && (
          <Alert
            severity="warning" variant="outlined"
            action={!soloLectura && (
              <Box sx={{ display: 'flex', gap: 1, alignSelf: 'center' }}>
                <Button size="small" color="error" onClick={() => acciones.rechazarAviso(avisos.map((pg) => pg.id_gasto))}>Rechazar</Button>
                <Button size="small" variant="contained" color="success"
                  onClick={() => acciones.registrarPagos(avisos.map((pg) => pg.id_gasto), `Transferencia de ${nombreUnidad(unidad)} validada.`)}>
                  Validar
                </Button>
              </Box>
            )}
          >
            {nombreUsuario(avisos[0].id_usuario)} avisó una transferencia por <b>{clp(avisos.reduce((s, pg) => s + pg.monto_pagado, 0))}</b> el {fechaHora(avisos[0].fecha_pago)}.
            {avisos[0].observacion ? ` «${avisos[0].observacion}».` : ''} Revisa que llegó a la cuenta antes de validarla.
          </Alert>
        )}
        <Typography variant="overline" color="text.secondary">Cobros de {periodo.nombre}</Typography>
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {delMes.length === 0 && <Typography color="text.secondary">Esta unidad no tiene cobros este mes.</Typography>}
          {delMes.map((g) => {
            const validado = pagosDe(g.id_gasto).find((pg) => pg.estado_validacion === 'Validado');
            return (
              <Box key={g.id_gasto} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }}>{concepto(g)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {clp(g.monto_total)}
                    {g.estado_pago === 'Pagado' && validado && ` · validado por ${nombreUsuario(validado.id_validador)}, ${fechaHora(validado.fecha_validacion)}`}
                  </Typography>
                </Box>
                {g.estado_pago === 'Exento' ? (
                  <Chip size="small" label="Exento" color="info" variant="outlined" />
                ) : (
                  <FormControlLabel
                    labelPlacement="start"
                    label={g.estado_pago === 'Pagado' ? 'Pagado' : 'Pendiente'}
                    disabled={soloLectura}
                    control={<Switch color="success" checked={g.estado_pago === 'Pagado'}
                      onChange={(e) => (e.target.checked ? acciones.registrarPagos([g.id_gasto]) : acciones.anularPago(g.id_gasto))} />}
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
                <Typography variant="body2" color="text.secondary">{atrasados.map(concepto).join(' · ')}</Typography>
              </Box>
              {!soloLectura && (
                <Button variant="outlined" color="success"
                  onClick={() => acciones.registrarPagos(atrasados.map((g) => g.id_gasto), `Deuda de ${nombreUnidad(unidad)} registrada como pagada.`)}>
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
