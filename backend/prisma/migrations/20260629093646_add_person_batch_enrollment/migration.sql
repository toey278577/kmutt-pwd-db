-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "batch_id" INTEGER;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "training_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
