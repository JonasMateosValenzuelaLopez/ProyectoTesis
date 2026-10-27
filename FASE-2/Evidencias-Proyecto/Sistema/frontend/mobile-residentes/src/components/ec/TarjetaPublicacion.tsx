import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp, type Publicacion } from '@/context/App';
import { useTema } from '@/constants/tema';
import { UNIDADES } from '@/data/demo';
import { clp, hace, nombreUnidad } from '@/utils/formato';
import Tarjeta from './Tarjeta';
import Texto from './Texto';
import Boton from './Boton';
import Chip from './Chip';
import PlacaUnidad from './PlacaUnidad';
import Opciones from './Opciones';
import SelloCargo from './SelloCargo';

// Una publicación del muro o del mercado. Lo oficial lleva el sello de la directiva;
// lo de vecinos lleva la placa de su vivienda y se puede reportar.
// Con `alTocar` (avisos del mercado) toda la tarjeta abre la ficha del aviso; abajo se ve
// en qué va el contacto: pedirlo, esperando respuesta, aceptado o no disponible.

const MOTIVOS = ['Lenguaje ofensivo', 'Acusación o datos de otro vecino', 'Posible estafa', 'Comercio fuera del mercado', 'Otro motivo'] as const;
type Motivo = (typeof MOTIVOS)[number];
export default function TarjetaPublicacion({ p, alTocar }: { p: Publicacion; alTocar?: () => void }) {
  const t = useTema();
  const { unidad, acciones, solicitudDe, solicitudesRecibidas } = useApp();
  const [confirmar, setConfirmar] = useState<'reportar' | 'eliminar' | null>(null);
  const [motivo, setMotivo] = useState<Motivo | null>(null);
  const cerrar = () => { setConfirmar(null); setMotivo(null); };
  const u = p.id_unidad ? UNIDADES[p.id_unidad] : undefined;
  const mia = !!unidad && p.id_unidad === unidad.id_unidad;
  const s = alTocar && !mia ? solicitudDe(p.id) : null;
  const interesados = mia ? solicitudesRecibidas.filter((x) => x.id_producto === p.id && x.estado === 'Pendiente').length : 0;
  type Icono = keyof typeof Ionicons.glyphMap;
  const [icono, etiqueta, color]: [Icono, string, string] = !s ? ['chatbubble-ellipses-outline', 'Contactar', t.accion]
    : s.estado === 'Pendiente' ? ['time-outline', 'Solicitud enviada', t.ink2]
      : s.estado === 'Aceptada' ? ['logo-whatsapp', 'Ver contacto', t.ok]
        : ['close-circle-outline', 'No disponible', t.ink2];

  const tarjeta = (
    <Tarjeta acento={p.oficial ? t.patina : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {p.oficial ? <SelloCargo cargo={p.oficial.cargo} size={30} /> : u ? <PlacaUnidad tipo="" numero={u.numero_identificador} size="sm" /> : null}
        <View style={{ flex: 1 }}>
          <Texto v="fuerte">{p.oficial ? `${p.oficial.tipo} oficial` : mia ? 'Tú' : p.autor}</Texto>
          <Texto v="chico">{p.oficial ? `Aprobado por ${p.oficial.aprobadoPor}` : `${nombreUnidad(u)} · ${hace(p.fecha)}`}</Texto>
        </View>
        {p.categoria && <Chip texto={p.categoria} tono={p.categoria === 'Vendo' ? 'accion' : p.categoria === 'Busco' ? 'senal' : 'neutro'} />}
      </View>
      {!!p.titulo && <Texto v="subtitulo">{p.titulo}</Texto>}
      {!!p.texto && <Texto>{p.texto}</Texto>}
      {p.precio != null && <Texto v="cifra" style={{ fontSize: 22, lineHeight: 26 }}>{clp(p.precio)}</Texto>}

      {!p.oficial && !confirmar && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: -8, marginBottom: -8 }}>
          {alTocar && !mia && (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={icono} size={18} color={color} />
              <Texto v="fuerte" color={color}>{etiqueta}</Texto>
              <Ionicons name="chevron-forward" size={16} color={color} />
            </View>
          )}
          {alTocar && mia && (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Texto v="fuerte" color={interesados ? t.accion : t.ink2}>{interesados ? `${interesados} ${interesados === 1 ? 'vecino interesado' : 'vecinos interesados'}` : 'Sin solicitudes nuevas'}</Texto>
              {!!interesados && <Ionicons name="chevron-forward" size={16} color={t.accion} />}
            </View>
          )}
          {mia
            ? <Boton tipo="texto" texto="Eliminar" onPress={() => setConfirmar('eliminar')} style={{ minHeight: 40 }} />
            : p.reportadaPorMi
              ? <Texto v="chico" style={{ paddingVertical: 10 }}>Reportaste esta publicación</Texto>
              : <Boton tipo="sutil" texto="Reportar" onPress={() => setConfirmar('reportar')} style={{ minHeight: 40 }} />}
        </View>
      )}
      {confirmar && (
        <View style={{ backgroundColor: t.paper, borderRadius: 12, padding: 12, gap: 10 }}>
          <Texto>{confirmar === 'reportar' ? '¿Reportar a la administración? Quien publicó no sabrá que fuiste tú.' : '¿Eliminar tu publicación?'}</Texto>
          {confirmar === 'reportar' && (
            <Opciones etiqueta="Motivo" valor={motivo} onCambio={setMotivo} opciones={MOTIVOS.map((m) => ({ valor: m, texto: m }))} />
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Boton tipo="peligro" texto={confirmar === 'reportar' ? 'Reportar' : 'Eliminar'} style={{ flex: 1 }} disabled={confirmar === 'reportar' && !motivo}
              onPress={() => { if (confirmar === 'eliminar') acciones.eliminarPublicacion(p); else if (motivo) acciones.reportar(p, motivo); cerrar(); }} />
            <Boton tipo="secundario" texto="No" style={{ flex: 1 }} onPress={cerrar} />
          </View>
        </View>
      )}
    </Tarjeta>
  );
  if (!alTocar || confirmar) return tarjeta;
  return (
    <Pressable onPress={alTocar} accessibilityRole="button" accessibilityLabel={`Ver aviso de ${p.autor}`} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {tarjeta}
    </Pressable>
  );
}
