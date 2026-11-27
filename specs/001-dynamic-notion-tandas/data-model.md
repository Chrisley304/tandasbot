# Data Model: 001-dynamic-notion-tandas

## Entidades y Mapeo en Notion

### 1. Tanda (`Listado Tandas` — `NOTION_TANDAS_LIST_DATASOURCE_ID`)
| Campo Interno (`Tanda`) | Propiedad Notion | Tipo Notion | Notas |
| :--- | :--- | :--- | :--- |
| `id` | `page.id` | UUID | Identificador único usado en relaciones |
| `name` | `"Nombre tanda"` | Title | Puede incluir emoji; se normaliza al comparar comandos |
| `isActive` | `"Activo?"` | Checkbox | Solo las activas aparecen en menú, IA y recordatorios |
| `suscriptionType` | `"Recurrencia"` | Select | `"monthly"` \| `"annual"` |
| `paymentDay` | `"Dia de pago"` | Date | Define el día fijo (y mes en anuales) de corte |
| `totalCost` | `"Costo tanda"` | Number | Actualizable por admin (`cambiar precio`) |
| `nMembers` | `"Numero de miembros"` | Number | Base para el cálculo de cuota |
| `costPerUser` | `"Costo por miembro"` | Formula | Solo lectura (`Costo tanda / Numero de miembros`) |
| `password` | `"password"` | Text | Actualizable por admin (`cambiar contraseña`) |
| `rules` | `"Reglas tanda"` | Text | Reglamento dinámico mostrado al usuario |

### 2. Usuario (`Usuarios` — `NOTION_USERS_DATASOURCE_ID`)
| Campo Interno (`User`) | Propiedad Notion | Tipo Notion | Notas |
| :--- | :--- | :--- | :--- |
| `id` | `page.id` | UUID | Identificador único usado en relaciones |
| `name` | `"Nombre"` | Title | Nombre del participante o admin |
| `phone` | `"Telefono"` | Phone | Sanitizado con soporte `521...` / `52...` |
| `isAdmin` | `"Admin?"` | Checkbox | Reemplaza al antiguo grupo `"admin"` y `.env` |
| `tandaIds` | `"Tandas"` | Relation | Array de IDs de `Listado Tandas` asignadas |

### 3. Legal / Membresía por Tanda (`Legales Usuarios Tandas` — `NOTION_TANDAS_LEGALES_DATASOURCE_ID`)
| Campo Interno (`UserTandaLegal`) | Propiedad Notion | Tipo Notion | Notas |
| :--- | :--- | :--- | :--- |
| `id` | `page.id` | UUID | Registro único por par `(Usuario, Tanda)` |
| `title` | `"Nombre"` | Title | Ej. `"Legales Chrisley - Hbo Max"` |
| `userId` | `"Usuario"` | Relation | Relación a `Usuarios` |
| `tandaId` | `"Tanda"` | Relation | Relación a `Listado Tandas` |
| `startDate` | `"Fecha inicio"` | Date | Fecha desde la que pertenece a la tanda |
| `acceptedRules` | `"Acepto reglas"` | Checkbox | Requerido antes de pagar o consultar estado |
| `creditBalance` | `"Saldo a favor"` | Number | Remanente acumulado en MXN (default `0`) |

### 4. Pago (`Listado de Pagos` — `NOTION_TANDAS_PAYMENTS_DATASOURCE_ID`)
| Campo Interno (`TandaPayment`) | Propiedad Notion | Tipo Notion | Notas |
| :--- | :--- | :--- | :--- |
| `id` | `page.id` | UUID | ID de la transacción |
| `title` | `"Titulo"` | Title | Ej. `"Pago de Juan - $40.00"` |
| `userId` | `"Usuario"` | Relation | Relación a `Usuarios` |
| `tandaId` | `"Tanda"` | Relation | Relación a `Listado Tandas` |
| `paymentDate` | `"Fecha pago"` | Date | Fecha en `America/Mexico_City` |
| `payment` | `"Monto"` | Number | Monto transferido en MXN |
| `nextPayment` | `"Siguiente pago"` | Date | Siempre con el día fijo de `"Dia de pago"` |
| `voucherFileUploadId` | `"Comprobante"` | File | Subido vía `fileUploads` API |
| `paidPeriods` | `"Periodos pagados"` | Formula | Solo lectura (calculada en Notion) |
| `overduePayment` | `"Vencido?"` | Formula | Solo lectura |

## Transiciones de Estado Clave
1. **Aceptación de Reglamento**: Si no existe registro en `Legales Usuarios Tandas` para `(userId, tandaId)` o `acceptedRules === false`, el usuario debe aceptar (`ACEPTO`) para crear/actualizar el registro con `Acepto reglas = true` y `Fecha inicio = hoy` (si no tenía).
2. **Registro de Pago (con Saldo a Favor)**:
   - `totalDisponible = montoRecibido + legal.creditBalance`
   - `periodosCubiertos = Math.floor(totalDisponible / tanda.costPerUser)`
   - `nuevoSaldo = round2(totalDisponible - periodosCubiertos * tanda.costPerUser)`
   - Si `periodosCubiertos > 0`: `siguientePago` avanza `periodosCubiertos` ciclos manteniendo fijo el día de `tanda.paymentDay`. Si `periodosCubiertos === 0`: `siguientePago` se mantiene en la fecha límite actual (no avanza).
3. **Ajuste de Precio (Admin)**:
   - Para usuarios con `lastPayment.nextPayment > hoy`: `periodosAdelantados = ciclosFuturos(hoy, lastPayment.nextPayment)`.
   - `creditoRestante = periodosAdelantados * costoAnterior + legal.creditBalance`.
   - `nuevosPeriodos = Math.floor(creditoRestante / nuevoCosto)`.
   - `nuevoSaldo = round2(creditoRestante - nuevosPeriodos * nuevoCosto)`.
   - Se recalcula `Siguiente pago` desde el corte actual + `nuevosPeriodos` (con día fijo) y se actualiza `"Saldo a favor"`.
