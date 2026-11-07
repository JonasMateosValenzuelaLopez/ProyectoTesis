import EnConexion from '@/components/ec/EnConexion';

// Se conecta con la API en la fase 8. La versión anterior, con datos de prueba, está en el commit d22b2ee.
export default function InvitacionesDeLaVivienda() {
  return <EnConexion titulo="Invitaciones de la vivienda" fase={8} hoja />;
}
