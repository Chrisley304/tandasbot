import { createBot } from "@builderbot/bot";
import { schedule } from "node-cron";
import dotenv from "dotenv";

import { provider } from "./config/provider";
import { database } from "./config/database";
import { flow } from "./flows";
import { handleDailyTandasReminders } from "./utils/tandas";
import logger from "./utils/logger";

dotenv.config();

const PORT = process.env.PORT ?? 3008;

const main = async () => {
    logger.info("Starting bot");

    const { httpServer } = await createBot({
        flow,
        provider,
        database,
    });

    httpServer(+PORT);

    /**
     * Daily schedule at 10am that verifies the status of the tandas
     */
    schedule("0 10 * * *", async () => {
        logger.info("Running daily schedule of tandas reminders");

        await handleDailyTandasReminders();
    });
};

main();
