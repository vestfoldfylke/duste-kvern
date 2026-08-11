import { type ChildProcess, type ExecException, exec } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { logger } from "@vestfoldfylke/loglady";
import { MAX_BUFFER, PS1_SCRIPTS_PATH } from "../config.js";

const replace = (str: string): string => {
  return str.replace(/["&;|]/g, "");
};

const sanitizeError = (filePath: string, error: string): string => {
  if (error.includes(`${filePath} : `)) {
    error = error.replace(`${filePath} : `, "");
    return error.substring(0, error.indexOf("At line:")).trim();
  }

  const errorLines: string[] = error.split("\n");
  if (errorLines.length > 1 && errorLines[1].includes(`${filePath}:`)) {
    return errorLines[0];
  }

  return error;
};

const parseArgs = (args: Record<string, unknown>): string => {
  let argumentsValue: string = "";

  for (const key of Object.keys(args)) {
    argumentsValue += replace(`-${key} ${typeof args[key] === "string" ? `'${args[key]}'` : args[key]} `);
  }

  return argumentsValue;
};

const getError = (filePath: string, error: string, name: string): Error => ({ name, message: sanitizeError(filePath, error), stack: error });

const invoke = <T>(scriptName: string, args?: Record<string, unknown>): Promise<T | Error> => {
  const scriptPath: string = `${PS1_SCRIPTS_PATH}/${scriptName}`;

  if (!existsSync(scriptPath)) {
    throw new Error(`'${scriptPath}' does not exist`);
  }

  if (!scriptPath.toLowerCase().endsWith(".ps1")) {
    throw new Error(`'${scriptPath}' is not a PowerShell script`);
  }

  if (args && typeof args !== "object") {
    throw new Error("'args' must be object");
  }

  return new Promise((resolve, reject) => {
    const cmdPwsh: string = `powershell.exe -NoLogo -ExecutionPolicy ByPass -Command "${scriptPath}"${args ? ` ${parseArgs(args)}` : ""}`;
    const cmd: string = `cmd.exe /c chcp 65001>nul && ${cmdPwsh}`;
    logger.info("invoke-ps-script - executing command: {Command}", cmdPwsh);

    const proc: ChildProcess = exec(cmd, { cwd: dirname(scriptPath), maxBuffer: Number.parseInt(String(MAX_BUFFER), 10) }, (error: ExecException | null, stdout: string, stderr: string) => {
      if (stderr !== "") {
        const { message, stack } = getError(scriptPath, stderr, "stderr");
        logger.error("invoke-ps-script - exec stderr on PID: {Pid}, Message: {Message}, Stack: {@Stack}", proc.pid, message, stack);
        return reject({ message, stack });
      }

      if (error !== null) {
        const { message, stack } = getError(scriptPath, stderr, "error");
        logger.error("invoke-ps-script - exec stderr on PID: {Pid}, Message: {Message}, Stack: {@Stack}. Error: {@Error}", proc.pid, message, stack, error);
        return reject({ message, stack });
      }

      logger.info("invoke-ps-script - exec finished on PID: {Pid}", proc.pid);

      try {
        const result: T = JSON.parse(stdout) as T;
        return resolve(result);
      } catch (err) {
        logger.errorException(err, "Failed to parse stdout to JSON in ScriptName {ScriptName}", scriptName);
        return reject(err);
      }
    });
  });
};

export default invoke;
