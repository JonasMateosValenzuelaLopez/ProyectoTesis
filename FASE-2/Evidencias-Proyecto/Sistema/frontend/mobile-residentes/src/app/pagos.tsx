import { Redirect } from 'expo-router';

// El historial de pagos ahora vive en la pestaña Finanzas; este enlace antiguo lleva allá.
export default function Pagos() {
  return <Redirect href="/finanzas" />;
}
