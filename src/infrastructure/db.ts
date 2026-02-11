import pg from 'pg';

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_otxA1Ubgi9Fe@ep-proud-block-aiau0o0s-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

export const pool = new pg.Pool({
  connectionString,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
