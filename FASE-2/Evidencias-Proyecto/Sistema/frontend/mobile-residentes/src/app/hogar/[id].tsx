import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/App';
import { F, useTema } from '@/constants/tema';
import { fecha, fechaLargaTexto, telefono } from '@/utils/formato';
import { FICHA, vencimiento } from '@/utils/hogar';
import Hoja from '@/components/ec/Hoja';
import Tarjeta from '@/components/ec/Tarjeta';
import Fila from '@/components/ec/Fila';
import Texto from '@/components/ec/Texto';
import Chip from '@/components/ec/Chip';
import Boton from '@/components/ec/Boton';

// Una ficha de Mi hogar con sus fechas, el contacto para llamar y las acciones para editarla.
export default function DetalleFicha() {
  const t = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { misFichas, nombreDe, acciones } = useApp();
  const [borrando, setBorrando] = useState(false);
  const f = misFichas.find((x) => x.id_ficha === Number(id));
  if (!f) return <Hoja titulo="Mi hogar"><Texto>Esta ficha ya no está.</Texto></Hoja>;

  const c = FICHA[f.tipo];
  const v = vencimiento(f);
  const tel = f.contacto_telefono;
  const quien = f.tipo === 'Técnico' ? f.titulo : f.contacto_nombre;

  return (
    <Hoja
      titulo={f.tipo}
      abajo={f.tipo === 'Mantención'
        ? <Boton texto="Registrar mantención de hoy" icono="checkmark" onPress={() => acciones.registrarMantencion(f.id_ficha)} />
        : undefined}
    >
      <View style={{ gap: 6 }}>
        <Texto v="titulo">{f.titulo}</Texto>
        {f.tipo !== 'Técnico' && !!f.detalle && <Texto v="suave">{f.detalle}</Texto>}
      </View>

      {v && f.fecha_vence && (
        <Tarjeta style={{ backgroundColor: v.tono === 'neutro' ? t.accionSoft : v.tono === 'bad' ? t.badSoft : t.warnSoft, gap: 4 }}>
          <Texto v="etiqueta" color={v.tono === 'neutro' ? t.accion : v.tono === 'bad' ? t.bad : t.warn}>{c.vence}</Texto>
          <Texto style={{ fontFamily: F.cifra, fontSize: 24, lineHeight: 30 }}>{fechaLargaTexto(f.fecha_vence)}</Texto>
          <Chip texto={v.texto} tono={v.tono} />
        </Tarjeta>
      )}

      {(f.fecha || f.tipo === 'Técnico') && (
        <Tarjeta style={{ gap: 0 }}>
          {f.fecha && <Fila borde={false} titulo={(c.fecha ?? 'Fecha').replace(' (opcional)', '')} detalle={fechaLargaTexto(f.fecha) + ` de ${f.fecha.slice(0, 4)}`} />}
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
        Agregada{f.id_usuario_crea ? ` por ${nombreDe(f.id_usuario_crea)}` : ''} el {fecha(f.fecha_registro)}. La ven todos los que viven aquí.
      </Texto>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Boton
          tipo="secundario" texto="Editar" icono="create-outline" style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/hogar-ficha', params: { id: String(f.id_ficha) } })}
        />
        <Boton
          tipo="peligro" texto={borrando ? '¿Eliminar?' : 'Eliminar'} icono="trash-outline" style={{ flex: 1 }}
          onPress={() => { if (!borrando) { setBorrando(true); return; } acciones.eliminarFicha(f.id_ficha); router.back(); }}
        />
      </View>
      {borrando && <Texto v="chico" color={t.bad}>Toca de nuevo para eliminarla. No se puede deshacer.</Texto>}
    </Hoja>
  );
}
