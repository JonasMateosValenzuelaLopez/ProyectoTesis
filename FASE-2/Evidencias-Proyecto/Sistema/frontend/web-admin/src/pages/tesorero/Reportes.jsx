import { useState } from 'react';
import {
  Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { FileDownloadOutlined as DescargarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import * as finanzas from '../../api/finanzas';
import * as admin from '../../api/admin';
import { useConsulta } from '../../api/useConsulta';
import { clp, descargarCSV, fecha, nombreUnidad } from '../../utils/formato';
import { hoyISO, nombrePeriodo, residentesDe } from '../../utils/finanzas';
import Encabezado from '../../components/ui/Encabezado';
import FranjaKpi from '../../components/ui/FranjaKpi';
import Tarjeta from '../../components/ui/Tarjeta';
import EstadoCarga from '../../components/ui/EstadoCarga';

const Descargar = ({ onClick, disabled }) => (
  <Button size="small" variant="outlined" startIcon={<DescargarIcon />} onClick={onClick} disabled={disabled}>Descargar CSV</Button>
);

// Reportes de un mes (GET finanzas/reportes?periodo=AAAA-MM): flujo de caja y balance por categoría.
// Solo cuentan los egresos que no requieren visado o que la Presidencia visó. La morosidad sale del estado actual.
export default function Reportes() {
  const { comunidad } = useSesion();
  const mesActual = hoyISO().slice(0, 7);
  const [mes, setMes] = useState(mesActual);
  const reporte = useConsulta(() => finanzas.reporte(mes), [comunidad.idRed, mes]);
  const estado = useConsulta(finanzas.estado, [comunidad.idRed]);
  const unidades = useConsulta(admin.listarUnidades, [comunidad.idRed]);
  const slug = comunidad.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
  const r = reporte.datos;
  const periodo = nombrePeriodo(`${mes}-01`);

  const descargarMorosidad = () => {
    const porId = Object.fromEntries((unidades.datos ?? []).map((u) => [u.idUnidad, u]));
    descargarCSV(`morosidad-${slug}-${hoyISO()}.csv`, [
      ['Unidad', 'Residentes', 'Cobros vencidos', 'Deuda vencida', 'Por vencer', 'Total'],
      ...estado.datos.morosos.map((m) => {
        const u = porId[m.idUnidad] ?? { ...m, tipo: comunidad.tipo === 'Edificio' ? 'Departamento' : 'Casa' };
        return [nombreUnidad(u), residentesDe(u), m.cobrosAtrasados, m.deudaAtrasada, m.pendienteNoVencido, m.total];
      }),
    ]);
  };
  const descargarFlujo = () => {
    const ingresos = r.flujoDeCaja.ingresos.map((i) => [i.fechaEmision, 'Ingreso', i.concepto, i.recaudado]);
    const egresos = r.flujoDeCaja.egresos.map((e) => [e.fechaEgreso, 'Egreso', e.proveedor ? `${e.descripcion} (${e.proveedor})` : e.descripcion, -e.monto]);
    descargarCSV(`flujo-de-caja-${slug}-${mes}.csv`, [['Fecha', 'Tipo', 'Detalle', 'Monto'], ...ingresos, ...egresos, ['', '', 'Saldo del periodo', r.flujoDeCaja.saldo]]);
  };
  const descargarBalance = () => descargarCSV(`balance-${slug}-${mes}.csv`, [
    ['Categoría', 'Cobrado', 'Recaudado', 'Egresos', 'Diferencia del mes', 'Saldo histórico'],
    ...r.porCategoria.map((c) => [c.nombre, c.cobrado, c.recaudado, c.egresos, c.diferencia, c.saldoHistorico]),
  ]);

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Reportes"
        descripcion="Se descargan como CSV y se abren en Excel o Google Sheets."
        acciones={(
          <TextField
            size="small" type="month" label="Mes" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: mesActual } }} sx={{ minWidth: 180 }}
          />
        )}
      />

      {!r ? <EstadoCarga cargando={reporte.cargando} error={reporte.error} onReintentar={reporte.recargar} /> : (
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <FranjaKpi items={[
            { etiqueta: `Recaudado en ${periodo}`, valor: clp(r.flujoDeCaja.totalIngresos) },
            { etiqueta: 'Egresos', valor: clp(r.flujoDeCaja.totalEgresos) },
            { etiqueta: 'Saldo del mes', valor: clp(r.flujoDeCaja.saldo), color: r.flujoDeCaja.saldo < 0 ? 'error.main' : undefined },
          ]} />

          <Tarjeta titulo="Flujo de caja" extra={<Descargar onClick={descargarFlujo} />}>
            {r.flujoDeCaja.ingresos.length + r.flujoDeCaja.egresos.length === 0 ? (
              <Typography color="text.secondary">Sin ingresos ni egresos en {periodo}.</Typography>
            ) : (
              <TableContainer>
                <Table size="small" sx={{ minWidth: 520 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Detalle</TableCell>
                      <TableCell align="right">Monto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.flujoDeCaja.ingresos.map((i) => (
                      <TableRow key={`i${i.idCobro}`}>
                        <TableCell>{fecha(i.fechaEmision)}</TableCell>
                        <TableCell>{i.concepto}<Typography variant="body2" color="text.secondary">Recaudado de {clp(i.esperado)} esperado</Typography></TableCell>
                        <TableCell align="right" sx={{ color: 'success.main', fontWeight: 700 }}>{clp(i.recaudado)}</TableCell>
                      </TableRow>
                    ))}
                    {r.flujoDeCaja.egresos.map((e) => (
                      <TableRow key={`e${e.idEgreso}`}>
                        <TableCell>{fecha(e.fechaEgreso)}</TableCell>
                        <TableCell>{e.descripcion}{e.proveedor && <Typography variant="body2" color="text.secondary">{e.proveedor}</Typography>}</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>−{clp(e.monto)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Tarjeta>

          <Tarjeta titulo="Balance por categoría" extra={<Descargar onClick={descargarBalance} disabled={r.porCategoria.length === 0} />}>
            {r.porCategoria.length === 0 ? <Typography color="text.secondary">Todavía no hay movimientos por categoría.</Typography> : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                <Table size="small" sx={{ minWidth: 640 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Categoría</TableCell>
                      <TableCell align="right">Cobrado</TableCell>
                      <TableCell align="right">Recaudado</TableCell>
                      <TableCell align="right">Egresos</TableCell>
                      <TableCell align="right">Diferencia</TableCell>
                      <TableCell align="right">Saldo histórico</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.porCategoria.map((c) => (
                      <TableRow key={c.idCategoria}>
                        <TableCell sx={{ fontWeight: 700 }}>{c.nombre}</TableCell>
                        <TableCell align="right">{clp(c.cobrado)}</TableCell>
                        <TableCell align="right">{clp(c.recaudado)}</TableCell>
                        <TableCell align="right">{clp(c.egresos)}</TableCell>
                        <TableCell align="right" sx={{ color: c.diferencia < 0 ? 'error.main' : undefined }}>{clp(c.diferencia)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: c.saldoHistorico < 0 ? 'error.main' : undefined }}>{clp(c.saldoHistorico)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <Typography variant="body2" color="text.secondary">El saldo histórico es todo lo recaudado en la categoría menos todos sus egresos válidos (por ejemplo, el fondo de reserva disponible).</Typography>
          </Tarjeta>

          <Tarjeta titulo="Estado de morosidad" extra={<Descargar onClick={descargarMorosidad} disabled={!estado.datos || !unidades.datos} />}>
            <Typography color="text.secondary">
              {estado.datos
                ? `Hoy: ${estado.datos.morosos.length} ${estado.datos.morosos.length === 1 ? 'unidad' : 'unidades'} con cobros vencidos, por ${clp(estado.datos.resumen.deudaMorosa)}. No depende del mes elegido.`
                : estado.error?.message ?? 'Cargando…'}
            </Typography>
          </Tarjeta>
        </Box>
      )}
    </Box>
  );
}
