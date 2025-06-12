/** @type { import("drizzle-kit").Config } */
export default {
    schema: "./utils/schema.js",
    dialect: 'postgresql',
    dbCredentials: {
      url: 'postgresql://neondb_owner:npg_1naQFLCsc6Pq@ep-muddy-moon-a4hcq0pf-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
    }
  };