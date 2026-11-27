import pino from "pino";
import pretty from "pino-pretty";
import dotenv from "dotenv";

dotenv.config();

const stream = pretty({
    colorize: process.env.LOG_COLOR !== "false",
    translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
    ignore: "pid,hostname,service",
    singleLine: true,
});

const logger = pino(
    {
        level: process.env.LOG_LEVEL ?? "info",
        base: { service: "Tandasbot" },
        serializers: {
            err: pino.stdSerializers.err,
        },
        redact: {
            paths: [
                "phone",
                "userPhone",
                "apiKey",
                "token",
                "voucherPath",
                "authorization",
            ],
            censor: "[REDACTED]",
        },
    },
    stream,
);

export default logger;
