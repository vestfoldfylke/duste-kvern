const { DefaultAzureCredential } = require("@azure/identity");
const { logger } = require("@vestfoldfylke/loglady");

const credential = new DefaultAzureCredential({});

const getEntraToken = async (scope) => {
  if (!process.env.AZURE_CLIENT_ID || !process.env.AZURE_CLIENT_SECRET || !process.env.AZURE_TENANT_ID) {
    throw new Error("AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET must be set in environment variables");
  }

  const accessToken = await credential.getToken(scope);
  const expires = Math.floor((accessToken.expiresOnTimestamp - Date.now()) / 1000);
  logger.info("getEntraToken - Got token from Microsoft for scope {Scope}, expires in {Expires} seconds.", scope, expires);

  return accessToken.token;
};

module.exports = { getEntraToken };
