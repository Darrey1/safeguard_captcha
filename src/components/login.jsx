import React, { useState } from 'react';

const TelegramLogin = () => {
    const [phoneNumber, setPhoneNumber] = useState('+1 --- --- ----');
    const [country, setCountry] = useState('United States');
    const [countryCode, setCountryCode] = useState('+1');

    const handlePhoneNumberFocus = () => {
        if (phoneNumber === `${countryCode} --- --- ----`) {
            setPhoneNumber(`${countryCode} `);
        }
    };

    const handlePhoneNumberBlur = () => {
        if (phoneNumber === `${countryCode} ` || phoneNumber === countryCode) {
            setPhoneNumber(`${countryCode} --- --- ----`);
        }
    };

    const handleCountryChange = (e) => {
        setCountry(e.target.value);
        // Update country code based on selection
        const codes = {
            'United States': '+1',
            'United Kingdom': '+44',
            'Canada': '+1',
            'Nigeria': '+234',
            'India': '+91'
        };
        setCountryCode(codes[e.target.value]);
        setPhoneNumber(`${codes[e.target.value]} --- --- ----`);
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-gray-100">
            <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-xl overflow-hidden border-l-4 border-purple-500">

                {/* Main Content */}
                <div className="px-8 py-6 flex flex-col items-center">
                    {/* Avatar */}
                    <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 4L3 11L10 14M20 4L17 21L10 14M20 4L10 14" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    {/* Title */}
                    <h1 className="text-xl font-bold mb-2">Sign in to Telegram</h1>
                    <p className="text-gray-400 text-center text-sm mb-8">
                        Please confirm your country code and enter your phone number.
                    </p>

                    {/* Form */}
                    <div className="w-full space-y-6">
                        {/* Country Selection */}
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Country</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    value={country}
                                    onChange={handleCountryChange}
                                >
                                    <option>United States</option>
                                    <option>United Kingdom</option>
                                    <option>Canada</option>
                                    <option>Nigeria</option>
                                    <option>India</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Phone Number</label>
                            <input
                                type="tel"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                onFocus={handlePhoneNumberFocus}
                                onBlur={handlePhoneNumberBlur}
                            />
                        </div>
                    </div>

                    {/* Button */}
                    <button
                        className="w-full bg-purple-600 hover:bg-purple-700 transition-colors duration-300 rounded-lg py-4 text-white font-medium mt-8 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                    >
                        NEXT
                    </button>

                    {/* Alternative login */}
                    <button className="mt-6 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors">
                        LOG IN BY QR CODE
                    </button>
                </div>

            </div>
        </div>
    );
};

export default TelegramLogin;