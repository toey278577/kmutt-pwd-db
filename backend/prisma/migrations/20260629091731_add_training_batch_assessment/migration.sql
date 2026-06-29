-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "training_batches" (
    "id" SERIAL NOT NULL,
    "batch_number" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "course_name" VARCHAR(255) NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_assessments" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "pre_test_score" DOUBLE PRECISION,
    "post_test_score" DOUBLE PRECISION,
    "soft_skill_comm" DOUBLE PRECISION,
    "soft_skill_time" DOUBLE PRECISION,
    "soft_skill_motiv" DOUBLE PRECISION,
    "soft_skill_duty" DOUBLE PRECISION,

    CONSTRAINT "person_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "person_assessments_person_id_batch_id_key" ON "person_assessments"("person_id", "batch_id");

-- AddForeignKey
ALTER TABLE "person_assessments" ADD CONSTRAINT "person_assessments_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_assessments" ADD CONSTRAINT "person_assessments_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "training_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
