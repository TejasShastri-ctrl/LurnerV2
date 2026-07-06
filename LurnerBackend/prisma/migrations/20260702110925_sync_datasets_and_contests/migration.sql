/*
  Warnings:

  - You are about to drop the column `creatorId` on the `Contest` table. All the data in the column will be lost.
  - The primary key for the `ContestQuestion` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `questionId` on the `ContestQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `initSql` on the `Question` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[friendCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `datasetId` to the `ContestQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `ContestQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `difficulty` to the `ContestQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expectedOutput` to the `ContestQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `ContestQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `datasetId` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Contest" DROP CONSTRAINT "Contest_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "ContestQuestion" DROP CONSTRAINT "ContestQuestion_contestId_fkey";

-- DropForeignKey
ALTER TABLE "ContestQuestion" DROP CONSTRAINT "ContestQuestion_questionId_fkey";

-- AlterTable
ALTER TABLE "Contest" DROP COLUMN "creatorId";

-- AlterTable
ALTER TABLE "ContestQuestion" DROP CONSTRAINT "ContestQuestion_pkey",
DROP COLUMN "questionId",
ADD COLUMN     "datasetId" INTEGER NOT NULL,
ADD COLUMN     "dbTableName" TEXT,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "difficulty" "Difficulty" NOT NULL,
ADD COLUMN     "expectedOutput" JSONB NOT NULL,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "solutionSql" TEXT,
ADD COLUMN     "title" TEXT NOT NULL,
ADD CONSTRAINT "ContestQuestion_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "initSql",
ADD COLUMN     "datasetId" INTEGER NOT NULL,
ADD COLUMN     "solutionSql" TEXT;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "diagnostic" JSONB;

-- CreateTable
CREATE TABLE "Dataset" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "initSql" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestSubmission" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "contestId" INTEGER NOT NULL,
    "contestQuestionId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "executionTimeMs" INTEGER,
    "errorMessage" TEXT,
    "output" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiReport" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "timeframeDays" INTEGER NOT NULL,
    "reportData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dataset_name_key" ON "Dataset"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_friendCode_key" ON "User"("friendCode");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestQuestion" ADD CONSTRAINT "ContestQuestion_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestQuestion" ADD CONSTRAINT "ContestQuestion_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSubmission" ADD CONSTRAINT "ContestSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSubmission" ADD CONSTRAINT "ContestSubmission_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSubmission" ADD CONSTRAINT "ContestSubmission_contestQuestionId_fkey" FOREIGN KEY ("contestQuestionId") REFERENCES "ContestQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReport" ADD CONSTRAINT "AiReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
