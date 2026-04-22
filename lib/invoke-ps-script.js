const { MAX_BUFFER, PS1_SCRIPTS_PATH } = require("../config");
const { exec } = require("node:child_process");
const { dirname } = require("node:path");
const { existsSync } = require("node:fs");
const { logger } = require("@vestfoldfylke/loglady");

const replace = (str) => {
  return str.replace(/["&;|]/g, "");
};

const sanitizeError = (filePath, error) => {
  if (error.includes(`${filePath} : `)) {
    error = error.replace(`${filePath} : `, "");
    return error.substring(0, error.indexOf("At line:")).trim();
  }
  const errorLines = error.split("\n");
  if (errorLines.length > 1 && errorLines[1].includes(`${filePath}:`)) return errorLines[0];

  return error;
};

const parseArgs = (args) => {
  let argumemts = "";
  for (const key of Object.keys(args)) {
    argumemts += replace(`-${key} ${typeof args[key] === "string" ? `'${args[key]}'` : args[key]} `);
  }
  return argumemts;
};

const getError = (filePath, error) => ({ message: sanitizeError(filePath, error), stack: error });

const invoke = (scriptName, args) => {
  // Setup full path to script
  const scriptPath = `${PS1_SCRIPTS_PATH}/${scriptName}`;

  // Validate scriptPath
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
    // set encoding directly in the console: "cmd.exe /c chcp 65001>nul &&"
    const cmdPwsh = `powershell.exe -NoLogo -ExecutionPolicy ByPass -Command "${scriptPath}"${args ? ` ${parseArgs(args)}` : ""}`;
    const cmd = `cmd.exe /c chcp 65001>nul && ${cmdPwsh}`;
    logger.info("invoke-ps-script - executing command: {Command}", cmdPwsh);

    const proc = exec(cmd, { cwd: dirname(scriptPath), maxBuffer: Number.parseInt(MAX_BUFFER, 10) }, (error, stdout, stderr) => {
      if (stderr !== "") {
        const { message, stack } = getError(scriptPath, stderr);
        logger.error("invoke-ps-script - exec stderr on PID: {Pid}, Message: {Message}", proc.pid, message);
        // eslint-disable-next-line
        return reject({ message, stack });
      }
      if (error !== null) {
        const { message, stack } = getError(scriptPath, stderr);
        logger.error("invoke-ps-script - exec stderr on PID: {Pid}, Message: {Message}", proc.pid, message);
        // eslint-disable-next-line
        return reject({ message, stack });
      }

      logger.info("invoke-ps-script - exec finished on PID: {Pid}", proc.pid);
      try {
        const result = JSON.parse(stdout);
        return resolve(result);
      } catch (_error) {
        return resolve({ stdout });
      }
    });
  });
};

module.exports = invoke;
