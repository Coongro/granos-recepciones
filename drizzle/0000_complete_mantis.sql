CREATE TABLE "module_granos_recepciones_receipts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"receipt_number" text NOT NULL,
	"ctg_number" text,
	"producer_id" text NOT NULL,
	"driver_id" text,
	"reception_date" timestamp NOT NULL,
	"grain_type" text NOT NULL,
	"harvest" text,
	"price_per_ton" numeric,
	"status" text NOT NULL,
	"gross_kg" numeric NOT NULL,
	"tara_kg" numeric NOT NULL,
	"net_without_cleaning_kg" numeric,
	"precleaning_kg" numeric,
	"net_kg" numeric,
	"shrinkage_kg" numeric,
	"final_net_kg" numeric,
	"dirt_percent" numeric,
	"stick_percent" numeric,
	"box_percent" numeric,
	"apt_percent" numeric,
	"loose_percent" numeric,
	"humidity_percent" numeric,
	"box_grain_percent" numeric,
	"zaranda_size" numeric,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_granos_recepciones_drivers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"document_number" text,
	"phone" text,
	"type" text NOT NULL,
	"company_name" text,
	"truck_plate" text,
	"trailer_plate" text,
	"is_active" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_granos_recepciones_deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"producer_id" text,
	"driver_id" text,
	"estimated_kg" numeric,
	"notes" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
