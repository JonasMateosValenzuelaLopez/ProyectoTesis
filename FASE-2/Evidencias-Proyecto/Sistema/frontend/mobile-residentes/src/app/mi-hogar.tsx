import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { TIPOS_FICHA, tipoUnidad, type HogarFicha, type TipoFicha } from '@/data/demo';
import { nombreUnidad } from '@/utils/formato';
import { FICHA, resumen, vencimiento } from '@/utils/hogar';
import Hoja from '@/components/ec/Hoja';
import Tarjeta from '@/components/ec/Tarjeta';
import Fila from '@/components/ec/Fila';
import Texto from '@/components/ec/Texto';
import Chip from '@/components/ec/Chip';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';
import PlacaUnidad from '@/components/ec/PlacaUnidad';

// Mi hogar: la libreta privada de la vivienda. La ven todos los residentes activos de la unidad
// y nadie más (ni administración ni conserjería).
export default function MiHogar() {
  const t = useTema();
  const { unidad, misFichas, fichasPorVencer } = useApp();
  const [filtro, setFiltro] = useState<TipoFicha | 'Todas'>('Todas');
  if (!unidad) return null;

  const porVencer = new Set(fichasPorVencer.map((f) => f.id_ficha));
  const tipos = TIPOS_FICHA.filter((x) => misFichas.some((f) => f.tipo === x));
  const visibles = misFichas.filter((f) => filtro === 'Todas' || f.tipo === filtro);
  const arriba = fichasPorVencer.filter((f) => filtro === 'Todas' || f.tipo === filtro);
  const resto = visibles.filter((f) => !porVencer.has(f.id_ficha)).sort((a, b) => TIPOS_FICHA.indexOf(a.tipo) - TIPOS_FICHA.indexOf(b.tipo) || a.titulo.localeCompare(b.titulo));

  const fila = (f: HogarFicha, n: number) => {
    const v = vencimiento(f);
    return (
      <Fila
        key={f.id_ficha} borde={n > 0} titulo={f.titulo} detalle={`${f.tipo} · ${resumen(f)}`}
        izquierda={<View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: v && v.tono !== 'neutro' ? t.warnSoft : t.accionSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={FICHA[f.tipo].icono} size={20} color={v && v.tono !== 'neutro' ? t.warn : t.accion} />
        </View>}
        derecha={v && porVencer.has(f.id_ficha) ? <Chip texto={v.texto} tono={v.tono} /> : undefined}
        onPress={() => router.push({ pathname: '/hogar/[id]', params: { id: String(f.id_ficha) } })}
      />
    );
  };

  return (
    <Hoja titulo="Mi hogar" abajo={<Boton texto="Agregar ficha" icono="add" onPress={() => router.push('/hogar-ficha')} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <PlacaUnidad tipo={tipoUnidad(unidad)} numero={unidad.numero_identificador} />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto v="fuerte">{nombreUnidad(unidad)}</Texto>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="lock-closed-outline" size={14} color={t.ink2} />
            <Texto v="chico" style={{ flex: 1 }}>Solo la ven quienes viven aquí</Texto>
          </View>
        </View>
      </View>

      {misFichas.length === 0 ? (
        <Tarjeta style={{ gap: 8 }}>
          <Texto v="fuerte">Guarda lo que siempre se olvida</Texto>
          <Texto v="suave">El código de la pintura, cuándo vence una garantía, la próxima mantención del calefont, las medidas de una ventana o el teléfono del técnico que vino. Te avisamos en Inicio cuando falte poco para una fecha.</Texto>
        </Tarjeta>
      ) : (
        <>
          {tipos.length > 1 && (
            <Opciones
              scroll valor={filtro} onCambio={setFiltro}
              opciones={[{ valor: 'Todas' as const, texto: `Todas · ${misFichas.length}` }, ...tipos.map((x) => ({ valor: x, texto: FICHA[x].plural }))]}
            />
          )}
          {arriba.length > 0 && (
            <View style={{ gap: 8 }}>
              <Texto v="etiqueta">Por vencer</Texto>
              <Tarjeta style={{ gap: 0 }}>{arriba.map(fila)}</Tarjeta>
            </View>
          )}
          {resto.length > 0 && (
            <View style={{ gap: 8 }}>
              {arriba.length > 0 && <Texto v="etiqueta">El resto</Texto>}
              <Tarjeta style={{ gap: 0 }}>{resto.map(fila)}</Tarjeta>
            </View>
          )}
        </>
      )}
    </Hoja>
  );
}
