import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import DoctorLogin from "./pages/doctor/DoctorLogin";
import DoctorRegister from "./pages/doctor/DoctorRegister";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import PatientList from "./pages/doctor/PatientList";
import OnboardPatient from "./pages/doctor/OnboardPatient";
import PatientDetail from "./pages/doctor/PatientDetail";
import PatientLogin from "./pages/patient/PatientLogin";
import PatientHome from "./pages/patient/PatientHome";
import UploadScan from "./pages/patient/UploadScan";
import PatientHistory from "./pages/patient/PatientHistory";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/doctor/login" element={<DoctorLogin />} />
          <Route path="/doctor/register" element={<DoctorRegister />} />
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute role="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/patients"
            element={
              <ProtectedRoute role="doctor">
                <PatientList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/patients/new"
            element={
              <ProtectedRoute role="doctor">
                <OnboardPatient />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/patients/:id"
            element={
              <ProtectedRoute role="doctor">
                <PatientDetail />
              </ProtectedRoute>
            }
          />
          <Route path="/patient/login" element={<PatientLogin />} />
          <Route
            path="/patient/home"
            element={
              <ProtectedRoute role="patient">
                <PatientHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/upload"
            element={
              <ProtectedRoute role="patient">
                <UploadScan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/history"
            element={
              <ProtectedRoute role="patient">
                <PatientHistory />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
