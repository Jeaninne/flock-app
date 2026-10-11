-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'DISPATCHER', 'COURIER');

-- CreateEnum
CREATE TYPE "vehicle_type" AS ENUM ('BICYCLE', 'SCOOTER', 'CAR', 'VAN');

-- CreateEnum
CREATE TYPE "courier_status" AS ENUM ('AVAILABLE', 'ACCIDENT');

-- CreateEnum
CREATE TYPE "order_type" AS ENUM ('ASAP', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('NEW', 'ASSIGNED', 'PICKED_UP', 'ON_HOLD', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "route_status" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "stop_type" AS ENUM ('PICKUP', 'DROPOFF');

-- CreateEnum
CREATE TYPE "stop_status" AS ENUM ('PENDING', 'ARRIVED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Kyiv',
    "shift_length_min" INTEGER NOT NULL DEFAULT 480,
    "pickup_handling_min" INTEGER NOT NULL DEFAULT 5,
    "dropoff_handling_min" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "role" "user_role" NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT,
    "dispatcher_id" UUID,
    "courier_status" "courier_status",
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "type" "vehicle_type" NOT NULL,
    "vin" VARCHAR(17),
    "legal_number" VARCHAR(10),
    "color" VARCHAR(30) NOT NULL,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "weight" INTEGER NOT NULL,
    "length" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "pickup_name" VARCHAR(100) NOT NULL,
    "pickup_phone" VARCHAR(20) NOT NULL,
    "pickup_window_start" TIMESTAMPTZ,
    "pickup_window_end" TIMESTAMPTZ,
    "pickup_address" VARCHAR(500) NOT NULL,
    "pickup_comment" VARCHAR(500),
    "pickup_lat" DOUBLE PRECISION NOT NULL,
    "pickup_lng" DOUBLE PRECISION NOT NULL,
    "dropoff_name" VARCHAR(100) NOT NULL,
    "dropoff_phone" VARCHAR(20) NOT NULL,
    "dropoff_window_start" TIMESTAMPTZ,
    "dropoff_window_end" TIMESTAMPTZ,
    "dropoff_address" VARCHAR(500) NOT NULL,
    "dropoff_comment" VARCHAR(500),
    "dropoff_lat" DOUBLE PRECISION NOT NULL,
    "dropoff_lng" DOUBLE PRECISION NOT NULL,
    "tracking_token" TEXT NOT NULL,
    "type" "order_type" NOT NULL DEFAULT 'ASAP',
    "status" "order_status" NOT NULL DEFAULT 'NEW',
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "courier_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "shift_date" DATE NOT NULL,
    "status" "route_status" NOT NULL DEFAULT 'PLANNED',
    "distance" INTEGER,
    "duration" INTEGER,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stops" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "type" "stop_type" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "stop_status" NOT NULL DEFAULT 'PENDING',
    "arrived_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "fail_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "stops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_company_id_role_idx" ON "users"("company_id", "role");

-- CreateIndex
CREATE INDEX "users_dispatcher_id_idx" ON "users"("dispatcher_id");

-- CreateIndex
CREATE INDEX "vehicles_company_id_type_idx" ON "vehicles"("company_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_company_id_vin_key" ON "vehicles"("company_id", "vin");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_company_id_legal_number_key" ON "vehicles"("company_id", "legal_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_tracking_token_key" ON "orders"("tracking_token");

-- CreateIndex
CREATE INDEX "orders_company_id_status_idx" ON "orders"("company_id", "status");

-- CreateIndex
CREATE INDEX "routes_company_id_shift_date_idx" ON "routes"("company_id", "shift_date");

-- CreateIndex
CREATE INDEX "routes_courier_id_shift_date_idx" ON "routes"("courier_id", "shift_date");

-- CreateIndex
CREATE INDEX "routes_vehicle_id_idx" ON "routes"("vehicle_id");

-- CreateIndex
CREATE INDEX "stops_order_id_idx" ON "stops"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "stops_route_id_order_id_type_key" ON "stops"("route_id", "order_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "stops_route_id_sequence_key" ON "stops"("route_id", "sequence");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_dispatcher_id_fkey" FOREIGN KEY ("dispatcher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stops" ADD CONSTRAINT "stops_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stops" ADD CONSTRAINT "stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stops" ADD CONSTRAINT "stops_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------
-- CHECK constraints (not expressible in schema.prisma, added by hand)
-- ---------------------------------------------------------------

-- Companies: positive durations
ALTER TABLE "companies"
    ADD CONSTRAINT "companies_durations_valid" CHECK (
        "shift_length_min" > 0 AND "pickup_handling_min" >= 0 AND "dropoff_handling_min" >= 0
        );

-- Users: emails are stored lower-case
ALTER TABLE "users"
    ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email"));

-- Users: only couriers have a courier status and can have an assigned dispatcher; every courier has a status
ALTER TABLE "users"
    ADD CONSTRAINT "users_courier_fields" CHECK (
        ("role" = 'COURIER' AND "courier_status" IS NOT NULL)
            OR ("role" <> 'COURIER' AND "courier_status" IS NULL AND "dispatcher_id" IS NULL)
        );

-- Vehicles: cars and vans have a VIN and a plate number, bicycles have neither, scooters may have them
ALTER TABLE "vehicles"
    ADD CONSTRAINT "vehicles_identifiers_match_type" CHECK (
        ("type" IN ('CAR', 'VAN') AND "vin" IS NOT NULL AND "legal_number" IS NOT NULL)
            OR ("type" = 'BICYCLE' AND "vin" IS NULL AND "legal_number" IS NULL)
            OR "type" = 'SCOOTER'
        );

-- Orders: ASAP has no time windows, SCHEDULED has all four; package weight and size within the largest vehicle (van); valid coordinates
ALTER TABLE "orders"
    ADD CONSTRAINT "orders_windows_match_type" CHECK (
        ("type" = 'ASAP'
            AND "pickup_window_start" IS NULL AND "pickup_window_end" IS NULL
            AND "dropoff_window_start" IS NULL AND "dropoff_window_end" IS NULL)
            OR ("type" = 'SCHEDULED'
            AND "pickup_window_start" IS NOT NULL AND "pickup_window_end" IS NOT NULL
            AND "dropoff_window_start" IS NOT NULL AND "dropoff_window_end" IS NOT NULL)
        ),
  ADD CONSTRAINT "orders_pickup_window_valid" CHECK ("pickup_window_start" < "pickup_window_end"),
  ADD CONSTRAINT "orders_dropoff_window_valid" CHECK ("dropoff_window_start" < "dropoff_window_end"),
  ADD CONSTRAINT "orders_dropoff_after_pickup" CHECK ("dropoff_window_start" >= "pickup_window_start"),
  ADD CONSTRAINT "orders_package_in_range" CHECK (
    "weight" BETWEEN 1 AND 1000000
    AND "length" BETWEEN 1 AND 300 AND "width" BETWEEN 1 AND 300 AND "height" BETWEEN 1 AND 300
  ),
  ADD CONSTRAINT "orders_coordinates_valid" CHECK (
    "pickup_lat" BETWEEN -90 AND 90 AND "pickup_lng" BETWEEN -180 AND 180
    AND "dropoff_lat" BETWEEN -90 AND 90 AND "dropoff_lng" BETWEEN -180 AND 180
  );

-- Routes: non-negative distance and duration
ALTER TABLE "routes"
    ADD CONSTRAINT "routes_metrics_valid" CHECK (
        ("distance" IS NULL OR "distance" >= 0) AND ("duration" IS NULL OR "duration" >= 0)
        );

-- Stops: positions start at 1; valid coordinates; failed stop has a reason
ALTER TABLE "stops"
    ADD CONSTRAINT "stops_sequence_positive" CHECK ("sequence" >= 1),
  ADD CONSTRAINT "stops_coordinates_valid" CHECK (
    "lat" BETWEEN -90 AND 90 AND "lng" BETWEEN -180 AND 180
  ),
  ADD CONSTRAINT "stops_failed_has_reason" CHECK ("status" <> 'FAILED' OR "fail_reason" IS NOT NULL);

-- Text fields: required text is not blank; optional text is NULL rather than blank
ALTER TABLE "companies"
    ADD CONSTRAINT "companies_text_not_blank" CHECK (btrim("name") <> '' AND btrim("timezone") <> '');

ALTER TABLE "users"
    ADD CONSTRAINT "users_text_not_blank" CHECK (btrim("name") <> '' AND btrim("email") <> '');

ALTER TABLE "vehicles"
    ADD CONSTRAINT "vehicles_text_not_blank" CHECK (
        btrim("color") <> ''
            AND ("vin" IS NULL OR btrim("vin") <> '')
            AND ("legal_number" IS NULL OR btrim("legal_number") <> '')
        );

ALTER TABLE "orders"
    ADD CONSTRAINT "orders_text_not_blank" CHECK (
        btrim("pickup_name") <> '' AND btrim("pickup_phone") <> '' AND btrim("pickup_address") <> ''
            AND btrim("dropoff_name") <> '' AND btrim("dropoff_phone") <> '' AND btrim("dropoff_address") <> ''
            AND ("pickup_comment" IS NULL OR btrim("pickup_comment") <> '')
            AND ("dropoff_comment" IS NULL OR btrim("dropoff_comment") <> '')
        );

ALTER TABLE "stops"
    ADD CONSTRAINT "stops_text_not_blank" CHECK ("fail_reason" IS NULL OR btrim("fail_reason") <> '');
