import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSesion } from '@/context/Sesion';
import { F, useTema } from '@/constants/tema';
import Texto from '@/components/ec/Texto';
import Boton from '@/components/ec/Boton';
import PlacaUnidad from '@/components/ec/PlacaUnidad';
import EscenaTutorial, { type ClaveEscena } from '@/components/ec/EscenaTutorial';

type Icono = keyof typeof Ionicons.glyphMap;
type Paso = { clave: ClaveEscena; icono: Icono; pestana?: string; titulo: string; texto: string; puntos: string[] };

// Tutorial de la app: qué hay en cada pestaña y qué se puede hacer. Se abre antes de la primera guía de
// bienvenida y después queda en Perfil. Solo muestra las secciones que la comunidad tiene activas.
export default function Tutorial() {
  const t = useTema();
  const insets = useSafeAreaInsets();
  const { perfil, unidad, comunidad, tiene, tutorialPendiente, acciones } = useSesion();
  // Si se abrió solo al entrar, después sigue la guía de bienvenida
  const [primeraVez] = useState(tutorialPendiente);
  const [n, setN] = useState(0);
  if (!perfil || !unidad || !comunidad) return null;

  const casa = unidad.tipoUnidad === 'Departamento' ? 'tu departamento' : 'tu casa';
  // La escena del tutorial usa un ejemplo genérico de espacios y horarios
  const conReservas = tiene('reservas');
  const opciones = {
    cobros: tiene('cobros'), votaciones: tiene('votaciones'), muro: tiene('muro'), conserjeria: tiene('conserjeria'),
  };
  // Poco texto por paso: la escena muestra cómo se usa y los puntos dicen lo que no se ve en ella
  const pasos: Paso[] = [
    {
      clave: 'inicio', icono: 'home', pestana: 'Inicio', titulo: 'Lo de hoy, de un vistazo', texto: `Al abrir la app ves lo importante de ${casa}.`,
      puntos: [
        tiene('cobros') ? 'Cuánto debes y hasta cuándo.' : 'Los avisos del día y lo que se acerca.',
        'Si hoy pasa el camión de la basura o toca una mantención.',
      ],
    },
    ...(tiene('cobros') ? [{
      clave: 'finanzas' as ClaveEscena, icono: 'wallet' as Icono, pestana: 'Finanzas', titulo: 'Pagar sin papeleo', texto: 'Transfieres a la comunidad y avisas con un toque.',
      puntos: ['Los datos de la cuenta están en la misma pestaña.', 'EntreCasas no cobra ni recibe pagos.'],
    }] : []),
    ...(tiene('muro') || tiene('votaciones') ? [{
      clave: 'muro' as ClaveEscena, icono: 'megaphone' as Icono, pestana: 'Muro', titulo: tiene('votaciones') ? 'Enterarte y decidir' : 'Lo que pasa en la comunidad',
      texto: tiene('muro') ? 'Lo oficial lleva el sello de quien lo aprobó.' : 'Las votaciones de la comunidad.',
      puntos: [
        tiene('muro') ? 'También puedes publicar avisos para tus vecinos.' : null,
        tiene('votaciones') ? 'Cada vivienda tiene un voto.' : null,
      ].filter(Boolean) as string[],
    }] : []),
    ...(conReservas ? [{
      clave: 'reservas' as ClaveEscena, icono: 'calendar' as Icono, pestana: 'Reservas', titulo: 'Reservar sin cuaderno', texto: 'Eliges el día y un horario libre. Listo.',
      puntos: ['Si cambias de planes, cancélala para que otro la use.'],
    }] : []),
    ...(tiene('marketplace') ? [{
      clave: 'mercado' as ClaveEscena, icono: 'storefront' as Icono, pestana: 'Mercado', titulo: 'Comprar y vender entre vecinos', texto: 'Tu número se comparte solo si tú aceptas.',
      puntos: ['Publica lo que vendes, buscas u ofreces.'],
    }] : []),
    ...(tiene('invitaciones_qr') ? [{
      clave: 'visitas' as ClaveEscena, icono: 'qr-code' as Icono, titulo: 'Visitas sin llamadas', texto: 'Desde Inicio, «Invitar una visita» crea un código QR para compartir.',
      puntos: [tiene('conserjeria') ? 'Si alguien llega sin código, Conserjería te pregunta en la app.' : 'Puedes cancelar la invitación cuando quieras.'],
    }] : []),
    {
      clave: 'perfil', icono: 'person-circle', pestana: 'Perfil', titulo: 'La memoria de tu casa', texto: 'En Perfil está Mi hogar: colores, garantías, mantenciones y notas.',
      puntos: ['También tus datos, los contactos de la comunidad y este tutorial.'],
    },
    {
      clave: 'letra', icono: 'text', pestana: 'Perfil', titulo: 'Letra más grande', texto: 'En Perfil, «Tamaño de letra»: A+ agranda y A− achica.',
      puntos: ['Mantén apretado para avanzar rápido.', 'También está en la pantalla de entrada, con el botón «Aa».'],
    },
  ];
  const total = pasos.length + 1; // la portada cuenta como paso
  const portada = n === 0;
  const paso = portada ? null : pasos[n - 1];
  const ultimo = n === total - 1;
  const terminar = () => {
    if (router.canGoBack()) router.back(); else router.replace('/(tabs)');
    acciones.marcarTutorialVisto(); // POST auth/tutorial-visto (lado app)
  };
  const tinta = portada ? t.sidebarStrong : t.ink;

  return (
    <View style={{ flex: 1, backgroundColor: portada ? t.sidebar : t.paper }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48 + insets.top + 12 }}>
        <View style={{ flexDirection: 'row', gap: 5, flexShrink: 1 }} accessibilityRole="progressbar" accessibilityLabel={`Paso ${n + 1} de ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={{ width: 20, height: 6, borderRadius: 3, backgroundColor: i === n ? tinta : i < n ? (portada ? t.sidebarMuted : t.patina) : (portada ? t.sidebarActive : t.line) }} />
          ))}
        </View>
        {!ultimo && (
          <Pressable onPress={terminar} accessibilityRole="button" hitSlop={8} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 }}>
            <Texto v="fuerte" color={portada ? t.sidebarInk : t.ink2}>{primeraVez ? 'Saltar' : 'Cerrar'}</Texto>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 18, justifyContent: portada ? 'center' : 'flex-start' }}>
        {portada ? (
          <>
            <PlacaUnidad tipo={unidad.tipoUnidad} numero={unidad.numeroIdentificador} size="lg" />
            <View style={{ gap: 6 }}>
              <Texto v="fuerte" color={tinta}>{primeraVez ? `Hola, ${perfil.nombre}` : 'Tutorial'}</Texto>
              <Texto v="titulo" accessibilityRole="header" color={tinta} style={{ fontSize: 34, lineHeight: 38 }}>Así funciona EntreCasas</Texto>
              <Texto color={t.sidebarInk}>
                La app de {comunidad.nombre}. Abajo están las pestañas; la placa de arriba en Inicio dice con qué vivienda estás.
              </Texto>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {pasos.filter((p) => p.pestana).map((p, i) => (
                <Animated.View key={p.clave} entering={FadeInDown.delay(150 + i * 70).duration(260)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.sidebarHover, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Ionicons name={p.icono} size={16} color={tinta} />
                  <Texto v="chico" color={tinta} style={{ fontFamily: F.negrita }}>{p.pestana}</Texto>
                </Animated.View>
              ))}
            </View>
          </>
        ) : paso && (
          <Animated.View key={paso.clave} entering={FadeIn.duration(220)} style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={paso.icono} size={18} color={t.accion} />
                <Texto v="etiqueta">{paso.pestana ? `Pestaña ${paso.pestana}` : paso.clave === 'visitas' ? 'En Inicio' : ''}</Texto>
              </View>
              <Texto v="titulo" accessibilityRole="header">{paso.titulo}</Texto>
              <Texto v="suave">{paso.texto}</Texto>
            </View>
            <EscenaTutorial clave={paso.clave} opciones={opciones} />
            <View style={{ gap: 8 }}>
              {paso.puntos.map((x) => (
                <View key={x} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <Ionicons name="checkmark-circle" size={20} color={t.patina} style={{ marginTop: 2 }} />
                  <Texto style={{ flex: 1 }}>{x}</Texto>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16, flexDirection: 'row', gap: 10 }}>
        {n > 0 && <Boton tipo="secundario" texto="Atrás" style={{ flex: 1 }} onPress={() => setN(n - 1)} />}
        <Boton
          tipo={portada ? 'portada' : 'principal'} style={{ flex: ultimo ? 2 : 1 }}
          texto={portada ? 'Empezar' : !ultimo ? 'Siguiente' : 'Listo'}
          onPress={() => (ultimo ? terminar() : setN(n + 1))}
        />
      </View>
    </View>
  );
}
