import mysql from 'mysql2/promise';
import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector';
import * as dotenv from 'dotenv';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
dotenv.config();

const db = async () => {
  // Handle service account credentials
  let authOptions = {};
  
  // Check if we're running on Render (with JSON string credentials)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    const tempKeyPath = join(process.cwd(), 'temp-service-account.json');
    writeFileSync(tempKeyPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempKeyPath;
  } else if (existsSync('./service-account-key.json')) {
    // Use local file if available (Docker environment)
    process.env.GOOGLE_APPLICATION_CREDENTIALS = './service-account-key.json';
  }

  const connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME!,
    ipType: IpAddressTypes.PUBLIC
  });
  
  return mysql.createPool({
    ...clientOpts,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectTimeout: 30000,
  });
};

export default db;