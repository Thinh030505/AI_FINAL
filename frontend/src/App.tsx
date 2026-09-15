import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { OCRPage } from './pages/OCRPage';
import { ObjectDetectionPage } from './pages/ObjectDetectionPage';
import { ImageAnalysisPage } from './pages/ImageAnalysisPage';
import { CameraPage } from './pages/CameraPage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ocr"
              element={
                <ProtectedRoute>
                  <OCRPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/object-detection"
              element={
                <ProtectedRoute>
                  <ObjectDetectionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/image-analysis"
              element={
                <ProtectedRoute>
                  <ImageAnalysisPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/camera"
              element={
                <ProtectedRoute>
                  <CameraPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MainLayout>
      </Router>
    </AuthProvider>
  );
};

export default App;
