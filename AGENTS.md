# AGENTS.md — Guía para Agentes de IA en TandasBot

Este documento proporciona una guía completa y estructurada sobre la arquitectura, funcionamiento, convenciones y herramientas del proyecto **TandasBot**, diseñada específicamente para que agentes de IA puedan entender, mantener y extender el código con precisión.

---

## 1. Visión General del Proyecto

**TandasBot** es un bot de WhatsApp creado por Christian Leyva (@chrisley.dev) para administrar y automatizar el cobro de suscripciones compartidas ("tandas" de servicios como Spotify, HBO Max, YouTube Premium y Amazon Prime) entre amigos y familiares.

### Capacidades principales:
1. **Atención Conversacional con IA**: Integra Google Gemini (`@google/genai`) para responder dudas en lenguaje natural con personalidad personalizada y dirigir al usuario al flujo correcto.
2. **Gestión de Suscripciones ("Tandas")**: Soporte para modelos mensuales y anuales, control de costos compartidos y cálculo de pagos adeudados.
3. **Registro y Validación de Comprobantes**: Los usuarios envían capturas de pantalla de sus transferencias; el bot las almacena localmente y las sube automáticamente a Notion como comprobante de pago.
4. **Recordatorios Automatizados (Cron)**: Tarea programada diaria (10:00 AM) que calcula deudores y envía avisos preventivos y de mora según días de vencimiento.
5. **Persistencia en Notion**: Utiliza Notion como base de datos estructurada para Usuarios, Tandas y Pagos mediante el SDK v5 (`dataSources` y `fileUploads`).

---

## 2. Stack Tecnológico

| Componente | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Runtime** | Node.js | v20+ (ESM nativo, `"type": "module"`) |
| **Lenguaje** | TypeScript | v5.4.3 (Target ES2022) |
| **Gestor de Paquetes** | pnpm | Obligatorio (usado en Docker y local) |
| **Bot Framework** | BuilderBot (`@builderbot/bot`) | v1.3.15 |
| **WhatsApp Provider** | `@builderbot/provider-baileys` | v1.3.15 (Baileys) |
| **Bot State DB** | `@builderbot/database-json` | v1.3.15 (`db.json`) |
| **Database Principal** | Notion SDK (`@notionhq/client`) | v5.3.0 (API de DataSources y FileUploads) |
| **Motor de IA** | Google Gen AI SDK (`@google/genai`) | v1.46.0 (Gemini 1.5 Flash / configurado vía env) |
| **Scheduler** | `node-cron` | v4.1.0 |
| **Bundler** | `tsup` | v8.5.1 (con loader de `.md` a texto) |
| **Servidor HTTP** | Express | v5.1.0 (servidor web interno de BuilderBot en puerto 3008) |
| **Logger** | `pino` + `pino-pretty` | Salidas estructuradas con colores |
| **Manipulación de Imágenes**| `sharp` | v0.32.6 |

---

## 3. Estructura del Proyecto

```
tandasbot/
├── .env.example              # Plantilla de variables de entorno requeridas
├── Dockerfile                # Configuración multi-stage para despliegue en contenedor
├── deploy.sh                 # Script bash para actualización automática en servidor PM2
├── package.json              # Scripts y dependencias
├── tsconfig.json             # Configuración TypeScript y alias de rutas
├── tsup.config.ts            # Configuración de compilación con tsup
├── globals.d.ts              # Declaración para importación de archivos *.md
├── src/
│   ├── app.ts                # Punto de entrada principal y configuración del cron diario
│   ├── config/
│   │   ├── aiContext.md      # Instrucciones de sistema y personalidad del bot (ChrisBot)
│   │   ├── aiModel.ts        # Inicialización de Gemini y esquema de respuesta JSON
│   │   ├── database.ts       # Inicialización de JsonFileDB de BuilderBot
│   │   └── provider.ts       # Configuración del BaileysProvider de WhatsApp
│   ├── constants/
│   │   ├── menu.ts           # Opciones de menú segmentadas por rol/grupo
│   │   ├── messages.ts       # Mensajes estándar (errores, no autorizado, términos)
│   │   ├── paths.ts          # Rutas locales (ej. 'vouchers')
│   │   ├── tandasRules.ts    # Generadores de texto con reglas por servicio
│   │   └── users.ts          # Usuario Admin por defecto derivado de .env
│   ├── enums/
│   │   ├── bot-commands.ts   # Comandos textuales exactos del bot
│   │   ├── suscriptions.ts   # Tipos de suscripción ('monthly' | 'annual')
│   │   └── users.ts          # Grupos/roles de usuarios ('admin', 'spotify', etc.)
│   ├── flows/
│   │   ├── index.ts          # Registro maestro de todos los flujos de BuilderBot
│   │   ├── aiFlow.ts         # Flow principal: captura mensajes/archivos y delega a Gemini
│   │   ├── aiFlowList.ts     # Mapeo de `startCommand` a flows de ejecución de BuilderBot
│   │   ├── generalFlow.ts    # Flujo de menú general (`menú` / `menu`)
│   │   ├── adminFlow.ts      # Flujos de administrador (difusión grupal, estatus, forzar cron)
│   │   └── tandasFlow.ts     # Flujos de usuario (pagar, consultar saldo, reglas, términos)
│   ├── types/
│   │   ├── aiResponse.d.ts   # Tipado de la respuesta JSON del modelo de IA
│   │   ├── debtors.d.ts      # Tipado de deudores de tandas
│   │   ├── messages.d.ts     # Tipado de mensajes de WhatsApp
│   │   ├── payments.d.ts     # Tipado de transacciones de pago
│   │   └── notion/           # Tipados específicos para propiedades de Notion
│   └── utils/
│       ├── datetimes.ts      # Cálculos de fechas, diferencias en meses/años/días y zona horaria
│       ├── files.ts          # Guardado local de comprobantes y subida vía Notion File Uploads
│       ├── logger.ts         # Instancia configurada de Pino Logger
│       ├── misc.ts           # Formateador de moneda (MXN) y transformaciones de texto
│       ├── tandas.ts         # Lógica central de adeudos, periodos y recordatorios
│       ├── users.ts          # Validación de permisos y envío masivo/individual de mensajes
│       ├── whatsapp.ts       # Utilidad para sanitizar números de teléfono desde JID
│       └── notion/
│           ├── client.ts     # Cliente oficial de Notion
│           ├── tandasDB.ts   # Queries y mutaciones de Tandas y Pagos en Notion
│           └── usersDB.ts    # Queries y mutaciones de Usuarios en Notion
```

---

## 4. Arquitectura de Flujos y Enrutamiento con IA

El flujo conversacional funciona mediante un patrón híbrido **IA Router + State Machine**:

```mermaid
flowchart TD
    User([Mensaje del Usuario]) --> AIFlow[aiFlow.ts: EVENTS.WELCOME / MEDIA / DOCUMENT]
    AIFlow --> CheckAuth{¿Usuario registrado en Notion?}
    CheckAuth -- No --> DenyMsg[Mensaje de usuario no registrado]
    CheckAuth -- Sí --> Gemini[Llamada a Google Gemini con aiContext.md]
    Gemini --> RespJSON[Respuesta JSON estructurada: messageToUser + startCommand]
    RespJSON --> SendMsg[Enviar messageToUser al usuario]
    RespJSON --> HasCmd{¿startCommand != null?}
    HasCmd -- No --> EndTurn([Fin del turno])
    HasCmd -- Sí --> FlowMapper[aiFlowList.ts: getFlowByCommandName]
    FlowMapper --> TargetFlow[gotoFlow: tandasFlow / generalFlow / adminFlow]
```

### Protocolo de respuesta de Gemini (`src/config/aiModel.ts`)
Gemini siempre responde un objeto JSON validado por esquema:
```json
{
  "messageToUser": "Mensaje en formato WhatsApp (usar *negritas*, _cursivas_, emojis moderados)",
  "startCommand": "comando exacto de BOT_COMMANDS o vacío"
}
```

### Comandos soportados (`src/enums/bot-commands.ts`)
- **Generales**: `menú`, `menu`, `datos de pago`.
- **Admin**: `mensaje a grupo`, `mensaje personalizado`, `estatus tandas`, `reenviar recordatorios tandas`.
- **Por tanda**: `pagar <tanda>`, `mi <tanda>`, `reglamento <tanda>` (ej. `pagar spotify`, `mi hbo max`, etc.).

---

## 5. Esquema de Base de Datos (Notion Data Sources)

El bot requiere 3 bases de datos en Notion vinculadas al token de integración (`NOTION_API_TOKEN`):

### 1. Base de Datos de Usuarios (`NOTION_USERS_DATASOURCE_ID`)
- `name` (*Title*): Nombre completo del usuario.
- `phone` (*Phone*): Número con código de país (ej. `52155...`).
- `groups` (*Multi-select*): Grupos a los que pertenece: `admin`, `spotify`, `hbo max`, `youtube premium`, `amazon prime`, `familia`, `tandas`.
- `<servicio>_start_date` (*Date*): Fecha de inicio de cada tanda (`spotify_start_date`, etc.).
- `accepted_<servicio>_terms` (*Checkbox*): Indicador de aceptación de reglamento (`accepted_spotify_terms`, etc.).

### 2. Base de Datos de Tandas (`NOTION_TANDAS_LIST_DATASOURCE_ID`)
- `name` (*Title*): Nombre de la tanda (coincide con los nombres de grupo).
- `is_active` (*Checkbox*): Si la tanda está activa.
- `suscription_type` (*Select*): Periodicidad: `monthly` o `annual`.
- `payment_day` (*Date*): Día de cobro del mes o del año.
- `total_cost` (*Number*): Costo total del plan familiar.
- `n_members` (*Number*): Cantidad de integrantes.
- `cost_per_member` (*Formula*): `prop("total_cost") / prop("n_members")`.

### 3. Base de Datos de Pagos (`NOTION_TANDAS_PAYMENTS_DATASOURCE_ID`)
- `title` (*Title*): Título del registro (ej. `Pago de Juan - $40.00`).
- `user` (*Relation*): Relación a la base de usuarios.
- `tanda` (*Select*): Nombre del servicio pagado.
- `payment_date` (*Date*): Fecha en que se realizó el pago.
- `payment` (*Number*): Monto pagado en MXN.
- `paid_periods` (*Number*): Cantidad de periodos cubiertos (`floor(payment / costPerMember)`).
- `next_payment` (*Date*): Próxima fecha límite calculada.
- `voucher_path` (*Rich Text*): Ruta local donde se guardó el voucher.
- `voucher_image` (*Files & media*): Archivo subido a Notion mediante File Uploads API.
- `overdue_payment` (*Formula Checkbox*): Indica si el pago está vencido.

---

## 6. Lógica de Negocio Crítica

### A. Registro de Pagos (`src/utils/tandas.ts: handleTandaPayment`)
1. Divide el monto recibido entre el costo por integrante (`costPerUser`) redondeado hacia abajo (`Math.floor`) para obtener `paidPeriods`.
2. Calcula la fecha de `nextPayment`:
   - Si existen pagos previos: añade `paidPeriods` a la fecha del último `nextPayment`.
   - Si es el primer pago: calcula a partir de la fecha de inicio del usuario (`<servicio>StartDate`) o de la fecha de pago de la tanda.
3. Almacena el comprobante localmente en `vouchers/<userId>/<timestamp>.<ext>`.
4. Sube el archivo a Notion mediante la API `fileUploads.create` y `fileUploads.send`, obteniendo `fileUploadId`.
5. Inserta la página en la base de pagos de Notion vinculando el usuario y el archivo subido.

### B. Recordatorios Diarios y Cálculo de Deudores (`src/utils/tandas.ts`)
- Cron: Ejecutado a las **10:00 AM** todos los días (`0 10 * * *`).
- Compara la diferencia de días entre la fecha actual y la fecha de corte de la tanda:
  - **Tandas mensuales**:
    - Dispara recordatorios si faltan 5, 3, 1 días, el mismo día (0) o si tiene retraso (-2 días).
    - Tolerancia de pago: 15 días tras la fecha límite.
  - **Tandas anuales**:
    - Dispara recordatorios con 30, 15, 7, 1 días de anticipación, el día límite (0) o en retraso (-2 días).
    - Tolerancia de pago: 20 días.
- Envía un resumen automático al administrador informando a quiénes se les envió recordatorio.

---

## 7. Variables de Entorno Requeridas

Copia `.env.example` a `.env` y configura los siguientes valores:

```env
# Administrador
ADMIN_NUMBER=521XXXXXXXXXX            # Número de WhatsApp del administrador con código de país
ADMIN_NAME="Christian Leyva"          # Nombre del administrador

# Notion Integration
NOTION_API_TOKEN=secret_xxxx          # Token de integración interna de Notion
NOTION_USERS_DATASOURCE_ID=xxxx       # ID de la base de datos de Usuarios
NOTION_TANDAS_LIST_DATASOURCE_ID=xxxx # ID de la base de datos de Tandas
NOTION_TANDAS_PAYMENTS_DATASOURCE_ID=xxxx # ID de la base de datos de Pagos

# Google Gemini
GEMINI_API_KEY=AIzaSy...              # API Key de Google AI Studio
GEMINI_MODEL_NAME=gemini-1.5-flash    # Nombre del modelo

# WhatsApp Baileys Provider
PROVIDER_VERSION=6                    # Subversión del cliente Web de WhatsApp
PORT=3008                             # Puerto HTTP para el servidor de BuilderBot
```

---

## 8. Comandos de Desarrollo y Ejecución

```bash
# Instalar dependencias
pnpm install

# Modo desarrollo (compilación en caliente + ejecución con watch)
pnpm dev

# Compilar para producción (salida en dist/app.js)
pnpm build

# Iniciar producción
pnpm start

# Ejecutar con Docker
docker build -t tandasbot .
docker run -d --name tandasbot-instance -p 3008:3008 --env-file .env tandasbot
```

> [!NOTE]
> En la primera ejecución, BuilderBot imprimirá un código QR en la consola de la terminal. Debe escanearse desde WhatsApp en **Dispositivos vinculados** para iniciar la sesión de Baileys.

---

## 9. Convenciones de Código y Buenas Prácticas

### Alias de TypeScript
Configurados en `tsconfig.json`, siempre deben utilizarse en lugar de rutas relativas largas:
- `@constants/*` ➔ `src/constants/*`
- `@config/*` ➔ `src/config/*`
- `@enums/*` ➔ `src/enums/*`
- `@flows/*` ➔ `src/flows/*`
- `@custom-types/*` ➔ `src/types/*`
- `@utils/*` ➔ `src/utils/*`

### Formato de Mensajes de WhatsApp
WhatsApp no soporta Markdown estándar (por ejemplo `**` no produce negrita). Respeta las siguientes reglas en plantillas y prompts:
- **Negrita**: `*texto*`
- **Cursiva**: `_texto_`
- **Tachado**: `~texto~`
- **Monoespaciado / Código**: ````texto```` o `` `texto` ``
- **Listas**: `* Elemento` o `- Elemento`
- **Citas**: `> texto`

### Manejo de Números Telefónicos
- En Baileys, el `remoteJid` suele llegar con formato `<phone>@s.whatsapp.net` o `<phone>@c.us`.
- Siempre utiliza `getCleanPhoneNumber(ctx.key.remoteJid)` para extraer únicamente el número numérico limpio antes de buscarlo en Notion.
- En México los números móviles de WhatsApp pueden venir con `521...` o `52...`. Las funciones de búsqueda en `src/utils/notion/usersDB.ts` verifican ambas variantes.

### Manejo de API Notion v5
Este proyecto utiliza el SDK oficial `@notionhq/client` v5+:
- Usar `notionClient.dataSources.query(...)` con `data_source_id`.
- Para adjuntar archivos a Notion, se utiliza `notionClient.fileUploads.create` y `notionClient.fileUploads.send`.

### Convención de Commits (Conventional Commits + Gitmoji)
Todos los commits deben seguir estrictamente el estándar de **Conventional Commits** combinado con **Gitmoji** utilizando la siguiente estructura:

```text
convention: :gitmoji: description
```

Donde:
- `convention`: Tipo de cambio según Conventional Commits (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, etc.).
- `:gitmoji:`: Código corto del Gitmoji correspondiente al tipo de cambio.
- `description`: Descripción concisa en tiempo presente e imperativo explicando el cambio realizado.

**Ejemplos de referencia:**
- `feat: :sparkles: add support for new streaming service tanda`
- `fix: :bug: resolve overdue payment calculation for monthly cycle`
- `docs: :memo: add gitmoji commit guidelines to AGENTS.md`
- `refactor: :recycle: simplify debtor reminder dispatch logic`
- `chore: :wrench: update dependencies and pnpm configurations`
- `test: :white_check_mark: add unit tests for date utilities`
- `style: :art: format message templates and fix indentation`

---

## 10. Consideraciones para Agentes que Modifiquen el Código

1. **Evitar romper el flujo de IA**: `aiFlow.ts` intercepta todos los mensajes (`EVENTS.WELCOME`, `EVENTS.MEDIA`, `EVENTS.DOCUMENT`). Si se agrega un nuevo comando de bot, se debe registrar en:
   - `BOT_COMMANDS` (`src/enums/bot-commands.ts`).
   - `aiFlowList.ts` (en `getFlowByCommandName`).
   - `aiContext.md` (para que el modelo de Gemini conozca cuándo sugerir o invocar dicho comando).
   - `menu.ts` (para mostrarlo en el comando `menú` al grupo correspondiente).
2. **Importaciones de Markdown**: Si se modifican o añaden archivos `.md` importados desde código TypeScript (como `aiContext.md`), ten en cuenta que `tsup.config.ts` utiliza `loader: { ".md": "text" }` y `globals.d.ts` contiene `declare module "*.md"`.
3. **Manejo de Errores en Flujos**: BuilderBot detiene la ejecución si una excepción no es capturada. Siempre envuelve la lógica de `addAction` o `addAnswer` en bloques `try / catch` reportando el error en `logger.error(...)` y notificando amigablemente al usuario con `flowDynamic(GENERIC_ERROR_MESSAGE)`.
