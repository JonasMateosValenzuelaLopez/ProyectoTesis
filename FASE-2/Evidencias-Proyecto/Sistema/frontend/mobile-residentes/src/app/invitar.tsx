import EnConexion from '@/components/ec/EnConexion';

// Se conecta con la API en la fase 8. La versión anterior, con datos de prueba, está en el commit d22b2ee.
export default function InvitarVisita() {
  return <EnConexion titulo="Invitar visita" fase={8} hoja />;
}
