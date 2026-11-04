import { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/App';
import { F, useTema } from '@/constants/tema';
import { DIAS_SEMANA, hora, tipoUnidad } from '@/data/demo';
import { telefono } from '@/utils/formato';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Boton from '@/components/ec/Boton';
import PlacaUnidad from '@/components/ec/PlacaUnidad';

type Paso = 'bienvenida' | 'basura' | 'espacios' | 'contactos';
const lista = (x: string[]) => (x.length < 2 ? x.join('') : `${x.slice(0, -1).join(', ')} y ${x[x.length - 1]}`);

// Guía de bienvenida: se abre sola la primera vez que alguien entra con una vivienda y después queda en Perfil.
// Sale de `guias_comunidad` (P8) más los espacios y contactos que la comunidad ya tiene. Un paso sin datos no aparece.
export default function Bienvenida() {
  const t = useTema();
  const insets = useSafeAreaInsets();
  const { cuenta, unidad, comunidad, guia, guiaPendiente, acciones } = useApp();
  const [n, setN] = useState(0);
  if (!cuenta || !unidad || !comunidad || !guia) return null;

  const pasos: Paso[] = ['bienvenida', ...(guia.tieneBasura ? ['basura' as const] : []), ...(guia.espacios.length ? ['espacios' as const] : []), 'contactos'];
  const paso = pasos[n];
  const ultimo = n === pasos.length - 1;
  const portada = paso === 'bienvenida';
  const cerrar = () => {
    acciones.marcarGuiaVista();
    if (router.canGoBack()) router.back(); else router.replace('/(tabs)');
  };
  const llamar = (tel: string) => Linking.openURL(`tel:${tel.replace(/\s/g, '')}`);
  // Sobre el turquesa el texto va en marino; en el resto, los colores de siempre
  const tinta = portada ? t.sidebarStrong : t.ink;
  const suave = portada ? t.sidebarInk : t.ink2;
  const lugar = comunidad.tipo === 'Edificio' ? 'el edificio' : comunidad.tipo === 'Villa' ? 'la villa' : 'el condominio';

  return (
    <View style={{ flex: 1, backgroundColor: portada ? t.sidebar : t.paper }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="progressbar" accessibilityLabel={`Paso ${n + 1} de ${pasos.length}`}>
          {pasos.map((p, i) => (
            <View key={p} style={{ width: 28, height: 6, borderRadius: 3, backgroundColor: i === n ? tinta : i < n ? (portada ? t.sidebarMuted : t.patina) : (portada ? t.sidebarActive : t.line) }} />
          ))}
        </View>
        {!ultimo && (
          <Pressable onPress={cerrar} accessibilityRole="button" hitSlop={8} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 }}>
            <Texto v="fuerte" color={suave}>{guiaPendiente ? 'Saltar' : 'Cerrar'}</Texto>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 18, justifyContent: portada ? 'center' : 'flex-start' }}>
        {paso === 'bienvenida' && (
          <>
            <PlacaUnidad tipo={tipoUnidad(unidad)} numero={unidad.numero_identificador} size="lg" />
            <View style={{ gap: 6 }}>
              <Texto v="fuerte" color={tinta}>Hola, {cuenta.nombre}</Texto>
              <Texto v="titulo" accessibilityRole="header" color={tinta} style={{ fontSize: 34, lineHeight: 38 }}>Te damos la bienvenida a {comunidad.nombre}</Texto>
            </View>
            {!!guia.mensaje && (
              <View style={{ backgroundColor: t.sidebarHover, borderRadius: 16, padding: 16, gap: 8 }}>
                <Texto color={tinta}>«{guia.mensaje}»</Texto>
                {!!guia.firma && <Texto v="chico" color={suave} style={{ fontFamily: F.negrita }}>{guia.firma}</Texto>}
              </View>
            )}
            <View style={{ gap: 8 }}>
              <Texto v="fuerte" color={tinta}>En un minuto te contamos:</Texto>
              {guia.tieneBasura && <Punto icono="trash-outline" color={tinta} texto="Cuándo pasa la basura y dónde reciclar" />}
              {guia.espacios.length > 0 && <Punto icono="calendar-outline" color={tinta} texto={`Cómo reservar ${lista(guia.espacios.map((e) => e.nombre.toLowerCase()))}`} />}
              <Punto icono="call-outline" color={tinta} texto="A quién llamar si algo pasa" />
            </View>
          </>
        )}

        {paso === 'basura' && (
          <>
            <Texto v="titulo" accessibilityRole="header">Basura y reciclaje</Texto>
            {guia.diasBasura.length > 0 && (
              <Tarjeta style={{ gap: 14 }}>
                <Texto v="etiqueta">{comunidad.tipo === 'Edificio' ? 'Se recibe' : 'El camión pasa'}</Texto>
                <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Días: ${lista(guia.diasBasura.map((d) => d.toLowerCase()))}`}>
                  {DIAS_SEMANA.map((d) => {
                    const si = guia.diasBasura.includes(d);
                    return (
                      <View key={d} style={{ flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: si ? t.accion : t.inkSoft }}>
                        <Texto style={{ fontFamily: si ? F.negrita : F.texto, color: si ? t.accionInk : t.ink2 }}>{d[0]}</Texto>
                      </View>
                    );
                  })}
                </View>
                <View style={{ gap: 4 }}>
                  <Texto v="subtitulo">{guia.diasBasura.length === 7 ? 'Todos los días' : lista(guia.diasBasura)}{guia.basura_horario ? ` · ${guia.basura_horario.charAt(0).toLowerCase()}${guia.basura_horario.slice(1)}` : ''}</Texto>
                  {!!guia.basura_lugar && <Texto v="suave">{guia.basura_lugar}</Texto>}
                </View>
              </Tarjeta>
            )}
            {!!guia.reciclaje_lugar && (
              <Tarjeta style={{ backgroundColor: t.patinaSoft, gap: 6 }}>
                <Texto v="etiqueta" color={t.patina}>Reciclaje</Texto>
                <Texto v="subtitulo">{guia.reciclaje_lugar}</Texto>
                {!!guia.reciclaje_detalle && <Texto v="suave">{guia.reciclaje_detalle}</Texto>}
              </Tarjeta>
            )}
            {guia.diasBasura.length > 0 && guia.diasBasura.length < 7 && <Texto v="chico">Los días de retiro te lo recordamos en Inicio.</Texto>}
          </>
        )}

        {paso === 'espacios' && (
          <>
            <Texto v="titulo" accessibilityRole="header">Espacios comunes</Texto>
            {guia.espacios.map((e) => (
              <Tarjeta key={e.id_espacio} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <Texto v="subtitulo" style={{ flex: 1 }}>{e.nombre}</Texto>
                  {e.capacidad != null && <Texto v="chico">Hasta {e.capacidad} personas</Texto>}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {e.espacios_bloques.map((b) => (
                    <View key={b.id_bloque} style={{ backgroundColor: t.accionSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Texto v="chico" color={t.accion} style={{ fontFamily: F.negrita }}>{hora(b.hora_inicio)} a {hora(b.hora_fin)}</Texto>
                    </View>
                  ))}
                </View>
                {!!e.descripcion && <Texto v="suave">{e.descripcion}</Texto>}
              </Tarjeta>
            ))}
            <View style={{ gap: 10 }}>
              <Texto v="etiqueta">Cómo se reserva</Texto>
              {['En la pestaña Reservas eliges el espacio, el día y un bloque libre.', 'La reserva queda a nombre de tu vivienda y la ves en Inicio.', `Lo dejas limpio y a la hora, para el próximo vecino de ${lugar}.`].map((x, i) => (
                <View key={x} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.accion, alignItems: 'center', justifyContent: 'center' }}>
                    <Texto style={{ fontFamily: F.negrita, color: t.accionInk }}>{i + 1}</Texto>
                  </View>
                  <Texto style={{ flex: 1, paddingTop: 2 }}>{x}</Texto>
                </View>
              ))}
            </View>
          </>
        )}

        {paso === 'contactos' && (
          <>
            <Texto v="titulo" accessibilityRole="header">Contactos útiles</Texto>
            {guia.contactos.length > 0 && (
              <Tarjeta style={{ gap: 0, paddingVertical: 4 }}>
                {guia.contactos.map((k, i) => (
                  <View key={k.id_contacto} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: t.line }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Texto v="fuerte">{k.nombre}</Texto>
                      <Texto v="chico">{[k.detalle, k.horario].filter(Boolean).join(' · ')}</Texto>
                    </View>
                    <Pressable
                      onPress={() => llamar(k.telefono)} accessibilityRole="button" accessibilityLabel={`Llamar a ${k.nombre}`}
                      style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.accionSoft, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons name="call" size={20} color={t.accion} />
                    </Pressable>
                  </View>
                ))}
              </Tarjeta>
            )}
            <Texto v="etiqueta">Emergencias</Texto>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {guia.emergencias.map((x) => (
                <Pressable
                  key={x.telefono} onPress={() => llamar(x.telefono)} accessibilityRole="button" accessibilityLabel={`Llamar a ${x.nombre}, ${x.telefono}`}
                  style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: t.surface, borderRadius: 12, padding: 12, gap: 2 }}
                >
                  <Texto style={{ fontFamily: F.cifra, fontSize: 22, lineHeight: 26 }}>{telefono(x.telefono)}</Texto>
                  <Texto v="chico">{x.nombre}</Texto>
                </Pressable>
              ))}
            </View>
            <Tarjeta style={{ backgroundColor: t.patinaSoft, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="compass-outline" size={22} color={t.patina} />
              <Texto style={{ flex: 1 }}>Esta guía queda en Perfil, en «Guía de la comunidad».</Texto>
            </Tarjeta>
          </>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16, flexDirection: 'row', gap: 10 }}>
        {n > 0 && <Boton tipo="secundario" texto="Atrás" style={{ flex: 1 }} onPress={() => setN(n - 1)} />}
        <Boton
          tipo={portada ? 'portada' : 'principal'} style={{ flex: 1 }}
          texto={portada ? 'Empezar' : ultimo ? 'Listo, ir a Inicio' : 'Siguiente'}
          onPress={() => (ultimo ? cerrar() : setN(n + 1))}
        />
      </View>
    </View>
  );
}

function Punto({ icono, texto, color }: { icono: keyof typeof Ionicons.glyphMap; texto: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name={icono} size={18} color={color} />
      <Texto style={{ flex: 1 }} color={color}>{texto}</Texto>
    </View>
  );
}
