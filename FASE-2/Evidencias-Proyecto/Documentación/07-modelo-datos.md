# Modelo de datos

El modelo se implementa en MariaDB y tiene 39 tablas y 91 llaves foráneas. Los diagramas se generaron desde el esquema real de la base de datos. Por claridad omiten las tres fechas de auditoría que tiene cada tabla: `fecha_creacion`, `fecha_actualizacion` y `fecha_eliminacion`.

Convenciones: **PK** es llave primaria, **FK** es llave foránea y **UK** es valor único. Cada diagrama incluye las relaciones de su área, por lo que también aparecen tablas de otras áreas relacionadas con ella.

## Reglas principales
- Un usuario tiene un cargo por fila en `membresias` y una vivienda por fila en `residencias`.
- Cada dato de una comunidad se asocia a `redes_vecinales`.
- Los registros se eliminan con borrado lógico mediante `fecha_eliminacion`.
- `muro_reportes.id_publicacion` no tiene llave foránea, porque apunta al muro o al marketplace según `tipo_publicacion`.
- En el muro y el marketplace, que el autor borre una publicación es un borrado lógico (`fecha_eliminacion`); que la oculte un moderador es `estado_moderacion` = 'Oculta', con `moderado_por` y `moderado_en`.
- `hogar_fichas` pertenece a la unidad: solo la ven y editan sus residentes vigentes.

## Identidad y acceso

```mermaid
erDiagram
    usuarios ||--o{ actas : ""
    usuarios ||--o{ bitacora_auditoria : ""
    usuarios ||--o{ cobros : ""
    usuarios ||--o{ cobros_avisos_pago : ""
    usuarios ||--o{ cobro_unidades : ""
    usuarios ||--o{ codigos_otp : ""
    usuarios ||--o{ comunidad_guias : ""
    usuarios ||--o{ egresos : ""
    usuarios ||--o{ exenciones : ""
    usuarios ||--o{ hogar_fichas : ""
    usuarios ||--o{ invitaciones : ""
    usuarios ||--o{ marketplace_publicaciones : ""
    usuarios ||--o{ marketplace_solicitudes_contacto : ""
    redes_vecinales ||--o{ membresias : ""
    roles ||--o{ membresias : ""
    usuarios ||--o{ membresias : ""
    usuarios ||--o{ muro_publicaciones : ""
    usuarios ||--o{ muro_reportes : ""
    usuarios ||--o{ notificaciones_enviadas : ""
    usuarios ||--o{ redes_vecinales : ""
    usuarios ||--o{ red_modulos : ""
    usuarios ||--o{ registro_accesos : ""
    usuarios ||--o{ reservas : ""
    unidades ||--o{ residencias : ""
    usuarios ||--o{ residencias : ""
    redes_vecinales ||--o{ solicitudes_acceso : ""
    usuarios ||--o{ solicitudes_acceso : ""
    unidades ||--o{ solicitudes_acceso : ""
    usuarios ||--o{ tokens_password : ""
    usuarios ||--o{ vehiculos : ""
    usuarios ||--o{ votaciones : ""
    usuarios ||--o{ votos : ""
    usuarios {
        int id_usuario PK
        varchar identificador
        char pais
        varchar nombre
        varchar primer_apellido
        varchar segundo_apellido
        varchar correo UK
        varchar telefono
        varchar password_hash
        datetime password_actualizada_en
        tinyint es_plataforma
        tinyint bloqueado
        varchar motivo_bloqueo
        tinyint tutorial_app_visto
        tinyint tutorial_panel_visto
    }
    roles {
        int id_rol PK
        varchar nombre_rol UK
    }
    membresias {
        int id_membresia PK
        int id_usuario FK
        int id_red FK
        int id_rol FK
        tinyint activo
        date desde
        date hasta
    }
    residencias {
        int id_residencia PK
        int id_usuario FK
        int id_unidad FK
        enum tipo
        date desde
        date hasta
        datetime fecha_guia_vista
    }
    solicitudes_acceso {
        int id_solicitud PK
        int id_red FK
        int id_unidad FK
        varchar numero_unidad
        enum tipo_residencia
        varchar identificador
        char pais
        varchar nombre
        varchar primer_apellido
        varchar segundo_apellido
        varchar correo
        varchar telefono
        varchar mensaje
        enum estado
        varchar motivo_rechazo
        datetime fecha_solicitud
        datetime fecha_resolucion
        int id_usuario_resolutor FK
        int id_usuario_creado FK
    }
    codigos_otp {
        int id_codigo PK
        int id_usuario FK
        char codigo_hash
        datetime expira
        tinyint usado
        tinyint intentos
    }
    tokens_password {
        int id_token PK
        int id_usuario FK
        char token_hash UK
        enum tipo
        datetime fecha_expiracion
        datetime fecha_uso
    }
```

## Comunidad

```mermaid
erDiagram
    redes_vecinales ||--o{ actas : ""
    redes_vecinales ||--o{ bitacora_auditoria : ""
    usuarios ||--o{ bitacora_auditoria : ""
    redes_vecinales ||--o{ categorias_gasto : ""
    redes_vecinales ||--o{ cobros : ""
    unidades ||--o{ cobro_unidades : ""
    redes_vecinales ||--o{ comunidad_contactos : ""
    redes_vecinales ||--o| comunidad_guias : ""
    usuarios ||--o{ comunidad_guias : ""
    redes_vecinales ||--o{ egresos : ""
    redes_vecinales ||--o{ espacios_comunes : ""
    unidades ||--o{ hogar_fichas : ""
    usuarios ||--o{ hogar_fichas : ""
    redes_vecinales ||--o{ invitaciones : ""
    unidades ||--o{ invitaciones : ""
    redes_vecinales ||--o{ marketplace_publicaciones : ""
    unidades ||--o{ marketplace_publicaciones : ""
    unidades ||--o{ marketplace_solicitudes_contacto : ""
    redes_vecinales ||--o{ membresias : ""
    redes_vecinales ||--o{ muro_publicaciones : ""
    unidades ||--o{ muro_publicaciones : ""
    redes_vecinales ||--o{ muro_reportes : ""
    redes_vecinales ||--o{ notificaciones_enviadas : ""
    usuarios ||--o{ redes_vecinales : ""
    redes_vecinales ||--o{ red_modulos : ""
    usuarios ||--o{ red_modulos : ""
    modulos ||--o{ red_modulos : ""
    unidades ||--o{ registro_accesos : ""
    redes_vecinales ||--o{ registro_accesos : ""
    redes_vecinales ||--o{ reservas : ""
    unidades ||--o{ reservas : ""
    unidades ||--o{ residencias : ""
    redes_vecinales ||--o{ solicitudes_acceso : ""
    unidades ||--o{ solicitudes_acceso : ""
    redes_vecinales ||--o{ unidades : ""
    unidades ||--o{ vehiculos : ""
    redes_vecinales ||--o{ visitantes : ""
    redes_vecinales ||--o{ votaciones : ""
    redes_vecinales {
        int id_red PK
        varchar nombre
        enum tipo
        varchar direccion
        enum estado
        varchar motivo_suspension
        int creada_por FK
        datetime ultima_actividad
        varchar banco
        varchar tipo_cuenta
        varchar numero_cuenta
        varchar titular_cuenta
        varchar identificador_titular
        varchar correo_transferencias
        decimal umbral_visado
    }
    unidades {
        int id_unidad PK
        int id_red FK
        varchar numero_identificador
        enum tipo
        varchar calle_pasaje
        varchar torre
        varchar torre_clave
        smallint piso
        varchar manzana
        int orden
        varchar estacionamiento
    }
    modulos {
        varchar codigo PK
        varchar nombre
        varchar descripcion
    }
    red_modulos {
        int id_red PK
        varchar codigo_modulo PK
        tinyint activo
        int actualizado_por FK
    }
    comunidad_contactos {
        int id_contacto PK
        int id_red FK
        varchar nombre
        varchar detalle
        varchar telefono
        varchar horario
        tinyint visible
    }
    comunidad_guias {
        int id_red PK
        varchar mensaje
        set basura_dias
        varchar basura_horario
        varchar basura_lugar
        varchar reciclaje_lugar
        varchar reciclaje_detalle
        int actualizado_por FK
    }
    hogar_fichas {
        int id_ficha PK
        int id_unidad FK
        enum tipo
        varchar titulo
        text detalle
        varchar contacto_nombre
        varchar contacto_telefono
        date fecha
        date fecha_vence
        int creado_por FK
    }
    bitacora_auditoria {
        int id_bitacora PK
        enum ambito
        int id_red FK
        int id_usuario FK
        varchar accion
        varchar entidad
        int id_entidad
        longtext detalle
    }
```

## Finanzas

```mermaid
erDiagram
    redes_vecinales ||--o{ categorias_gasto : ""
    categorias_gasto ||--o{ cobros : ""
    usuarios ||--o{ cobros : ""
    redes_vecinales ||--o{ cobros : ""
    cobro_unidades ||--o{ cobros_avisos_pago : ""
    usuarios ||--o{ cobros_avisos_pago : ""
    cobros ||--o{ cobro_unidades : ""
    usuarios ||--o{ cobro_unidades : ""
    unidades ||--o{ cobro_unidades : ""
    categorias_gasto ||--o{ egresos : ""
    usuarios ||--o{ egresos : ""
    redes_vecinales ||--o{ egresos : ""
    cobro_unidades ||--o{ exenciones : ""
    usuarios ||--o{ exenciones : ""
    cobros ||--o{ notificaciones_enviadas : ""
    usuarios ||--o{ notificaciones_enviadas : ""
    redes_vecinales ||--o{ notificaciones_enviadas : ""
    votaciones ||--o{ notificaciones_enviadas : ""
    categorias_gasto {
        int id_categoria PK
        int id_red FK
        varchar nombre
        tinyint activa
    }
    cobros {
        int id_cobro PK
        int id_red FK
        int id_categoria FK
        varchar concepto
        text descripcion
        decimal monto_por_unidad
        date periodo
        date fecha_emision
        date fecha_vencimiento
        tinyint extraordinario
        int creado_por FK
    }
    cobro_unidades {
        int id_cobro_unidad PK
        int id_cobro FK
        int id_unidad FK
        decimal monto
        enum estado
        datetime pagado_marcado_en
        int pagado_marcado_por FK
    }
    cobros_avisos_pago {
        int id_aviso PK
        int id_cobro_unidad FK
        int id_usuario FK
        decimal monto
        enum metodo
        date fecha_pago
        varchar comprobante_url
        varchar observacion
        enum estado
        varchar motivo_rechazo
        int validado_por FK
        datetime validado_en
    }
    exenciones {
        int id_exencion PK
        int id_cobro_unidad FK
        varchar motivo
        int solicitada_por FK
        enum estado
        int revisada_por FK
        datetime revisada_en
        int resuelta_por FK
        datetime resuelta_en
        varchar comentario_resolucion
    }
    egresos {
        int id_egreso PK
        int id_red FK
        int id_categoria FK
        decimal monto
        varchar descripcion
        varchar proveedor
        date fecha_egreso
        varchar comprobante_url
        tinyint requiere_visado
        enum estado_visado
        int visado_por FK
        datetime visado_en
        int creado_por FK
    }
    notificaciones_enviadas {
        int id_notificacion PK
        int id_red FK
        enum tipo
        varchar asunto
        int id_cobro FK
        int id_votacion FK
        int destinatarios
        int enviado_por FK
    }
```

## Directiva

```mermaid
erDiagram
    usuarios ||--o{ actas : ""
    redes_vecinales ||--o{ actas : ""
    votaciones ||--o{ notificaciones_enviadas : ""
    usuarios ||--o{ votaciones : ""
    redes_vecinales ||--o{ votaciones : ""
    actas ||--o{ votaciones_acuerdos_acta : ""
    votaciones ||--o{ votacion_opciones : ""
    votaciones ||--o{ votos : ""
    votacion_opciones ||--o{ votos : ""
    usuarios ||--o{ votos : ""
    actas {
        int id_acta PK
        int id_red FK
        int numero
        varchar titulo
        enum tipo_reunion
        datetime fecha_asamblea
        varchar lugar
        int unidades_presentes
        text asistentes
        text temas
        longtext contenido
        varchar archivo_url
        tinyint publicada
        datetime publicada_en
        int creada_por FK
    }
    votaciones_acuerdos_acta {
        int id_acuerdo PK
        int id_acta FK
        varchar texto
        varchar responsable
        date plazo
    }
    votaciones {
        int id_votacion PK
        int id_red FK
        varchar titulo
        text descripcion
        enum tipo
        tinyint quorum_minimo
        datetime inicio
        datetime cierre
        datetime cerrada_en
        int creada_por FK
    }
    votacion_opciones {
        int id_opcion PK
        int id_votacion FK
        varchar texto
        tinyint orden
    }
    votos {
        int id_voto PK
        int id_votacion FK
        int id_opcion FK
        int id_usuario FK
    }
```

## Muro y marketplace

```mermaid
erDiagram
    usuarios ||--o{ marketplace_publicaciones : ""
    categorias_marketplace ||--o{ marketplace_publicaciones : ""
    redes_vecinales ||--o{ marketplace_publicaciones : ""
    unidades ||--o{ marketplace_publicaciones : ""
    marketplace_publicaciones ||--o{ marketplace_solicitudes_contacto : ""
    unidades ||--o{ marketplace_solicitudes_contacto : ""
    usuarios ||--o{ marketplace_solicitudes_contacto : ""
    usuarios ||--o{ muro_publicaciones : ""
    redes_vecinales ||--o{ muro_publicaciones : ""
    unidades ||--o{ muro_publicaciones : ""
    redes_vecinales ||--o{ muro_reportes : ""
    usuarios ||--o{ muro_reportes : ""
    muro_publicaciones {
        int id_publicacion PK
        int id_red FK
        int id_usuario FK
        int id_unidad FK
        enum tipo
        varchar titulo
        text contenido
        enum estado_aprobacion
        int aprobado_por FK
        datetime aprobado_en
        enum estado_moderacion
        int moderado_por FK
        datetime moderado_en
    }
    muro_reportes {
        int id_reporte PK
        int id_red FK
        enum tipo_publicacion
        int id_publicacion
        int id_usuario FK
        varchar motivo
        enum estado
        int resuelto_por FK
        datetime resuelto_en
    }
    marketplace_publicaciones {
        int id_producto PK
        int id_red FK
        int id_usuario FK
        int id_unidad FK
        int id_categoria FK
        enum tipo
        varchar titulo
        text descripcion
        decimal precio
        varchar foto_url
        varchar telefono_contacto
        datetime fecha_publicacion
        enum estado_moderacion
        int moderado_por FK
        datetime moderado_en
    }
    categorias_marketplace {
        int id_categoria PK
        varchar nombre_categoria
    }
    marketplace_solicitudes_contacto {
        int id_solicitud PK
        int id_producto FK
        int id_usuario FK
        int id_unidad FK
        enum estado
        datetime respondida_en
        tinyint vista
    }
```

## Reservas y accesos

```mermaid
erDiagram
    redes_vecinales ||--o{ espacios_comunes : ""
    usuarios ||--o{ invitaciones : ""
    redes_vecinales ||--o{ invitaciones : ""
    unidades ||--o{ invitaciones : ""
    visitantes ||--o{ invitaciones : ""
    visitantes ||--o{ registro_accesos : ""
    unidades ||--o{ registro_accesos : ""
    usuarios ||--o{ registro_accesos : ""
    invitaciones ||--o{ registro_accesos : ""
    redes_vecinales ||--o{ registro_accesos : ""
    espacios_comunes ||--o{ reservas : ""
    usuarios ||--o{ reservas : ""
    redes_vecinales ||--o{ reservas : ""
    unidades ||--o{ reservas : ""
    espacios_comunes ||--o{ reservas_bloques : ""
    unidades ||--o{ vehiculos : ""
    usuarios ||--o{ vehiculos : ""
    redes_vecinales ||--o{ visitantes : ""
    espacios_comunes {
        int id_espacio PK
        int id_red FK
        varchar nombre
        text descripcion
        int capacidad
        text reglas
        tinyint estado
    }
    reservas {
        int id_reserva PK
        int id_red FK
        int id_espacio FK
        int id_usuario FK
        int id_unidad FK
        date fecha_reserva
        time hora_inicio
        time hora_fin
        smallint invitados
        varchar observacion
        enum estado_reserva
        varchar motivo_cancelacion
        datetime entregado_en
        int entregado_por FK
        datetime recibido_en
        int recibido_por FK
        varchar observaciones_recepcion
        datetime fecha_solicitud
    }
    reservas_bloques {
        int id_bloque PK
        int id_espacio FK
        time hora_inicio
        time hora_fin
    }
    invitaciones {
        int id_invitacion PK
        int id_red FK
        int id_unidad FK
        int creada_por FK
        int id_visitante FK
        varchar nombre_visita
        varchar identificador_visita
        varchar patente
        enum categoria
        varchar codigo UK
        enum tipo
        datetime valida_desde
        datetime valida_hasta
        int usos_max
        int usos
        datetime cancelada_en
    }
    visitantes {
        int id_visitante PK
        int id_red FK
        varchar rut
        varchar nombre
        varchar apellido
        enum tipo
    }
    registro_accesos {
        int id_acceso PK
        int id_red FK
        int id_visitante FK
        int id_unidad FK
        int id_invitacion FK
        enum categoria
        varchar patente
        datetime fecha_ingreso
        datetime fecha_salida
        enum estado_autorizacion
        enum autorizado_via
        int autorizado_por FK
        tinyint codigo_qr_validado
        int validado_por FK
        enum metodo
    }
    vehiculos {
        int id_vehiculo PK
        int id_usuario FK
        int id_unidad FK
        varchar patente
        varchar marca
        varchar modelo
        varchar color
        varchar estacionamiento
    }
```
