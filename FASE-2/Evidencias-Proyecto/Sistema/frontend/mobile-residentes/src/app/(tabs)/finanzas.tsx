import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import type { Periodo } from '@/data/demo';
import { clp, diasHasta, fecha, nombreUnidad } from '@/utils/formato';
import { resumenCuenta, totalPeriodo } from '@/utils/cuenta';
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
  const { estado, unidad, comunidad, avisoTransferencia } = useApp();
  const [filtro, setFiltro] = useState<Filtro>('por-pagar');
  if (!estado || !unidad || !comunidad) return null;

  const r = resumenCuenta(estado);
  const actual = estado.actual.periodo;
  const periodos = [estado.actual, ...estado.historial];
  const porPagar = periodos.filter((p) => p.estado === 'pendiente');
  const pagados = periodos.filter((p) => p.estado !== 'pendiente');
  const lista = filtro === 'por-pagar' ? porPagar : filtro === 'pagados' ? pagados : periodos;
  const nombreCuota = comunidad.tipo === 'Villa' ? 'cuota social' : 'gasto común';

  const estadoDe = (p: Periodo): { texto: string; tono: Tono } => {
    if (p.estado === 'pagado') return { texto: 'Pagado', tono: 'ok' };
    if (p.estado === 'exento') return { texto: 'Exento', tono: 'neutro' };
    if (p.periodo === actual && diasHasta(p.vence) >= 0) return { texto: 'Pendiente', tono: 'warn' };
    return { texto: 'Sin pagar', tono: 'bad' };
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
            {r.pagado ? '' : `El ${nombreCuota} de ${estado.actual.nombre.split(' ')[0].toLowerCase()} vence el ${fecha(estado.actual.vence)}.`}
          </Texto>
        )}
        {r.total > 0 && avisoTransferencia && (
          <Texto v="chico">Avisaste una transferencia de {clp(avisoTransferencia.monto)} el {fecha(avisoTransferencia.fecha)}. La administración la está revisando.</Texto>
        )}
        {r.total > 0 && <Boton texto={avisoTransferencia ? 'Ver datos de transferencia' : 'Cómo pagar'} icono="card-outline" onPress={() => router.push('/transferencia')} />}
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
          <Tarjeta key={p.periodo}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Texto v="subtitulo">{p.nombre}</Texto>
              <Chip texto={e.texto} tono={e.tono} />
            </View>
            <Texto v="cifra" style={{ fontSize: 26, lineHeight: 30 }}>{clp(totalPeriodo(p))}</Texto>
            <View style={{ gap: 4 }}>
              {p.items.map((i) => (
                <View key={i.concepto} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Texto v="suave" style={{ flex: 1 }}>{i.concepto}{i.extraordinario ? ' · extraordinario' : ''}</Texto>
                  <Texto v="suave">{clp(i.monto)}</Texto>
                </View>
              ))}
            </View>
            <Texto v="chico" color={p.estado === 'pagado' ? t.ink2 : e.tono === 'bad' ? t.bad : t.ink2}>
              {p.estado === 'pagado' ? `Marcado por ${p.marcadoPor} el ${fecha(p.marcadoEn!)}` : `${diasHasta(p.vence) >= 0 ? 'Vence' : 'Venció'} el ${fecha(p.vence)}`}
            </Texto>
          </Tarjeta>
        );
      })}

      <Texto v="chico" style={{ textAlign: 'center' }}>Los pagos se hacen por transferencia a la comunidad. Si necesitas un convenio por deuda, habla con la administración.</Texto>
    </Pantalla>
  );
}
