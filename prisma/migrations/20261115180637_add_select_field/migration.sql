-- AlterEnum
ALTER TYPE "FieldType" ADD VALUE 'SELECT';

-- AlterTable
ALTER TABLE "EventFormField" ADD COLUMN     "options" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "RecruitmentFormField" ADD COLUMN     "options" TEXT[] DEFAULT ARRAY[]::TEXT[];
