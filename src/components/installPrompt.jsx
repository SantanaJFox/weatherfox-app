import React, { useEffect, useState } from 'react';

const bannerStyle = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    padding: '12 px 16px',
    background: '#1f2937',
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    zIndex: 50,
};

const buttonStyle = {
    background: '#6b4eff',
    border: 'none',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: 8,
    cursor: 'pointer',
};

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setVisible(true);
        };
        const onInstalled = () => {
            setVisible(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

if (!visible) return null;

const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome !== 'dismissed') {
        setVisible(false);
    }
    setDeferredPrompt(null);
};

return (
    <div style={bannerStyle}>
        <span>Add Weather App to your home screen?</span>
        <div style={{ display: 'flex', gap: 8 }}>
            <button style={buttonStyle} onClick={handleInstall}>Install</button>
            <button style={{ ...buttonStyle, background: '#374151 '}} onClick={() => setVisible(false)}>Not now</button>
      </div>
    </div>
  );
}