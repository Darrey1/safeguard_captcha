import { useEffect, useState } from 'react'
import TelegramLogin from './components/login'
import AuthScreen from './components/verify'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import VerificationSuccess from './components/success';

function App() {
  const [phone, setPhone] = useState("")
  const [ip, setIp] = useState("");

  useEffect(() => {
    fetch("https://api64.ipify.org?format=json")
      .then((response) => response.json())
      .then((data) => setIp(data.ip))
      .catch((error) => console.error("Error fetching IP:", error));
  }, []);


  return (
    <>
      <ToastContainer />
      <Router>
        <Routes>
          <Route path="/" element={<TelegramLogin setPhone={setPhone} />} />
          <Route path="/verify" element={<AuthScreen phone={phone} IP={ip} />} />
          <Route path="/success" element={<VerificationSuccess />} />
        </Routes>
      </Router >
    </>

  )
}

export default App
