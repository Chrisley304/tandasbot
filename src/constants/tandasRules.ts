import type { Tanda } from "@custom-types/notion/tandasDB";
import { SUSCRIPTION_TYPES } from "@enums/suscriptions";
import { getMexicoCityDateParts } from "@utils/datetimes";
import { pesosFormatter } from "@utils/misc";

const SPANISH_MONTHS = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
];

/**
 * Generates the rules messages for any dynamic tanda:
 * 1) Rules text from Notion ("Reglas tanda") with a fallback template
 * 2) Separate message with the cost per member and payment due day/date
 */
export const generateTandaRulesMessages = (tanda: Tanda): string[] => {
    const formattedCost = pesosFormatter.format(tanda.costPerUser);
    const { day, month } = getMexicoCityDateParts(tanda.paymentDay);

    const rulesText = tanda.rules?.trim()
        ? tanda.rules.trim()
        : [
              `📃 Reglamento de participación en la "Tanda" de *${tanda.name}*`,
              "⏳ *Tiempo de tolerancia:* Respeta la fecha límite de pago o avisa con anticipación si tienes algún inconveniente.",
              "🚨 *Expulsión por impago:* Dejar de pagar sin aviso resultará en la suspensión definitiva del servicio.",
              "🔄 *Salida del grupo:* Avisa con al menos 1 mes de anticipación.",
          ].join("\n\n");

    const scheduleText =
        tanda.suscriptionType === SUSCRIPTION_TYPES.ANNUAL
            ? `antes del día *${day} de ${SPANISH_MONTHS[month - 1]}* de cada año`
            : `antes del día *${day}* de cada mes`;

    const paymentSummaryMessage = `💵 *Monto a pagar:* *${formattedCost} pesos* (${
        tanda.suscriptionType === SUSCRIPTION_TYPES.ANNUAL ? "anual" : "mensual"
    })\n📅 *Fecha límite:* Debes realizar tu pago ${scheduleText}.`;

    return [rulesText, paymentSummaryMessage];
};
