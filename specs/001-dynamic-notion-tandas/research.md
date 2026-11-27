# Research & Technical Decisions: 001-dynamic-notion-tandas

## 1. Enrutamiento Dinámico de Flujos en BuilderBot
- **Decision**: Reemplazar los 12 flujos individuales por servicio (`spotifyStatusFlow`, `maxPaymentHandler`, etc.) por **3 flujos genéricos parametrizados** (`tandaStatusFlow`, `tandaPaymentFlow`, `tandaRulesFlow`) que resuelven la tanda solicitada desde el `state` (cuando vienen de `aiFlow` vía `aiFlowList.ts`) o parseando el comando del usuario (`ctx.body` con regex `^(pagar|mi|reglamento)\s+(.+)$` insensible a mayúsculas/acentos).
- **Rationale**: BuilderBot registra los flujos una sola vez al arrancar (`createFlow([...])`). Usar expresiones regulares en `addKeyword` con `{ regex: true }` más resolución en `aiFlowList.ts` permite que cualquier tanda agregada en Notion funcione inmediatamente sin reiniciar ni editar código.
- **Alternatives considered**: Crear flujos dinámicos al arranque consultando Notion antes de `createBot()`. Descartado porque requeriría reiniciar el bot cada vez que se agregue una tanda nueva en Notion.

## 2. Resolución Automática de Versión de WhatsApp Web y Optimización de Store
- **Decision**: Inicializar el `BaileysProvider` de forma asíncrona llamando a `fetchLatestWaWebVersion({})` de `@whiskeysockets/baileys` (con `try/catch` de respaldo para no bloquear el arranque si hay fallo temporal de red) y configurar `timeRelease: 10800000` (3 horas) y `experimentalStore: true` (siempre que no se requieran eventos de grupos de WhatsApp).
- **Rationale**: Elimina la variable `PROVIDER_VERSION` de `.env`, evita desconexiones por versiones obsoletas de WhatsApp Web y previene el crecimiento ilimitado de `baileys_store.json`.
- **Alternatives considered**: Mantener `PROVIDER_VERSION` como fallback en `.env`. Descartado por requerimiento explícito de eliminarla de `.env`.

## 3. Esquema Relacional de Notion v5 (`@notionhq/client`)
- **Decision**: Adaptar todas las consultas y mutaciones a las 4 tablas reales inspeccionadas en `TandasBot (nuevo)`:
  - `Usuarios`: `"Nombre"`, `"Telefono"`, `"Admin?"` (checkbox), `"Tandas"` (relation de IDs de página).
  - `Listado Tandas`: `"Nombre tanda"`, `"Activo?"`, `"Recurrencia"` (`monthly`/`annual`), `"Dia de pago"`, `"Costo tanda"`, `"Numero de miembros"`, `"Costo por miembro"` (formula), `"password"`, `"Reglas tanda"`.
  - `Legales Usuarios Tandas` (`NOTION_TANDAS_LEGALES_DATASOURCE_ID`): `"Nombre"`, `"Usuario"` (relation), `"Tanda"` (relation), `"Fecha inicio"`, `"Acepto reglas"`, y `"Saldo a favor"` (number, con lectura segura que asume `0` si la propiedad aún no existe o está vacía).
  - `Listado de Pagos`: `"Titulo"`, `"Usuario"` (relation), `"Tanda"` (relation), `"Fecha pago"`, `"Monto"`, `"Siguiente pago"`, `"Comprobante"` (file), más propiedades calculadas de solo lectura (`"Periodos pagados"`, `"Costo tanda"`, `"Recurrencia"`, `"Periodos restantes"`, `"Vencido?"`).
- **Rationale**: Usar relaciones por `page_id` elimina inconsistencias por cambios de nombre, mayúsculas o emojis en el título de una tanda. Al ser `"Periodos pagados"` una fórmula en Notion, el bot deja de enviarla en `pages.create` y la lee de la respuesta.

## 4. Cálculo de Adeudos, Día Fijo de `"Siguiente pago"`, Días con Signo y Saldo a Favor
- **Decision**:
  - **Normalización de fechas**: Extraer año, mes y día en zona horaria `America/Mexico_City` (`Intl.DateTimeFormat` con `timeZone: 'America/Mexico_City'`), operando sobre fechas calendario sin desplazamientos manuales (`+ 1` día).
  - **Día fijo en `"Siguiente pago"`**: Al avanzar `N` periodos (`monthly` o `annual`), fijar el día al día de `"Dia de pago"` de la tanda (ajustando al último día del mes si el mes destino tiene menos días, p.ej. 31 → 30/28) y en anuales fijar también el mes de `"Dia de pago"`.
  - **Cálculo de adeudo (`missingPayments`)**:
    - Si hay pagos previos: comparar la fecha límite actual (`lastPayment.nextPayment`) contra la fecha de hoy en `America/Mexico_City`. Si `today < nextPayment`, adeuda `0`. Si `today >= nextPayment`, contar los ciclos completos vencidos desde `nextPayment` hasta `today` (mínimo `1`).
    - Si NO hay pagos previos (`payments.length === 0`): usar `"Fecha inicio"` de `Legales Usuarios Tandas` (si existe); si `today < startDate`, `0`, si `today >= startDate`, contar ciclos desde `startDate` hasta `today`.
  - **Días con signo (`getTandaDaysDiff`)**: Calcular `(fechaCorteActual - hoyEnDias)` sin `Math.abs`, devolviendo positivos antes del corte, `0` el día de corte y negativos en mora (`-2`).
  - **Saldo a favor**: Sumar `montoPagado + saldoAFavorActual`; calcular `paidPeriods = Math.floor(totalDisponible / costoPorMiembro)` y `nuevoSaldoAFavor = Number((totalDisponible - paidPeriods * costoPorMiembro).toFixed(2))`. Solo avanza `"Siguiente pago"` cuando `paidPeriods > 0`.

## 5. UX en Flujos de BuilderBot
- **Decision**:
  - **`withTyping`**: Helper que envía `provider.vendor.sendPresenceUpdate("composing", ctx.key.remoteJid)` al iniciar y `"paused"` en `finally`.
  - **Idle de 5 minutos**: Módulo `idleFlow.ts` con `Map<string, NodeJS.Timeout>` por `ctx.from` (`300_000 ms`), iniciado al entrar a cualquier flujo con `{ capture: true }`, reiniciado en cada paso y detenido al finalizar o cancelar.
  - **Fast Entries Debounce**: Cola por usuario (`1500 ms`) en `aiFlow` (`EVENTS.WELCOME`) para concatenar mensajes enviados en ráfaga antes de consultar Notion/Gemini.
  - **Validación y Cancelación**: Función helper `isCancelCommand(body)` (`"cancelar"`) en todos los pasos `{ capture: true }`, acompañada de instrucción explícita en cada mensaje de captura y respuesta de confirmación al cancelar; uso de `fallBack(...)` para reintentar entradas inválidas.
