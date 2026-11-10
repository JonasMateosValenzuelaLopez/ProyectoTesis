// Política de privacidad de EntreCasas (Ley 21.719 sobre protección de datos personales).
// Es la misma que muestra el panel web (web-admin/src/config/privacidad.js): si cambia una, cambiar la otra
// y subir la versión. Texto provisorio: debe revisarlo un abogado antes de publicar la plataforma.

export const VERSION_PRIVACIDAD = '1 · 10 de noviembre de 2026';
export const RESPONSABLE = 'EntreCasas';
export const CORREO_PRIVACIDAD = 'entrecasas@gmail.com';

// Resumen que acompaña a los formularios que piden datos personales
export const AVISO_SOLICITUD = `${RESPONSABLE} usará tu RUT, nombre, correo, teléfono y vivienda solo para que la administración de tu comunidad valide tu residencia, crear tu cuenta y avisarte por correo. No vendemos ni cedemos tus datos.`;
export const TEXTO_CONSENTIMIENTO = 'Leí la Política de privacidad y acepto el tratamiento de mis datos para gestionar mi acceso.';

export type SeccionPrivacidad = { titulo: string; parrafos?: string[]; lista?: string[] };

export const SECCIONES_PRIVACIDAD: SeccionPrivacidad[] = [
  {
    titulo: 'Quién es responsable de tus datos',
    parrafos: [
      `${RESPONSABLE} es responsable del tratamiento de los datos personales que entregas en la plataforma (panel web y app de residentes). Puedes escribirnos a ${CORREO_PRIVACIDAD}.`,
      'La administración de tu comunidad (administrador, presidencia y demás cargos de la directiva) accede a los datos que necesita para gestionar la comunidad.',
    ],
  },
  {
    titulo: 'Qué datos tratamos',
    lista: [
      'Identificación: RUT o documento de identidad, nombre y apellidos.',
      'Contacto: correo electrónico y, si lo entregas, teléfono.',
      'Vivienda: comunidad, número de casa o departamento y si eres propietario o arrendatario.',
      'Uso de la plataforma: cobros y pagos que marca la administración, reservas, votaciones, publicaciones y las fichas privadas de Mi hogar.',
      'Visitas: nombre, RUT y patente de las personas que invitas o que llegan a portería.',
    ],
  },
  {
    titulo: 'Para qué los usamos',
    lista: [
      'Validar que vives en la vivienda que indicas y crear tu cuenta.',
      'Permitirte usar las funciones de tu comunidad: pagos, reservas, votaciones, muro, mercado e invitaciones.',
      'Enviarte avisos por correo sobre tu cuenta y tu comunidad.',
      'Registrar el ingreso de visitas en portería, por seguridad de la comunidad.',
    ],
    parrafos: ['Tratamos tus datos con tu consentimiento y para cumplir el servicio que tu comunidad contrató. No los usamos para publicidad ni los vendemos.'],
  },
  {
    titulo: 'Con quién los compartimos',
    parrafos: [
      'Solo con la administración y la directiva de tu comunidad, en lo que necesitan para gestionarla, y con los proveedores tecnológicos que nos dan alojamiento y envío de correos, que actúan por encargo nuestro y no pueden usarlos para otros fines.',
      'En el mercado vecinal, tu teléfono se comparte solo con los vecinos que tú aceptas.',
    ],
  },
  {
    titulo: 'Cuánto tiempo los guardamos',
    lista: [
      'Los datos de tu cuenta, mientras vivas en la comunidad y tengas acceso a ella.',
      'Las solicitudes de acceso, mientras se revisan y el tiempo necesario para dejar constancia de cómo se resolvieron.',
      'Los registros de visitas se anonimizan a los 12 meses, salvo que la administración los retenga por un incidente concreto.',
    ],
  },
  {
    titulo: 'Tus derechos',
    parrafos: [
      `Puedes pedir acceder a tus datos, rectificarlos, suprimirlos, oponerte a su tratamiento, solicitar su portabilidad o su bloqueo temporal. Escríbenos a ${CORREO_PRIVACIDAD} indicando tu nombre, RUT y lo que necesitas; te responderemos dentro de los plazos de la ley.`,
      'Si no quedas conforme con la respuesta, puedes reclamar ante la Agencia de Protección de Datos Personales.',
    ],
  },
  {
    titulo: 'Cómo los protegemos',
    parrafos: ['Las contraseñas se guardan cifradas, el acceso a cada dato depende del cargo de cada persona y las acciones de la administración quedan registradas en una bitácora que no se puede modificar.'],
  },
];
