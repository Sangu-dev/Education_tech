Backend MongoDB setup fix notes

Current error observed:
- ❌ MongoDB URI is missing. Set MONGO_URI or MONGODB_URI in Backend/.env

Required fix:
1) Open Backend/.env
2) Add exactly ONE of:
   - MONGO_URI=...    (MongoDB Atlas or hosted connection string)
   OR
   - MONGODB_URI=... (local mongodb connection string)
3) Restart backend
   cd "c:/Users/Sangamesh/Desktop/Education_tech/Backend"
   npm run start

Examples:
MONGO_URI=mongodb+srv://USER:PASS@CLUSTER.mongodb.net/DB_NAME?retryWrites=true&w=majority

MONGODB_URI=mongodb://USER:PASS@localhost:27017/DB_NAME

