-- CreateTable
CREATE TABLE "senders" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "senders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_jobs" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "dedupe_key" TEXT NOT NULL,
    "bull_job_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "send_logs" (
    "id" TEXT NOT NULL,
    "email_job_id" TEXT NOT NULL,
    "message_id" TEXT,
    "ethereal_url" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,

    CONSTRAINT "send_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "senders_email_key" ON "senders"("email");

-- CreateIndex
CREATE UNIQUE INDEX "email_jobs_dedupe_key_key" ON "email_jobs"("dedupe_key");

-- CreateIndex
CREATE INDEX "email_jobs_status_idx" ON "email_jobs"("status");

-- CreateIndex
CREATE INDEX "email_jobs_sender_id_idx" ON "email_jobs"("sender_id");

-- CreateIndex
CREATE UNIQUE INDEX "send_logs_email_job_id_key" ON "send_logs"("email_job_id");

-- AddForeignKey
ALTER TABLE "email_jobs" ADD CONSTRAINT "email_jobs_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "senders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "send_logs" ADD CONSTRAINT "send_logs_email_job_id_fkey" FOREIGN KEY ("email_job_id") REFERENCES "email_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
