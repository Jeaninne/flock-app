-- CreateTable
CREATE TABLE "password_setup_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_setup_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_setup_tokens_token_hash_key" ON "password_setup_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_setup_tokens_user_id_idx" ON "password_setup_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "password_setup_tokens" ADD CONSTRAINT "password_setup_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
