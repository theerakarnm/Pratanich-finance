import { Client } from "pg";

async function createDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not defined");
    process.exit(1);
  }

  // Parse database name from URL
  const urlParts = new URL(dbUrl);
  const dbName = urlParts.pathname.slice(1); // Remove leading slash

  // Connect to 'postgres' database to create the new database
  urlParts.pathname = "/postgres";
  const postgresUrl = urlParts.toString();

  const client = new Client({
    connectionString: postgresUrl,
  });

  try {
    await client.connect();

    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (res.rowCount === 0) {
      console.log(`Creating database "${dbName}"...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error("Error creating database:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDb();
