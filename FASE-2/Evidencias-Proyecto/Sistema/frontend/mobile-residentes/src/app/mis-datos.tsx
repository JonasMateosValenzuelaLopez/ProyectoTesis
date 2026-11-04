import { useState } from 'react';
import { router } from 'expo-router';
import { useApp } from '@/context/App';
import { CUENTAS } from '@/data/demo';
import { normalizarTelefono, telefono } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';

const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);
// Actualizar correo y teléfono de la cuenta (`usuarios.correo` y `usuarios.telefono`).
// El nombre y el RUT no se cambian aquí: los corrige la administración.
export default function MisDatos() {
  const { cuenta, acciones } = useApp();
  const [correo, setCorreo] = useState(cuenta?.correo ?? '');
  const [tel, setTel] = useState(telefono(cuenta?.telefono));
  const [intento, setIntento] = useState(false);
  if (!cuenta) return null;

  const c = correo.trim().toLowerCase();
  const nuevoTelefono = tel.trim() ? normalizarTelefono(tel) : null;
  const errores: { correo: string | false; telefono: string | false } = {
    correo: !correoValido(c) ? 'Revisa el correo'
      : CUENTAS.some((x) => x.id_usuario !== cuenta.id_usuario && x.correo.toLowerCase() === c) ? 'Ese correo ya lo usa otra cuenta' : false,
    telefono: !!tel.trim() && !nuevoTelefono ? 'Escribe un celular de 9 dígitos, por ejemplo 9 6123 4501' : false,
  };
  const sinCambios = c === cuenta.correo && nuevoTelefono === cuenta.telefono;

  const guardar = () => {
    setIntento(true);
    if (errores.correo || errores.telefono) return;
    acciones.actualizarDatos({ correo: c, telefono: nuevoTelefono });
    router.back();
  };

  return (
    <Hoja titulo="Mis datos de contacto" abajo={<Boton texto="Guardar cambios" disabled={sinCambios} onPress={guardar} />}>
      <Texto v="suave">La administración y la conserjería usan estos datos para avisarte. Al correo también llegan los códigos para entrar.</Texto>
      <Campo
        etiqueta="Correo" value={correo} onChangeText={setCorreo} keyboardType="email-address" autoCapitalize="none" autoComplete="email"
        error={intento && errores.correo}
      />
      <Campo
        etiqueta="Teléfono celular (opcional)" value={tel} onChangeText={setTel} keyboardType="phone-pad" autoComplete="tel" placeholder="+56 9 6123 4501"
        error={intento && errores.telefono} ayuda="Si lo dejas vacío, la conserjería no podrá llamarte."
      />
    </Hoja>
  );
}
