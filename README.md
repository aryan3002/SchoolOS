# SchoolOS 🎓

> AI-first school operating system platform - A conversational AI layer that sits above existing school systems to provide a unified, intelligent interface.

[![CI](https://github.com/your-org/schoolos/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/schoolos/actions/workflows/ci.yml)
[![CD](https://github.com/your-org/schoolos/actions/workflows/cd.yml/badge.svg)](https://github.com/your-org/schoolos/actions/workflows/cd.yml)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

## 🌟 Overview

SchoolOS is NOT a traditional school management system. It's a conversational AI layer that:

- **Connects** to existing systems (PowerSchool, Skyward, Canvas, Google Classroom)
- **Provides** a unified chat interface for parents, teachers, students, and admins
- **Ensures** strict RBAC + relationship-based permissions for student data
- **Delivers** source-grounded responses with zero hallucinations

## 📦 Project Structure

```
schoolos/
├── apps/
│   ├── api/                 # NestJS backend API
│   ├── web/                 # Next.js admin console
│   └── mobile/              # React Native iOS app
├── packages/
│   ├── database/            # Prisma schemas and migrations
│   ├── auth/                # Authentication utilities
│   ├── ai/                  # LLM orchestration layer
│   ├── ui/                  # Shared React components
│   ├── types/               # Shared TypeScript types
│   └── config/              # Shared configs (ESLint, TS)
├── services/
│   ├── knowledge/           # Knowledge ingestion service
│   └── integrations/        # SIS/LMS connector services
└── tools/
    └── scripts/             # Deployment and utility scripts
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Docker** and **Docker Compose**
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/schoolos.git
cd schoolos
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Generate JWT Keys

```bash
# Generate RSA key pair for JWT signing
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Add the keys to your .env file (escape newlines)
```

### 5. Start Local Services

```bash
# Start PostgreSQL, Redis (core services)
npm run docker:up

# Start with development tools (pgAdmin, Redis Commander, etc.)
docker-compose --profile dev-tools up -d
```

### 6. Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate:dev

# Seed sample data
npm run db:seed
```

### 7. Start Development

```bash
# Start all services in development mode
npm run dev

# Or start individual services
npm run dev:api    # Start only the API
npm run dev:web    # Start only the web app
```

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services in development mode |
| `npm run build` | Build all packages |
| `npm run test` | Run all tests |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run lint` | Lint all code |
| `npm run lint:fix` | Fix lint issues |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:migrate:dev` | Create and run migrations (dev) |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run docker:up` | Start Docker services |
| `npm run docker:down` | Stop Docker services |
| `npm run docker:reset` | Reset Docker volumes |

## 🏛️ Architecture

### Core Principles

1. **AI-FIRST**: Conversation is the primary interface, not navigation
2. **SECURITY-FIRST**: Student data requires strict RBAC + relationship-based permissions
3. **SOURCE-GROUNDED**: Every answer must cite official district sources
4. **INTEGRATION-FORWARD**: Connect to existing systems without replacing them
5. **TENANT-ISOLATED**: Multi-district platform with complete data isolation

### Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + NestJS (TypeScript) |
| Web Frontend | Next.js 14+ |
| Mobile | React Native (iOS) |
| Database | PostgreSQL + Prisma |
| Cache | Redis |
| Vector DB | pgvector / Pinecone |
| AI/LLM | Anthropic Claude API |
| Auth | JWT (RS256) + OAuth |

### Key Entities

- **District**: Tenant boundary (complete data isolation)
- **User**: Parent, Teacher, Student, Admin, Staff
- **Relationships**: parent-of(student_id), teacher-of(section_id)
- **Knowledge**: Documents, policies, announcements with versioning
- **Conversation**: Questions + AI responses with source citations

## 🔐 Security

- All API responses are type-safe
- Every database query enforces tenant isolation (district_id)
- All AI responses include source provenance
- Audit logging for all sensitive operations
- No training on district data - RAG only
- RS256 JWT tokens for authentication
- Relationship-based access control (RBAC)

## 📁 Environment Variables

See [.env.example](.env.example) for all required environment variables.

Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection URL |
| `JWT_PRIVATE_KEY` | RSA private key for JWT signing |
| `JWT_PUBLIC_KEY` | RSA public key for JWT verification |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch
```

## 📦 Deployment

### Staging

Automatic deployment on push to `main` branch.

### Production

1. Create a release tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. Or trigger manual deployment via GitHub Actions.

## 🤝 Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Ensure all tests pass: `npm run test`
4. Ensure linting passes: `npm run lint`
5. Commit using conventional commits: `feat(scope): description`
6. Create a Pull Request

### Commit Message Format

```
type(scope): subject

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`, `security`

Scopes: `api`, `web`, `mobile`, `database`, `auth`, `ai`, `ui`, `types`, `config`, `knowledge`, `integrations`

## 📄 License

Proprietary - All rights reserved.

## 📞 Support

For support, email support@schoolos.com or join our Slack channel.
