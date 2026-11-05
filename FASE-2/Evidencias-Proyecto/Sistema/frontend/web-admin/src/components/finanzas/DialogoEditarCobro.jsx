import { useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, TextField, Typography,
} from '@mui/material';
import { useFinanzas } from '../../context/FinanzasContext';
import { clp, fecha } from '../../utils/formato';

const MAX_MONTO = 99_999_999;

// Editar un cobro ya creado, con las reglas de la API (PATCH /finanzas/cobros/:id):
// - concepto y vencimiento siempre; el vencimiento no puede quedar antes de la emisión;
// - el monto solo mientras el cobro no tenga pagos, avisos ni exenciones;
// - la categoría, si es extraordinario y las unidades no se cambian.
// Editar no envía un correo nuevo. El padre lo monta con `key` para que el formulario parta del cobro.
export default function DialogoEditarCobro({ cobro, onClose }) {
  const { categoriaPorId, acciones, cobroTieneMovimientos } = useFinanzas();
  const [form, setForm] = useState({
    concepto: cobro.concepto, monto: String(cobro.monto_por_unidad), fecha_vencimiento: cobro.fecha_vencimiento,
  });
  const bloqueado = cobroTieneMovimientos(cobro.id_cobro);

  const concepto = form.concepto.trim();
  const monto = Number(form.monto);
  const errores = {
    concepto: !concepto ? 'El concepto es obligatorio' : concepto.length > 150 ? 'Máximo 150 caracteres' : null,
    monto: !Number.isInteger(monto) || monto < 1 || monto > MAX_MONTO ? 'Ingresa un monto entero mayor a 0' : null,
    fecha_vencimiento: !form.fecha_vencimiento ? 'Elige una fecha'
      : form.fecha_vencimiento < cobro.fecha_emision ? `No puede ser antes de la emisión (${fecha(cobro.fecha_emision)})` : null,
  };
  const cambios = {
    ...(concepto !== cobro.concepto && { concepto }),
    ...(!bloqueado && monto !== cobro.monto_por_unidad && { monto_por_unidad: monto }),
    ...(form.fecha_vencimiento !== cobro.fecha_vencimiento && { fecha_vencimiento: form.fecha_vencimiento }),
  };
  const valido = !errores.concepto && (bloqueado || !errores.monto) && !errores.fecha_vencimiento;
  const hayCambios = Object.keys(cambios).length > 0;

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const guardar = (e) => {
    e.preventDefault();
    if (!valido || !hayCambios) return;
    acciones.editarCobro(cobro.id_cobro, cambios);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={guardar}>
      <DialogTitle>Editar cobro</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <Typography color="text.secondary">
          {categoriaPorId[cobro.id_categoria]?.nombre ?? 'Sin categoría'}{cobro.es_extraordinario ? ' · extraordinario' : ''} · emitido el {fecha(cobro.fecha_emision)}.
          La categoría y las unidades no se pueden cambiar.
        </Typography>
        <TextField
          required label="Concepto" name="concepto" value={form.concepto} onChange={cambiar}
          error={Boolean(errores.concepto)} helperText={errores.concepto ?? ' '}
        />
        <TextField
          required label="Monto por unidad" name="monto" type="number" value={form.monto} onChange={cambiar} disabled={bloqueado}
          error={!bloqueado && Boolean(errores.monto)}
          helperText={bloqueado ? 'No se puede cambiar: el cobro ya tiene pagos, transferencias avisadas o exenciones.' : errores.monto ?? ' '}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 1, step: 1 } }}
        />
        <TextField
          required label="Vence el" name="fecha_vencimiento" type="date" value={form.fecha_vencimiento} onChange={cambiar}
          error={Boolean(errores.fecha_vencimiento)} helperText={errores.fecha_vencimiento ?? ' '}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: cobro.fecha_emision } }}
        />
        {cambios.monto_por_unidad !== undefined && !errores.monto && (
          <Typography color="text.secondary">
            Cada unidad pasará a deber <b>{clp(monto)}</b> en vez de {clp(cobro.monto_por_unidad)}.
          </Typography>
        )}
        <Alert severity="info" variant="outlined">
          Los cambios quedan en la bitácora. No se envía un correo nuevo a las unidades.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido || !hayCambios}>Guardar cambios</Button>
      </DialogActions>
    </Dialog>
  );
}
