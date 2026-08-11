# dust-scripts / DB

## Update

Gets all relevant users from graph / m365 and måks them up to mongodb

# dust-scripts / node

Node scripts used by DUST

## Setup

`npm run build` from the root foler (duste-kvern) MUST have been run before these scripts have been compiled from TypeScript into JavaScript! 

### .env

These scripts rely on `.env` environment file in the root folder (duste-kvern)

All scripts must be started with the `--env-file` argument like this: `node --env-file=../../.env ../../dist/scripts/db-update/<script-name>.js`

## Scripts

### db-update

**Must be called with one of the required types**:
- *users*
- *sds*

Remove all users from db and update db with users from `./db-update/data/users.json`
```bash
node --env-file=../../.env ../../dist/scripts/db-update/index.js users
```
