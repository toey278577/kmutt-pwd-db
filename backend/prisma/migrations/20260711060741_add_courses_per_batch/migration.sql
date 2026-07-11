-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "course_id" INTEGER;

-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courses_batch_id_idx" ON "courses"("batch_id");

-- CreateIndex
CREATE INDEX "persons_course_id_idx" ON "persons"("course_id");

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "training_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
