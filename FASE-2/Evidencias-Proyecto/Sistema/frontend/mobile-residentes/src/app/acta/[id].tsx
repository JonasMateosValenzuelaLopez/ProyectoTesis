import EnConexion from '@/components/ec/EnConexion';

// Se conecta con la API en la fase 7. La versión anterior, con datos de prueba, está en el commit d22b2ee.
export default function Acta() {
  return <EnConexion titulo="Acta" fase={7} hoja />;
}
