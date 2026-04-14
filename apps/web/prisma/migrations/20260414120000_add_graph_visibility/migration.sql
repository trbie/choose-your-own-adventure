-- Add story visibility flag (public vs private)

ALTER TABLE "Graph" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT TRUE;
