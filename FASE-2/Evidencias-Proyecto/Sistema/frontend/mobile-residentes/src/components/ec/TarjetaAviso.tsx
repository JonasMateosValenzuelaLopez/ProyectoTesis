import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/constants/tema';
import type { AvisoMercado } from '@/api/tipos';
import { clp, hace } from '@/utils/formato';
import Tarjeta from './Tarjeta';
import Texto from './Texto';
import Chip from './Chip';
import PlacaUnidad from './PlacaUnidad';

type Icono = keyof typeof Ionicons.glyphMap;

// Un aviso del mercado en la lista. Toda la tarjeta abre la ficha; abajo se ve en qué va el contacto
// (pedirlo, esperando, aceptado o no disponible) o, si es mío, cuántos vecinos esperan respuesta.
export default function TarjetaAviso({ a, interesados = 0, alTocar }: { a: AvisoMercado; interesados?: number; alTocar: () => void }) {
  const t = useTema();
  const oculto = a.estadoModeracion === 'Oculta';
  const s = a.miSolicitud;
  const [icono, etiqueta, color]: [Icono, string, string] = a.esMia
    ? ['chevron-forward', oculto ? 'Oculto por la administración' : a.cerradoEn ? 'Reabrir o revisar'
      : interesados ? `${interesados} ${interesados === 1 ? 'vecino interesado' : 'vecinos interesados'}` : a.tipo === 'Vendo' ? 'Editar o marcar como vendido' : 'Editar o cerrar',
    interesados ? t.accion : t.ink2]
    : !s ? ['chatbubble-ellipses-outline', 'Contactar', t.accion]
      : s.estado === 'Pendiente' ? ['time-outline', 'Solicitud enviada', t.ink2]
        : s.estado === 'Aceptada' ? ['logo-whatsapp', 'Ver contacto', t.ok]
          : ['close-circle-outline', 'No disponible', t.ink2];

  return (
    <Pressable onPress={alTocar} accessibilityRole="button" accessibilityLabel={`Ver aviso ${a.titulo}`} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Tarjeta>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {a.unidad && <PlacaUnidad tipo="" numero={a.unidad.numeroIdentificador} size="sm" />}
          <View style={{ flex: 1 }}>
            <Texto v="fuerte">{a.esMia ? 'Tú' : a.autor?.nombre ?? 'Un vecino'}</Texto>
            <Texto v="chico">{hace(a.fecha)}</Texto>
          </View>
          {oculto ? <Chip texto="Oculto" tono="bad" />
            : a.cerradoEn ? <Chip texto={a.tipo === 'Vendo' ? 'Vendido' : 'Cerrado'} />
              : <Chip texto={a.tipo} tono={a.tipo === 'Vendo' ? 'accion' : a.tipo === 'Busco' ? 'senal' : 'neutro'} />}
        </View>
        <Texto v="subtitulo">{a.titulo}</Texto>
        {!!a.descripcion && <Texto numberOfLines={3}>{a.descripcion}</Texto>}
        {a.precio != null && <Texto v="cifra" style={{ fontSize: 22, lineHeight: 26 }}>{clp(a.precio)}</Texto>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {!a.esMia && <Ionicons name={icono} size={18} color={color} />}
          <Texto v="fuerte" color={color} style={{ flex: a.esMia ? 1 : undefined }}>{etiqueta}</Texto>
          <Ionicons name="chevron-forward" size={16} color={color} />
        </View>
      </Tarjeta>
    </Pressable>
  );
}
