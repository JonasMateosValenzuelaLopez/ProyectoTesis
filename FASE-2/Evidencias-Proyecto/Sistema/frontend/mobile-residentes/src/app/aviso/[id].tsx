import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as muroApi from '@/api/muro';
import { mensajeDe } from '@/api/cliente';
import { useConsulta } from '@/api/useConsulta';
import { clp, fecha, hace, telefono } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Boton from '@/components/ec/Boton';
import Chip from '@/components/ec/Chip';
import PlacaUnidad from '@/components/ec/PlacaUnidad';
import SolicitudRecibida from '@/components/ec/SolicitudRecibida';
import Confirmar from '@/components/ec/ConfirmarAccion';

// Solo dígitos, con el 56 de Chile adelante: lo que piden wa.me y tel:.
const soloDigitos = (tel: string) => {
  const d = tel.replace(/\D/g, '');
  return d.startsWith('56') ? d : `56${d}`;
};

// Ficha de un aviso del mercado (GET marketplace/:id). El teléfono de quien publicó no se muestra de entrada:
// el interesado toca «Contactar», quien publicó acepta o rechaza, y solo si acepta se comparte.
// Quien publicó lo edita, lo marca como vendido (o cerrado), lo reabre o lo elimina desde aquí.
export default function Aviso() {
  const t = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { unidad, acciones } = useSesion();
  const consulta = useConsulta(() => muroApi.aviso(Number(id)), [id]);
  const solicitudes = useConsulta(muroApi.solicitudes, [id]);
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [confirmar, setConfirmar] = useState<'reportar' | 'eliminar' | null>(null);
  const [enviando, setEnviando] = useState(false);
  const p = consulta.datos;
  const s = p && !p.esMia ? p.miSolicitud : null;

  // Al abrir el aviso, la respuesta del vendedor queda vista y se apaga el aviso en Mercado
  useEffect(() => {
    if (s && s.estado !== 'Pendiente' && !s.vista) muroApi.marcarRespuestaVista(s.idSolicitud).catch(() => { /* se marcará la próxima vez */ });
  }, [s]);

  if (!p) {
    return (
      <Hoja titulo="Aviso">
        {consulta.error ? <Texto v="suave">{consulta.error.message}</Texto> : <ActivityIndicator color={t.accion} accessibilityLabel="Cargando el aviso" />}
      </Hoja>
    );
  }

  const ejecutar = async (hacer: () => Promise<unknown>, mensaje: string, recargarTodo = true) => {
    setEnviando(true);
    try {
      await hacer();
      acciones.avisar(mensaje);
      if (recargarTodo) { consulta.recargar(); solicitudes.recargar(); }
    } catch (e) {
      acciones.avisar(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  const mio = p.esMia;
  const oculto = p.estadoModeracion === 'Oculta';
  const nombre = p.autor?.nombre?.split(' ')[0] ?? 'Tu vecino';
  const cosa = p.tipo === 'Servicio' ? 'Este servicio' : p.tipo === 'Busco' ? 'Este pedido' : 'Este artículo';
  const textoCerrar = p.tipo === 'Vendo' ? 'Marcar como vendido' : 'Cerrar aviso';
  const interesados = (solicitudes.datos?.recibidas ?? []).filter((x) => x.aviso.idProducto === p.idProducto);
  const esperando = interesados.filter((x) => x.estado === 'Pendiente').length;
  const mensaje = `Hola ${nombre}, vi tu aviso en el mercado de EntreCasas: «${p.titulo}». ¿Sigue disponible?`;
  // Un aviso cerrado ya no recibe solicitudes; quien ya tenía el contacto lo sigue viendo
  const noDisponible = !mio && (s?.estado === 'Rechazada' || (!!p.cerradoEn && s?.estado !== 'Aceptada'));
  const tel = s?.telefono ?? null;

  const abrir = async (url: string, alFallar: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      acciones.avisar(alFallar);
    }
  };
  const copiar = async () => {
    if (!tel) return;
    await Clipboard.setStringAsync(tel);
    acciones.avisar('Teléfono copiado.');
  };
  const cerrar = async () => { await ejecutar(() => muroApi.cerrarAviso(p.idProducto), p.tipo === 'Vendo' ? 'Marcado como vendido.' : 'Aviso cerrado.'); setConfirmarCierre(false); };
  const confirmado = async (motivo?: string) => {
    if (confirmar === 'eliminar') {
      try {
        await muroApi.eliminarAviso(p.idProducto);
        acciones.avisar('Aviso eliminado.');
        router.back();
      } catch (e) {
        acciones.avisar(mensajeDe(e));
      }
    } else if (motivo) {
      await ejecutar(() => muroApi.reportarAviso(p.idProducto, motivo), 'Gracias. La administración revisará el aviso.');
      setConfirmar(null);
    }
  };

  const abajo = confirmar || confirmarCierre ? undefined : mio ? (
    p.cerradoEn ? <Boton texto="Reabrir aviso" icono="refresh" cargando={enviando} onPress={() => ejecutar(() => muroApi.reabrirAviso(p.idProducto), 'Aviso disponible de nuevo.')} />
      : oculto ? undefined : (
        <>
          <Boton tipo="secundario" texto="Editar aviso" icono="create-outline" onPress={() => router.push({ pathname: '/publicar', params: { editar: String(p.idProducto) } })} />
          <Boton texto={textoCerrar} icono="checkmark-done" cargando={enviando} onPress={() => (esperando ? setConfirmarCierre(true) : cerrar())} />
        </>
      )
  ) : noDisponible ? undefined
    : !s ? <Boton texto="Contactar" icono="chatbubble-ellipses-outline" cargando={enviando} onPress={() => unidad && ejecutar(() => muroApi.pedirContacto(p.idProducto, unidad.idUnidad), `Le avisamos a ${nombre}. Te mostraremos su respuesta aquí.`)} />
      : s.estado === 'Pendiente' ? <Boton tipo="secundario" texto="Cancelar solicitud" cargando={enviando} onPress={() => ejecutar(() => muroApi.cancelarSolicitud(s.idSolicitud), 'Solicitud cancelada.')} />
        : s.estado === 'Aceptada' && tel ? (
          <>
            <Boton texto="Contactar por WhatsApp" icono="logo-whatsapp" onPress={() => abrir(`https://wa.me/${soloDigitos(tel)}?text=${encodeURIComponent(mensaje)}`, 'No se pudo abrir WhatsApp. Copia el teléfono y escríbele desde tu celular.')} />
            <Boton tipo="secundario" texto="Llamar" icono="call-outline" onPress={() => abrir(`tel:+${soloDigitos(tel)}`, 'No se pudo iniciar la llamada desde este dispositivo.')} />
          </>
        ) : undefined;

  return (
    <Hoja titulo={p.tipo === 'Servicio' ? 'Servicio' : p.tipo === 'Busco' ? 'Busca' : 'En venta'} abajo={abajo}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Chip texto={p.tipo} tono={p.tipo === 'Vendo' ? 'accion' : p.tipo === 'Busco' ? 'senal' : 'neutro'} />
          {oculto && <Chip texto="Oculto por la administración" tono="bad" />}
          {p.cerradoEn && <Chip texto={p.tipo === 'Vendo' ? 'Vendido' : 'Cerrado'} />}
        </View>
        <Texto v="subtitulo" style={{ fontSize: 20, lineHeight: 26 }}>{p.titulo}</Texto>
        {!!p.descripcion && <Texto style={{ fontSize: 17, lineHeight: 25 }}>{p.descripcion}</Texto>}
        {p.precio != null
          ? <Texto v="cifra" style={{ fontSize: 30, lineHeight: 34 }}>{clp(p.precio)}</Texto>
          : p.tipo !== 'Busco' && <Texto v="suave">Precio a convenir</Texto>}
        <Texto v="chico">
          {mio ? 'Publicaste' : `${p.autor?.nombre ?? 'Un vecino'} publicó`} {hace(p.fecha)}{p.cerradoEn ? ` · ${p.tipo === 'Vendo' ? 'vendido' : 'cerrado'} el ${fecha(p.cerradoEn)}` : ''}
        </Texto>
      </View>

      {mio ? (
        <>
          {oculto && (
            <Tarjeta>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="eye-off-outline" size={22} color={t.bad} />
                <Texto v="fuerte" style={{ flex: 1 }}>La administración ocultó este aviso</Texto>
              </View>
              <Texto v="suave">Tus vecinos ya no lo ven y no puedes editarlo ni responder solicitudes. Si crees que es un error, habla con la administración.</Texto>
            </Tarjeta>
          )}
          {confirmarCierre && (
            <Tarjeta>
              <Texto v="fuerte">¿{textoCerrar}?</Texto>
              <Texto v="suave">
                {esperando === 1 ? 'Un vecino espera tu respuesta' : `${esperando} vecinos esperan tu respuesta`}: le{esperando === 1 ? '' : 's'} avisaremos que ya no está disponible.
                Si lo reabres, esas solicitudes vuelven a esperar tu respuesta.
              </Texto>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Boton texto={p.tipo === 'Vendo' ? 'Sí, vendido' : 'Sí, cerrar'} style={{ flex: 1 }} cargando={enviando} onPress={cerrar} />
                <Boton tipo="secundario" texto="No" style={{ flex: 1 }} onPress={() => setConfirmarCierre(false)} />
              </View>
            </Tarjeta>
          )}
          {p.cerradoEn && (
            <Texto v="suave">Ya no aparece en el mercado ni recibe solicitudes. Si lo reabres, vuelve a estar disponible y las solicitudes que se rechazaron al cerrarlo vuelven a esperar tu respuesta.</Texto>
          )}
          {!oculto && (
            <Tarjeta>
              <Texto v="etiqueta">Vecinos interesados</Texto>
              {interesados.length
                ? interesados.map((x, i) => <SolicitudRecibida key={x.idSolicitud} s={x} borde={i > 0} onRespondida={solicitudes.recargar} />)
                : <Texto v="suave">Cuando un vecino toque «Contactar», aparecerá aquí para que aceptes o rechaces. Tu teléfono solo se comparte si aceptas.</Texto>}
            </Tarjeta>
          )}
        </>
      ) : noDisponible ? (
        <Tarjeta>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="close-circle-outline" size={22} color={t.ink2} />
            <Texto v="fuerte" style={{ flex: 1 }}>{cosa} ya no está disponible</Texto>
          </View>
          <Texto v="suave">{s ? `${nombre} respondió tu solicitud.` : `${nombre} cerró el aviso.`} Puedes revisar otros avisos del mercado.</Texto>
        </Tarjeta>
      ) : !s ? (
        <Texto v="suave">Al tocar «Contactar», {nombre} recibe un aviso con tu nombre y tu vivienda. Si acepta, te compartimos su teléfono para que lo llames o le escribas por WhatsApp.</Texto>
      ) : s.estado === 'Pendiente' ? (
        <Tarjeta>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="time-outline" size={22} color={t.accion} />
            <Texto v="fuerte" style={{ flex: 1 }}>Solicitud enviada</Texto>
          </View>
          <Texto v="suave">Le avisamos a {nombre} {hace(s.fecha)}. Te mostraremos su respuesta aquí y en la pestaña Mercado.</Texto>
        </Tarjeta>
      ) : (
        <Tarjeta>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="checkmark-circle" size={22} color={t.ok} />
            <Texto v="fuerte" style={{ flex: 1 }}>{nombre} aceptó tu solicitud</Texto>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {p.unidad && <PlacaUnidad tipo="" numero={p.unidad.numeroIdentificador} size="sm" />}
            <Texto v="subtitulo" style={{ flex: 1 }}>{p.autor?.nombre}</Texto>
          </View>
          {tel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopWidth: 1, borderColor: t.line, paddingTop: 12 }}>
              <View style={{ gap: 2 }}>
                <Texto v="chico">Teléfono</Texto>
                <Texto v="fuerte" selectable style={{ fontSize: 18 }}>{telefono(tel)}</Texto>
              </View>
              <Boton tipo="texto" texto="Copiar" icono="copy-outline" onPress={copiar} style={{ minHeight: 44, paddingHorizontal: 10 }} />
            </View>
          ) : (
            <Texto v="suave">{nombre} ya no tiene un teléfono en su perfil.</Texto>
          )}
        </Tarjeta>
      )}

      {confirmar ? <Confirmar tipo={confirmar} onConfirmar={confirmado} onCancelar={() => setConfirmar(null)} />
        : mio ? <Boton tipo="texto" texto="Eliminar aviso" onPress={() => setConfirmar('eliminar')} style={{ alignSelf: 'flex-start' }} />
          : p.reportadaPorMi ? <Texto v="chico">Reportaste este aviso.</Texto>
            : <Boton tipo="sutil" texto="Reportar aviso" onPress={() => setConfirmar('reportar')} style={{ alignSelf: 'flex-start' }} />}
      <Texto v="chico">Coordina directamente con tu vecino. EntreCasas no cobra ni intermedia en las ventas.</Texto>
    </Hoja>
  );
}
