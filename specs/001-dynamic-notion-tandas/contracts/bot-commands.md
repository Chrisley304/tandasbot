# Bot Commands & Interaction Contracts: 001-dynamic-notion-tandas

## 1. Comandos Generales (Todos los usuarios registrados)
- `menú` / `menu`: Lista dinámicamente los comandos generales, los comandos de cada tanda activa asignada al usuario (`pagar <tanda>`, `mi <tanda>`, `reglamento <tanda>`), y los comandos administrativos si `user.isAdmin === true`.
- `datos de pago`: Muestra la información bancaria/transferencia del administrador.

## 2. Comandos Dinámicos por Tanda (Usuarios asignados en `"Tandas"`)
Resueltos dinámicamente por prefijo + nombre normalizado de tanda:
- `mi <tanda>`:
  - Valida membresía y aceptación de reglas (`Legales Usuarios Tandas`).
  - Muestra:
    - **Antigüedad**: Fecha de inicio (`Fecha inicio`) y tiempo transcurrido (años y meses).
    - **Estado de adeudo**: Si está al corriente (con próxima fecha de pago) o si debe (`N` periodos × costo unitario, saldo a favor descontado si aplica, y **total acumulado a pagar**).
    - **Saldo a favor**: Monto actual disponible en `"Saldo a favor"`.
    - **Historial reciente**: Últimos pagos realizados.
- `pagar <tanda>`:
  - Valida membresía y aceptación de reglas.
  - Captura monto numérico (con `fallBack` si es inválido) y comprobante multimedia (con `fallBack` si no es imagen/documento).
  - En cada paso de captura incluye el aviso de escribir `"cancelar"`, y si se recibe `"cancelar"`, termina con confirmación explícita.
  - Al finalizar, registra el pago, actualiza `"Saldo a favor"`, avanza `"Siguiente pago"` con día fijo si `paidPeriods > 0`, e informa periodos cubiertos, nueva fecha de próximo pago (o cuánto falta para completar el periodo) y saldo a favor restante. Notifica a los administradores (`Admin? = true`).
- `reglamento <tanda>`:
  - Muestra el texto de `"Reglas tanda"` desde `Listado Tandas`.
  - Envía un **segundo mensaje** indicando el monto (`Costo por miembro`) y antes de qué día se debe realizar el pago (`Dia de pago` / recurrencia).
  - Si el usuario aún no acepta las reglas, solicita escribir `ACEPTO` (con opción `"cancelar"`).

## 3. Comandos Exclusivos de Administrador (`user.isAdmin === true`)
- `mensaje a grupo`: Solicita el grupo/tanda destino **o `"todos"`** (envía sin duplicar a todos los miembros de todas las tandas) y el mensaje a difundir.
- `mensaje personalizado`: Selecciona usuario destino y envía mensaje directo.
- `estatus tandas`: Resumen general de todas las tandas activas, deudores, montos pendientes y dinero recaudado.
- `reenviar recordatorios tandas`: Ejecuta manualmente el envío de recordatorios diarios (incluyendo el aviso de suspensión definitiva por falta de pago).
- `adeudos usuario` *(Nuevo)*: Solicita seleccionar/buscar usuario y muestra por cada tanda asignada sus últimos 3 pagos (fecha, monto, periodos), su saldo a favor actual, periodos pendientes y monto total adeudado.
- `cambiar precio tanda` *(Nuevo)*: Solicita seleccionar tanda y nuevo costo total (`Costo tanda`); actualiza Notion, recalcula pagos adelantados vigentes y saldo a favor de los miembros afectados, y muestra resumen al admin.
- `cambiar contraseña tanda` *(Nuevo)*: Solicita seleccionar tanda y nueva contraseña; actualiza `"password"` en Notion, envía la nueva contraseña únicamente a miembros sin adeudos, e informa al admin quién la recibió y quién no.

## 4. Contrato de UX transversal
- **Typing**: Activo durante toda operación asíncrona (IA o Notion).
- **Idle timeout**: 5 minutos (`300_000 ms`) en flujos con captura; cierra el flujo con mensaje informativo.
- **Cancelación**: Toda instrucción de captura añade `_(Escribe "cancelar" para cancelar la operación)_`; al recibir `"cancelar"`, responde confirmando la cancelación y limpia el timer.
- **Debounce**: Ráfagas de mensajes en `EVENTS.WELCOME` se agrupan durante `1500 ms` antes de enviarse a Gemini.
