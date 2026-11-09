import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as hogar from '@/api/hogar';
import { useConsulta } from '@/api/useConsulta';
import { useAlEnfocar } from '@/api/useAlEnfocar';
import type { FichaHogar, TipoFicha } from '@/api/tipos';
import { nombreUnidad } from '@/utils/formato';
import { FICHA, TIPOS_FICHA, porVencer, resumen, vencimiento } from '@/utils/hogar';
import Hoja from '@/components/ec/Hoja';
import Tarjeta from '@/components/ec/Tarjeta';
import Fila from '@/components/ec/Fila';
import Texto from '@/components/ec/Texto';
import Chip from '@/components/ec/Chip';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';
import PlacaUnidad from '@/components/ec/PlacaUnidad';

// Mi hogar (GET unidades/:id/fichas): la libreta privada de la vivienda. La ven todos los residentes de la unidad
// y nadie más (ni administración ni conserjería).
export default function MiHogar() {
  const t = useTema();
  const { unidad } = useSesion();
  const { datos, error, recargar } = useConsulta(() => (unidad ? hogar.listarFichas(unidad.idUnidad) : Promise.resolve([])), [unidad?.idUnidad]);
  useAlEnfocar(recargar);
  const [filtro, setFiltro] = useState<TipoFicha | 'Todas'>('Todas');
  if (!unidad) return null;

  const fichas = datos ?? [];
  const urgentes = porVencer(fichas);
  const idsUrgentes = new Set(urgentes.map((f) => f.idFicha));
  const tipos = TIPOS_FICHA.filter((x) => fichas.some((f) => f.tipo === x));
  const visibles = fichas.filter((f) => filtro === 'Todas' || f.tipo === filtro);
  const arriba = urgentes.filter((f) => filtro === 'Todas' || f.tipo === filtro);
  const resto = visibles.filter((f) => !idsUrgentes.has(f.idFicha)).sort((a, b) => TIPOS_FICHA.indexOf(a.tipo) - TIPOS_FICHA.indexOf(b.tipo) || a.titulo.localeCompare(b.titulo));

  const fila = (f: FichaHogar, n: number) => {
    const v = vencimiento(f);
    const alerta = v && v.tono !== 'neutro';
    return (
      <Fila
        key={f.idFicha} borde={n > 0} titulo={f.titulo} detalle={[f.tipo, resumen(f)].filter(Boolean).join(' · ')}
        izquierda={(
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: alerta ? t.warnSoft : t.accionSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={FICHA[f.tipo].icono} size={20} color={alerta ? t.warn : t.accion} />
          </View>
        )}
        derecha={v && idsUrgentes.has(f.idFicha) ? <Chip texto={v.texto} tono={v.tono} /> : undefined}
        onPress={() => router.push({ pathname: '/hogar/[id]', params: { id: String(f.idFicha) } })}
      />
    );
  };

  return (
    <Hoja titulo="Mi hogar" abajo={<Boton texto="Agregar ficha" icono="add" onPress={() => router.push('/hogar-ficha')} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <PlacaUnidad tipo={unidad.tipoUnidad} numero={unidad.numeroIdentificador} />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto v="fuerte">{nombreUnidad(unidad)}</Texto>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="lock-closed-outline" size={14} color={t.ink2} />
            <Texto v="chico" style={{ flex: 1 }}>Solo la ven quienes viven aquí</Texto>
          </View>
        </View>
      </View>

      {error ? (
        <>
          <Texto color={t.bad}>{error.message}</Texto>
          <Boton tipo="texto" texto="Reintentar" onPress={recargar} />
        </>
      ) : !datos ? <ActivityIndicator color={t.accion} accessibilityLabel="Cargando Mi hogar" />
        : fichas.length === 0 ? (
          <Tarjeta style={{ gap: 8 }}>
            <Texto v="fuerte">Guarda lo que siempre se olvida</Texto>
            <Texto v="suave">El código de la pintura, cuándo vence una garantía, la próxima mantención del calefont, las medidas de una ventana o el teléfono del técnico que vino. Te avisamos en Inicio cuando falte poco para una fecha.</Texto>
          </Tarjeta>
        ) : (
          <>
            {tipos.length > 1 && (
              <Opciones
                scroll valor={filtro} onCambio={setFiltro}
                opciones={[{ valor: 'Todas' as const, texto: `Todas · ${fichas.length}` }, ...tipos.map((x) => ({ valor: x, texto: FICHA[x].plural }))]}
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
