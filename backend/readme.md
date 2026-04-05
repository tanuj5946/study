# StudySync — Backend

Express.js + PostgreSQL backend for the StudySync learning platform.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create `.env` file
```env
DATABASE_URL=postgresql://username:password@localhost:5432/studysync
PORT=5000
JWT_SECRET=your-long-random-secret-here
CLIENT_URL=http://localhost:5173
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_CHAT_MODEL=openai/gpt-4o-mini
OPENROUTER_EMBED_MODEL=openai/text-embedding-3-small
OPENROUTER_HTTP_REFERER=http://localhost:5173
OPENROUTER_APP_TITLE=StudySync
```

### 3. Set up the database
Create a PostgreSQL database named `studysync` and run the schema:
```bash
psql -U postgres -d studysync -f schema.sql
```

### 4. Start the server
```bash
# Development
npm run dev

# Production
node server.js
```

<!-- ## API Routes
- `POST /api/auth/signup` — Register
- `POST /api/auth/login` — Login
- `GET /api/subjects` — All subjects with modules
- `GET /api/tests/subject/:id` — Get questions
- `POST /api/tests/submit` — Submit test
- `GET /api/analytics/summary` — Analytics
- `GET /api/recommendations` — AI recommendations
- `POST /api/recommendations/chat` — Chatbot -->
