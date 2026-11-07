import EnConexion from '@/components/ec/EnConexion';

// Se conecta con la API en la fase 6. La versión anterior, con datos de prueba, está en el commit d22b2ee.
export default function Mercado() {
  return <EnConexion titulo="Mercado" fase={6} />;
}
