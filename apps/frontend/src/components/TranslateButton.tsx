"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiGlobe } from "react-icons/fi";
import "@/lib/i18n"; // ensure i18n is initialized

export function TranslateButton() {
    const { i18n } = useTranslation();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const toggleLanguage = () => {
        const newLang = i18n.language.startsWith('es') ? 'en' : 'es';
        i18n.changeLanguage(newLang);
    };

    if (!mounted) {
        // Prevent hydration mismatch by returning a placeholder
        return (
            <button className="p-2 text-neutral-400 hover:text-neutral-200 transition-colors rounded-lg hover:bg-neutral-800">
                <FiGlobe size={20} />
            </button>
        );
    }

    return (
        <button
            onClick={toggleLanguage}
            className="p-2 text-neutral-400 hover:text-neutral-200 transition-colors rounded-lg hover:bg-neutral-800 flex items-center gap-2"
            title={i18n.language.startsWith('es') ? "Switch to English" : "Cambiar a Español"}
        >
            <FiGlobe size={20} />
            <span className="text-sm font-medium uppercase">{i18n.language.substring(0, 2)}</span>
        </button>
    );
}
