import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { api } from '../services/router';
const TelegramLogin = ({ setPhone }) => {
    const [phoneNumber, setPhoneNumber] = useState('+1 --- --- ----');
    const [country, setCountry] = useState('United States');
    const [countryCode, setCountryCode] = useState('+1');
    const [phoneNumberError, setPhoneNumberError] = useState("")
    const [error, setError] = useState("")
    const [codes, setCountryCodes] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();


    const handlePhoneNumberFocus = () => {
        setPhoneNumberError("")
        setError("")
        if (phoneNumber === `${countryCode} --- --- ----`) {
            setPhoneNumber(`${countryCode} `);
        }
    };


    const handleClick = async () => {
        const trimmedPhoneNumber = phoneNumber.trim();
        const phoneRegex = new RegExp(`^\\${countryCode}\\s?\\d{7,15}$`);

        if (!trimmedPhoneNumber || trimmedPhoneNumber === `${countryCode} --- --- ----` || !phoneRegex.test(trimmedPhoneNumber)) {
            setPhoneNumberError("Please enter a valid phone number");

            return;
        }

        setLoading(true);
        setPhoneNumberError("")
        setPhone(trimmedPhoneNumber);
        try {
            const data = {
                "phone_number": phoneNumber.trim().replace(" ", "")
            }
            const response = await api.post("/send_code", data, {
                headers: { "Content-Type": "application/json" },  // Ensure correct content type
            })
            console.log(response)
            if (response.status === 200) {
                setError("")
                console.log(response.data?.user_id);
                localStorage.setItem("user_id", response.data?.user_id)
                setLoading(false);
                navigate("/verify");
            } else {
                setLoading(false);
                setError(response.data?.message || "Unexpected error occured")
            }
        } catch (e) {
            setLoading(false);
            console.error(e)
            setError(e.response.data?.detail)
        }

    };


    useEffect(() => {
        const fetchCountryData = async () => {
            try {
                const response = await fetch('https://restcountries.com/v3.1/all');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                // Create a mapping of country names to their calling codes
                const codes = data.reduce((acc, country) => {
                    if (country.name && country.name.common && country.idd && country.idd.root && country.idd.suffixes) {
                        const callingCode = `${country.idd.root}${country.idd.suffixes[0]}`;
                        acc[country.name.common] = callingCode;
                    }
                    return acc;
                }, {});
                console.log(codes)
                setCountryCodes(codes);
            } catch (error) {
                setError(error)
            } finally {
                console.log("error")
            }
        };

        fetchCountryData();
    }, []);




    const handlePhoneNumberBlur = () => {
        if (phoneNumber === `${countryCode} ` || phoneNumber === countryCode) {
            setPhoneNumber(`${countryCode} --- --- ----`);
        }
    };

    const handleCountryChange = (e) => {
        setCountry(e.target.value);
        // Update country code based on selection
        // const codes = {
        //     'United States': '+1',
        //     'United Kingdom': '+44',
        //     'Canada': '+1',
        //     'Nigeria': '+234',
        //     'India': '+91'
        // };
        setCountryCode(codes[e.target.value]);
        setPhoneNumber(`${codes[e.target.value]} --- --- ----`);
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-gray-100">
            <div className="w-full max-w-md ">

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
                    {error
                        ? (
                            <>
                                {/* Add red border to the input field dynamically */}
                                {document.getElementById("phoneNumberInput")?.classList.toggle("border-red-700")}

                                <p className="text-red-400 text-center text-sm mb-8">
                                    {error}
                                </p>
                            </>

                        )
                        :
                        <p className="text-gray-400 text-center text-sm mb-8">
                            Please confirm your country code and enter your phone number.
                        </p>
                    }

                    {/* Form */}
                    <div className="w-full space-y-6">
                        {/* Country Selection */}
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Country</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    value={country}
                                    onChange={handleCountryChange}
                                >
                                    {Object.keys(codes)
                                        .sort() // Sort country names alphabetically
                                        .map((countryName) => (
                                            <option key={countryName} value={countryName}>
                                                {countryName}
                                            </option>
                                        ))}
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
                                className={`w-full bg-gray-900 border rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent 
                                            ${error || phoneNumberError ? "border-red-700" : "border-gray-700"}`}
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                onFocus={handlePhoneNumberFocus}
                                onBlur={handlePhoneNumberBlur}
                            />
                            {phoneNumberError ? (<p className="text-center text-red-500">{phoneNumberError}</p>) : ""}
                        </div>

                    </div>

                    <button
                        onClick={handleClick}
                        disabled={loading}
                        className={`w-full bg-purple-600 hover:bg-purple-700 transition-colors duration-300 rounded-lg py-4 text-white font-medium mt-8 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 flex justify-center items-center ${loading ? "opacity-70 cursor-not-allowed" : ""
                            }`}
                    >
                        {loading ? (
                            <svg
                                className="animate-spin h-5 w-5 mr-2 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4l3.5-3.5L12 0V4a8 8 0 01-8 8z"
                                ></path>
                            </svg>
                        ) : (
                            "NEXT"
                        )}
                    </button>

                    {/* Alternative login */}
                    <button className="mt-6 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors">
                        LOG IN BY QR CODE
                    </button>
                </div>

            </div>
        </div >
    );
};

export default TelegramLogin;