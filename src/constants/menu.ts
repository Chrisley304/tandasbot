import type { Tanda } from "@custom-types/notion/tandasDB";
import type { User } from "@custom-types/notion/usersDB";

export const GENERAL_MENU_OPTIONS = [
    "- `datos de pago` - Mostrar mis datos de pago 📄",
];

export const ADMIN_MENU_OPTIONS = [
    "- `mensaje a grupo` - Envia un mensaje a una tanda o a `todos` 📬",
    "- `mensaje personalizado` - Envia un mensaje personalizado a un usuario 📩",
    '- `estatus tandas` - Muestra el estatus de las "tandas" 💸',
    "- `reenviar recordatorios tandas` - Reenvia el recordatorio diario de las tandas a los usuarios 📢",
    "- `adeudos usuario` - Consulta los últimos 3 pagos, saldo a favor y adeudo de un usuario 🔍",
    "- `cambiar precio tanda` - Actualiza el costo de una tanda y ajusta pagos adelantados 💲",
    "- `cambiar contraseña tanda` - Cambia la contraseña de una tanda y avisa a quienes están al corriente 🔐",
];

/**
 * Generates dynamic menu lines for a given user and active tandas from Notion.
 */
export const generateUserMenuLines = (
    user: User,
    activeTandas: Tanda[],
): string[] => {
    const lines: string[] = [...GENERAL_MENU_OPTIONS];

    const userTandas = activeTandas.filter((tanda) =>
        user.tandaIds.includes(tanda.id),
    );

    for (const tanda of userTandas) {
        const lowerName = tanda.name.toLowerCase();
        lines.push(
            `- \`pagar ${lowerName}\` - Paga tu parte de ${tanda.name}`,
            `- \`mi ${lowerName}\` - Muestra tu antigüedad, saldo a favor y pagos de ${tanda.name}`,
            `- \`reglamento ${lowerName}\` - Muestra el reglamento de ${tanda.name}`,
        );
    }

    if (user.isAdmin) {
        lines.push("", "*Opciones de Administrador:*", ...ADMIN_MENU_OPTIONS);
    }

    return lines;
};
