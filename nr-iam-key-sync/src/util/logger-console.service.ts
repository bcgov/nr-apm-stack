import { LoggerService } from './logger.service';

export class LoggerConsoleService extends LoggerService {
    info(message: string): void {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
    }

    error(message: string): void {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    }

    warn(message: string): void {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
    }

    debug(message: string): void {
        console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`);
    }
}
