# 🎓 ELearnAI — AI-Powered Education Platform

An intelligent e-learning platform that generates AI video lessons with narration in **English and 5 Indian languages** (Hindi, Kannada, Telugu, Tamil, Malayalam).

## ✨ Features

- 🤖 **AI Course Generation** — Upload any topic and AI builds a full course with chapters, lessons & quizzes
- 🎬 **AI Video Lessons** — Animated slide-based video player with AI narration
- 🌐 **Indian Language Audio** — Listen to lessons in हिन्दी, ಕನ್ನಡ, తెలుగు, தமிழ், മലയാളം
- 💬 **AI Chat** — Ask questions about your course content
- 📊 **Progress Tracking** — Track completed lessons and course progress
- 🧠 **AI Quizzes** — Auto-generated quizzes to test understanding
- 🔍 **Smart Search** — Search across all your courses

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Database | MongoDB |
| AI | Groq (LLaMA 3.3) |
| Translation | Groq LLM + Google TTS |
| Auth | JWT |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Groq API key — [get one free here](https://console.groq.com)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/Education_tech.git
cd Education_tech
```

### 2. Setup Backend
```bash
cd backend
cp .env.example .env
# Edit .env and add your GROQ_API_KEY and MONGODB_URI
npm install
npm run dev
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app
Visit **http://localhost:5173**

## ⚙️ Environment Variables

Create `backend/.env` based on `backend/.env.example`:

```env
MONGODB_URI=mongodb://localhost:27017/education_tech
JWT_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
GROQ_API_KEY=your_groq_api_key_here
```

## 📁 Project Structure

```
Education_tech/
├── backend/          # Express API server
│   ├── ai/           # Groq AI client
│   ├── controllers/  # Route controllers
│   ├── models/       # MongoDB models
│   ├── routes/       # API routes
│   └── services/     # Business logic
└── frontend/         # React app
    └── src/
        ├── api/      # API clients
        ├── components/
        └── pages/
```

## 🌐 Indian Language Feature

The AI video player supports real audio narration in Indian languages:

1. Open any lesson → click the **Video** tab
2. In the player, click a language: `🌐 EN | हि | ಕ | తె | த | മ`
3. Click **▶ Play** — lesson narrates in the selected language

Powered by **Groq LLM translation** + **Google TTS audio**.
