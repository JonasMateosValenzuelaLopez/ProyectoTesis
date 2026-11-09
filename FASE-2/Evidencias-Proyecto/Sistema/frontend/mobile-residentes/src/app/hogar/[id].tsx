import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSesion } from '@/context/Sesion';
import { F, useTema } from '@/constants/tema';
import * as hogar from '@/api/hogar';
import { mensajeDe } from '@/api/cliente';
import { useConsulta } from '@/api/useConsulta';
import { useAlEnfocar } from '@/api/useAlEnfocar';
import { fecha, fechaLargaTexto, telefono } from '@/utils/formato';
import { FICHA, vencimiento } from '@/utils/hogar';
import Hoja from '@/components/ec/Hoja';
import Tarjeta from '@/components/ec/Tarjeta';
import Fila from '@/components/ec/Fila';
import Texto from '@/components/ec/Texto';
import Chip from '@/components/ec/Chip';
import Boton from '@/components/ec/Boton';

// Una ficha de Mi hogar con sus fechas, el contacto para llamar y las acciones para editarla.
// La API no tiene un GET por ficha, así que se busca en las de la vivienda.
export default function DetalleFicha() {
  const t = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { unidad, acciones } = useSesion();
  const { datos, error, recargar, setDatos } = useConsulta(() => (unidad ? hogar.listarFichas(unidad.idUnidad) : Promise.resolve([])), [unidad?.idUnidad]);
  useAlEnfocar(recargar);
  const [borrando, setBorrando] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  if (!datos) {
    return <Hoja titulo="Mi hogar">{error ? <Texto color={t.bad}>{error.message}</Texto> : <ActivityIndicator color={t.accion} accessibilityLabel="Cargando la ficha" />}</Hoja>;
  }
  const f = datos.find((x) => x.idFicha === Number(id));
  if (!f) return <Hoja titulo="Mi hogar"><Texto>Esta ficha ya no está.</Texto></Hoja>;

  const c = FICHA[f.tipo];
  const v = vencimiento(f);
  const tel = f.contactoTelefono;
  const quien = f.tipo === 'Técnico' ? f.titulo : f.contactoNombre;

  const mantencion = async () => {
    setEnviando('mantencion');
    try {
      const nueva = await hogar.registrarMantencion(f.idFicha);
      setDatos((l) => (l ?? []).map((x) => (x.idFicha === nueva.idFicha ? nueva : x)));
      acciones.avisar(nueva.fechaVence ? `Listo. La próxima toca el ${fecha(nueva.fechaVence)}.` : 'Mantención registrada.');
    } catch (e) {
      acciones.avisar(mensajeDe(e));
    } finally {
      setEnviando(null);
    }
  };
  const eliminar = async () => {
    if (!borrando) { setBorrando(true); return; }
    setEnviando('eliminar');
    try {
      await hogar.eliminarFicha(f.idFicha);
      acciones.avisar('Ficha eliminada.');
      router.back();
    } catch (e) {
      acciones.avisar(mensajeDe(e));
      setEnviando(null);
    }
  };

  return (
    <Hoja
      titulo={f.tipo}
      abajo={f.tipo === 'Mantención'
        ? <Boton texto="Registrar mantención de hoy" icono="checkmark" cargando={enviando === 'mantencion'} onPress={mantencion} />
        : undefined}
    >
      <View style={{ gap: 6 }}>
        <Texto v="titulo">{f.titulo}</Texto>
        {f.tipo !== 'Técnico' && !!f.detalle && <Texto v="suave">{f.detalle}</Texto>}
      </View>

      {v && f.fechaVence && (
        <Tarjeta style={{ backgroundColor: v.tono === 'neutro' ? t.accionSoft : v.tono === 'bad' ? t.badSoft : t.warnSoft, gap: 4 }}>
          <Texto v="etiqueta" color={v.tono === 'neutro' ? t.accion : v.tono === 'bad' ? t.bad : t.warn}>{c.vence}</Texto>
          <Texto style={{ fontFamily: F.cifra, fontSize: 24, lineHeight: 30 }}>{fechaLargaTexto(f.fechaVence)}</Texto>
          <Chip texto={v.texto} tono={v.tono} />
        </Tarjeta>
      )}

      {(f.fecha || (f.tipo === 'Técnico' && f.detalle)) && (
        <Tarjeta style={{ gap: 0 }}>
          {f.fecha && <Fila borde={false} titulo={(c.fecha ?? 'Fecha').replace(' (opcional)', '')} detalle={`${fechaLargaTexto(f.fecha)} de ${f.fecha.slice(0, 4)}`} />}
          {f.tipo === 'Técnico' && !!f.detalle && <Fila borde={!!f.fecha} titulo="Qué hizo" detalle={f.detalle} />}
        </Tarjeta>
      )}

      {(quien || tel) && (
        <View style={{ gap: 8 }}>
          {f.tipo !== 'Técnico' && <Texto v="etiqueta">Quién la hizo</Texto>}
          <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Texto v="fuerte">{quien ?? 'Técnico'}</Texto>
              {!!tel && <Texto v="chico">{telefono(tel)}</Texto>}
            </View>
            {!!tel && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${tel}`)} accessibilityRole="button" accessibilityLabel={`Llamar a ${quien ?? 'el técnico'}`}
                style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.boton, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="call" size={20} color={t.botonInk} />
              </Pressable>
            )}
          </Tarjeta>
        </View>
      )}

      <Texto v="chico">
        Agregada{f.creadoPor?.nombre ? ` por ${f.creadoPor.nombre}` : ''} el {fecha(f.fechaCreacion)}. La ven todos los que viven aquí.
      </Texto>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Boton
          tipo="secundario" texto="Editar" icono="create-outline" style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/hogar-ficha', params: { id: String(f.idFicha) } })}
        />
        <Boton tipo="peligro" texto={borrando ? '¿Eliminar?' : 'Eliminar'} icono="trash-outline" style={{ flex: 1 }} cargando={enviando === 'eliminar'} onPress={eliminar} />
      </View>
      {borrando && <Texto v="chico" color={t.bad}>Toca de nuevo para eliminarla. No se puede deshacer.</Texto>}
    </Hoja>
  );
}
