import { useState } from 'react';
import { router } from 'expo-router';
import { useApp } from '@/context/App';
import { errorClaveNueva } from '@/utils/clave';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';

// Cambiar la contraseña con la sesión abierta (PUT auth/perfil/password). Como la API: pide la actual,
// la nueva tiene al menos 8 caracteres, una letra y un número, y no puede ser igual a la actual.
// Al cambiarla se cierran las sesiones en otros dispositivos y llega un aviso al correo.
export default function CambiarClave() {
  const { acciones } = useApp();
  const [f, setF] = useState({ actual: '', nueva: '', repetir: '' });
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState<{ campo: 'actual' | 'nueva'; texto: string } | null>(null);

  const errorNueva = errorClaveNueva(f.nueva);
  const errorRepetir = f.repetir !== f.nueva ? 'Las contraseñas no coinciden' : false;
  const guardar = () => {
    setIntento(true);
    if (!f.actual || errorNueva || errorRepetir) return;
    const r = acciones.cambiarClave(f.actual, f.nueva);
    if (!r) { router.back(); return; }
    setError({ campo: r.includes('actual no es correcta') ? 'actual' : 'nueva', texto: r });
  };
  const cambiar = (campo: keyof typeof f) => (v: string) => { setF({ ...f, [campo]: v }); setError(null); };

  return (
    <Hoja titulo="Cambiar contraseña" abajo={<Boton texto="Cambiar contraseña" disabled={!f.actual || !f.nueva || !f.repetir} onPress={guardar} />}>
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
      <Texto v="chico">Al cambiarla, cerramos tu sesión en los otros dispositivos donde entraste y te avisamos por correo.</Texto>
    </Hoja>
  );
}
