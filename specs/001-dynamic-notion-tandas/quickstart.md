# Quickstart & Validation Guide: 001-dynamic-notion-tandas

## Prerrequisitos
1. Node.js v20+ y `pnpm` instalados.
2. Variables de entorno configuradas en `.env` (sin `ADMIN_NUMBER`, `ADMIN_NAME` ni `PROVIDER_VERSION`):
   - `NOTION_API_TOKEN`
   - `NOTION_USERS_DATASOURCE_ID`
   - `NOTION_TANDAS_LIST_DATASOURCE_ID`
   - `NOTION_TANDAS_PAYMENTS_DATASOURCE_ID`
   - `NOTION_TANDAS_LEGALES_DATASOURCE_ID` *(nueva)*
   - `GEMINI_API_KEY`, `GEMINI_MODEL_NAME`, `PORT`
3. En Notion (`TandasBot (nuevo)`):
   - Agregar la propiedad `"Saldo a favor"` (Number) en `Legales Usuarios Tandas` (opcional si inicia en 0, requerida para persistir saldos).
   - Restaurar nombres finales `"Fecha inicio"` y `"Acepto reglas"` en `Legales Usuarios Tandas`.

## Comandos de Verificación
```bash
# 1. Instalar y actualizar dependencias
pnpm update
pnpm install

# 2. Verificar tipos y compilar
npx tsc --noEmit
pnpm build

# 3. Iniciar en desarrollo
pnpm dev
```

## Escenarios de Validación End-to-End
1. **Arranque sin `PROVIDER_VERSION` ni `ADMIN_*`**: Verificar en logs que `fetchLatestWaWebVersion` resuelve la versión de WhatsApp Web y que los administradores se obtienen desde `Usuarios` (`Admin? = true`).
2. **Nueva tanda dinámica**: Crear una tanda de prueba activa en `Listado Tandas` con `"Reglas tanda"`, asignarla a un usuario en `Usuarios` y validar sin reiniciar código que aparece en `menú`, responde `reglamento <tanda>` (+ segundo mensaje con monto y fecha), `mi <tanda>` (con antigüedad y saldo a favor) y `pagar <tanda>`.
3. **Pagos parciales y día fijo**: Enviar un pago menor a la cuota → verificar `"Saldo a favor"` > 0 y sin avance de `"Siguiente pago"`. Enviar el complemento → verificar que acredita 1 periodo y `"Siguiente pago"` conserva exactamente el día de `"Dia de pago"`.
4. **Comandos de Admin**: Probar `estatus usuario`, `regalar periodos` (verificando abono sin comprobante, monto y próximo pago), `cambiar precio tanda`, `cambiar contraseña tanda` (verificando envío solo a miembros sin adeudos y reporte final) y `mensaje a grupo` con `"todos"`.
5. **UX de Flujos**: Verificar indicador `"escribiendo..."`, agrupación de mensajes rápidos, reintento con `fallBack` ante monto inválido, cancelación con `"cancelar"` y cierre automático tras 5 minutos de inactividad.
