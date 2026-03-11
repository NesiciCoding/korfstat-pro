import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface SponsorRotatingBannerProps {
    className?: string;
    imageClassName?: string;
}

const SponsorRotatingBanner: React.FC<SponsorRotatingBannerProps> = ({
    className = "",
    imageClassName = "object-contain"
}) => {
    const { settings } = useSettings();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    const sponsors = settings.sponsorLogos || [];
    const interval = (settings.sponsorRotationInterval || 10) * 1000;

    useEffect(() => {
        if (sponsors.length <= 1) return;

        const timer = setInterval(() => {
            // Start fade out
            setIsVisible(false);

            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % sponsors.length);
                setIsVisible(true);
            }, 500); // Wait for fade out animation

        }, interval);

        return () => clearInterval(timer);
    }, [sponsors.length, interval]);

    if (sponsors.length === 0) return null;

    const currentUrl = sponsors[currentIndex];
    const fullUrl = currentUrl.startsWith('http')
        ? currentUrl
        : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${currentUrl}`;
    // TODO: Check if the AP_URL is correct!
    return (
        <div className={`transition-opacity duration-500 overflow-hidden ${isVisible ? 'opacity-100' : 'opacity-0'} ${className}`}>
            <img
                src={fullUrl}
                alt="Sponsor"
                className={`w-full h-full ${imageClassName}`}
            />
        </div>
    );
};

export default SponsorRotatingBanner;
