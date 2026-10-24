-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION postgres;

-- DROP TYPE public."Difficulty";

CREATE TYPE public."Difficulty" AS ENUM (
	'EASY',
	'MEDIUM',
	'HARD');

-- DROP SEQUENCE public."ActivityLog_id_seq";

CREATE SEQUENCE public."ActivityLog_id_seq"
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public."AiReport_id_seq";

CREATE SEQUENCE public."AiReport_id_seq"
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public."ContestQuestion_id_seq";

CREATE SEQUENCE public."ContestQuestion_id_seq"
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public."ContestSubmission_id_seq";

CREATE SEQUENCE public."ContestSubmission_id_seq"
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public."Contest_id_seq";

CREATE SEQUENCE public."Contest_id_seq"
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public."Dataset_id_seq";

CREATE SEQUENCE public."Dataset_id_seq"
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public."FriendInvite_id_seq";

CREATE SEQUENCE public."FriendInvite_id_seq"
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public."Question_id_seq";

CREATE SEQUENCE public."Question_id_seq"
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public."Submission_id_seq";

CREATE SEQUENCE public."Submission_id_seq"
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public."Tag_id_seq";

CREATE SEQUENCE public."Tag_id_seq"
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public."User_id_seq";

CREATE SEQUENCE public."User_id_seq"
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;-- public."Contest" definition

-- Drop table

-- DROP TABLE public."Contest";

CREATE TABLE public."Contest" (
	id serial4 NOT NULL,
	title text NOT NULL,
	description text NULL,
	"startTime" timestamp(3) NOT NULL,
	"endTime" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "Contest_pkey" PRIMARY KEY (id)
);


-- public."Dataset" definition

-- Drop table

-- DROP TABLE public."Dataset";

CREATE TABLE public."Dataset" (
	id serial4 NOT NULL,
	"name" text NOT NULL,
	description text NULL,
	"initSql" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "Dataset_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX "Dataset_name_key" ON public."Dataset" USING btree (name);


-- public."Tag" definition

-- Drop table

-- DROP TABLE public."Tag";

CREATE TABLE public."Tag" (
	id serial4 NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "Tag_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX "Tag_name_key" ON public."Tag" USING btree (name);


-- public."User" definition

-- Drop table

-- DROP TABLE public."User";

CREATE TABLE public."User" (
	id serial4 NOT NULL,
	"name" text NOT NULL,
	email text NOT NULL,
	"password" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"friendCode" text NOT NULL,
	CONSTRAINT "User_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);
CREATE UNIQUE INDEX "User_friendCode_key" ON public."User" USING btree ("friendCode");


-- public._prisma_migrations definition

-- Drop table

-- DROP TABLE public._prisma_migrations;

CREATE TABLE public._prisma_migrations (
	id varchar(36) NOT NULL,
	checksum varchar(64) NOT NULL,
	finished_at timestamptz NULL,
	migration_name varchar(255) NOT NULL,
	logs text NULL,
	rolled_back_at timestamptz NULL,
	started_at timestamptz DEFAULT now() NOT NULL,
	applied_steps_count int4 DEFAULT 0 NOT NULL,
	CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id)
);


-- public."AiReport" definition

-- Drop table

-- DROP TABLE public."AiReport";

CREATE TABLE public."AiReport" (
	id serial4 NOT NULL,
	"userId" int4 NOT NULL,
	"timeframeDays" int4 NOT NULL,
	"reportData" jsonb NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "AiReport_pkey" PRIMARY KEY (id),
	CONSTRAINT "AiReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);


-- public."ContestParticipant" definition

-- Drop table

-- DROP TABLE public."ContestParticipant";

CREATE TABLE public."ContestParticipant" (
	"userId" int4 NOT NULL,
	"contestId" int4 NOT NULL,
	score int4 DEFAULT 0 NOT NULL,
	"finishedAt" timestamp(3) NULL,
	infractions int4 DEFAULT 0 NOT NULL,
	"isDisqualified" bool DEFAULT false NOT NULL,
	CONSTRAINT "ContestParticipant_pkey" PRIMARY KEY ("userId", "contestId"),
	CONSTRAINT "ContestParticipant_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES public."Contest"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT "ContestParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);


-- public."ContestQuestion" definition

-- Drop table

-- DROP TABLE public."ContestQuestion";

CREATE TABLE public."ContestQuestion" (
	"contestId" int4 NOT NULL,
	"order" int4 DEFAULT 0 NOT NULL,
	"datasetId" int4 NOT NULL,
	"dbTableName" text NULL,
	description text NOT NULL,
	difficulty public."Difficulty" NOT NULL,
	"expectedOutput" jsonb NOT NULL,
	id serial4 NOT NULL,
	"solutionSql" text NULL,
	title text NOT NULL,
	"tablePreviews" jsonb NULL,
	CONSTRAINT "ContestQuestion_pkey" PRIMARY KEY (id),
	CONSTRAINT "ContestQuestion_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES public."Contest"(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "ContestQuestion_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES public."Dataset"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);


-- public."ContestSubmission" definition

-- Drop table

-- DROP TABLE public."ContestSubmission";

CREATE TABLE public."ContestSubmission" (
	id serial4 NOT NULL,
	"userId" int4 NOT NULL,
	"contestId" int4 NOT NULL,
	"contestQuestionId" int4 NOT NULL,
	code text NOT NULL,
	status text NOT NULL,
	"executionTimeMs" int4 NULL,
	"errorMessage" text NULL,
	"output" jsonb NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ContestSubmission_pkey" PRIMARY KEY (id),
	CONSTRAINT "ContestSubmission_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES public."Contest"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT "ContestSubmission_contestQuestionId_fkey" FOREIGN KEY ("contestQuestionId") REFERENCES public."ContestQuestion"(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "ContestSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);


-- public."Follows" definition

-- Drop table

-- DROP TABLE public."Follows";

CREATE TABLE public."Follows" (
	"followerId" int4 NOT NULL,
	"followingId" int4 NOT NULL,
	CONSTRAINT "Follows_pkey" PRIMARY KEY ("followerId", "followingId"),
	CONSTRAINT "Follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES public."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT "Follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES public."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);


-- public."FriendInvite" definition

-- Drop table

-- DROP TABLE public."FriendInvite";

CREATE TABLE public."FriendInvite" (
	id serial4 NOT NULL,
	"senderId" int4 NOT NULL,
	"receiverId" int4 NOT NULL,
	status text DEFAULT 'PENDING'::text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "FriendInvite_pkey" PRIMARY KEY (id),
	CONSTRAINT "FriendInvite_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES public."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT "FriendInvite_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FriendInvite_senderId_receiverId_key" ON public."FriendInvite" USING btree ("senderId", "receiverId");


-- public."Question" definition

-- Drop table

-- DROP TABLE public."Question";

CREATE TABLE public."Question" (
	id serial4 NOT NULL,
	title text NOT NULL,
	description text NOT NULL,
	"tagId" int4 NOT NULL,
	difficulty public."Difficulty" NOT NULL,
	"expectedOutput" jsonb NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"dbTableName" text NULL,
	"datasetId" int4 NOT NULL,
	"solutionSql" text NULL,
	CONSTRAINT "Question_pkey" PRIMARY KEY (id),
	CONSTRAINT "Question_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES public."Dataset"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT "Question_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public."Tag"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);


-- public."Submission" definition

-- Drop table

-- DROP TABLE public."Submission";

CREATE TABLE public."Submission" (
	id serial4 NOT NULL,
	"userId" int4 NOT NULL,
	"questionId" int4 NOT NULL,
	code text NOT NULL,
	status text NOT NULL,
	"output" jsonb NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"errorMessage" text NULL,
	"executionTimeMs" int4 NULL,
	"sessionId" text NULL,
	diagnostic jsonb NULL,
	CONSTRAINT "Submission_pkey" PRIMARY KEY (id),
	CONSTRAINT "Submission_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public."Question"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);


-- public."UserQuestionProgress" definition

-- Drop table

-- DROP TABLE public."UserQuestionProgress";

CREATE TABLE public."UserQuestionProgress" (
	"userId" int4 NOT NULL,
	"questionId" int4 NOT NULL,
	"isCompleted" bool DEFAULT false NOT NULL,
	attempts int4 DEFAULT 0 NOT NULL,
	"bestCode" text NULL,
	"lastAttempt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "UserQuestionProgress_pkey" PRIMARY KEY ("userId", "questionId"),
	CONSTRAINT "UserQuestionProgress_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public."Question"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT "UserQuestionProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);


-- public."ActivityLog" definition

-- Drop table

-- DROP TABLE public."ActivityLog";

CREATE TABLE public."ActivityLog" (
	id serial4 NOT NULL,
	"userId" int4 NOT NULL,
	"questionId" int4 NOT NULL,
	code text NOT NULL,
	status text NOT NULL,
	"executionTimeMs" int4 NULL,
	"errorMessage" text NULL,
	"sessionId" text NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ActivityLog_pkey" PRIMARY KEY (id),
	CONSTRAINT "ActivityLog_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public."Question"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);