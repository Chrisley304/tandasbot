---

description: "Task list for 001-dynamic-notion-tandas implementation"
---

# Tasks: Configuración Dinámica de Tandas, Admin, Adeudos y UX de Flujos

**Input**: Design documents from `/specs/001-dynamic-notion-tandas/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/bot-commands.md`, `quickstart.md`

**Tests**: No se solicitaron pruebas automatizadas formales en el spec; se incluye verificación de tipos (`tsc --noEmit`), compilación (`pnpm build`) y validación manual/unitaria de fechas y adeudos según `quickstart.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`US1`–`US7`)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure & Dependencies)

**Purpose**: Actualizar dependencias vía `pnpm` y limpiar configuración de entorno

- [X] T001 Actualizar dependencias del proyecto usando `pnpm update` y asegurar `@whiskeysockets/baileys` disponible para `fetchLatestWaWebVersion` en `package.json` y `pnpm-lock.yaml`
- [X] T002 [P] Actualizar plantilla de entorno eliminando `ADMIN_NUMBER`, `ADMIN_NAME`, `PROVIDER_VERSION` y agregando `NOTION_TANDAS_LEGALES_DATASOURCE_ID` en `.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tipos de Notion actualizados, capa de datos relacional (4 tablas), utilidades base de normalización y fechas en `America/Mexico_City`

**⚠️ CRITICAL**: Ninguna historia de usuario debe implementarse hasta completar esta fase

- [X] T003 [P] Actualizar definiciones de tipos para `Listado Tandas` (`Tanda.id`, `Tanda.name`, `Tanda.isActive`, `Tanda.suscriptionType`, `Tanda.paymentDay`, `Tanda.totalCost`, `Tanda.nMembers`, `Tanda.costPerUser`, `Tanda.password`, `Tanda.rules` según `data-model.md`) en `src/types/notion/tandasDB.d.ts`
- [X] T004 [P] Simplificar definiciones de tipos de `Usuarios` (`User.id`, `User.name`, `User.phone`, `User.isAdmin`, `User.tandaIds` según `data-model.md`) eliminando campos por servicio en `src/types/notion/usersDB.d.ts`
- [X] T005 [P] Crear definición de tipos para `Legales Usuarios Tandas` (`UserTandaLegal.id`, `UserTandaLegal.title`, `UserTandaLegal.userId`, `UserTandaLegal.tandaId`, `UserTandaLegal.startDate`, `UserTandaLegal.acceptedRules`, `UserTandaLegal.creditBalance` según `data-model.md`) en `src/types/notion/legalsDB.d.ts`
- [X] T006 [P] Actualizar definiciones de tipos de `Listado de Pagos` (`TandaPayment.id`, `TandaPayment.title`, `TandaPayment.userId`, `TandaPayment.tandaId`, `TandaPayment.paymentDate`, `TandaPayment.payment`, `TandaPayment.nextPayment`, `TandaPayment.voucherFileUploadId`, `TandaPayment.paidPeriods`, `TandaPayment.overduePayment` según `data-model.md`) en `src/types/notion/paymentsDB.d.ts`
- [X] T007 [P] Actualizar utilidades de normalización de nombres de tanda (eliminación de acentos, emojis y espacios extra para coincidencia de comandos) y formateo de moneda en `src/utils/misc.ts`
- [X] T008 [P] Implementar utilidades de fechas normalizadas a `America/Mexico_City`, cálculo de `"Siguiente pago"` con día fijo de `Tanda.paymentDay` (según `data-model.md`), conteo exacto de ciclos vencidos/futuros, diferencia de días con signo (`getTandaDaysDiff`) y cálculo de antigüedad en años/meses en `src/utils/datetimes.ts`
- [X] T009 Implementar consultas y mutaciones para `Legales Usuarios Tandas` (`getUserTandaLegal`, `getAllLegalsForUser`, `upsertUserTandaLegal`, `updateUserCreditBalance`) usando relaciones a `Usuarios` y `Listado Tandas` en `src/utils/notion/legalsDB.ts`
- [X] T010 Actualizar consultas y mutaciones de `Usuarios` para mapear `"Nombre"`, `"Telefono"`, `"Admin?"`, `"Tandas"` (relation), y agregar `getAdminUsers()` y `getUsersByTandaId(tandaId)` en `src/utils/notion/usersDB.ts`
- [X] T011 Actualizar consultas y mutaciones de `Listado Tandas` y `Listado de Pagos` (usando relaciones `Tanda.id` / `Usuario.id`, lectura de `"Reglas tanda"`, `"password"`, `"Periodos pagados"` como fórmula de solo lectura, caché ligera de tandas con invalidación, y funciones `updateTandaPrice` / `updateTandaPassword`) en `src/utils/notion/tandasDB.ts`

**Checkpoint**: Capa de datos relacional en Notion, tipos y utilidades de fechas listos.

---

## Phase 3: User Story 1 - Alta de Nuevas Suscripciones sin Cambios de Código (Priority: P1) 🎯 MVP

**Goal**: Eliminar suscripciones hardcodeadas; resolver dinámicamente tandas activas, `menú`, `pagar <tanda>`, `mi <tanda>`, `reglamento <tanda>`, system prompt de Gemini y flujos genéricos.

**Independent Test**: Crear una nueva tanda activa en `Listado Tandas` con `"Reglas tanda"`, asignarla a un usuario en `"Tandas"` de `Usuarios`, y validar sin reiniciar ni editar código que aparece en `menú`, responde `reglamento <tanda>` (+ segundo mensaje con monto y fecha), `mi <tanda>` y `pagar <tanda>`.

- [X] T012 [P] [US1] Limpiar enumeración `BOT_COMMANDS` dejando únicamente comandos base (generales y admin) y eliminar comandos fijos por servicio en `src/enums/bot-commands.ts`
- [X] T013 [P] [US1] Eliminar dependencias de `USER_GROUPS` fijos por servicio (conservando o adaptando utilidades genéricas de permisos por `User.isAdmin` y `User.tandaIds`) en `src/enums/users.ts` y `src/utils/users.ts`
- [X] T014 [P] [US1] Refactorizar generador de menú dinámico para construir opciones por cada `Tanda` activa asignada en `User.tandaIds` más opciones administrativas si `User.isAdmin === true` en `src/constants/menu.ts` y `src/flows/generalFlow.ts`
- [X] T015 [P] [US1] Refactorizar formateador de reglas para leer `Tanda.rules` (`"Reglas tanda"` de `data-model.md`) con respaldo por defecto y generar el segundo mensaje con `Tanda.costPerUser` y fecha límite según `Tanda.paymentDay` en `src/constants/tandasRules.ts`
- [X] T016 [US1] Convertir `aiContext.md` en plantilla base con marcador `{{TANDAS_CONTEXT}}` y generar `aiModelConfig` dinámicamente en tiempo de ejecución con las tandas activas, costos, días de pago, `"Reglas tanda"` y comandos válidos en `src/config/aiContext.md` y `src/config/aiModel.ts`
- [X] T017 [US1] Implementar los 3 flujos genéricos parametrizados (`tandaStatusFlow`, `tandaPaymentFlow`, `tandaRulesFlow`) + `acceptTermsHandler` usando `Legales Usuarios Tandas` y coincidencia dinámica por nombre/regex en `src/flows/tandasFlow.ts`
- [X] T018 [US1] Actualizar resolución de `startCommand` (`pagar <tanda>`, `mi <tanda>`, `reglamento <tanda>`, comandos generales y admin) hacia los flujos genéricos en `src/flows/aiFlowList.ts` y `src/flows/aiFlow.ts`
- [X] T019 [US1] Registrar exclusivamente los flujos genéricos, generales, admin, `aiFlow` e `idleFlow` en `src/flows/index.ts`

**Checkpoint**: User Story 1 funcional — nuevas tandas en Notion operan sin cambios en código.

---

## Phase 4: User Story 2 - Obtención Dinámica del Administrador desde Notion (Priority: P2)

**Goal**: Identificar administradores exclusivamente mediante `"Admin?"` en `Usuarios` y eliminar `ADMIN_NUMBER` / `ADMIN_NAME` estáticos.

**Independent Test**: Marcar `"Admin?"` en un usuario en Notion (sin `ADMIN_NUMBER` en `.env`) y verificar que recibe notificaciones de pago, resúmenes de recordatorios y tiene acceso a comandos de administrador.

- [X] T020 [P] [US2] Eliminar `ADMIN_USER` estático derivado de `.env` (o reemplazar por helper `getAdminUsers()`) en `src/constants/users.ts`
- [X] T021 [US2] Actualizar envío de resúmenes diarios y notificaciones de nuevos pagos para consultar dinámicamente `getAdminUsers()` y notificar a todos los administradores activos (registrando advertencia si no hay ninguno) en `src/utils/tandas.ts`, `src/flows/tandasFlow.ts` y `src/flows/adminFlow.ts`

**Checkpoint**: User Story 2 funcional — cero dependencias de variables de entorno de administrador.

---

## Phase 5: User Story 3 - Resolución Automática de la Versión de WhatsApp (Priority: P3)

**Goal**: Obtener la última versión de WhatsApp Web automáticamente con `fetchLatestWaWebVersion` al iniciar el proveedor, y optimizar memoria/disco del store.

**Independent Test**: Iniciar el bot sin `PROVIDER_VERSION` en `.env` y verificar conexión exitosa usando la versión resuelta automáticamente y configuración de `timeRelease`.

- [X] T022 [US3] Refactorizar inicialización del proveedor para usar `fetchLatestWaWebVersion({})` de `@whiskeysockets/baileys` (con fallback seguro si falla la red) y configurar `timeRelease: 10800000` / `experimentalStore: true` en `src/config/provider.ts`
- [X] T023 [US3] Adaptar el arranque de la aplicación para inicializar de forma asíncrona el proveedor antes de `createBot(...)` en `src/app.ts`

**Checkpoint**: User Story 3 funcional — arranque automático sin `PROVIDER_VERSION`.

---

## Phase 6: User Story 4 - Cálculo Exacto y Claridad en Adeudos y Recordatorios (Priority: P2)

**Goal**: Corregir conteo de periodos adeudados, fijar el día de `"Siguiente pago"`, usar diferencia de días con signo, mostrar desglose claro + antigüedad en `mi <tanda>`, e incluir aviso de suspensión definitiva en recordatorios.

**Independent Test**: Validar `mi <tanda>` con usuarios al corriente, con 0 pagos y con 2+ periodos vencidos (verificando desglose, total en pesos, antigüedad desde `Fecha inicio`), y validar recordatorios preventivos y de mora con aviso de suspensión.

- [X] T024 [P] [US4] Actualizar tipo `Deptor` para incluir `missingPayments`, `totalAmountOwed` y `creditBalance` en `src/types/debtors.d.ts`
- [X] T025 [US4] Refactorizar `getUserMissingPayments`, `getDebtorsFromTanda` y `handleDailyTandasReminders` usando fechas `America/Mexico_City`, manejo correcto de usuarios sin pagos previos (`UserTandaLegal.startDate`), y días con signo en `src/utils/tandas.ts`
- [X] T026 [US4] Actualizar `sendReminderToDebtors` para mostrar monto total acumulado cuando `missingPayments > 1` e incluir el aviso explícito de suspensión definitiva del servicio por falta de pago en `src/utils/users.ts`
- [X] T027 [US4] Actualizar `tandaStatusFlow` (`mi <tanda>`) para mostrar antigüedad (`UserTandaLegal.startDate` + años/meses), desglose de periodos pendientes × costo unitario, saldo a favor, total a pagar y fecha límite en `src/flows/tandasFlow.ts`

**Checkpoint**: User Story 4 funcional — cálculos exactos y mensajes claros de adeudo y antigüedad.

---

## Phase 7: User Story 7 - Pagos Parciales y Saldo a Favor Acumulable (Priority: P2)

**Goal**: Permitir pagos en múltiples exhibiciones acumulando remanentes en `"Saldo a favor"` de `Legales Usuarios Tandas` sin avanzar `"Siguiente pago"` hasta completar al menos 1 periodo.

**Independent Test**: Registrar pago de `$39` en tanda de `$40` (saldo a favor `$39`, `0` periodos, fecha límite intacta) y luego pago de `$1` (saldo `$0`, `1` periodo acreditado, `"Siguiente pago"` avanza 1 ciclo con día fijo).

- [X] T028 [US7] Actualizar `handleTandaPayment` para sumar `UserTandaLegal.creditBalance` + monto recibido, calcular `paidPeriods` y `newCreditBalance`, persistir `"Saldo a favor"` en `Legales Usuarios Tandas`, y avanzar `"Siguiente pago"` con día fijo solo cuando `paidPeriods > 0` en `src/utils/tandas.ts`
- [X] T029 [US7] Actualizar respuesta al usuario en `tandaPaymentFlow` para informar periodos acreditados, nueva fecha límite (o monto faltante para completar 1 periodo) y saldo a favor restante en `src/flows/tandasFlow.ts`

**Checkpoint**: User Story 7 funcional — pagos parciales acumulables sin pérdida de dinero.

---

## Phase 8: User Story 5 - Experiencia Conversacional Mejorada en Flujos (Priority: P3)

**Goal**: Agregar indicador de "escribiendo...", debounce de mensajes rápidos, temporizador de inactividad de 5 minutos, `fallBack` ante entradas inválidas y cancelación explícita con `"cancelar"`.

**Independent Test**: Enviar ráfaga de 3 mensajes seguidos (1 sola respuesta de IA), enviar monto inválido (reintento con `fallBack`), escribir `"cancelar"` en captura (confirmación de cancelación) y dejar flujo inactivo 5 minutos (cierre automático).

- [X] T030 [P] [US5] Crear helpers `withTyping`, `isCancelCommand`, constante de aviso de cancelación y cola `createMessageQueue` (debounce `1500 ms`) en `src/utils/flowHelpers.ts` y `src/constants/messages.ts`
- [X] T031 [P] [US5] Implementar flujo y utilidades de inactividad (`idleFlow`, `startIdle`, `resetIdle`, `stopIdle` con `300_000 ms` / 5 minutos) en `src/flows/idleFlow.ts`
- [X] T032 [US5] Integrar `createMessageQueue` y `withTyping` en el flujo de IA en `src/flows/aiFlow.ts`
- [X] T033 [US5] Integrar `withTyping`, `idleFlow` (5 min), `fallBack` y manejo/aviso de `"cancelar"` en todos los pasos con captura de `src/flows/tandasFlow.ts` y `src/flows/adminFlow.ts`

**Checkpoint**: User Story 5 funcional — UX fluida, tolerante a errores y sin flujos colgados.

---

## Phase 9: User Story 6 - Comandos Administrativos Nuevos y Broadcast `"todos"` (Priority: P3)

**Goal**: Implementar comandos de admin: `estatus usuario`, `cambiar precio tanda` (con ajuste de adelantados), `cambiar contraseña tanda` (con envío solo a miembros sin adeudos y reporte) y soporte de `"todos"` en `mensaje a grupo`.

**Independent Test**: Ejecutar como admin cada uno de los 4 flujos y verificar reporte de últimos 3 pagos + saldo + adeudo, recalculo de adelantados tras cambio de precio, entrega selectiva de contraseña nueva y difusión sin duplicados con `"todos"`.

- [X] T034 [P] [US6] Implementar lógica de negocio para `getUserDetailedDebtSummary(userId)`, `adjustTandaPriceAndAdvancePayments(tandaId, newTotalCost)` y `updateTandaPasswordAndNotify(tandaId, newPassword)` en `src/utils/tandas.ts`
- [X] T035 [P] [US6] Agregar soporte de `"todos"` (miembros únicos de todas las tandas activas) en `sendMessageToAllTandaMembers` dentro de `src/utils/users.ts`
- [X] T036 [US6] Implementar flujos administrativos `userDebtLookupFlow`, `changeTandaPriceFlow`, `changeTandaPasswordFlow` y actualizar `sendMessageToGroupFlow` para aceptar `"todos"` en `src/flows/adminFlow.ts`
- [X] T037 [US6] Registrar nuevos comandos administrativos en `src/enums/bot-commands.ts`, `src/constants/menu.ts`, `src/flows/aiFlowList.ts`, `src/config/aiContext.md` y `src/flows/index.ts`

**Checkpoint**: User Story 6 funcional — todas las herramientas administrativas operativas.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Documentación, limpieza de código muerto, validación de tipos y compilación final

- [X] T038 [P] Actualizar documentación del proyecto reflejando las 4 tablas de Notion, comandos dinámicos y nuevas variables de entorno en `AGENTS.md`
- [X] T039 Verificar ausencia total de referencias estáticas a suscripciones (`spotify`, `hbo max`, `youtube premium`, `amazon prime`) y ejecutar `npx tsc --noEmit` y `pnpm build` para validar compilación limpia
- [ ] T040 Ejecutar validación end-to-end siguiendo los escenarios de `specs/001-dynamic-notion-tandas/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)**: Sin dependencias — iniciar primero.
- **Phase 2 (Foundational)**: Depende de Phase 1 — **BLOQUEA** todas las historias de usuario (`US1`–`US7`).
- **Phase 3 (US1 - P1 MVP)**: Depende de Phase 2.
- **Phase 4 (US2 - P2)** y **Phase 5 (US3 - P3)**: Dependen de Phase 2; pueden ejecutarse en paralelo con US1 o inmediatamente después.
- **Phase 6 (US4 - P2)**: Depende de Phase 2 y se integra con `tandasFlow.ts` de US1.
- **Phase 7 (US7 - P2)**: Depende de Phase 2 y Phase 6 (`tandas.ts` / `tandasFlow.ts`).
- **Phase 8 (US5 - P3)**: Depende de US1 (`tandasFlow.ts`, `aiFlow.ts`) y US6 o puede aplicarse transversalmente sobre los flujos existentes.
- **Phase 9 (US6 - P3)**: Depende de Phase 2, Phase 6 (cálculo de adeudos) y Phase 7 (saldo a favor).
- **Phase 10 (Polish)**: Depende de todas las fases anteriores.

### Parallel Opportunities
- **Phase 2**: `T003`, `T004`, `T005`, `T006`, `T007`, `T008` pueden ejecutarse en paralelo (archivos independientes).
- **Phase 3 (US1)**: `T012`, `T013`, `T014`, `T015` pueden ejecutarse en paralelo antes de integrar `T016`–`T019`.
- **Phase 8 (US5)**: `T030` (`flowHelpers.ts`) y `T031` (`idleFlow.ts`) pueden crearse en paralelo.
- **Phase 9 (US6)**: `T034` (`tandas.ts`) y `T035` (`users.ts`) pueden implementarse en paralelo antes de `T036`–`T037`.

## Implementation Strategy

### MVP First (User Story 1 + Foundational)
1. Completar Phase 1 (Setup + `pnpm update`) y Phase 2 (Esquema Notion de 4 tablas + utilidades de fecha).
2. Completar Phase 3 (US1): tandas 100% dinámicas desde Notion.
3. Validar con `tsc --noEmit` y `pnpm build` antes de continuar con US2–US7.

### Incremental Delivery
1. Setup + Foundational → Base relacional lista.
2. US1 → Tandas dinámicas (MVP).
3. US2 + US3 → Admin dinámico + versión automática de WhatsApp.
4. US4 + US7 → Cálculo exacto de adeudos, día fijo, antigüedad y saldo a favor.
5. US5 + US6 → UX de flujos BuilderBot + nuevos comandos administrativos.
6. Polish → Limpieza final, `AGENTS.md` y validación completa de `quickstart.md`.
