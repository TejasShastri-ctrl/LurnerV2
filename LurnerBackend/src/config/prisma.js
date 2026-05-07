import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

/**
 * Prisma Singleton configuration for PostgreSQL.
 * Using the @prisma/adapter-pg for maximum efficiency and modern Prisma 7 support.
 */
const connectionString = process.env.DATABASE_URL;
if(connectionString.includes("localhost")) {
    console.log("attempting prisma connection to localhost")
} else console.log("attempting prisma connection to hosted DB");


const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;