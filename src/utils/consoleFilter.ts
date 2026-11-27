import dotenv from "dotenv";

dotenv.config();

/**
 * libsignal prints every session closure directly with console.info, bypassing
 * BuilderBot and the application's Pino logger. Suppress only that noisy,
 * expected message while keeping all other dependency output intact.
 *
 * Set SUPPRESS_LIBSIGNAL_SESSION_LOGS=false to restore the original output.
 */
const shouldSuppressSessionLogs =
    process.env.SUPPRESS_LIBSIGNAL_SESSION_LOGS !== "false";

if (shouldSuppressSessionLogs) {
    const originalConsoleInfo = console.info.bind(console);

    console.info = (...args: unknown[]): void => {
        if (args[0] === "Closing session:") {
            return;
        }

        originalConsoleInfo(...args);
    };
}
