# Implementation Plan: Configuración Dinámica de Tandas, Admin, Adeudos y UX de Flujos

**Branch**: `001-dynamic-notion-tandas` | **Date**: 2026-11-26 | **Spec**: [spec.md](file:///Users/chrisley/Documents/Development/NodeJS/tandasbot/specs/001-dynamic-notion-tandas/spec.md)
**Input**: Feature specification from `/specs/001-dynamic-notion-tandas/spec.md`

## Summary

Refactorizar **TandasBot** para eliminar toda configuración estática de suscripciones, administrador y versión de WhatsApp Web, moviendo la fuente de verdad 100% a las 4 tablas relacionales de Notion (`Listado Tandas`, `Usuarios`, `Legales Usuarios Tandas`, `Listado de Pagos`). Adicionalmente, corregir el cálculo de periodos adeudados y fechas fijas de `"Siguiente pago"` en zona horaria `America/Mexico_City`, introducir saldo a favor para pagos parciales, agregar 3 comandos administrativos (consulta de adeudos de usuario, ajuste de precio con recalculo de adelantados, cambio de contraseña con envío solo a miembros al corriente) + broadcast `"todos"`, dinamizar el system prompt de Gemini y el comando `menú`, incorporar mejoras de UX en BuilderBot (indicador de escritura, timeout de 5 min, debounce de ráfagas, `fallBack`/cancelación explícita y optimización de store) y actualizar dependencias con `pnpm`.

## Technical Context

**Language/Version**: TypeScript 5.4.3 / Node.js v20+ (ESM nativo, target ES2022)  
**Primary Dependencies**: `@builderbot/bot` (1.3.15), `@builderbot/provider-baileys` (1.3.15), `@builderbot/database-json` (1.3.15), `@whiskeysockets/baileys`, `@notionhq/client` (5.3.0), `@google/genai` (^1.46.0), `node-cron` (^4.1.0), `pino` (^9.6.0), `tsup` (^8.5.1) — todas a actualizar vía `pnpm`  
**Storage**: Notion Data Sources API v5 (4 tablas: `Listado Tandas`, `Usuarios`, `Legales Usuarios Tandas`, `Listado de Pagos`) + almacenamiento local de comprobantes (`vouchers/`) + `db.json` (BuilderBot JsonFileDB)  
**Testing**: Validación de compilación (`pnpm build`), verificación de tipos (`tsc --noEmit`) y pruebas unitarias/manuales de flujos y utilidades de fechas/adeudos (`tsx` / `node --test`)  
**Target Platform**: Linux/macOS server (Node.js + Docker / PM2)  
**Project Type**: WhatsApp conversational bot service (BuilderBot + Express HTTP server)  
**Performance Goals**: Respuesta conversacional fluida con caché ligera de catálogo de tandas en memoria (TTL corto, p.ej. 60s, invalidada al editar precios/contraseñas) para evitar consultas redundantes a Notion  
**Constraints**: Zona horaria fija `America/Mexico_City`; nombres exactos de propiedades en Notion; compatibilidad con formato WhatsApp (`*negrita*`, `_cursiva_`, sin `**`)  
**Scale/Scope**: ~4–20 tandas activas, ~20–100 usuarios, ~1–5 administradores

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

El archivo `.specify/memory/constitution.md` del repositorio contiene únicamente la plantilla base sin reglas específicas adicionales. Se aplican las convenciones obligatorias de `AGENTS.md`:
- Uso estricto de alias TypeScript (`@constants/*`, `@config/*`, `@enums/*`, `@flows/*`, `@custom-types/*`, `@utils/*`).
- Manejo de errores con `try / catch` en todos los flujos de BuilderBot, registrando con `logger.error` y respondiendo con `GENERIC_ERROR_MESSAGE`.
- Formato de mensajes de WhatsApp (`*negrita*`, `_cursiva_`).
- Uso exclusivo de `pnpm` para gestión de dependencias.
- Commits siguiendo Conventional Commits + Gitmoji.

**Gate Status**: PASS (sin violaciones).

## Project Structure

### Documentation (this feature)

```text
specs/001-dynamic-notion-tandas/
├── plan.md              # Este archivo
├── research.md          # Decisiones técnicas y resolución de incógnitas
├── data-model.md        # Modelo de datos y mapeo de las 4 tablas de Notion
├── quickstart.md        # Guía de configuración y validación end-to-end
├── contracts/           # Contratos de comandos del bot y respuestas
│   └── bot-commands.md
└── tasks.md             # Pendiente (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app.ts                    # Inicialización async del provider, bot y cron diario
├── config/
│   ├── aiContext.md          # Plantilla base del prompt con marcador {{TANDAS_CONTEXT}}
│   ├── aiModel.ts            # Generador dinámico de aiModelConfig con tandas de Notion
│   ├── database.ts
│   └── provider.ts           # fetchLatestWaWebVersion + timeRelease / experimentalStore
├── constants/
│   ├── menu.ts               # Generador dinámico de opciones de menú por usuario y rol
│   ├── messages.ts           # Mensajes estándar + instrucción de "cancelar" y confirmación
│   ├── paths.ts
│   └── tandasRules.ts        # Formateador genérico de reglas + monto + fecha límite
├── enums/
│   ├── bot-commands.ts       # Comandos base (generales y admin); sin servicios fijos
│   └── suscriptions.ts       # 'monthly' | 'annual'
├── flows/
│   ├── index.ts              # Registro maestro de flujos genéricos, admin, idle y AI
│   ├── aiFlow.ts             # Debounce (fast-entries) + typing + prompt dinámico
│   ├── aiFlowList.ts         # Resolución dinámica de comando -> flujo + estado
│   ├── generalFlow.ts        # Menú dinámico
│   ├── adminFlow.ts          # Difusión (incl. "todos"), estatus, adeudos usuario, precio, password, cron
│   ├── tandasFlow.ts         # 3 flujos genéricos (pagar, mi <tanda>, reglamento <tanda>) + idle + cancel
│   └── idleFlow.ts           # Temporizador de inactividad de 5 minutos
├── types/
│   ├── aiResponse.d.ts
│   ├── debtors.d.ts          # Incluye missingPayments, totalAmountOwed, creditBalance
│   ├── messages.d.ts
│   ├── payments.d.ts
│   └── notion/
│       ├── legalsDB.d.ts     # Nuevo: Legales Usuarios Tandas
│       ├── paymentsDB.d.ts   # Actualizado a esquema Listado de Pagos con relaciones/fórmulas
│       ├── tandasDB.d.ts     # Actualizado a Listado Tandas (Reglas tanda, password, etc.)
│       └── usersDB.d.ts      # Simplificado: Nombre, Telefono, Admin?, Tandas[]
└── utils/
    ├── datetimes.ts          # Normalización America/Mexico_City, día fijo, diff con signo, antigüedad
    ├── files.ts
    ├── flowHelpers.ts        # withTyping, isCancelCommand, fast-entries queue
    ├── logger.ts
    ├── misc.ts               # Normalización de nombres de tanda, formateador MXN
    ├── tandas.ts             # Adeudos exactos, saldo a favor, ajuste de precio, recordatorios con suspensión
    ├── users.ts              # Permisos con Admin? / Tandas[], envío a admins dinámicos, recordatorios
    ├── whatsapp.ts
    └── notion/
        ├── client.ts
        ├── legalsDB.ts       # Nuevo: CRUD de Legales Usuarios Tandas
        ├── tandasDB.ts       # Queries/mutaciones con relaciones y caché ligera de tandas
        └── usersDB.ts        # Queries con Admin? y relación Tandas
```

**Structure Decision**: Se mantiene la arquitectura modular existente de un solo proyecto bajo `src/`, reemplazando los flujos y tipos duplicados por servicio por flujos genéricos parametrizados y un módulo dedicado para `legalsDB` y helpers de UX (`flowHelpers.ts`, `idleFlow.ts`).

## Complexity Tracking

No hay violaciones a la constitución del proyecto.
