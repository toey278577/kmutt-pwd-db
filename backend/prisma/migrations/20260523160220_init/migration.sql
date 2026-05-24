-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'OTHER');

-- CreateEnum
CREATE TYPE "LifeStatus" AS ENUM ('ALIVE', 'DECEASED');

-- CreateEnum
CREATE TYPE "TrainingType" AS ENUM ('TRAIN', 'LEARN', 'EARN');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('INTERNSHIP', 'EMPLOYMENT', 'FREELANCE');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('EMPLOYED', 'UNEMPLOYED', 'STUDYING');

-- CreateEnum
CREATE TYPE "SkillMatch" AS ENUM ('MATCH', 'NOT_MATCH');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('INTERNSHIP', 'EMPLOYMENT', 'OTHER');

-- CreateTable
CREATE TABLE "persons" (
    "id" SERIAL NOT NULL,
    "thai_id" VARCHAR(13),
    "full_name" VARCHAR(255) NOT NULL,
    "gender" "Gender" NOT NULL,
    "birth_date" DATE,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "address" TEXT,
    "province" VARCHAR(100),
    "nationality" VARCHAR(100),
    "religion" VARCHAR(100),
    "marital_status" "MaritalStatus",
    "education_level" VARCHAR(100),
    "life_status" "LifeStatus" NOT NULL DEFAULT 'ALIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_photos" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "photo_type" VARCHAR(50),
    "photo_date" DATE,
    "description" TEXT,
    "file_path" VARCHAR(500),

    CONSTRAINT "person_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disability_types" (
    "id" SERIAL NOT NULL,
    "type_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "disability_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disability_infos" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "disability_type_id" INTEGER NOT NULL,
    "disability_level" VARCHAR(100),
    "assistive_device" TEXT,
    "work_limitation" TEXT,
    "accommodation_need" TEXT,

    CONSTRAINT "disability_infos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_records" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "course_name" VARCHAR(255) NOT NULL,
    "organizer" VARCHAR(255),
    "start_date" DATE,
    "end_date" DATE,
    "training_type" "TrainingType",
    "skills_gained" TEXT,
    "evaluation_result" VARCHAR(100),

    CONSTRAINT "training_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_experiences" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "organization_name" VARCHAR(255) NOT NULL,
    "job_type" VARCHAR(100),
    "start_date" DATE,
    "end_date" DATE,
    "work_mode" "WorkMode",
    "income" DECIMAL(10,2),
    "outcome" TEXT,

    CONSTRAINT "work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "skill_name" VARCHAR(100) NOT NULL,
    "skill_level" "SkillLevel" NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "follow_up_date" DATE NOT NULL,
    "employment_status" "EmploymentStatus" NOT NULL,
    "job_type" VARCHAR(100),
    "income" DECIMAL(10,2),
    "skill_match" "SkillMatch",
    "satisfaction" VARCHAR(255),
    "issues" TEXT,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" SERIAL NOT NULL,
    "org_name" VARCHAR(255) NOT NULL,
    "business_type" VARCHAR(100),
    "address" TEXT,
    "contact_name" VARCHAR(255),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "note" TEXT,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_organizations" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "org_id" INTEGER NOT NULL,
    "role_type" "RoleType" NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "amount" DECIMAL(10,2),
    "support_detail" TEXT,
    "note" TEXT,

    CONSTRAINT "person_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "persons_thai_id_key" ON "persons"("thai_id");

-- AddForeignKey
ALTER TABLE "person_photos" ADD CONSTRAINT "person_photos_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disability_infos" ADD CONSTRAINT "disability_infos_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disability_infos" ADD CONSTRAINT "disability_infos_disability_type_id_fkey" FOREIGN KEY ("disability_type_id") REFERENCES "disability_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_organizations" ADD CONSTRAINT "person_organizations_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_organizations" ADD CONSTRAINT "person_organizations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
