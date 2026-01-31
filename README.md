# SmokeRing - AI-Native Smoked Meat Assistant

A mobile-first AI cooking assistant that helps smoker owners predict finish times, manage stalls, and cook consistently.

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+
- iOS Simulator or Android Emulator (for mobile development)
- Expo Go app (for device testing)

### Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set up the database**
   ```bash
   # Copy environment file
   cp apps/api/.env.example apps/api/.env

   # Edit .env with your PostgreSQL connection string
   # DATABASE_URL="postgresql://user:password@localhost:5432/smokering"

   # Generate Prisma client and push schema
   pnpm db:generate
   pnpm db:push
   ```

3. **Start development servers**
   ```bash
   # Terminal 1: Start the API server
   pnpm dev:api

   # Terminal 2: Start the mobile app
   pnpm dev:mobile
   ```

4. **Open the app**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on your device

## Project Structure

```
smokering/
├── apps/
│   ├── api/                    # Express backend
│   │   ├── src/
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── services/       # Business logic
│   │   │   ├── ai/             # AI agents and RAG
│   │   │   ├── middleware/     # Auth, validation
│   │   │   └── websocket/      # Real-time updates
│   │   └── prisma/             # Database schema
│   │
│   └── mobile/                 # React Native Expo app
│       ├── app/                # Expo Router screens
│       └── src/
│           ├── components/     # Reusable UI
│           ├── stores/         # Zustand state
│           ├── services/       # API client, socket
│           └── hooks/          # Custom hooks
│
└── packages/
    └── shared/                 # Shared types and constants
```

## Features

### Cook Planning
- Enter meat type, weight, and serve time
- Get a detailed cook timeline with phase predictions
- Confidence indicators show prediction reliability

### Active Cook Tracking
- Log temperatures with large, greasy-hand-friendly buttons
- Real-time progress tracking
- Phase transition notifications

### AI Pit Assist
- Chat with an AI assistant during your cook
- Get evidence-backed advice with source citations
- Context-aware responses based on your current cook

### Cook History
- Track all your past cooks
- See prediction accuracy over time
- Learn from your cooking patterns

## Tech Stack

- **Frontend**: React Native, Expo, React Native Paper, Zustand
- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **AI**: Claude API, LangChain
- **Real-time**: Socket.io
- **Auth**: Supabase Auth (optional) or JWT

## Environment Variables

### API (`apps/api/.env`)

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/smokering"

# Auth
JWT_SECRET="your-secret-key"

# AI (optional for demo mode)
ANTHROPIC_API_KEY="your-anthropic-key"
OPENAI_API_KEY="your-openai-key"

# CORS
CORS_ORIGIN="http://localhost:8081"
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Equipment
- `GET /api/equipment` - List user's smokers
- `POST /api/equipment` - Add smoker
- `PUT /api/equipment/:id` - Update smoker
- `DELETE /api/equipment/:id` - Delete smoker

### Cooks
- `POST /api/cooks/plan` - Generate cook plan (preview)
- `POST /api/cooks` - Create cook
- `GET /api/cooks/active` - Get active cook
- `GET /api/cooks/history` - Get cook history
- `POST /api/cooks/:id/start` - Start cook
- `PUT /api/cooks/:id/temp` - Log temperature
- `POST /api/cooks/:id/complete` - Complete cook

### Chat
- `POST /api/chat/:cookId/message` - Send message
- `GET /api/chat/:cookId` - Get chat history

## Development

### Running Tests
```bash
pnpm test
```

### Building for Production
```bash
# Build shared package
pnpm build:shared

# Build API
pnpm build:api

# Build mobile (EAS Build)
cd apps/mobile && eas build
```

## License

MIT
# Trigger Vercel deployment

