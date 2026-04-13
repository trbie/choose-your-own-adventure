import { Prisma } from "@prisma/client";

const DATABASE_SETUP_ERROR_CODES = new Set(["P1001", "P2021"]);

export function isDatabaseSetupError(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && DATABASE_SETUP_ERROR_CODES.has(err.code)
  );
}

export function getDatabaseSetupErrorMessage(): string {
  return "Database schema is not ready yet. Run the Prisma migrations against Supabase to create the tables.";
}
