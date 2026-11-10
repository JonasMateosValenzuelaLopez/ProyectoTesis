import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, TextField, Typography,
} from '@mui/material';
import { DeleteOutlined as EliminarIcon } from '@mui/icons-material';
import { useAviso } from '../../context/AvisoContext';
import * as finanzas from '../../api/finanzas';
import { clp, fecha } from '../../utils/formato';
import { errorMonto, MAX_CONCEPTO, MAX_DESCRIPCION_COBRO, soloDigitos } from '../../utils/finanzas';

// Editar un cobro ya creado, con las reglas de la API (PATCH finanzas/cobros/:id):
// - concepto, detalle y vencimiento siempre; el vencimiento no puede quedar antes de la emisión;
// - el monto solo mientras el cobro no tenga pagos, avisos ni exenciones;
// - la categoría, si es extraordinario y las unidades no se cambian.
// Eliminar (DELETE finanzas/cobros/:id) también exige que no tenga movimientos. Editar no envía un correo nuevo.
// `totales` solo dice si hay pagadas o exentas; los avisos y las exenciones en revisión los informa el backend al guardar.
export default function DialogoEditarCobro({ cobro, onClose, onCambio }) {
  const { avisar } = useAviso();
  const [form, setForm] = useState({
    concepto: cobro.concepto, descripcion: cobro.descripcion ?? '', monto: String(cobro.montoPorUnidad), fechaVencimiento: cobro.fechaVencimiento,
  });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const conMovimientos = cobro.totales.pagadas > 0 || cobro.totales.exentas > 0;

  const concepto = form.concepto.trim();
  const descripcion = form.descripcion.trim();
  const monto = Number(form.monto);
  const errores = {
    concepto: !concepto ? 'El concepto es obligatorio' : null,
    monto: conMovimientos ? null : errorMonto(form.monto),
    fechaVencimiento: !form.fechaVencimiento ? 'Elige una fecha'
      : form.fechaVencimiento < cobro.fechaEmision ? `No puede ser antes de la emisión (${fecha(cobro.fechaEmision)})` : null,
  };
  const cambios = {
    ...(concepto !== cobro.concepto && { concepto }),
    ...(descripcion !== (cobro.descripcion ?? '') && { descripcion }),
    ...(!conMovimientos && monto !== cobro.montoPorUnidad && { montoPorUnidad: monto }),
    ...(form.fechaVencimiento !== cobro.fechaVencimiento && { fechaVencimiento: form.fechaVencimiento }),
  };
  const valido = !Object.values(errores).some(Boolean);
  const hayCambios = Object.keys(cambios).length > 0;
  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const ejecutar = async (clave, hacer, mensaje) => {
    setEnviando(clave);
    setError(null);
    try {
      await hacer();
      avisar(mensaje);
      onCambio();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(null);
    }
  };
  const guardar = (e) => {
    e.preventDefault();
    if (!valido || !hayCambios) return;
    ejecutar('guardar', () => finanzas.editarCobro(cobro.idCobro, cambios), 'Cobro actualizado.');
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={guardar} noValidate>
      <DialogTitle>Editar cobro</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <Typography color="text.secondary">
          {cobro.categoria?.nombre ?? 'Sin categoría'}{cobro.extraordinario ? ' · extraordinario' : ''} · emitido el {fecha(cobro.fechaEmision)}.
          La categoría y las unidades no se pueden cambiar.
        </Typography>
        <TextField
          required label="Concepto" name="concepto" value={form.concepto} onChange={cambiar}
          error={!!errores.concepto} helperText={errores.concepto ?? ' '} slotProps={{ htmlInput: { maxLength: MAX_CONCEPTO } }}
        />
        <TextField
          label="Detalle (opcional)" name="descripcion" value={form.descripcion} onChange={cambiar} multiline minRows={2}
          slotProps={{ htmlInput: { maxLength: MAX_DESCRIPCION_COBRO } }}
        />
        <TextField
          required label="Monto por unidad" value={form.monto} disabled={conMovimientos}
          onChange={(e) => setForm({ ...form, monto: soloDigitos(e.target.value) })}
          error={!!errores.monto}
          helperText={conMovimientos ? 'No se puede cambiar: el cobro ya tiene pagos o exenciones.' : errores.monto ?? ' '}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
        />
        <TextField
          required label="Vence el" name="fechaVencimiento" type="date" value={form.fechaVencimiento} onChange={cambiar}
          error={!!errores.fechaVencimiento} helperText={errores.fechaVencimiento ?? ' '}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: cobro.fechaEmision } }}
        />
        {cambios.montoPorUnidad !== undefined && !errores.monto && (
          <Typography color="text.secondary">
            Cada unidad pasará a deber <b>{clp(monto)}</b> en vez de {clp(cobro.montoPorUnidad)}.
          </Typography>
        )}
        <Alert severity="info" variant="outlined">Los cambios quedan en la bitácora. No se envía un correo nuevo a las unidades.</Alert>
        {confirmarEliminar && (
          <Alert
            severity="warning"
            action={(
              <Box sx={{ display: 'flex', gap: 1, alignSelf: 'center' }}>
                <Button size="small" color="inherit" onClick={() => setConfirmarEliminar(false)}>No</Button>
                <Button
                  size="small" color="error" variant="contained" loading={enviando === 'eliminar'}
                  onClick={() => ejecutar('eliminar', () => finanzas.eliminarCobro(cobro.idCobro), `Cobro «${cobro.concepto}» eliminado.`)}
                >
                  Eliminar
                </Button>
              </Box>
            )}
          >
            ¿Eliminar «{cobro.concepto}»? Se quita de las {cobro.totales.unidades} unidades. Solo se puede si nadie lo pagó ni avisó una transferencia.
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button color="error" startIcon={<EliminarIcon />} disabled={conMovimientos || confirmarEliminar} onClick={() => setConfirmarEliminar(true)}>
          Eliminar cobro
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={!valido || !hayCambios} loading={enviando === 'guardar'}>Guardar cambios</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
