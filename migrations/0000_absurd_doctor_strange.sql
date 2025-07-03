CREATE TABLE "analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"platform" text NOT NULL,
	"likes" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"impressions" integer DEFAULT 0,
	"engagement_rate" integer DEFAULT 0,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"platforms" json NOT NULL,
	"media_urls" json DEFAULT '[]'::json,
	"scheduled_for" timestamp NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"published_at" timestamp,
	"error_message" text,
	"social_post_ids" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "social_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"platform" text NOT NULL,
	"account_id" text NOT NULL,
	"access_token" text,
	"access_token_secret" text,
	"refresh_token" text,
	"cookies" text,
	"auth_method" text DEFAULT 'oauth',
	"expires_at" timestamp,
	"account_name" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
