CREATE TABLE "task_template" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cadence" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
