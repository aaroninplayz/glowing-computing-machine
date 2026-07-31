# Database Architecture & Data Models

## Overview

The database layer stores persistent domain data for the Forge community (~45 members).

---

## Technical Specifications

- **Database Engine**: SQLite (Embedded, single-file database for zero-config Phase 1 operation; easily migratable to PostgreSQL in future phases).
- **ORM / Query Builder**: Prisma ORM or Kysely for type-safe query execution and schema migrations.

---

## Core Domain Entities (Schema Baseline)

### 1. Users
- `id`: String (UUID)
- `name`: String
- `email`: String (Unique)
- `password_hash`: String
- `role`: Enum (`MEMBER`, `TEACHER_ADMIN`, `SUPER_ADMIN`)
- `created_at`: DateTime

### 2. Teams
- `id`: String (UUID)
- `name`: String
- `description`: Text
- `created_at`: DateTime

### 3. TeamMemberships
- `id`: String (UUID)
- `user_id`: String (FK -> Users.id)
- `team_id`: String (FK -> Teams.id)
- `joined_at`: DateTime

### 4. LearningActivities
- `id`: String (UUID)
- `title`: String
- `description`: Text
- `points`: Integer
- `requires_proof`: Boolean (Default: false)
- `requires_approval`: Boolean (Default: false)
- `created_at`: DateTime

### 5. ActivityProgress
- `id`: String (UUID)
- `user_id`: String (FK -> Users.id)
- `activity_id`: String (FK -> LearningActivities.id)
- `status`: Enum (`NOT_STARTED`, `IN_PROGRESS`, `PENDING_APPROVAL`, `COMPLETED`, `REJECTED`)
- `proof_url`: String (Optional link or uploaded file path)
- `proof_notes`: Text (Optional submission comment)
- `submitted_at`: DateTime
- `reviewed_by`: String (FK -> Users.id, Optional)
- `reviewed_at`: DateTime

### 6. Resources
- `id`: String (UUID)
- `title`: String
- `url`: String (Web link or stored file path)
- `category`: String
- `file_type`: String (e.g. `pdf`, `link`, `zip`)
- `uploaded_by`: String (FK -> Users.id)
- `created_at`: DateTime
