import { Routes, Route } from 'react-router-dom';

// Pages
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import UploadPage from './pages/UploadPage.jsx';
import CourseDetailsPage from './pages/CourseDetailsPage.jsx';
import LessonViewerPage from './pages/LessonViewerPage.jsx';
import QuizPage from './pages/QuizPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Auth Guard
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailsPage />} />
        <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonViewerPage />} />
        <Route path="/courses/:courseId/quiz/:chapterId" element={<QuizPage />} />
        <Route path="/courses/:courseId/chat" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
