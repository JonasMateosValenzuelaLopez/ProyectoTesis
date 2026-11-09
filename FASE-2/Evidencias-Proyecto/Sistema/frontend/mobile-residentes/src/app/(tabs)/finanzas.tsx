import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import { nombrePeriodo, useMiCuenta } from '@/api/useMiCuenta';
import type { CobroCuenta } from '@/api/tipos';
import { clp, diasHasta, fecha, nombreUnidad } from '@/utils/formato';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Chip, { type Tono } from '@/components/ec/Chip';
import Boton from '@/components/ec/Boton';
import Segmentos from '@/components/ec/Segmentos';

type Filtro = 'por-pagar' | 'pagados' | 'todo';
const EN_CURSO = ['Pendiente', 'Por aprobar'];

// Estado de un cobro de la unidad (cobro_unidades.estado; «atrasado» = pendiente después de su vencimiento)
const estadoDe = (c: CobroCuenta): { texto: string; tono: Tono } => {
  if (c.estado === 'Pagado') return { texto: 'Pagado', tono: 'ok' };
  if (c.estado === 'Exento') return { texto: 'Exento', tono: 'neutro' };
  if (c.atrasado) return { texto: 'Vencido', tono: 'bad' };
  return { texto: 'Pendiente', tono: 'warn' };
};

// Finanzas de la vivienda (GET finanzas/mi-cuenta): lo que falta pagar y el historial.
// EntreCasas no recibe pagos: se transfiere a la comunidad y la administración lo marca en el panel.
export default function Finanzas() {
  const t = useTema();
  const { unidad, comunidad } = useSesion();
  const { cuenta, cargando, error, recargar } = useMiCuenta();
  const [filtro, setFiltro] = useState<Filtro>('por-pagar');
  if (!unidad || !comunidad) return null;
  const contexto = `${nombreUnidad(unidad)} · ${comunidad.nombre}`;

  if (!cuenta) {
    return (
      <Pantalla contexto={contexto} titulo="Finanzas">
        <Tarjeta>
          {error ? (
            <>
              <Texto color={t.bad}>{error.message}</Texto>
              <Boton tipo="texto" texto="Reintentar" onPress={recargar} />
            </>
          ) : cargando ? <ActivityIndicator color={t.accion} accessibilityLabel="Cargando tu cuenta" />
            : <Texto v="suave">No encontramos la cuenta de esta vivienda.</Texto>}
        </Tarjeta>
      </Pantalla>
    );
  }

  const cobros = cuenta.cobros;
  const porPagar = cobros.filter((c) => c.estado === 'Pendiente');
  const avisosPendientes = cobros.flatMap((c) => c.avisos.filter((a) => a.estado === 'Pendiente'));
  const avisado = avisosPendientes.reduce((s, a) => s + a.monto, 0);
  // El último aviso rechazado de un cobro que sigue pendiente (si no hay otro aviso en revisión)
  const rechazado = avisosPendientes.length ? null
    : porPagar.flatMap((c) => c.avisos.filter((a) => a.estado === 'Rechazado')).sort((a, b) => b.idAviso - a.idAviso)[0] ?? null;
  const proximo = porPagar.filter((c) => !c.atrasado).sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))[0];
  const resumen: { texto: string; tono: Tono } = cuenta.total === 0 ? { texto: 'Al día', tono: 'ok' }
    : cuenta.deudaAtrasada > 0 ? { texto: 'Con deuda', tono: 'bad' } : { texto: 'Pendiente', tono: 'warn' };

  const lista = filtro === 'por-pagar' ? porPagar : filtro === 'pagados' ? cobros.filter((c) => c.estado !== 'Pendiente') : cobros;
  // Agrupados por mes, del más reciente al más antiguo (el backend ya los entrega en ese orden)
  const periodos = [...new Set(lista.map((c) => c.periodo))].map((p) => ({ periodo: p, cobros: lista.filter((c) => c.periodo === p) }));

  const detalle = (c: CobroCuenta) => {
    if (c.estado === 'Pagado') return c.pagadoMarcadoEn ? `Marcado como pagado el ${fecha(c.pagadoMarcadoEn)}` : 'Pagado';
    if (c.estado === 'Exento') return 'Exento por decisión de la directiva';
    if (c.exencion && EN_CURSO.includes(c.exencion.estado)) return 'Pediste una exención: la directiva la está revisando';
    const aviso = c.avisos.find((a) => a.estado === 'Pendiente');
    if (aviso) return `Avisaste ${clp(aviso.monto)}: la administración lo está revisando`;
    return `${diasHasta(c.fechaVencimiento) >= 0 ? 'Vence' : 'Venció'} el ${fecha(c.fechaVencimiento)}`;
  };
  const puedePedirExencion = (c: CobroCuenta) => c.estado === 'Pendiente' && !(c.exencion && EN_CURSO.includes(c.exencion.estado));

  return (
    <Pantalla contexto={contexto} titulo="Finanzas">
      <Tarjeta>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Texto v="fuerte">{cuenta.total ? 'Total por pagar' : 'Estás al día'}</Texto>
          <Chip texto={resumen.texto} tono={resumen.tono} />
        </View>
        <Texto v="cifra" style={{ fontSize: 34, lineHeight: 38 }}>{clp(cuenta.total)}</Texto>
        {cuenta.total > 0 && (
          <Texto v="suave">
            {cuenta.deudaAtrasada > 0 ? `Incluye ${clp(cuenta.deudaAtrasada)} ya vencidos. ` : ''}
            {proximo ? `«${proximo.concepto}» vence el ${fecha(proximo.fechaVencimiento)}.` : ''}
          </Texto>
        )}
        {avisado > 0 && (
          <Texto v="chico">Avisaste una transferencia de {clp(avisado)}. La administración la está revisando.</Texto>
        )}
        {rechazado && (
          <View style={{ backgroundColor: t.badSoft, borderRadius: 12, padding: 12 }}>
            <Texto color={t.bad}>
              La administración no encontró tu transferencia de {clp(rechazado.monto)} del {fecha(rechazado.fechaPago)}
              {rechazado.motivoRechazo ? `: «${rechazado.motivoRechazo}»` : ''}. Revisa los datos y vuelve a avisar.
            </Texto>
          </View>
        )}
        {cuenta.total > 0 && <Boton texto={avisado ? 'Ver datos de transferencia' : 'Cómo pagar'} icono="card-outline" onPress={() => router.push('/transferencia')} />}
      </Tarjeta>

      <Segmentos
        opciones={[{ valor: 'por-pagar', texto: `Por pagar (${porPagar.length})` }, { valor: 'pagados', texto: 'Pagados' }, { valor: 'todo', texto: 'Todo' }]}
        valor={filtro} onCambio={setFiltro}
      />

      {periodos.length === 0 && (
        <Texto v="suave">{filtro === 'por-pagar' ? 'No tienes cobros pendientes. Cuando la administración emita uno nuevo, aparecerá aquí.' : 'Todavía no hay pagos registrados.'}</Texto>
      )}
      {periodos.map((p) => (
        <Tarjeta key={p.periodo}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Texto v="subtitulo" style={{ textTransform: 'capitalize' }}>{nombrePeriodo(p.periodo)}</Texto>
            <Texto v="fuerte">{clp(p.cobros.reduce((s, c) => s + c.monto, 0))}</Texto>
          </View>
          {p.cobros.map((c, n) => {
            const e = estadoDe(c);
            return (
              <View key={c.idCobroUnidad} style={{ gap: 4, paddingTop: n ? 10 : 2, borderTopWidth: n ? 1 : 0, borderColor: t.line }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <Texto v="fuerte" style={{ flex: 1 }}>{c.concepto}{c.extraordinario ? ' · extraordinario' : ''}</Texto>
                  <Chip texto={e.texto} tono={e.tono} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Texto v="chico" color={e.tono === 'bad' ? t.bad : t.ink2} style={{ flex: 1 }}>{detalle(c)}</Texto>
                  <Texto v="suave">{clp(c.monto)}</Texto>
                </View>
                {puedePedirExencion(c) && (
                  <Boton tipo="texto" texto="Pedir exención" onPress={() => router.push({ pathname: '/exencion', params: { id: String(c.idCobroUnidad) } })} style={{ alignSelf: 'flex-start' }} />
                )}
              </View>
            );
          })}
        </Tarjeta>
      ))}

      <Texto v="chico" style={{ textAlign: 'center' }}>Los pagos se hacen por transferencia a la comunidad. Si necesitas un convenio por deuda, habla con la administración.</Texto>
    </Pantalla>
  );
}
