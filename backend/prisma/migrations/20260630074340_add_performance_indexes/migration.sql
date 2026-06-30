-- CreateIndex
CREATE INDEX "disability_infos_person_id_idx" ON "disability_infos"("person_id");

-- CreateIndex
CREATE INDEX "disability_infos_disability_type_id_idx" ON "disability_infos"("disability_type_id");

-- CreateIndex
CREATE INDEX "follow_ups_person_id_idx" ON "follow_ups"("person_id");

-- CreateIndex
CREATE INDEX "follow_ups_employment_status_idx" ON "follow_ups"("employment_status");

-- CreateIndex
CREATE INDEX "person_assessments_batch_id_idx" ON "person_assessments"("batch_id");

-- CreateIndex
CREATE INDEX "person_organizations_person_id_idx" ON "person_organizations"("person_id");

-- CreateIndex
CREATE INDEX "person_organizations_org_id_idx" ON "person_organizations"("org_id");

-- CreateIndex
CREATE INDEX "person_photos_person_id_idx" ON "person_photos"("person_id");

-- CreateIndex
CREATE INDEX "persons_batch_id_idx" ON "persons"("batch_id");

-- CreateIndex
CREATE INDEX "persons_province_idx" ON "persons"("province");

-- CreateIndex
CREATE INDEX "skills_person_id_idx" ON "skills"("person_id");

-- CreateIndex
CREATE INDEX "training_records_person_id_idx" ON "training_records"("person_id");

-- CreateIndex
CREATE INDEX "work_experiences_person_id_idx" ON "work_experiences"("person_id");
