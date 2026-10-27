import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { clp, diasHasta, fecha, nombreUnidad } from '@/utils/formato';
import { resumenCuenta, totalMes, type MesCuenta } from '@/utils/cuenta';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Chip, { type Tono } from '@/components/ec/Chip';
import Boton from '@/components/ec/Boton';
import Segmentos from '@/components/ec/Segmentos';

type Filtro = 'por-pagar' | 'pagados' | 'todo';

// Finanzas de la vivienda: lo que falta pagar y el historial de pagos, con quién marcó cada uno.
// EntreCasas no recibe pagos: se transfiere a la comunidad y la administración lo marca en el panel.
export default function Finanzas() {
  const t = useTema();
  const { estado, unidad, comunidad } = useApp();
  const [filtro, setFiltro] = useState<Filtro>('por-pagar');
  if (!estado || !unidad || !comunidad) return null;

  const r = resumenCuenta(estado);
  const aviso = estado.avisoPendiente;
  const periodos = [estado.actual, ...estado.historial].filter((p) => p.gastos.length);
  const debe = (p: MesCuenta) => p.estado_pago === 'Pendiente' || p.estado_pago === 'Atrasado';
  const porPagar = periodos.filter(debe);
  const pagados = periodos.filter((p) => !debe(p));
  const lista = filtro === 'por-pagar' ? porPagar : filtro === 'pagados' ? pagados : periodos;
  const nombreCuota = comunidad.tipo === 'Villa' ? 'cuota social' : 'gasto común';

  // Mismos estados que `gastos_comunes.estado_pago`
  const estadoDe = (p: MesCuenta): { texto: string; tono: Tono } => {
    if (p.estado_pago === 'Pagado') return { texto: 'Pagado', tono: 'ok' };
    if (p.estado_pago === 'Exento') return { texto: 'Exento', tono: 'neutro' };
    if (p.estado_pago === 'Pendiente') return { texto: 'Pendiente', tono: 'warn' };
    return { texto: 'Atrasado', tono: 'bad' };
  };

  return (
    <Pantalla contexto={`${nombreUnidad(unidad)} · ${comunidad.nombre}`} titulo="Finanzas">
      <Tarjeta>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Texto v="fuerte">{r.total ? 'Total por pagar' : 'Estás al día'}</Texto>
          <Chip texto={r.estado.texto} tono={r.estado.tono} />
        </View>
        <Texto v="cifra" style={{ fontSize: 34, lineHeight: 38 }}>{clp(r.total)}</Texto>
        {r.total > 0 && (
          <Texto v="suave">
            {estado.deudaAnterior > 0 ? `Incluye ${clp(estado.deudaAnterior)} de meses anteriores. ` : ''}
            {r.pagado ? '' : `El ${nombreCuota} de ${estado.actual.nombre.split(' ')[0].toLowerCase()} vence el ${fecha(estado.actual.fecha_vencimiento)}.`}
          </Texto>
        )}
        {r.total > 0 && aviso && (
          <Texto v="chico">Avisaste una transferencia de {clp(aviso.monto)} el {fecha(aviso.fecha_pago)}. La administración la está revisando.</Texto>
        )}
        {r.total > 0 && <Boton texto={aviso ? 'Ver datos de transferencia' : 'Cómo pagar'} icono="card-outline" onPress={() => router.push('/transferencia')} />}
      </Tarjeta>

      <Segmentos
        opciones={[{ valor: 'por-pagar', texto: `Por pagar (${porPagar.length})` }, { valor: 'pagados', texto: 'Pagados' }, { valor: 'todo', texto: 'Todo' }]}
        valor={filtro} onCambio={setFiltro}
      />

      {lista.length === 0 && (
        <Texto v="suave">{filtro === 'por-pagar' ? 'No tienes cobros pendientes. Cuando la administración emita uno nuevo, aparecerá aquí.' : 'Todavía no hay pagos registrados.'}</Texto>
      )}
      {lista.map((p) => {
        const e = estadoDe(p);
        return (
          <Tarjeta key={`${p.anio}-${p.mes}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Texto v="subtitulo">{p.nombre}</Texto>
              <Chip texto={e.texto} tono={e.tono} />
            </View>
            <Texto v="cifra" style={{ fontSize: 26, lineHeight: 30 }}>{clp(totalMes(p))}</Texto>
            <View style={{ gap: 4 }}>
              {p.gastos.map((g) => (
                <View key={g.id_gasto} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Texto v="suave" style={{ flex: 1 }}>{g.concepto}{g.es_extraordinario ? ' · extraordinario' : ''}{g.estado_pago === 'Exento' ? ' · exento' : ''}</Texto>
                  <Texto v="suave">{clp(g.monto_total)}</Texto>
                </View>
              ))}
            </View>
            <Texto v="chico" color={e.tono === 'bad' ? t.bad : t.ink2}>
              {p.estado_pago === 'Pagado' && p.validadoPor
                ? `Marcado por ${p.validadoPor} el ${fecha(p.fecha_validacion!)}`
                : p.estado_pago === 'Exento' ? 'Exento por decisión de la directiva' : `${diasHasta(p.fecha_vencimiento) >= 0 ? 'Vence' : 'Venció'} el ${fecha(p.fecha_vencimiento)}`}
            </Texto>
          </Tarjeta>
        );
      })}

      <Texto v="chico" style={{ textAlign: 'center' }}>Los pagos se hacen por transferencia a la comunidad. Si necesitas un convenio por deuda, habla con la administración.</Texto>
    </Pantalla>
  );
}
