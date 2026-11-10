import EnConexion from '@/components/ec/EnConexion';

// Se conecta con la API en la fase 5. La versión anterior, con datos de prueba, está en el commit d22b2ee.
export default function Reservar() {
  return <EnConexion titulo="Reservar" fase={5} hoja />;
}
