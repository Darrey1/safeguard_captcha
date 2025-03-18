import { useState } from 'react'
import TelegramLogin from './components/login'
import AuthScreen from './components/verify'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [phone, setPhone] = useState("")

  return (
    <>
      <ToastContainer />
      <Router>
        <Routes>
          <Route path="/" element={<TelegramLogin setPhone={setPhone} />} />
          <Route path="/verify" element={<AuthScreen phone={phone} />} />
        </Routes>
      </Router >
    </>

  )
}

export default App
