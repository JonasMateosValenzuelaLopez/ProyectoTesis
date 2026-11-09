import { useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControlLabel, Switch, TextField, Typography,
} from '@mui/material';
import { useAviso } from '../../context/AvisoContext';
import * as finanzas from '../../api/finanzas';
import { useConsulta } from '../../api/useConsulta';
import { clp, fecha, fechaHora, nombreUnidad } from '../../utils/formato';
import { MAX_MOTIVO, nombrePeriodo, residentesDe } from '../../utils/finanzas';
import EstadoCarga from '../ui/EstadoCarga';
import PlacaUnidad from '../marca/PlacaUnidad';
import EstadoPago from '../marca/EstadoPago';

const EN_CURSO = ['Pendiente', 'Por aprobar'];
const PAGADOS_VISIBLES = 6;

// Cuenta de una unidad (GET finanzas/unidades/:id). El pago ocurre fuera de la plataforma (transferencia o
// efectivo); aquí Tesorería o Administración lo marcan, validan o rechazan los avisos que llegan desde la app,
// y Tesorería puede pedir una exención que decide la Presidencia.
// `unidad` viene de GET unidades (con `ocupantes`); `onCambio` avisa al padre para que actualice el plano.
export default function DialogoUnidad({ unidad, estado, gestiona, pideExencion, onExencion, onClose, onCambio }) {
  const { avisar } = useAviso();
  const { datos: cuenta, cargando, error: errorCarga, recargar } = useConsulta(() => finanzas.detalleUnidad(unidad.idUnidad), [unidad.idUnidad]);
  const [enviando, setEnviando] = useState(null);
  const [error, setError] = useState(null);
  const [rechazo, setRechazo] = useState(null);
  const [verTodos, setVerTodos] = useState(false);

  const accion = async (clave, hacer, mensaje) => {
    setEnviando(clave);
    setError(null);
    try {
      await hacer();
      avisar(mensaje);
      recargar();
      onCambio();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setEnviando(null);
    }
  };

  const cobros = cuenta?.cobros ?? [];
  const avisos = cobros.flatMap((c) => c.avisos.filter((a) => a.estado === 'Pendiente').map((a) => ({ ...a, concepto: c.concepto })));
  const porPagar = cobros.filter((c) => c.estado === 'Pendiente');
  const atrasados = porPagar.filter((c) => c.atrasado);
  const cerrados = cobros.filter((c) => c.estado !== 'Pendiente');
  const cerradosVisibles = verTodos ? cerrados : cerrados.slice(0, PAGADOS_VISIBLES);
  const totalAvisado = avisos.reduce((s, a) => s + a.monto, 0);

  const validarAvisos = () => accion(
    'validar',
    () => finanzas.marcarPagos([...new Set(avisos.map((a) => a.idCobroUnidad))], 'Transferencia'),
    `Transferencia de ${nombreUnidad(unidad)} validada.`,
  );
  const rechazarAvisos = async () => {
    const ok = await accion(
      'rechazar',
      () => finanzas.rechazarAvisos(avisos.map((a) => a.idAviso), rechazo.trim()),
      `Aviso de ${nombreUnidad(unidad)} rechazado. Los cobros siguen pendientes.`,
    );
    if (ok) setRechazo(null);
  };
  const cambiarPago = (c, pagado) => accion(
    c.idCobroUnidad,
    () => (pagado ? finanzas.marcarPagos([c.idCobroUnidad]) : finanzas.anularPago(c.idCobroUnidad)),
    pagado ? `«${c.concepto}» marcado como pagado.` : `«${c.concepto}» vuelve a estar pendiente.`,
  );

  const filaCobro = (c) => {
    const exencion = c.exencion && EN_CURSO.includes(c.exencion.estado) ? c.exencion : null;
    return (
      <Box key={c.idCobroUnidad} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 700 }}>{c.concepto}</Typography>
            {c.atrasado && <Chip size="small" label="Vencido" sx={{ bgcolor: 'error.light', color: 'error.main' }} />}
            {exencion && <Chip size="small" label="Exención en revisión" sx={{ bgcolor: 'info.light', color: 'info.main' }} />}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {clp(c.monto)} · {nombrePeriodo(c.periodo)} · vence {fecha(c.fechaVencimiento)}
            {c.estado === 'Pagado' && c.pagadoMarcadoEn && ` · marcado el ${fechaHora(c.pagadoMarcadoEn)}`}
          </Typography>
          {pideExencion && c.estado === 'Pendiente' && !exencion && (
            <Button size="small" sx={{ px: 0, minWidth: 0 }} onClick={() => onExencion(c)}>Pedir exención</Button>
          )}
        </Box>
        {c.estado === 'Exento' ? (
          <Chip size="small" label="Exento" color="info" variant="outlined" />
        ) : (
          <FormControlLabel
            labelPlacement="start"
            label={c.estado === 'Pagado' ? 'Pagado' : 'Pendiente'}
            disabled={!gestiona || enviando !== null}
            control={<Switch color="success" checked={c.estado === 'Pagado'} onChange={(e) => cambiarPago(c, e.target.checked)} />}
          />
        )}
      </Box>
    );
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <PlacaUnidad unidad={unidad} size="sm" />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" component="span" sx={{ display: 'block' }}>{nombreUnidad(unidad)}</Typography>
          <Typography variant="body2" color="text.secondary">{residentesDe(unidad) || 'Sin residentes registrados'}</Typography>
        </Box>
        <EstadoPago estado={estado} />
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
        {!cuenta ? <EstadoCarga cargando={cargando} error={errorCarga} onReintentar={recargar} /> : (
          <>
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

            {avisos.length > 0 && (
              <Alert
                severity="warning" variant="outlined"
                action={gestiona && rechazo === null && (
                  <Box sx={{ display: 'flex', gap: 1, alignSelf: 'center' }}>
                    <Button size="small" color="error" onClick={() => setRechazo('')} disabled={enviando !== null}>Rechazar</Button>
                    <Button size="small" variant="contained" color="success" loading={enviando === 'validar'} disabled={enviando !== null} onClick={validarAvisos}>Validar</Button>
                  </Box>
                )}
              >
                {avisos[0].avisadoPor?.nombre ?? 'Un residente'} avisó una transferencia por <b>{clp(totalAvisado)}</b> pagada el {fecha(avisos[0].fechaPago)}
                {' '}({avisos.map((a) => a.concepto).join(', ')}).
                {avisos[0].observacion ? ` «${avisos[0].observacion}».` : ''} Revisa que llegó a la cuenta antes de validarla.
              </Alert>
            )}
            {rechazo !== null && (
              <Box sx={{ display: 'grid', gap: 1 }}>
                <TextField
                  autoFocus size="small" label="Motivo del rechazo (opcional)" value={rechazo} onChange={(e) => setRechazo(e.target.value)}
                  slotProps={{ htmlInput: { maxLength: MAX_MOTIVO } }} helperText="El residente lo verá en la app."
                />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button onClick={() => setRechazo(null)}>Cancelar</Button>
                  <Button color="error" variant="contained" loading={enviando === 'rechazar'} onClick={rechazarAvisos}>Rechazar aviso</Button>
                </Box>
              </Box>
            )}

            <Typography variant="overline" color="text.secondary">Por pagar</Typography>
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {porPagar.length === 0 && <Typography color="text.secondary">Esta unidad no tiene cobros pendientes.</Typography>}
              {porPagar.map(filaCobro)}
            </Box>

            {atrasados.length > 0 && (
              <>
                <Divider />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>Deuda vencida</Typography>
                    <Typography color="error.main" sx={{ fontWeight: 800, fontSize: '1.25rem' }}>{clp(cuenta.deudaAtrasada)}</Typography>
                    <Typography variant="body2" color="text.secondary">{atrasados.length === 1 ? '1 cobro vencido' : `${atrasados.length} cobros vencidos`}</Typography>
                  </Box>
                  {gestiona && atrasados.length > 1 && (
                    <Button
                      variant="outlined" color="success" loading={enviando === 'deuda'} disabled={enviando !== null}
                      onClick={() => accion('deuda', () => finanzas.marcarPagos(atrasados.map((c) => c.idCobroUnidad)), `Deuda de ${nombreUnidad(unidad)} marcada como pagada.`)}
                    >
                      Marcar pagada toda la deuda
                    </Button>
                  )}
                </Box>
              </>
            )}

            {cerrados.length > 0 && (
              <>
                <Divider />
                <Typography variant="overline" color="text.secondary">Pagados y exentos</Typography>
                <Box sx={{ display: 'grid', gap: 1.5 }}>{cerradosVisibles.map(filaCobro)}</Box>
                {cerrados.length > PAGADOS_VISIBLES && (
                  <Button size="small" sx={{ justifySelf: 'start' }} onClick={() => setVerTodos(!verTodos)}>
                    {verTodos ? 'Ver menos' : `Ver los ${cerrados.length}`}
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
        <Typography variant="caption" color="text.secondary">
          {gestiona ? 'Los pagos se hacen por transferencia o en efectivo; aquí solo se registran.' : 'Solo Tesorería y Administración pueden marcar pagos.'}
        </Typography>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
