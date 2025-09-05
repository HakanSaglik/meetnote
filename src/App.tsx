import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import Header from './components/Header';
import { TaskSidebar } from './components/TaskSidebar';
import HomePage from './pages/HomePage';
import MeetingsPage from './pages/MeetingsPage';
import AddMeetingPage from './pages/AddMeetingPage';
import EditMeetingPage from './pages/EditMeetingPage';
import MeetingDetailPage from './pages/MeetingDetailPage';
import SettingsPage from './pages/SettingsPage';
import AskQuestionPage from './pages/AskQuestionPage';
import CompletedTasksPage from './pages/CompletedTasksPage';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ThemeProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <Header onToggleSidebar={toggleSidebar} />
          <div className="flex">
            <main className="flex-1 px-4 py-8 lg:pr-76">
              <Routes>
                <Route path="/" element={<HomePage />} />
                 <Route path="/meetings" element={<MeetingsPage />} />
                 <Route path="/meetings/:id" element={<MeetingDetailPage />} />
                 <Route path="/add-meeting" element={<AddMeetingPage />} />
                 <Route path="/edit-meeting/:id" element={<EditMeetingPage />} />
                 <Route path="/ask-question" element={<AskQuestionPage />} />
                 <Route path="/settings" element={<SettingsPage />} />
                 <Route path="/completed-tasks" element={<CompletedTasksPage />} />
              </Routes>
            </main>
            <TaskSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
          </div>
          <Toaster position="top-right" />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;