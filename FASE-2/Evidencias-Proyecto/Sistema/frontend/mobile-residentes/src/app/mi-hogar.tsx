import EnConexion from '@/components/ec/EnConexion';

// Se conecta con la API en la fase 9. La versión anterior, con datos de prueba, está en el commit d22b2ee.
export default function MiHogar() {
  return <EnConexion titulo="Mi hogar" fase={9} hoja />;
}
