-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "bio" TEXT,
    "avatarUrl" VARCHAR(500),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" VARCHAR(45),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "coverImage" VARCHAR(500),
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "clapCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_translations" (
    "id" TEXT NOT NULL,
    "language" VARCHAR(10) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "readingTime" INTEGER NOT NULL DEFAULT 0,
    "postId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "post_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_translations" (
    "id" TEXT NOT NULL,
    "language" VARCHAR(10) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "category_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "clapCount" INTEGER NOT NULL DEFAULT 0,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claps" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claps_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "postCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PostTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PostTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "posts_authorId_status_idx" ON "posts"("authorId", "status");

-- CreateIndex
CREATE INDEX "posts_categoryId_status_idx" ON "posts"("categoryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "post_translations_postId_language_key" ON "post_translations"("postId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "category_translations_categoryId_language_key" ON "category_translations"("categoryId", "language");

-- CreateIndex
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_postCount_idx" ON "tags"("postCount" DESC);

-- CreateIndex
CREATE INDEX "_PostTags_B_index" ON "_PostTags"("B");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_translations" ADD CONSTRAINT "post_translations_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claps" ADD CONSTRAINT "claps_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claps" ADD CONSTRAINT "claps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostTags" ADD CONSTRAINT "_PostTags_A_fkey" FOREIGN KEY ("A") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostTags" ADD CONSTRAINT "_PostTags_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- PARTIAL INDEXES
-- ============================================

-- User: chỉ index user chưa bị soft delete
-- dùng Unique Index ở đây để cho phép đăng ký lại email/username đã bị soft delete
CREATE UNIQUE INDEX "idx_users_email_unique_active"
    ON "users" ("email")
    WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "idx_users_username_unique_active"
    ON "users" ("username")
    WHERE "deletedAt" IS NULL;

-- RefreshToken: chỉ index các token còn hiệu lực (chưa revoke)
CREATE INDEX "idx_refresh_tokens_active"
    ON "refresh_tokens" ("userId")
    WHERE "isRevoked" = false;

-- RefreshToken: cron delete
CREATE INDEX "idx_refresh_tokens_expiry_gc"
    ON "refresh_tokens" ("expiresAt")
    WHERE "isRevoked" = true;

-- Post: chỉ index bài đã published và chưa bị xóa và covering index (Post feed)
CREATE INDEX "idx_posts_feed_covering"
    ON "posts" ("publishedAt" DESC)
    INCLUDE ("id", "coverImage")
    WHERE "status" = 'PUBLISHED' AND "deletedAt" IS NULL;

-- Post: index theo Author Feed
CREATE INDEX "idx_posts_author_feed"
    ON "posts" ("authorId", "publishedAt" DESC)
    WHERE "status" = 'PUBLISHED' AND "deletedAt" IS NULL;

-- Post: index theo Category Feed
CREATE INDEX "idx_posts_category_feed"
    ON "posts" ("categoryId", "publishedAt" DESC)
    WHERE "status" = 'PUBLISHED' AND "deletedAt" IS NULL;

-- PostTranslation: Slug không trùng trong cùng 1 ngôn ngữ và reuseble slug
CREATE UNIQUE INDEX "idx_slug_active"
    ON "post_translations" ("language", "slug")
    WHERE "deletedAt" IS NULL;

-- PostTranslation: Search index theo ngôn ngữ
CREATE INDEX "idx_post_translations_search_lang"
    ON "post_translations" ("language")
    WHERE "deletedAt" IS NULL;

-- Comment: chỉ index comment chưa bị xóa và sắp theo thời gian (All / Newest)
CREATE INDEX "idx_comments_active"
    ON "comments" ("postId", "createdAt" DESC)
    WHERE "deletedAt" IS NULL;

-- Comment: chỉ index comment chưa bị xóa và sắp theo claps + replies
CREATE INDEX "idx_comments_relevant"
    ON "comments" ("postId", "clapCount" DESC, "replyCount" DESC)
    WHERE "deletedAt" IS NULL;

-- Comment: lấy replies của 1 comment
CREATE INDEX "idx_comments_replies_active"
    ON "comments" ("parentId", "createdAt" ASC)
    WHERE "deletedAt" IS NULL;

-- ============================================
-- CONSTRAINTS
-- ============================================

ALTER TABLE "claps"
    ADD CONSTRAINT "claps_count_check"
    CHECK ("count" BETWEEN 1 AND 50);

-- ============================================
-- FULL-TEXT SEARCH (tsvector)
-- ============================================

-- Thêm cột tsv tự động tính từ title + excerpt + content
-- Dùng 'simple' để support cả tiếng Việt (không dùng stemming tiếng Anh)
ALTER TABLE "post_translations"
    ADD COLUMN "tsv" tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', lower(coalesce("title", ''))), 'A') ||
        setweight(to_tsvector('simple', lower(coalesce("excerpt", ''))), 'B') ||
        setweight(to_tsvector('simple', lower(coalesce("content", ''))), 'C')
    ) STORED;

-- GIN index cho full-text search
CREATE INDEX "idx_post_translations_tsv"
    ON "post_translations"
    USING GIN ("tsv")
    WHERE "deletedAt" IS NULL;
