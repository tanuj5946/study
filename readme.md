# Setup Instructions

1. Install PostgreSQL locally
2. Create database:

   createdb studysync

3. Run schema.sql file:

   psql -U postgres -d studysync -f schema.sql

4. Create .env file from .env.example
5. Run backend:

   npm install
   npm run dev