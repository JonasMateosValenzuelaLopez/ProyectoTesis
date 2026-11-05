# Product Backlog

Estado al 1 de noviembre de 2026. "Vista" significa que la pantalla existe con datos de prueba y "API" que el endpoint está implementado.

| ID | Historia de usuario | Prioridad | Sprint | Criterios de aceptación | Estado |
|---|---|---|---|---|---|
| HU-01 | Como vecino quiero solicitar acceso a mi comunidad para usar la plataforma | Alta | 2 | La solicitud se guarda como pendiente; la respuesta no revela si la cuenta existe | API y vista; falta conectar |
| HU-02 | Como Administrador quiero aprobar o rechazar solicitudes para controlar quién entra | Alta | 2 | Al aprobar se crea cuenta, cargo y residencia, se registra en bitácora y se envía correo | API y vista; falta conectar |
| HU-03 | Como usuario quiero entrar con contraseña o código por correo para acceder de forma segura | Alta | 2 | Máximo 5 intentos por código; código válido por 10 minutos | API y vista; falta conectar |
| HU-04 | Como usuario quiero recuperar mi contraseña para no perder el acceso | Alta | 2 | Enlace válido por 1 hora y de un solo uso | API y vista; falta conectar |
| HU-05 | Como usuario quiero elegir comunidad y cargo para actuar en el contexto correcto | Alta | 3 | Solo aparecen cargos vigentes de comunidades activas | Vista; falta conectar |
| HU-06 | Como Presidente quiero revisar la bitácora para supervisar las acciones de la comunidad | Media | 3 | Lista acciones con usuario y fecha, filtradas por comunidad | Registro en API; falta consulta |
| HU-07 | Como equipo EntreCasas quiero crear comunidades para incorporar clientes | Alta | 3 | Crea comunidad, unidades, módulos y primer responsable en una transacción | API; falta conectar |
| HU-08 | Como Administrador quiero gestionar unidades para reflejar las viviendas | Alta | 3 | No se repite el número de unidad dentro de una comunidad, salvo departamentos de torres distintas | API; falta conectar |
| HU-09 | Como Administrador quiero gestionar residentes para mantener el padrón | Alta | 3 | Una persona puede tener varias residencias con fechas de vigencia | API; falta conectar |
| HU-10 | Como Administrador quiero asignar cargos para definir los permisos | Alta | 3 | Solo un Presidente, un Tesorero y un Secretario vigentes por comunidad | API; falta conectar |
| HU-11 | Como Administrador quiero activar módulos para adaptar la plataforma a mi comunidad | Media | 3 | Las rutas de un módulo apagado quedan inaccesibles | Vista |
| HU-12 | Como Tesorero quiero crear cobros para informar a cada unidad lo que debe | Alta | 4 | El cobro se asocia a las unidades correspondientes | Vista |
| HU-13 | Como Tesorero quiero marcar pagos para mantener las cuentas al día | Alta | 4 | Queda registrado quién marcó y cuándo | Vista |
| HU-14 | Como residente quiero avisar que transferí para que Tesorería lo revise | Alta | 4 | El aviso no marca el cobro como pagado | Vista |
| HU-15 | Como Tesorero quiero ver la morosidad para gestionar las deudas | Alta | 4 | Lista unidades con cobros vencidos e impagos | Vista |
| HU-16 | Como Tesorero quiero registrar egresos para transparentar los gastos | Media | 4 | Requiere visado del Presidente desde el umbral de la comunidad | Vista |
| HU-17 | Como residente quiero solicitar una exención para regularizar un caso especial | Baja | Por definir | La solicitud queda pendiente hasta su resolución | Vista |
| HU-18 | Como residente quiero publicar en el Muro Vecinal para comunicarme con mis vecinos | Alta | 4 | Solo se ve en la comunidad de quien publica | Vista |
| HU-19 | Como residente quiero reportar una publicación para mantener la sana convivencia | Media | 4 | El reporte valida que la publicación exista y sea de la comunidad | Vista |
| HU-20 | Como residente quiero publicar en el Marketplace para ofrecer productos a mis vecinos | Media | 4 | Publicación con categoría y solicitud de contacto | Vista |
| HU-21 | Como residente quiero votar para participar en las decisiones | Media | Por definir | Un voto por persona en cada votación | Vista |
| HU-22 | Como Secretario quiero registrar actas para dejar constancia de los acuerdos | Media | Por definir | El acta guarda asistentes, temas y acuerdos | Vista |
| HU-23 | Como residente quiero reservar un espacio común para usarlo sin cruces | Media | 5 | No se permiten dos reservas en un mismo bloque | Vista |
| HU-24 | Como residente quiero invitar visitas con QR para agilizar su ingreso | Media | 5 | El código identifica una invitación vigente | Vista |
| HU-25 | Como Conserje quiero validar visitas para controlar el acceso | Media | 5 | El ingreso queda en el registro de accesos | Vista |
| HU-26 | Como equipo quiero contenerizar el sistema para instalarlo de forma consistente | Media | 5 | La API y la BD se levantan con Docker Compose | Pendiente |
| HU-27 | Como equipo quiero desplegar el sistema para usarlo en la nube | Media | 5 | Panel y API accesibles por una URL pública | Pendiente |
