import { Tanda } from "@custom-types/notion/tandasDB";
import { pesosFormatter } from "@utils/misc";

export const generateSpotifyRulesMessage = (tanda: Tanda) => {
    const formattedCost = pesosFormatter.format(tanda.costPerUser);
    const paymentDay = tanda.paymentDay.getDate() + 1;

    return [
        '📃 Reglamento de participación en la "Tanda" de *Spotify* 🎧\n',

        `✅ *Pago Mensual:* Debes pagar ${formattedCost} pesos a más tardar el día ${paymentDay} de cada mes.`,

        "⏳ *Tiempo de tolerancia:* Tienes hasta 15 días después de la fecha límite para hacerlo.",

        "⚠️ *Justificación de Retraso:* Si tienes algún problema para pagar dentro de la tolerancia, avísame con anticipación (a mi numero personal) y explícame la situación para buscar una solución (_Nota: Puede aplicar una tarifa por retraso 😬_).",

        "🚨 *Expulsión por Impago:* Si no pagas dentro del plazo y no das ninguna explicación, serás expulsado automáticamente del grupo.",

        "🔄 *Salida del Grupo:* Si deseas salir del grupo, debes avisarme con un mes de anticipación y pagar tu último mes. Esto es para que pueda encontrar un reemplazo a tiempo 🙏🏼. (_Ejemplo: si quieres salir en septiembre, debes avisar en agosto y pagar ese mes_).",

        "🔒 *Privacidad de Datos:* Ten la confianza que tu información personal (nombre, contacto e historial de pagos) será utilizada únicamente para el funcionamiento del bot (es decir solo yo tengo esos datos) y no será compartida con NADIE.",

        "🤝 *Compromiso:* Al aceptar las reglas de la tanda te comprometes a cumplir con los pagos en tiempo y forma y estás de acuerdo en que almacene tu nombre, contacto e historial de pagos en el bot para la administración de la tanda.",
    ];
};

export const generateHBOMaxRulesMessage = (tanda: Tanda) => {
    const formattedCost = pesosFormatter.format(tanda.costPerUser);
    const paymentDay = tanda.paymentDay.getDate() + 1;

    return [
        '📃 Reglamento de participación en la "Tanda" de *HBO Max* 🍿\n',

        `✅ *Pago Mensual:* Debes pagar ${formattedCost} pesos a más tardar el día ${paymentDay} de cada mes.`,

        "⏳ *Tiempo de tolerancia:* Tienes hasta 15 días después de la fecha límite para hacerlo.",

        "⚠️ *Justificación de Retraso:* Si tienes algún problema para pagar dentro de la tolerancia, avísame con anticipación (a mi numero personal) y explícame la situación para buscar una solución (_Nota: Puede aplicar una tarifa por retraso 😬_).",

        "🚨 *Expulsión por Impago:* Si no pagas dentro del plazo y no das ninguna explicación, serás expulsado automáticamente del grupo.",

        "🔄 *Salida del Grupo:* Si deseas salir del grupo, debes avisarme con un mes de anticipación y pagar tu último mes. Esto es para que pueda encontrar un reemplazo a tiempo 🙏🏼. (_Ejemplo: si quieres salir en septiembre, debes avisar en agosto y pagar ese mes_).",

        "🔒 *Privacidad de Datos:* Ten la confianza que tu información personal (nombre, contacto e historial de pagos) será utilizada únicamente para el funcionamiento del bot (es decir solo yo tengo esos datos) y no será compartida con NADIE.",

        "🤝 *Compromiso:* Al aceptar las reglas de la tanda te comprometes a cumplir con los pagos en tiempo y forma y estás de acuerdo en que almacene tu nombre, contacto e historial de pagos en el bot para la administración de la tanda.",
    ];
};

export const generateAmazonPrimeRulesMessage = (tanda: Tanda) => {
    const formattedCost = pesosFormatter.format(tanda.costPerUser);
    const paymentDay = tanda.paymentDay.toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
    });

    return [
        '📃 Reglamento de participación en la "Tanda" de *Amazon Prime* 📦\n',

        `✅ *Pago Anual:* Debes pagar ${formattedCost} pesos a más tardar el día ${paymentDay} de cada año.`,

        "⏳ *Tiempo de tolerancia:* Tienes hasta 20 días después de la fecha límite para hacerlo.",

        "⚠️ *Justificación de Retraso:* Si tienes algún problema para pagar dentro de la tolerancia, avísame con anticipación (a mi numero personal) y explícame la situación para buscar una solución (_Nota: Puede aplicar una tarifa por retraso 😬_).",

        "🚨 *Expulsión por Impago:* Si no pagas dentro del plazo y no das ninguna explicación, serás expulsado automáticamente del grupo.",

        "🔄 *Salida del Grupo:* Si deseas salir del grupo, debes avisarme *máximo* con un mes de anticipación de la siguiente fecha de pago. Esto es para que pueda encontrar un reemplazo a tiempo 🙏🏼. (_Ejemplo: si quieres salir en septiembre, debes avisar en agosto y pagar ese mes_).",

        "🔒 *Privacidad de Datos:* Ten la confianza que tu información personal (nombre, contacto e historial de pagos) será utilizada únicamente para el funcionamiento del bot (es decir solo yo tengo esos datos) y no será compartida con NADIE.",

        "🤝 *Compromiso:* Al aceptar las reglas de la tanda te comprometes a cumplir con los pagos en tiempo y forma y estás de acuerdo en que almacene tu nombre, contacto e historial de pagos en el bot para la administración de la tanda.",
    ];
};

export const generateYoutubePremiumRulesMessage = (tanda: Tanda) => {
    const formattedCost = pesosFormatter.format(tanda.costPerUser);
    const paymentDay = tanda.paymentDay.getDate() + 1;

    return [
        '📃 Reglamento de participación en la "Tanda" de *Youtube Premium* 🎥\n',

        `✅ *Pago Mensual:* Debes pagar ${formattedCost} pesos a más tardar el día ${paymentDay} de cada mes.`,

        "⏳ *Tiempo de tolerancia:* Tienes hasta 15 días después de la fecha límite para hacerlo.",

        "⚠️ *Justificación de Retraso:* Si tienes algún problema para pagar dentro de la tolerancia, avísame con anticipación (a mi numero personal) y explícame la situación para buscar una solución (_Nota: Puede aplicar una tarifa por retraso 😬_).",

        "🚨 *Expulsión por Impago:* Si no pagas dentro del plazo y no das ninguna explicación, serás expulsado automáticamente del grupo.",

        "🔄 *Salida del Grupo:* Si deseas salir del grupo, debes avisarme con un mes de anticipación y pagar tu último mes. Esto es para que pueda encontrar un reemplazo a tiempo 🙏🏼. (_Ejemplo: si quieres salir en septiembre, debes avisar en agosto y pagar ese mes_).",

        "🔒 *Privacidad de Datos:* Ten la confianza que tu información personal (nombre, contacto e historial de pagos) será utilizada únicamente para el funcionamiento del bot (es decir solo yo tengo esos datos) y no será compartida con NADIE.",

        "🤝 *Compromiso:* Al aceptar las reglas de la tanda te comprometes a cumplir con los pagos en tiempo y forma y estás de acuerdo en que almacene tu nombre, contacto e historial de pagos en el bot para la administración de la tanda.",
    ];
};
