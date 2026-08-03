# MongoDB setup (local) for this project

## Goal
Fix backend error: `MongoDB URI is missing. Set MONGO_URI or MONGODB_URI in Backend/.env`

## Steps (easy)
1. Open: `Backend/.env`
2. Add ONE line:
   - If you run MongoDB locally without authentication (most common):
     ```env
     MONGODB_URI=mongodb://localhost:27017/education_tech
     ```
   - If you use a different local DB name, change only `education_tech`.
3. Restart backend:
   ```bat
   cd "c:/Users/Sangamesh/Desktop/Education_tech/Backend"
   npm run start
   ```

## If it still fails
Send the full backend log line that starts with:
- `❌ MongoDB connection error:`

Then I will generate the exact correct Mongo URI (with auth if needed).

