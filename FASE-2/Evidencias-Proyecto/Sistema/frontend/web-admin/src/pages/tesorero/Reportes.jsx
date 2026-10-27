import { Box, Button, Typography } from '@mui/material';
import { FileDownloadOutlined as DescargarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { residentes } from '../../data/finanzasMock';
import { clp, descargarCSV, fecha, fechaHora, nombreUnidad } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';

const ESTADO_TEXTO = { pagado: 'Pagado', pendiente: 'Pendiente', exento: 'Exento' };

export default function Reportes() {
  const { comunidad } = useSesion();
  const { datos, cobrosDelPeriodo, morosos, unidadPorId } = useFinanzas();
  const slug = comunidad.nombre.toLowerCase().replace(/\s+/g, '-');
  const categoria = (id) => datos.categorias.find((c) => c.id === id)?.nombre ?? '';
  const egresosValidos = datos.egresos.filter((e) => !e.requiereVisado || e.estadoVisado === 'aprobado');
  const pagadoDe = (c) => Object.values(datos.cobroUnidades[c.id] ?? {}).filter((x) => x.estado === 'pagado').length * c.montoPorUnidad;

  const reportes = [
    {
      titulo: 'Estado de morosidad',
      descripcion: `Unidades con deuda de meses anteriores y lo que deben de ${datos.nombrePeriodo.toLowerCase()}.`,
      resumen: `${morosos.length} unidades · ${clp(morosos.reduce((s, m) => s + m.total, 0))}`,
      generar: () => descargarCSV(`morosidad-${slug}.csv`, [
        ['Unidad', 'Residente', 'Deuda anterior', 'Pendiente del mes', 'Total'],
        ...morosos.map((m) => [nombreUnidad(m.unidad), residentes[m.unidad.id], m.deudaAnterior, m.pendienteMes, m.total]),
      ]),
    },
    {
      titulo: 'Flujo de caja',
      descripcion: 'Ingresos registrados por cobro y egresos visados o que no requieren visado, con el saldo del periodo.',
      resumen: `${cobrosDelPeriodo.length} ingresos · ${egresosValidos.length} egresos`,
      generar: () => {
        const ingresos = cobrosDelPeriodo.map((c) => [fecha(c.emision), 'Ingreso', c.concepto, pagadoDe(c)]);
        const egresos = egresosValidos.map((e) => [fecha(e.fecha), 'Egreso', e.descripcion, -e.monto]);
        const saldo = [...ingresos, ...egresos].reduce((s, f) => s + f[3], 0);
        descargarCSV(`flujo-de-caja-${slug}.csv`, [['Fecha', 'Tipo', 'Detalle', 'Monto'], ...ingresos, ...egresos, ['', '', 'Saldo del periodo', saldo]]);
      },
    },
    {
      titulo: 'Balance mensual',
      descripcion: 'Por categoría: lo cobrado, lo recaudado y lo gastado en el mes.',
      resumen: `${datos.categorias.filter((c) => c.activa).length} categorías activas`,
      generar: () => descargarCSV(`balance-${slug}.csv`, [
        ['Categoría', 'Cobrado', 'Recaudado', 'Egresos', 'Diferencia'],
        ...datos.categorias.map((cat) => {
          const cobros = cobrosDelPeriodo.filter((c) => c.idCategoria === cat.id);
          const cobrado = cobros.reduce((s, c) => s + Object.values(datos.cobroUnidades[c.id] ?? {}).filter((x) => x.estado !== 'exento').length * c.montoPorUnidad, 0);
          const recaudado = cobros.reduce((s, c) => s + pagadoDe(c), 0);
          const gastado = egresosValidos.filter((e) => e.categoria === cat.nombre).reduce((s, e) => s + e.monto, 0);
          return [cat.nombre, cobrado, recaudado, gastado, recaudado - gastado];
        }),
      ]),
    },
    {
      titulo: 'Historial por unidad',
      descripcion: 'Cada cobro de cada unidad, con su estado y quién marcó el pago.',
      resumen: `${comunidad.unidades.length} unidades · ${datos.cobros.length} cobros`,
      generar: () => descargarCSV(`historial-por-unidad-${slug}.csv`, [
        ['Unidad', 'Residente', 'Cobro', 'Categoría', 'Monto', 'Estado', 'Marcado por', 'Fecha de registro'],
        ...datos.cobros.flatMap((c) => Object.entries(datos.cobroUnidades[c.id] ?? {}).map(([id, cu]) => [
          nombreUnidad(unidadPorId[id]), residentes[id], c.concepto, categoria(c.idCategoria), c.montoPorUnidad,
          ESTADO_TEXTO[cu.estado], cu.marcadoPor ?? '', cu.marcadoEn ? fechaHora(cu.marcadoEn) : '',
        ])),
      ]),
    },
  ];

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Encabezado
        contexto={`${comunidad.nombre} · ${datos.nombrePeriodo}`}
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
