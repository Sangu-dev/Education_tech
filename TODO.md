# TODO - Education_tech

## Step 1: Repo analysis
- [x] Read backend package + server routing structure
- [x] Read key frontend routing + main app structure
- [x] Read key pages: Landing/Dashboard/Upload/CourseDetails/LessonViewer
- [x] Read key frontend API modules (auth/courses/upload/progress/quiz/chat/search/profile)
- [x] Read backend auth/course/upload routes + upload controller

## Step 2: Identify & Fix build blockers
- [x] Install dependencies for Frontend
- [x] Install dependencies for Backend (used --legacy-peer-deps due to npm peer conflict)
- [x] Fix backend startup blocked by missing GROQ_API_KEY env var (create Backend/.env)
- [x] Fix dotenv loading order in server.js (import 'dotenv/config' must be first)
- [x] Fix SkeletonLoader import bug in DashboardPage (SkeletonList vs SkeletonLoader)
- [x] Remove unused/broken dependencies: langchain, xss-clean (saved 72 packages)
- [x] Fix SMTP env var mismatch in sendEmail.js (EMAIL_* vs SMTP_*)
- [x] Fix ChatPage history data mapping (data.chats[0].messages, not data.messages)
- [x] Fix ChatPage AI message format (wrap string in {role, content} object)
- [x] Fix ChatPage clearChat to use chatId not courseId
- [x] Fix Quiz results data mapping to match backend response format
- [x] Fix Quiz answer submission format (string values, not indices)
- [x] Update Groq model to current: llama-3.3-70b-versatile (llama-3.1-70b-versatile deprecated)
- [x] Add FRONTEND_URL to .env (needed for password reset email links)
- [x] Frontend build: 0 errors, 2200 modules transformed ✓
- [x] Backend startup: Server running on port 5000, MongoDB connected ✓

## Step 3: Features (completed)
- [x] Upload → course generation status polling (refetchInterval in UploadPage)
- [x] Quiz attempt results page + retry flow
- [x] Chat typing indicator (already implemented)
- [x] Global error states via axios interceptor + react-hot-toast