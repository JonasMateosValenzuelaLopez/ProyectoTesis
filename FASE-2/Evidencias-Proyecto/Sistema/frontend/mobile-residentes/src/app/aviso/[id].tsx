import { useEffect } from 'react';
import { Linking, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { UNIDADES, tipoUnidad } from '@/data/demo';
import { clp, hace, nombreUnidad } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Boton from '@/components/ec/Boton';
import Chip from '@/components/ec/Chip';
import PlacaUnidad from '@/components/ec/PlacaUnidad';
import SolicitudRecibida from '@/components/ec/SolicitudRecibida';

// Solo dígitos, con el 56 de Chile adelante: lo que piden wa.me y tel:.
const soloDigitos = (telefono: string) => {
  const d = telefono.replace(/\D/g, '');
  return d.startsWith('56') ? d : `56${d}`;
};

// Ficha de un aviso del mercado. El teléfono de quien publicó no se muestra de entrada:
// el interesado toca «Contactar», quien publicó acepta o rechaza, y solo si acepta se comparte.
export default function Aviso() {
  const t = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { publicaciones, unidad, acciones, solicitudDe, solicitudesRecibidas } = useApp();
  const p = publicaciones.find((x) => x.id === Number(id) && x.lugar === 'mercado');
  const s = p ? solicitudDe(p.id) : null;

  // Al abrir el aviso, la respuesta del vendedor queda vista y se apaga el globo de Mercado
  useEffect(() => {
    if (s && s.estado !== 'Pendiente' && !s.vista) acciones.marcarRespuestaVista(s.id_solicitud);
  }, [s, acciones]);

  if (!p) {
    return <Hoja titulo="Aviso"><Texto v="suave">Este aviso ya no está disponible.</Texto></Hoja>;
  }
  const u = p.id_unidad ? UNIDADES[p.id_unidad] : undefined;
  const mio = !!unidad && p.id_unidad === unidad.id_unidad;
  const nombre = p.autor.split(' ')[0];
  const cosa = p.categoria === 'Servicio' ? 'Este servicio' : p.categoria === 'Busco' ? 'Este pedido' : 'Este artículo';
  const interesados = solicitudesRecibidas.filter((x) => x.id_producto === p.id);
  const mensaje = `Hola ${nombre}, vi tu aviso en el mercado de EntreCasas: «${p.titulo}». ¿Sigue disponible?`;

  const abrir = async (url: string, alFallar: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      acciones.avisar(alFallar);
    }
  };
  const copiar = async () => {
    if (!p.telefono) return;
    await Clipboard.setStringAsync(p.telefono);
    acciones.avisar('Teléfono copiado.');
  };

  const abajo = mio ? undefined
    : !s ? <Boton texto="Contactar" icono="chatbubble-ellipses-outline" onPress={() => acciones.pedirContacto(p.id)} />
      : s.estado === 'Pendiente' ? <Boton tipo="secundario" texto="Cancelar solicitud" onPress={() => acciones.cancelarSolicitud(s.id_solicitud)} />
        : s.estado === 'Aceptada' && p.telefono ? (
          <>
            <Boton texto="Contactar por WhatsApp" icono="logo-whatsapp" onPress={() => abrir(`https://wa.me/${soloDigitos(p.telefono!)}?text=${encodeURIComponent(mensaje)}`, 'No se pudo abrir WhatsApp. Copia el teléfono y escríbele desde tu celular.')} />
            <Boton tipo="secundario" texto="Llamar" icono="call-outline" onPress={() => abrir(`tel:+${soloDigitos(p.telefono!)}`, 'No se pudo iniciar la llamada desde este dispositivo.')} />
          </>
        ) : undefined;

  return (
    <Hoja titulo={p.categoria === 'Servicio' ? 'Servicio' : p.categoria === 'Busco' ? 'Busca' : 'En venta'} abajo={abajo}>
      <View style={{ gap: 8 }}>
        {p.categoria && <View style={{ flexDirection: 'row' }}><Chip texto={p.categoria} tono={p.categoria === 'Vendo' ? 'accion' : p.categoria === 'Busco' ? 'senal' : 'neutro'} /></View>}
        <Texto v="subtitulo" style={{ fontSize: 20, lineHeight: 26 }}>{p.titulo}</Texto>
        {!!p.texto && <Texto style={{ fontSize: 17, lineHeight: 25 }}>{p.texto}</Texto>}
        {p.precio != null
          ? <Texto v="cifra" style={{ fontSize: 30, lineHeight: 34 }}>{clp(p.precio)}</Texto>
          : p.categoria !== 'Busco' && <Texto v="suave">Precio a convenir</Texto>}
        <Texto v="chico">Publicado {hace(p.fecha)}</Texto>
      </View>

      {mio ? (
        <Tarjeta>
          <Texto v="etiqueta">Vecinos interesados</Texto>
          {interesados.length
            ? interesados.map((x, i) => <SolicitudRecibida key={x.id_solicitud} s={x} borde={i > 0} />)
            : <Texto v="suave">Cuando un vecino toque «Contactar», aparecerá aquí para que aceptes o rechaces. Tu teléfono solo se comparte si aceptas.</Texto>}
        </Tarjeta>
      ) : !s ? (
        <Texto v="suave">Al tocar «Contactar», {nombre} recibe un aviso con tu nombre y tu vivienda. Si acepta, te compartimos su teléfono para que lo llames o le escribas por WhatsApp.</Texto>
      ) : s.estado === 'Pendiente' ? (
        <Tarjeta>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="time-outline" size={22} color={t.accion} />
            <Texto v="fuerte" style={{ flex: 1 }}>Solicitud enviada</Texto>
          </View>
          <Texto v="suave">Le avisamos a {nombre} {hace(s.fecha_solicitud)}. Te mostraremos su respuesta aquí y en la pestaña Mercado.</Texto>
        </Tarjeta>
      ) : s.estado === 'Rechazada' ? (
        <Tarjeta>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="close-circle-outline" size={22} color={t.ink2} />
            <Texto v="fuerte" style={{ flex: 1 }}>{cosa} ya no está disponible</Texto>
          </View>
          <Texto v="suave">{nombre} respondió tu solicitud. Puedes revisar otros avisos del mercado.</Texto>
        </Tarjeta>
      ) : (
        <Tarjeta>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="checkmark-circle" size={22} color={t.ok} />
            <Texto v="fuerte" style={{ flex: 1 }}>{nombre} aceptó tu solicitud</Texto>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {u && <PlacaUnidad tipo={tipoUnidad(u)} numero={u.numero_identificador} size="sm" />}
            <View style={{ flex: 1, gap: 2 }}>
              <Texto v="subtitulo">{p.autor}</Texto>
              <Texto v="suave">{nombreUnidad(u)}</Texto>
            </View>
          </View>
          {p.telefono && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopWidth: 1, borderColor: t.line, paddingTop: 12 }}>
              <View style={{ gap: 2 }}>
                <Texto v="chico">Teléfono</Texto>
                <Texto v="fuerte" selectable style={{ fontSize: 18 }}>{p.telefono}</Texto>
              </View>
              <Boton tipo="texto" texto="Copiar" icono="copy-outline" onPress={copiar} style={{ minHeight: 44, paddingHorizontal: 10 }} />
            </View>
          )}
        </Tarjeta>
      )}

      <Texto v="chico">Coordina directamente con tu vecino. EntreCasas no cobra ni intermedia en las ventas.</Texto>
    </Hoja>
  );
}
