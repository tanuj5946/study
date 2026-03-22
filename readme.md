# StudySync

A module-based learning platform with AI recommendations, test evaluation, and progress tracking.

## Project Structure
```
studysync-ai/
  backend/              ← Express.js + PostgreSQL API
  frontend/   ← React + Vite frontend
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/studysync.git
cd studysync
```

### 2. Set up the database
```bash
# Create the database
psql -U postgres -c "CREATE DATABASE studysync;"

# Run the schema
psql -U postgres -d studysync -f backend/schema.sql
```

### 3. Set up the backend
```bash
cd backend
npm install
cp .env.example .env   # then fill in your values
npm run dev
```

### 4. Set up the frontend
```bash
cd ../frontend
npm install
cp .env.example .env   # then fill in your values
npm run dev
```

### 5. Create your admin account
Sign up normally, then run:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

## Tech Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts
- **Backend:** Node.js, Express, PostgreSQL
- **Auth:** JWT (bcryptjs)
- **Export:** jsPDF, jspdf-autotable