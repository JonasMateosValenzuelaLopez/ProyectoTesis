import EnConexion from '@/components/ec/EnConexion';

// Se conecta con la API en la fase 4. La versión anterior, con datos de prueba, está en el commit d22b2ee.
export default function Pagos() {
  return <EnConexion titulo="Pagos" fase={4} hoja />;
}
