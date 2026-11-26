# Feature Specification: Configuración Dinámica de Tandas, Admin y Versión de WhatsApp

**Feature Branch**: `001-dynamic-notion-tandas`

**Created**: 2026-11-25

**Status**: Draft

**Input**: User description: "Quiero hacer un refactor en la aplicación para no tener que colocar directamente las suscripciones que voy a utilizar en el bot. Por ejemplo, estas se deben obtener a partir del listado de tandas que está en Notion. Y además con generar una nueva tanda dentro de Notion y generar también su tabla en Notion de payments debe bastar para que funcione el bot. Hay que hacer este refactor y además también necesitamos que el bot obtenga la última versión de WhatsApp automáticamente usando import { fetchLatestWaWebVersion } from '@whiskeysockets/baileys' y ya no obtenerla desde el .env. También el numero de admin se debe obtener desde el listado de notion de usuarios cuando el user tenga el grupo \"admin\"."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Alta de Nuevas Suscripciones sin Cambios de Código (Priority: P1)

Como administrador, quiero que el bot obtenga las suscripciones ("tandas") disponibles directamente desde el catálogo de Notion para que, al agregar una nueva tanda y configurar su registro de pagos en Notion, el bot la reconozca automáticamente y los usuarios puedan consultarla, pagarla y ver su reglamento sin modificar ni redesplegar el código fuente.

**Why this priority**: Es el núcleo del refactor solicitado; elimina la dependencia de listas fijas de servicios y permite escalar a cualquier cantidad de suscripciones compartidas de forma autónoma.

**Independent Test**: Se puede probar agregando una nueva tanda activa en el catálogo de Notion, asignando un usuario a ese grupo y verificando que el usuario puede verla en su menú, consultar su estado de pagos, ver su reglamento y registrar un pago mediante conversación natural o comandos.

**Acceptance Scenarios**:

1. **Given** una nueva tanda activa registrada en el catálogo de Notion y un usuario asignado a ella, **When** el usuario solicita el menú principal o pregunta por sus suscripciones, **Then** el bot muestra dinámicamente las opciones correspondientes a esa nueva tanda (pagar, consultar estado y ver reglamento).
2. **Given** un usuario que envía un mensaje natural solicitando pagar o revisar su nueva tanda, **When** el asistente conversacional interpreta la intención, **Then** enruta al usuario al flujo genérico de pago, consulta o reglamento usando los datos actuales de esa tanda obtenidos desde Notion.
3. **Given** una tanda marcada como inactiva en el catálogo de Notion, **When** se generan recordatorios diarios o un usuario consulta el menú, **Then** el bot excluye esa tanda de las opciones activas y de los recordatorios automáticos.

---

### User Story 2 - Obtención Dinámica del Administrador desde el Listado de Usuarios (Priority: P2)

Como administrador, quiero que el bot identifique al administrador y su número de contacto consultando a los usuarios marcados con la propiedad `"Admin?"` en el registro de usuarios de Notion, eliminando la necesidad de configurar manualmente el nombre y teléfono del administrador en variables de entorno.

**Why this priority**: Centraliza la gestión de identidad y permisos en una única fuente de verdad (el registro de usuarios), evitando desincronizaciones cuando cambia el número o se agregan administradores.

**Independent Test**: Se puede probar eliminando la configuración estática del administrador, marcando la casilla `"Admin?"` en un usuario de Notion y verificando que recibe los resúmenes diarios, notificaciones de pago y tiene acceso a los comandos administrativos.

**Acceptance Scenarios**:

1. **Given** al menos un usuario registrado con la casilla `"Admin?"` activa en Notion, **When** el bot envía notificaciones administrativas (resúmenes de recordatorios o avisos de nuevos pagos), **Then** los mensajes se envían al número telefónico obtenido dinámicamente de ese registro.
2. **Given** un usuario con `"Admin?"` activo que escribe al bot, **When** solicita funciones administrativas (estatus general, difusión a grupos, reenvío de recordatorios, consulta de adeudos, ajuste de precios o cambio de contraseña), **Then** el bot valida su rol desde el registro de usuarios y ejecuta la acción solicitada.

---

### User Story 3 - Resolución Automática de la Versión de WhatsApp (Priority: P3)

Como operador del sistema, quiero que el bot obtenga automáticamente la versión más reciente del cliente web de WhatsApp al iniciar la conexión, sin depender de un número de versión configurado manualmente en variables de entorno.

**Why this priority**: Evita fallos de conexión cuando WhatsApp actualiza su protocolo y reduce la intervención manual en la configuración del servidor.

**Independent Test**: Se puede probar iniciando el bot sin la variable de versión configurada y verificando que establece la conexión con WhatsApp utilizando la versión más reciente obtenida automáticamente.

**Acceptance Scenarios**:

1. **Given** que el bot se inicia sin una versión de proveedor configurada manualmente, **When** establece la conexión con el servicio de mensajería, **Then** consulta automáticamente la última versión compatible disponible y la utiliza para inicializar la sesión.

---

### User Story 4 - Cálculo Exacto y Claridad en Adeudos y Recordatorios (Priority: P2)

Como participante de una tanda o administrador, quiero que el bot calcule con precisión los periodos vencidos y muestre claramente cuántos meses o años debo y cuánto dinero en total tengo que pagar, tanto al consultar mi estado como al recibir recordatorios.

**Why this priority**: Elimina errores de conteo cerca de las fechas de corte, corrige el disparo de recordatorios por atraso y evita confusiones sobre el monto total acumulado cuando se debe más de un periodo.

**Independent Test**: Se puede probar consultando el estado de una tanda para usuarios con 0 pagos, con 1 periodo vencido, con múltiples periodos vencidos y al corriente, así como ejecutando el proceso de recordatorios en días previos, día de corte y días de atraso, verificando en cada caso la exactitud de periodos y montos mostrados.

**Acceptance Scenarios**:

1. **Given** un usuario con 1 o más periodos vencidos (con o sin pagos previos), **When** consulta su estado o recibe un recordatorio, **Then** el bot muestra el número exacto de periodos pendientes, el costo por periodo y el monto total acumulado a pagar (`periodos pendientes × costo por periodo`).
2. **Given** un usuario que está al corriente en sus pagos, **When** consulta su estado, **Then** el bot confirma que no tiene adeudos e indica la fecha límite de su siguiente pago.
3. **Given** una tanda en días previos al corte, en el día de corte o en días posteriores (atraso), **When** se evalúan los recordatorios diarios, **Then** el bot distingue correctamente entre días restantes y días de atraso para enviar únicamente el recordatorio correspondiente.

---

### User Story 5 - Experiencia Conversacional Mejorada en Flujos (Priority: P3)

Como usuario del bot, quiero percibir cuándo el bot está procesando mi solicitud, poder cancelar cualquier operación guiada en curso, corregir entradas inválidas sin reiniciar el flujo y no recibir respuestas duplicadas si envío varios mensajes seguidos.

**Why this priority**: Mejora significativamente la fluidez, tolerancia a errores y estabilidad operativa del bot en conversaciones reales de WhatsApp.

**Independent Test**: Se puede probar enviando múltiples mensajes seguidos al bot, ingresando un dato inválido en un flujo de pago, escribiendo `"cancelar"` durante una captura y dejando un flujo inactivo durante 5 minutos para verificar el cierre automático.

**Acceptance Scenarios**:

1. **Given** un usuario que realiza una consulta o envía un comprobante, **When** el bot está procesando la solicitud, **Then** muestra el indicador de "escribiendo..." hasta completar o responder la operación.
2. **Given** un usuario dentro de un flujo que solicita entrada de datos, **When** el bot muestra las instrucciones, **Then** incluye el aviso de que escribir `"cancelar"` cancela la operación; y si el usuario escribe `"cancelar"`, el bot finaliza el flujo confirmando la cancelación.
3. **Given** un usuario que ingresa un dato inválido en un paso de captura, **When** el bot valida la entrada, **Then** solicita nuevamente el dato manteniendo al usuario en el mismo paso del flujo.
4. **Given** un usuario dentro de un flujo interactivo que deja de responder, **When** transcurren 5 minutos de inactividad, **Then** el bot cierra automáticamente el flujo con un mensaje informativo.
5. **Given** un usuario que envía varios mensajes consecutivos en pocos segundos, **When** el bot recibe la ráfaga, **Then** los agrupa antes de procesarlos para emitir una única respuesta coherente.

---

### User Story 6 - Consulta Administrativa de Adeudos, Ajuste de Precios y Cambio de Contraseña (Priority: P3)

Como administrador, quiero consultar el historial reciente, saldo a favor y adeudo detallado de cualquier usuario específico, actualizar el precio de una tanda ajustando pagos adelantados, y cambiar la contraseña de una tanda notificándola únicamente a los miembros al corriente.

**Why this priority**: Facilita la atención manual de dudas de participantes, automatiza el recalculo cuando cambia una tarifa y protege el acceso a cuentas compartidas distribuyendo nuevas contraseñas solo a quienes están al corriente.

**Independent Test**: Se puede probar ejecutando los tres comandos como administrador: consultando un usuario (verificando últimos 3 pagos, saldo a favor y adeudo), cambiando el precio de una tanda con adelantados, y cambiando la contraseña de una tanda con miembros al corriente y miembros con adeudo para verificar quién recibe la contraseña y el reporte final al admin.

**Acceptance Scenarios**:

1. **Given** un usuario con rol `"admin"`, **When** ejecuta el comando de consulta de adeudos de un usuario, **Then** el bot muestra por cada tanda del usuario sus últimos 3 pagos (fecha, monto y periodos cubiertos), su saldo a favor actual, los periodos pendientes y el monto total adeudado.
2. **Given** un usuario con rol `"admin"`, **When** ejecuta el comando para cambiar el precio de una tanda indicando el nuevo costo, **Then** el bot actualiza el costo en Notion y recalcula automáticamente los periodos adelantados, la próxima fecha de pago y el saldo a favor de los usuarios con pagos vigentes a futuro.
3. **Given** un usuario con rol `"admin"`, **When** ejecuta el comando para cambiar la contraseña de una tanda e ingresa la nueva contraseña, **Then** el bot la actualiza en Notion, envía la nueva contraseña únicamente a los miembros de esa tanda que no tienen adeudos, y entrega al administrador el listado de miembros a los que sí se les envió y a los que no.
4. **Given** un usuario sin rol `"admin"`, **When** intenta usar cualquiera de estos comandos administrativos, **Then** el bot deniega el acceso con el mensaje estándar de no autorizado.

---

### User Story 7 - Pagos Parciales y Saldo a Favor Acumulable (Priority: P2)

Como participante de una tanda, quiero poder completar el pago de uno o varios periodos mediante múltiples transferencias parciales (por ejemplo, pagar `$39` y luego `$1` para completar `$40`), acumulando mi saldo a favor sin perder dinero por redondeo.

**Why this priority**: Evita que los usuarios pierdan dinero cuando transfieren una cantidad incompleta (por ejemplo tras un cambio de precio) y permite que el ajuste de pagos adelantados conserve remanentes exactos.

**Independent Test**: Se puede probar registrando un pago menor al costo del periodo (verificando que se registra el saldo a favor sin avanzar la fecha límite) y luego enviando el complemento para verificar que se completa el periodo y avanza la fecha de próximo pago.

**Acceptance Scenarios**:

1. **Given** una tanda con costo por integrante de `$40` y un usuario que envía un comprobante por `$39`, **When** se registra el pago, **Then** el bot registra `0` periodos completos cubiertos, conserva `$39` como saldo a favor e informa al usuario cuánto le falta (`$1`) para completar el periodo.
2. **Given** ese mismo usuario con `$39` de saldo a favor que envía un nuevo comprobante por `$1`, **When** se registra el segundo pago, **Then** el bot suma el saldo a favor (`$39 + $1 = $40`), acredita `1` periodo completo, avanza la fecha de próximo pago y deja el saldo a favor en `$0`.

---

### Edge Cases

- ¿Qué ocurre si no existe ningún usuario con el grupo "admin" en el registro de usuarios al momento de enviar un resumen o notificación? El sistema debe registrar una advertencia clara en los logs sin interrumpir el flujo principal ni fallar silenciosamente en el envío a los demás usuarios.
- ¿Qué ocurre si existen múltiples usuarios con el grupo "admin"? El sistema debe soportar el envío de notificaciones administrativas a todos los administradores configurados o definir un criterio claro (por defecto: notificar a todos los usuarios con grupo "admin").
- ¿Qué ocurre si falla la consulta automática de la última versión de WhatsApp al arrancar (por ejemplo, indisponibilidad temporal de red)? El sistema debe registrar el error y permitir un comportamiento de respaldo seguro (reintento o versión por defecto del proveedor) para no quedar bloqueado indefinidamente.
- ¿Qué ocurre si una tanda nueva en Notion tiene espacios, mayúsculas o caracteres especiales en su nombre? El bot debe normalizar la coincidencia entre el nombre de la tanda, los grupos de usuario y los comandos generados dinámicamente sin requerir coincidencia exacta de mayúsculas/minúsculas.
- ¿Qué ocurre si se crea una tanda en Notion pero falta configurar su almacenamiento de pagos o propiedades requeridas? El sistema debe informar el problema en los logs y responder al usuario con un mensaje de error amigable sin detener el bot.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE obtener el catálogo completo de tandas disponibles (activas e inactivas), su periodicidad, costo por integrante y día de cobro directamente desde el catálogo central en Notion, sin listas fijas de servicios en el código.
- **FR-002**: El sistema DEBE generar dinámicamente los comandos disponibles, las opciones del comando `menú` / `menu` filtradas por las tandas asignadas al usuario (más opciones administrativas si aplica), el contexto del asistente conversacional y los flujos de atención (pago, consulta de estado y reglamento) a partir de las tandas activas recuperadas de Notion.
- **FR-003**: El sistema DEBE asociar y consultar los pagos y membresías de usuario mediante relaciones directas en Notion hacia la tabla `Listado Tandas` (propiedad `"Tanda"` en `Listado de Pagos` y propiedad `"Tandas"` en `Usuarios`), sin depender de campos de selección por texto.
- **FR-004**: El sistema DEBE obtener el reglamento de cada tanda desde la propiedad `"Reglas tanda"` en la tabla `Listado Tandas` de Notion (con un mensaje de respaldo si está vacía), enviar en un mensaje posterior el monto a pagar (`Costo por miembro`) y antes de qué día se debe realizar el pago (`Dia de pago`), y prescindir de emojis fijos por servicio en el código (conservando únicamente cualquier emoji que ya forme parte del nombre de la tanda en Notion).
- **FR-005**: El sistema DEBE consultar y actualizar la fecha de inicio, el estado de aceptación de reglamento y el saldo a favor por usuario y tanda utilizando la nueva tabla de relación `Legales Usuarios Tandas` en Notion, eliminando por completo las columnas fijas por servicio dentro de la tabla `Usuarios`.
- **FR-006**: El sistema DEBE obtener la identidad y el número telefónico del administrador (o administradores) consultando el registro de usuarios en Notion filtrando por la casilla `"Admin?"` activa, eliminando la dependencia de variables de entorno para el nombre y teléfono del administrador.
- **FR-007**: El sistema DEBE obtener automáticamente la versión más reciente del protocolo web de mensajería al inicializar el proveedor de conexión, eliminando la lectura de la versión desde la configuración de entorno.
- **FR-008**: El sistema DEBE mantener intactas las capacidades existentes de recordatorios diarios programados, registro y almacenamiento de comprobantes de pago y validación de permisos por grupo para todas las tandas dinámicas.
- **FR-009**: El sistema DEBE calcular los periodos adeudados y la fecha de `"Proximo pago"` normalizando las fechas a la zona horaria local (`America/Mexico_City`) sin desplazamientos artificiales de días. La fecha de `"Proximo pago"` DEBE conservar siempre fijo el mismo día del mes (y mes, en suscripciones anuales) definido en `"Dia de pago"` de la tabla de Tandas, avanzando únicamente el mes y/o año según los periodos pagados, y calculando el adeudo desde la fecha de inicio cuando el usuario no tenga pagos previos.
- **FR-010**: El sistema DEBE calcular la diferencia de días respecto al corte con signo (días previos positivos, día de corte en cero, días de atraso negativos) para diferenciar con precisión los recordatorios preventivos de los de mora.
- **FR-011**: El sistema DEBE mostrar de forma explícita en consultas de estado (`mi <tanda>`) y recordatorios: la cantidad de periodos pendientes, el costo por periodo, el saldo a favor actual, el monto total acumulado a pagar, la fecha de corte o próximo pago aplicable y (en `mi <tanda>`) la antigüedad del usuario en la tanda (su fecha de inicio obtenida de `Legales Usuarios Tandas` y el tiempo transcurrido en años/meses).
- **FR-012**: El sistema DEBE mostrar el indicador de "escribiendo..." mientras procesa consultas o acciones asíncronas en los flujos y detenerlo al concluir.
- **FR-013**: El sistema DEBE agrupar mensajes consecutivos enviados por un mismo usuario en una ventana corta antes de procesarlos en el flujo conversacional para evitar respuestas y consultas duplicadas.
- **FR-014**: El sistema DEBE aplicar un tiempo máximo de espera por inactividad de 5 minutos en flujos que esperan respuesta del usuario, cerrando el flujo automáticamente al expirar.
- **FR-015**: El sistema DEBE validar entradas en pasos interactivos solicitando reintento ante valores inválidos, incluir en toda instrucción de captura el aviso de que escribir `"cancelar"` anula la operación, y responder confirmando la cancelación cuando el usuario la solicite.
- **FR-016**: El sistema DEBE configurar la limpieza periódica y optimización del almacenamiento de sesión del proveedor de mensajería para evitar el crecimiento descontrolado en memoria y disco.
- **FR-017**: El proyecto DEBE actualizar sus dependencias mediante `pnpm`, verificando que la compilación y los flujos operen correctamente tras la actualización.
- **FR-018**: El sistema DEBE alinearse exactamente con el esquema actualizado de las 4 tablas de Notion (`TandasBot (nuevo)`):
  - **Listado Tandas**: `"Nombre tanda"` (Title), `"Activo?"` (Checkbox), `"Recurrencia"` (Select: `monthly` / `annual`), `"Dia de pago"` (Date), `"Costo tanda"` (Number), `"Numero de miembros"` (Number), `"Costo por miembro"` (Formula), `"password"` (Text) y `"Reglas tanda"` (Text).
  - **Usuarios**: `"Nombre"` (Title), `"Telefono"` (Phone), `"Admin?"` (Checkbox) y `"Tandas"` (Relation a `Listado Tandas`), sin columnas por servicio.
  - **Legales Usuarios Tandas**: `"Nombre"` (Title, ej. `"Legales <Usuario> - <Tanda>"`), `"Usuario"` (Relation a `Usuarios`), `"Tanda"` (Relation a `Listado Tandas`), `"Fecha inicio"` (Date), `"Acepto reglas"` (Checkbox) y `"Saldo a favor"` (Number, para acumular remanentes de pagos parciales/ajustes).
  - **Listado de Pagos**: `"Titulo"` (Title), `"Usuario"` (Relation a `Usuarios`), `"Tanda"` (Relation a `Listado Tandas`), `"Fecha pago"` (Date), `"Monto"` (Number), `"Siguiente pago"` (Date), `"Comprobante"` (File), más las propiedades calculadas de solo lectura (`"Costo tanda"`, `"Recurrencia"`, `"Periodos pagados"`, `"Periodos restantes"`, `"Vencido?"`, `"Fecha de creación"`).
- **FR-019**: El sistema DEBE proveer un comando exclusivo para administradores que permita consultar los adeudos de un usuario específico, mostrando sus últimos 3 pagos (fecha, monto pagado y periodos cubiertos), su saldo a favor actual, los periodos pendientes y el monto total adeudado.
- **FR-020**: El sistema DEBE soportar pagos parciales y acumulables mediante un saldo a favor por usuario y tanda, evitando la pérdida de remanentes al dividir el monto pagado entre el costo por integrante y acreditando periodos completos automáticamente en cuanto el saldo acumulado alcance el costo del periodo.
- **FR-021**: El sistema DEBE proveer un comando exclusivo para administradores que permita cambiar el precio de una tanda en Notion y recalcular los periodos adelantados, próxima fecha de pago y saldo a favor de los usuarios con pagos adelantados vigentes, mostrando un resumen de los ajustes realizados.
- **FR-022**: El sistema DEBE proveer un comando exclusivo para administradores que permita actualizar la contraseña de una tanda en Notion, enviarla automáticamente solo a los miembros del grupo que no tengan adeudos, e informar al administrador a qué miembros se les envió y a cuáles no.
- **FR-023**: El sistema DEBE permitir en el comando administrativo de envío de mensaje a grupo que, al indicar `"todos"`, el mensaje se envíe a todos los miembros pertenecientes a cualquiera de las tandas/grupos (sin duplicar envíos si un usuario pertenece a más de una tanda).
- **FR-024**: El sistema DEBE incluir en los mensajes de recordatorio a deudores el aviso explícito de que dejar de pagar resultará en la suspensión definitiva de su servicio.
- **FR-025**: El sistema DEBE construir dinámicamente el contexto del asistente conversacional (system prompt) inyectando en tiempo de ejecución las tandas activas de Notion (nombre, recurrencia, costo, día de pago, reglas de `"Reglas tanda"` y comandos válidos), eliminando la lista fija de servicios y reglamentos del prompt base.

### Key Entities *(include if feature involves data)*

- **Tanda (Suscripción Compartida)**: Representa un servicio compartido administrado por el bot. Atributos clave: identificador, nombre (que puede incluir opcionalmente un emoji), estado activo/inactivo, tipo de periodicidad (mensual o anual), día de cobro, costo total, número de integrantes, costo por integrante y texto del reglamento.
- **Usuario**: Participante o administrador del sistema. Atributos clave: identificador, nombre, teléfono, lista de grupos/tandas a las que pertenece (incluyendo el rol "admin"), fechas de inicio por tanda y estado de aceptación de reglamento por tanda.
- **Pago**: Registro de una transacción realizada por un usuario para una tanda específica. Atributos clave: título, usuario asociado, tanda asociada, fecha de pago, monto, periodos cubiertos, próxima fecha de pago y comprobante adjunto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un administrador puede dar de alta una nueva tanda en Notion y tenerla operativa para consultas, pagos y recordatorios en el bot sin realizar ningún cambio en el código fuente ni reiniciar manualmente configuraciones fijas de servicios (0 líneas de código modificadas por nueva tanda).
- **SC-002**: El 100% de las referencias estáticas a nombres de suscripciones específicas en la lógica de flujos, menús, comandos y reglas son reemplazadas por resolución dinámica desde el catálogo de tandas.
- **SC-003**: El bot inicia y se conecta correctamente sin requerir variables de entorno para la versión del protocolo de mensajería ni para el nombre o teléfono del administrador.
- **SC-004**: El 100% de las notificaciones administrativas y validaciones de permisos de administrador funcionan utilizando exclusivamente los usuarios marcados con el grupo "admin" en el registro de usuarios.
- **SC-005**: El 100% de las consultas de estado y recordatorios con adeudo muestran de forma consistente los periodos pendientes y el monto total exacto a pagar, sin errores de desfase por zona horaria ni omisión de usuarios sin pagos previos.
- **SC-006**: Todos los flujos interactivos muestran el indicador de escritura durante el procesamiento, permiten cancelar explícitamente con `"cancelar"`, reintentan ante entradas inválidas y cierran automáticamente tras 5 minutos de inactividad.
- **SC-007**: El administrador puede consultar en un solo comando los últimos 3 pagos, saldo a favor y adeudo total de cualquier usuario, actualizar el precio de una tanda con recalculo automático de pagos adelantados, y cambiar la contraseña de una tanda distribuyéndola únicamente a miembros sin adeudos con reporte de entrega; y los pagos parciales en múltiples exhibiciones acreditan correctamente periodos completos sin pérdida de saldo.

## Assumptions

- El catálogo de tandas en Notion seguirá siendo la fuente de verdad principal para la configuración de suscripciones, y su consulta puede realizarse bajo demanda o con caché ligera para no degradar el tiempo de respuesta al usuario.
- Cuando existan múltiples usuarios con el grupo "admin" en Notion, las notificaciones administrativas (resúmenes de recordatorios y avisos de pago) se enviarán a todos ellos, salvo que el administrador indique lo contrario.
- La eliminación de las variables de entorno de administrador y versión de proveedor se reflejará también en la plantilla de configuración de ejemplo (`.env.example`) y documentación del proyecto.
