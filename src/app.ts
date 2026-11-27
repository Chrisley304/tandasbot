import "./utils/consoleFilter";
import { createBot } from "@builderbot/bot";
import { schedule } from "node-cron";
import dotenv from "dotenv";

import { initProvider } from "./config/provider";
import { database } from "./config/database";
import { flow } from "./flows";
import { handleDailyTandasReminders } from "./utils/tandas";
import logger from "./utils/logger";

dotenv.config();

const PORT = process.env.PORT ?? 3008;

const main = async () => {
    logger.info({ event: "bot.starting" }, "Starting Tandasbot");

    const provider = await initProvider();

    const { httpServer } = await createBot({
        flow,
        provider,
        database,
    });

    httpServer(+PORT);
    logger.info(
        { event: "bot.ready", port: Number(PORT) },
        "Tandasbot is ready to receive messages",
    );

    /**
     * Daily schedule at 10am that verifies the status of the tandas
     */
    schedule("0 10 * * *", async () => {
        logger.info(
            { event: "reminders.cron.started" },
            "Starting daily tanda reminders",
        );

        try {
            await handleDailyTandasReminders();
            logger.info(
                { event: "reminders.cron.completed" },
                "Daily tanda reminders completed",
            );
        } catch (error) {
            logger.error(
                { err: error, event: "reminders.cron.failed" },
                "Daily tanda reminders failed",
            );
        }
    });
};

main().catch((error) => {
    logger.fatal(
        { err: error, event: "bot.startup.failed" },
        "Tandasbot could not start",
    );
    process.exitCode = 1;
});
