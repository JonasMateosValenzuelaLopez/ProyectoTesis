import { useState } from 'react';
import { router } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import * as auth from '@/api/auth';
import { ErrorApi, mensajeDe } from '@/api/cliente';
import { errorClaveNueva } from '@/utils/clave';
import { useTema } from '@/constants/tema';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';

// Cambiar la contraseña con la sesión abierta (PUT auth/perfil/password). Como la API: pide la actual,
// la nueva tiene al menos 8 caracteres, una letra y un número, y no puede ser igual a la actual.
// Al cambiarla se cierran las sesiones en otros dispositivos y llega un aviso al correo.
export default function CambiarClave() {
  const t = useTema();
  const { acciones } = useSesion();
  const [f, setF] = useState({ actual: '', nueva: '', repetir: '' });
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState<{ campo: 'actual' | 'nueva' | 'general'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const errorNueva = errorClaveNueva(f.nueva);
  const errorRepetir = f.repetir !== f.nueva ? 'Las contraseñas no coinciden' : false;
  const guardar = async () => {
    setIntento(true);
    if (!f.actual || errorNueva || errorRepetir) return;
    setEnviando(true);
    try {
      // La API devuelve una sesión nueva: el token anterior y los de otros dispositivos dejan de servir
      await acciones.renovarSesion(await auth.cambiarPassword(f.actual, f.nueva));
      acciones.avisar('Contraseña actualizada. Cerramos la sesión en tus otros dispositivos.');
      router.back();
    } catch (e) {
      const campos = e instanceof ErrorApi ? e.campos : null;
      setError(campos?.passwordActual ? { campo: 'actual', texto: campos.passwordActual }
        : campos?.passwordNueva ? { campo: 'nueva', texto: campos.passwordNueva }
          : { campo: 'general', texto: mensajeDe(e) });
    } finally {
      setEnviando(false);
    }
  };
  const cambiar = (campo: keyof typeof f) => (v: string) => { setF({ ...f, [campo]: v }); setError(null); };

  return (
    <Hoja titulo="Cambiar contraseña" abajo={<Boton texto="Cambiar contraseña" cargando={enviando} disabled={!f.actual || !f.nueva || !f.repetir} onPress={guardar} />}>
      <Campo
        etiqueta="Contraseña actual" value={f.actual} onChangeText={cambiar('actual')} secureTextEntry autoComplete="current-password" textContentType="password"
        error={(intento && !f.actual && 'Escribe tu contraseña actual') || (error?.campo === 'actual' && error.texto)}
      />
      <Campo
        etiqueta="Contraseña nueva" value={f.nueva} onChangeText={cambiar('nueva')} secureTextEntry autoComplete="new-password" textContentType="newPassword"
        ayuda="Al menos 8 caracteres, con una letra y un número." error={(intento && errorNueva) || (error?.campo === 'nueva' && error.texto)}
      />
      <Campo
        etiqueta="Repite la contraseña nueva" value={f.repetir} onChangeText={cambiar('repetir')} secureTextEntry autoComplete="new-password" textContentType="newPassword"
        error={intento && errorRepetir}
      />
      {error?.campo === 'general' && <Texto color={t.bad}>{error.texto}</Texto>}
      <Texto v="chico">Al cambiarla, cerramos tu sesión en los otros dispositivos donde entraste y te avisamos por correo.</Texto>
    </Hoja>
  );
}
