import { useEffect } from "react";
import { CheckCircle } from "lucide-react";

export default function VerificationSuccess() {
    useEffect(() => {
        if (window.Telegram?.WebApp?.close) {
            setTimeout(() => window.Telegram.WebApp.close(), 3000); // Auto-close after 2s
        }
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h2 className="text-2xl text-white font-semibold mt-4">Verification Successful!</h2>
                <p className="text-gray-400 mt-2">Closing in 3 seconds...</p>
            </div>
        </div>
    );
}
