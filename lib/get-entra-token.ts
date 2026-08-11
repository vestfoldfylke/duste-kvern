import { type AccessToken, DefaultAzureCredential } from "@azure/identity";
import { logger } from "@vestfoldfylke/loglady";

const credential: DefaultAzureCredential = new DefaultAzureCredential({});

export async function getEntraToken(scope: string): Promise<string> {
  const result: AccessToken = await credential.getToken(scope);
  const expires: number = Math.floor((result.expiresOnTimestamp - Date.now()) / 1000);
  logger.info("getEntraToken - Got token from Microsoft for scope {Scope}, expires in {Expires} seconds.", scope, expires);

  return result.token;
}
