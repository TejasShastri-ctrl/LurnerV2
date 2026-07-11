-- AlterTable
ALTER TABLE "ContestParticipant" ADD COLUMN     "infractions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isDisqualified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ContestQuestion" ADD COLUMN     "tablePreviews" JSONB;
