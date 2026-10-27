import { Box, Button, Typography } from '@mui/material';
import { FileDownloadOutlined as DescargarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { residentes } from '../../data/finanzasMock';
import { clp, descargarCSV, fecha, fechaHora, nombreUnidad } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';

export default function Reportes() {
  const { comunidad } = useSesion();
  const { datos, periodo, cobrosDelPeriodo, gastosPorCobro, categoriaPorId, morosos, unidadPorId, nombreUsuario } = useFinanzas();
  const slug = comunidad.nombre.toLowerCase().replace(/\s+/g, '-');
  const categoria = (id) => categoriaPorId[id]?.nombre ?? '';
  const egresosValidos = datos.egresos.filter((e) => !e.requiere_visado || e.estado_visado === 'Aprobado');
  const suma = (gastos) => gastos.reduce((s, g) => s + g.monto_total, 0);
  const pagadoDe = (c) => suma((gastosPorCobro[c.id_cobro] ?? []).filter((g) => g.estado_pago === 'Pagado'));
  // Pago validado de cada gasto, para saber quién lo registró
  const validadoDe = (id_gasto) => datos.pagos.find((pg) => pg.id_gasto === id_gasto && pg.estado_validacion === 'Validado');

  const reportes = [
    {
      titulo: 'Estado de morosidad',
      descripcion: `Unidades con deuda de meses anteriores y lo que deben de ${periodo.nombre}.`,
      resumen: `${morosos.length} unidades · ${clp(morosos.reduce((s, m) => s + m.total, 0))}`,
      generar: () => descargarCSV(`morosidad-${slug}.csv`, [
        ['Unidad', 'Residente', 'Deuda anterior', 'Pendiente del mes', 'Total'],
        ...morosos.map((m) => [nombreUnidad(m.unidad), residentes[m.unidad.id_unidad], m.deudaAnterior, m.pendienteMes, m.total]),
      ]),
    },
    {
      titulo: 'Flujo de caja',
      descripcion: 'Ingresos registrados por cobro y egresos visados o que no requieren visado, con el saldo del periodo.',
      resumen: `${cobrosDelPeriodo.length} ingresos · ${egresosValidos.length} egresos`,
      generar: () => {
        const ingresos = cobrosDelPeriodo.map((c) => [fecha(c.fecha_emision), 'Ingreso', c.concepto, pagadoDe(c)]);
        const egresos = egresosValidos.map((e) => [fecha(e.fecha), 'Egreso', e.proveedor ? `${e.descripcion} (${e.proveedor})` : e.descripcion, -e.monto]);
        const saldo = [...ingresos, ...egresos].reduce((s, f) => s + f[3], 0);
        descargarCSV(`flujo-de-caja-${slug}.csv`, [['Fecha', 'Tipo', 'Detalle', 'Monto'], ...ingresos, ...egresos, ['', '', 'Saldo del periodo', saldo]]);
      },
    },
    {
      titulo: 'Balance mensual',
      descripcion: 'Por categoría: lo cobrado, lo recaudado y lo gastado en el mes.',
      resumen: `${datos.categorias_cobro.filter((c) => c.activa).length} categorías activas`,
      generar: () => descargarCSV(`balance-${slug}.csv`, [
        ['Categoría', 'Cobrado', 'Recaudado', 'Egresos', 'Diferencia'],
        ...datos.categorias_cobro.map((cat) => {
          const cobros = cobrosDelPeriodo.filter((c) => c.id_categoria === cat.id_categoria);
          const cobrado = cobros.reduce((s, c) => s + suma((gastosPorCobro[c.id_cobro] ?? []).filter((g) => g.estado_pago !== 'Exento')), 0);
          const recaudado = cobros.reduce((s, c) => s + pagadoDe(c), 0);
          const gastado = egresosValidos
            .filter((e) => e.id_categoria === cat.id_categoria && e.fecha.startsWith(`${periodo.anio}-${String(periodo.mes).padStart(2, '0')}`))
            .reduce((s, e) => s + e.monto, 0);
          return [cat.nombre, cobrado, recaudado, gastado, recaudado - gastado];
        }),
      ]),
    },
    {
      titulo: 'Historial por unidad',
      descripcion: 'Cada cobro de cada unidad, con su estado y quién marcó el pago.',
      resumen: `${comunidad.unidades.length} unidades · ${datos.cobros.length} cobros`,
      generar: () => descargarCSV(`historial-por-unidad-${slug}.csv`, [
        ['Unidad', 'Residente', 'Cobro', 'Categoría', 'Monto', 'Estado', 'Validado por', 'Fecha de validación'],
        ...datos.cobros.flatMap((c) => (gastosPorCobro[c.id_cobro] ?? []).map((g) => {
          const pago = validadoDe(g.id_gasto);
          return [
            nombreUnidad(unidadPorId[g.id_unidad]), residentes[g.id_unidad], c.concepto, categoria(c.id_categoria), g.monto_total,
            g.estado_pago, pago ? nombreUsuario(pago.id_validador) : '', pago ? fechaHora(pago.fecha_validacion) : '',
          ];
        })),
      ]),
    },
  ];

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Encabezado
        contexto={`${comunidad.nombre} · ${periodo.nombre}`}
        titulo="Reportes"
        descripcion="Se descargan como CSV y se abren en Excel o Google Sheets."
      />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {reportes.map((r) => (
          <Tarjeta key={r.titulo} titulo={r.titulo}>
            <Typography color="text.secondary">{r.descripcion}</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.resumen}</Typography>
              <Button variant="outlined" startIcon={<DescargarIcon />} onClick={r.generar}>Descargar CSV</Button>
            </Box>
          </Tarjeta>
        ))}
      </Box>
    </Box>
  );
}
