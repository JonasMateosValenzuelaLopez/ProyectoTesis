import { View } from 'react-native';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { clp, diasHasta, fecha } from '@/utils/formato';
import { totalPeriodo } from '@/utils/cuenta';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Chip from '@/components/ec/Chip';

// Historial de gastos comunes de la vivienda, con quién marcó cada pago.
export default function Pagos() {
  const t = useTema();
  const { estado, unidad } = useApp();
  if (!estado || !unidad) return null;
  const periodos = [estado.actual, ...estado.historial];
  return (
    <Hoja titulo="Mis pagos">
      {estado.deudaAnterior > 0 && (
        <View style={{ backgroundColor: t.badSoft, borderRadius: 12, padding: 12 }}>
          <Texto color={t.bad}>Tienes {clp(estado.deudaAnterior)} de meses anteriores sin pagar. Si necesitas un convenio, habla con la administración.</Texto>
        </View>
      )}
      {periodos.map((p) => (
        <Tarjeta key={p.periodo}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Texto v="subtitulo">{p.nombre}</Texto>
            <Chip texto={p.estado === 'pagado' ? 'Pagado' : p.periodo === estado.actual.periodo ? 'Pendiente' : 'Sin pagar'} tono={p.estado === 'pagado' ? 'ok' : p.periodo === estado.actual.periodo ? 'warn' : 'bad'} />
          </View>
          <Texto v="cifra" style={{ fontSize: 26, lineHeight: 30 }}>{clp(totalPeriodo(p))}</Texto>
          <Texto v="suave">{p.items.map((i) => `${i.concepto} ${clp(i.monto)}`).join(' · ')}</Texto>
          <Texto v="chico">{p.estado === 'pagado' ? `Marcado por ${p.marcadoPor} el ${fecha(p.marcadoEn!)}` : `${diasHasta(p.vence) >= 0 ? 'Vence' : 'Venció'} el ${fecha(p.vence)}`}</Texto>
        </Tarjeta>
      ))}
    </Hoja>
  );
}
