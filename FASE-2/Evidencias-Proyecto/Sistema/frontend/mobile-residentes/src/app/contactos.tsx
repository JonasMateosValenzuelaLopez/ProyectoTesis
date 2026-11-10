import EnConexion from '@/components/ec/EnConexion';

// Se conecta con la API en la fase 3. La versión anterior, con datos de prueba, está en el commit d22b2ee.
export default function ContactosDeLaComunidad() {
  return <EnConexion titulo="Contactos de la comunidad" fase={3} hoja />;
}
