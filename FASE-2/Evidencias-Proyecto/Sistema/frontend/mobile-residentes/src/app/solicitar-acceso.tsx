import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COMUNIDADES } from '@/data/demo';
import { formatearRut, rutValido } from '@/utils/rut';
import { useTema } from '@/constants/tema';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';

const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.trim());

// Un vecino nuevo pide acceso a su vivienda; la administración (o la presidencia) lo aprueba en el panel.
export default function SolicitarAcceso() {
  const t = useTema();
  const [f, setF] = useState({ comunidad: '', numero: '', relacion: 'propietario', nombre: '', rut: '', correo: '', mensaje: '' });
  const [intento, setIntento] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const cambiar = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const comunidad = COMUNIDADES.find((c) => String(c.id) === f.comunidad);

  const faltas = {
    comunidad: !f.comunidad && 'Elige tu comunidad',
    numero: !f.numero.trim() && 'Escribe el número de tu vivienda',
    nombre: !f.nombre.trim() && 'Escribe tu nombre completo',
    rut: !rutValido(f.rut) && 'RUT no válido',
    correo: !correoValido(f.correo) && 'Revisa el correo',
  };
  const err = (k: keyof typeof faltas) => (intento ? faltas[k] : false);

  const enviar = () => {
    setIntento(true);
    if (Object.values(faltas).some(Boolean)) return;
    setEnviada(true);
  };

  if (enviada) {
    return (
      <Hoja titulo="Solicitud enviada" abajo={<Boton texto="Volver a entrar" onPress={() => router.back()} />}>
        <Ionicons name="paper-plane-outline" size={44} color={t.cobalt} />
        <Texto v="titulo">Listo, {f.nombre.split(' ')[0]}</Texto>
        <Texto>
          {comunidad?.modulos.includes('administrador_externo') ? 'La administración' : 'La directiva'} de {comunidad?.nombre} revisará tu solicitud para {comunidad?.tipo === 'Edificio' ? 'el depto' : 'la casa'} {f.numero}. Te avisaremos a {f.correo.trim()} cuando puedas entrar.
        </Texto>
      </Hoja>
    );
  }

  return (
    <Hoja titulo="Solicitar acceso" abajo={<Boton texto="Enviar solicitud" onPress={enviar} />}>
      <Texto v="suave">Pide acceso a tu vivienda. Tu comunidad debe estar en EntreCasas.</Texto>
      <Opciones etiqueta="Comunidad" opciones={COMUNIDADES.map((c) => ({ valor: String(c.id), texto: c.nombre, detalle: c.tipo }))} valor={f.comunidad || null} onCambio={cambiar('comunidad')} />
      {err('comunidad') && <Texto v="chico" color={t.bad}>{err('comunidad')}</Texto>}
      <Campo etiqueta={comunidad?.tipo === 'Edificio' ? 'Número de depto' : 'Número de casa'} value={f.numero} onChangeText={cambiar('numero')} keyboardType="number-pad" error={err('numero')} />
      <Opciones etiqueta="Vivo ahí como" opciones={[{ valor: 'propietario', texto: 'Propietario' }, { valor: 'arrendatario', texto: 'Arrendatario' }]} valor={f.relacion} onCambio={cambiar('relacion')} />
      <Campo etiqueta="Nombre completo" value={f.nombre} onChangeText={cambiar('nombre')} autoComplete="name" error={err('nombre')} />
      <Campo etiqueta="RUT" value={f.rut} onChangeText={cambiar('rut')} onBlur={() => rutValido(f.rut) && setF({ ...f, rut: formatearRut(f.rut) })} autoCapitalize="characters" error={err('rut') || (f.rut.length > 3 && !rutValido(f.rut) && 'RUT no válido')} />
      <Campo etiqueta="Correo" value={f.correo} onChangeText={cambiar('correo')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={err('correo')} ayuda="Aquí te avisamos cuando te aprueben" />
      <Campo etiqueta="Mensaje para la administración (opcional)" value={f.mensaje} onChangeText={cambiar('mensaje')} multiline style={{ minHeight: 90, paddingTop: 12, textAlignVertical: 'top' }} />
      <View />
    </Hoja>
  );
}
