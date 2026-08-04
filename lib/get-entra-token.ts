import { DefaultAzureCredential } from "@azure/identity";
import { logger } from "@vestfoldfylke/loglady";

const credential = new DefaultAzureCredential({});

export async function getEntraToken(scope: string): Promise<string> {
  const result = await credential.getToken(scope);
  const expires = Math.floor((result.expiresOnTimestamp - Date.now()) / 1000);
  logger.info("getEntraToken - Got token from Microsoft for scope {Scope}, expires in {Expires} seconds.", scope, expires);

  return result.token;
}
