import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as muroApi from '@/api/muro';
import { mensajeDe } from '@/api/cliente';
import { useConsulta } from '@/api/useConsulta';
import type { AvisoMercado, TipoAviso } from '@/api/tipos';
import { clp, nombreUnidad, telefono } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';

const TIPOS: { valor: TipoAviso; texto: string }[] = [{ valor: 'Vendo', texto: 'Vendo' }, { valor: 'Servicio', texto: 'Ofrezco un servicio' }, { valor: 'Busco', texto: 'Busco' }];
const DIGITOS_PRECIO = String(muroApi.PRECIO_MAXIMO).length;

// Formulario: con `original` edita título, descripción y precio de un aviso propio (el tipo no se cambia).
function Formulario({ inicial, original }: { inicial: 'muro' | 'mercado'; original: AvisoMercado | null }) {
  const t = useTema();
  const { perfil, unidad, tiene, acciones } = useSesion();
  const [lugar, setLugar] = useState<'muro' | 'mercado'>(original ? 'mercado' : inicial);
  const [titulo, setTitulo] = useState(original?.titulo ?? '');
  const [texto, setTexto] = useState(original?.descripcion ?? '');
  const [tipo, setTipo] = useState<TipoAviso>(original?.tipo ?? 'Vendo');
  const [precio, setPrecio] = useState(original?.precio != null ? String(original.precio) : '');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  if (!unidad || !perfil) return null;

  const mercado = lugar === 'mercado';
  // Para publicar en el mercado hace falta un teléfono: se comparte al aceptar a un vecino
  const sinTelefono = mercado && !original && !perfil.telefono;
  const valorPrecio = precio && tipo !== 'Busco' ? Number(precio) : null;
  const valido = mercado
    ? titulo.trim().length >= muroApi.MIN_TITULO_AVISO && (valorPrecio ?? 0) <= muroApi.PRECIO_MAXIMO && !sinTelefono
    : texto.trim().length >= muroApi.MIN_MENSAJE;

  const enviar = async () => {
    if (!valido) return;
    setEnviando(true);
    setError(null);
    try {
      const datos = { titulo: titulo.trim(), ...(texto.trim() ? { descripcion: texto.trim() } : {}), precio: valorPrecio };
      if (original) {
        await muroApi.editarAviso(original.idProducto, datos);
        acciones.avisar('Aviso actualizado.');
      } else if (mercado) {
        await muroApi.publicarAviso({ ...datos, tipo, idUnidad: unidad.idUnidad, ...(tipo === 'Busco' ? { precio: undefined } : {}) });
        acciones.avisar('Aviso publicado en el mercado.');
      } else {
        await muroApi.publicar(texto.trim(), unidad.idUnidad);
        acciones.avisar('Publicado en el muro.');
      }
      router.back();
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Hoja
      titulo={original ? 'Editar aviso' : 'Publicar'}
      abajo={<Boton texto={original ? 'Guardar cambios' : mercado ? 'Publicar aviso' : 'Publicar en el muro'} disabled={!valido} cargando={enviando} onPress={enviar} />}
    >
      {!original && tiene('muro') && tiene('marketplace') && (
        <Opciones etiqueta="Dónde" valor={lugar} onCambio={(v) => setLugar(v)} opciones={[{ valor: 'muro', texto: 'Muro', detalle: 'Avisos y conversación' }, { valor: 'mercado', texto: 'Mercado', detalle: 'Vender u ofrecer' }]} />
      )}
      {sinTelefono && (
        <Tarjeta>
          <Texto v="fuerte">Agrega tu teléfono para publicar</Texto>
          <Texto v="suave">Es el dato que les compartimos a los vecinos que aceptes cuando te pidan contacto.</Texto>
          <Boton tipo="secundario" texto="Ir a Mis datos" icono="create-outline" onPress={() => router.push('/mis-datos')} />
        </Tarjeta>
      )}
      {mercado && (
        <>
          {original
            ? <Texto v="suave">Tipo de aviso: {TIPOS.find((x) => x.valor === tipo)?.texto}. El tipo no se puede cambiar.</Texto>
            : <Opciones etiqueta="Tipo de aviso" valor={tipo} onCambio={setTipo} opciones={TIPOS} />}
          <Campo etiqueta="Título" value={titulo} onChangeText={setTitulo} maxLength={muroApi.MAX_TITULO_AVISO} placeholder={tipo === 'Busco' ? 'Escalera de 3 metros' : tipo === 'Servicio' ? 'Clases de matemáticas' : 'Bicicleta aro 26'} />
          {tipo !== 'Busco' && (
            <Campo
              etiqueta="Precio (opcional)" value={precio} onChangeText={(v) => setPrecio(v.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))} keyboardType="number-pad" maxLength={DIGITOS_PRECIO}
              ayuda={precio ? clp(Number(precio)) : 'Déjalo vacío si es a convenir'}
            />
          )}
        </>
      )}
      <Campo
        etiqueta={mercado ? 'Descripción (opcional)' : 'Mensaje'} value={texto} onChangeText={setTexto} multiline
        maxLength={mercado ? muroApi.MAX_DESCRIPCION_AVISO : muroApi.MAX_MENSAJE}
        placeholder={mercado ? 'En buen estado, se puede probar en el pasaje…' : '¿Alguien perdió un gato gris?…'}
        style={{ minHeight: 140, paddingTop: 12, textAlignVertical: 'top' }}
        ayuda={`${texto.length}/${mercado ? muroApi.MAX_DESCRIPCION_AVISO : muroApi.MAX_MENSAJE} · se publica como ${nombreUnidad(unidad)}`}
      />
      {mercado && perfil.telefono && (
        <Texto v="suave">Tus vecinos verán tu nombre y {nombreUnidad(unidad)}. Tu teléfono {telefono(perfil.telefono)} solo se comparte con quienes aceptes cuando te pidan contacto.</Texto>
      )}
      {error && <Texto color={t.bad}>{error}</Texto>}
      <Texto v="chico">Las publicaciones se moderan según las normas de la comunidad. No compartas datos personales de otros vecinos.</Texto>
    </Hoja>
  );
}

// Publicar en el muro (POST muro) o poner un aviso en el mercado (POST marketplace). Lo oficial lo publica la
// directiva desde el panel. Con `editar` (id de un aviso propio) carga el aviso para cambiarlo (PUT marketplace/:id).
export default function Publicar() {
  const t = useTema();
  const { lugar, editar } = useLocalSearchParams<{ lugar?: string; editar?: string }>();
  const original = useConsulta(() => (editar ? muroApi.aviso(Number(editar)) : Promise.resolve(null)), [editar]);
  const inicial = lugar === 'mercado' ? 'mercado' : 'muro';
  if (!editar) return <Formulario inicial={inicial} original={null} />;
  if (!original.datos) {
    return (
      <Hoja titulo="Editar aviso">
        {original.error ? <Texto color={t.bad}>{original.error.message}</Texto> : <ActivityIndicator color={t.accion} accessibilityLabel="Cargando el aviso" />}
      </Hoja>
    );
  }
  const a = original.datos;
  if (!a.esMia || a.cerradoEn || a.estadoModeracion === 'Oculta') {
    return (
      <Hoja titulo="Editar aviso" abajo={<Boton texto="Volver" onPress={() => router.back()} />}>
        <Texto v="suave">{!a.esMia ? 'Este aviso no es tuyo.' : a.estadoModeracion === 'Oculta' ? 'El aviso está oculto por la administración: no puedes editarlo.' : 'Reabre el aviso para editarlo.'}</Texto>
      </Hoja>
    );
  }
  return <Formulario inicial="mercado" original={a} />;
}
