<p align="center">
  <picture>
    <img src="./src/assets/tandasbot.jpeg" height="120" alt="Tandasbot logo">
  </picture>
  <h1 align="center">Tandasbot</h1>
  <p align="center">
    <strong>Bot de WhatsApp para administrar tandas y suscripciones compartidas.</strong>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v20+-blue?logo=node.js" alt="Node Version">
  <img src="https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript" alt="TypeScript Version">
  <img src="https://img.shields.io/badge/BuilderBot-1.5.2-orange" alt="BuilderBot Version">
  <img src="https://img.shields.io/badge/Notion-Integration-black?logo=notion" alt="Notion Integration">
</p>

---

## Propósito

**Tandasbot** se dedica exclusivamente a la gestión de tandas: membresías, reglas, pagos, comprobantes, saldos a favor, adeudos y recordatorios. El catálogo de tandas, participantes y administradores vive en Notion; agregar una tanda activa no requiere cambios de código.

## Funcionalidades

- Menú y comandos dinámicos para cada tanda asignada.
- Registro de pagos con comprobantes y saldo a favor para pagos parciales.
- Consulta de adeudos, próximos pagos, antigüedad e historial reciente.
- Recordatorios automáticos diarios y herramientas de administración.
- Aceptación de reglamentos por tanda.
- Resolución automática de la versión de WhatsApp Web al iniciar.

## Requisitos

- Node.js 20 o superior.
- pnpm.
- Una integración de Notion con acceso a las cuatro tablas descritas abajo.
- Credenciales de Google Gemini y una cuenta de WhatsApp para vincular el provider.

## Instalación

```bash
git clone https://github.com/Chrisley304/tandasbot.git
cd tandasbot
pnpm install
cp .env.example .env
```

Configura `.env`:

```env
NOTION_API_TOKEN=secret_xxx
NOTION_USERS_DATASOURCE_ID=xxx
NOTION_TANDAS_LIST_DATASOURCE_ID=xxx
NOTION_TANDAS_PAYMENTS_DATASOURCE_ID=xxx
NOTION_TANDAS_LEGALES_DATASOURCE_ID=xxx

GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL_NAME=gemini-1.5-flash
PORT=3008

# Optional logging configuration
LOG_LEVEL=info
LOG_COLOR=true
```

Los administradores se definen en Notion con la casilla `Admin?`; no se configuran mediante variables de entorno. La versión de WhatsApp Web también se resuelve automáticamente.

Para diagnóstico local usa `LOG_LEVEL=debug`. En servidores o agregadores de logs puedes usar `LOG_COLOR=false` para desactivar los colores ANSI.

Tandasbot también oculta por defecto el mensaje ruidoso `Closing session: SessionEntry...` emitido directamente por libsignal. Usa `SUPPRESS_LIBSIGNAL_SESSION_LOGS=false` solo si necesitas diagnosticar internamente la sesión de WhatsApp.

## Esquema de Notion

| Tabla | Variable de entorno | Propiedades principales |
| --- | --- | --- |
| `Usuarios` | `NOTION_USERS_DATASOURCE_ID` | `Nombre`, `Telefono`, `Admin?`, `Tandas` (relación) |
| `Listado Tandas` | `NOTION_TANDAS_LIST_DATASOURCE_ID` | `Nombre tanda`, `Activo?`, `Recurrencia`, `Dia de pago`, `Costo tanda`, `Numero de miembros`, `Costo por miembro`, `password`, `Reglas tanda` |
| `Legales Usuarios Tandas` | `NOTION_TANDAS_LEGALES_DATASOURCE_ID` | `Nombre`, `Usuario`, `Tanda`, `Fecha inicio`, `Acepto reglas`, `Saldo a favor` |
| `Listado de Pagos` | `NOTION_TANDAS_PAYMENTS_DATASOURCE_ID` | `Titulo`, `Usuario`, `Tanda`, `Fecha pago`, `Monto`, `Siguiente pago`, `Comprobante`, `Periodos pagados`, `Vencido?` |

## Comandos

- `menú` / `menu`: muestra las tandas y comandos disponibles.
- `datos de pago`: muestra los datos bancarios para pagar una tanda.
- `pagar <tanda>`: registra un pago y su comprobante.
- `mi <tanda>`: muestra adeudo, saldo, historial y próxima fecha de pago.
- `reglamento <tanda>`: muestra y permite aceptar el reglamento.

Los usuarios con `Admin?` activo también pueden enviar mensajes, consultar estatus, reenviar recordatorios, revisar adeudos, ajustar precios y cambiar contraseñas. El comando `regalar periodos` permite otorgar periodos completos de una tanda a un usuario: registra un abono sin comprobante por el monto correspondiente y avanza su siguiente pago.

## Desarrollo y ejecución

```bash
# Verificar tipos y compilar
pnpm exec tsc --noEmit
pnpm build

# Desarrollo
pnpm dev

# Producción
pnpm start
```

En el primer inicio, vincula WhatsApp escaneando el código QR desde **Dispositivos vinculados**.

## Despliegue con Docker

```bash
docker build -t tandasbot .
docker run -d --name tandasbot-instance -p 3008:3008 --env-file .env tandasbot
```

## Licencia

ISC. Consulta [LICENSE](./LICENSE).
