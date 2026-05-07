-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('PREVIEW', 'ATTEMPT');

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "executionTimeMs" INTEGER,
ADD COLUMN     "type" "SubmissionType" NOT NULL DEFAULT 'ATTEMPT',
ALTER COLUMN "output" DROP NOT NULL;

-- CreateTable
CREATE TABLE "UserQuestionProgress" (
    "userId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "bestCode" TEXT,
    "lastAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserQuestionProgress_pkey" PRIMARY KEY ("userId","questionId")
);

-- AddForeignKey
ALTER TABLE "UserQuestionProgress" ADD CONSTRAINT "UserQuestionProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestionProgress" ADD CONSTRAINT "UserQuestionProgress_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
