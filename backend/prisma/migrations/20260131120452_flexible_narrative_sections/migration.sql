/*
  Warnings:

  - You are about to drop the column `action` on the `career_stories` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `career_stories` table. All the data in the column will be lost.
  - You are about to drop the column `situation` on the `career_stories` table. All the data in the column will be lost.
  - You are about to drop the column `task` on the `career_stories` table. All the data in the column will be lost.
  - Added the required column `sections` to the `career_stories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `career_stories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "career_stories" DROP COLUMN "action",
DROP COLUMN "result",
DROP COLUMN "situation",
DROP COLUMN "task",
ADD COLUMN     "sections" JSONB NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "intent" DROP NOT NULL;
