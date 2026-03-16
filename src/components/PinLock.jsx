import { useState, useEffect } from 'react';
import { db } from '../db/db';

async function hashPIN(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'zakat-salt-2024');
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function PinLock({ onUnlock }) {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isSetup, setIsSetup] = useState(false);
    const [step, setStep] = useState('loading');
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);

    useEffect(() => {
        checkPin();
    }, []);

    async function checkPin() {
        // Check if PIN is enabled
        const pinEnabledSetting = await db.settings.get('pinEnabled');
        if (pinEnabledSetting && pinEnabledSetting.value === false) {
            onUnlock();
            return;
        }

        const setting = await db.settings.get('pin');
        if (!setting || !setting.value) {
            setStep('setup');
            setIsSetup(true);
        } else {
            setStep('enter');
        }
    }

    function handleDigit(d) {
        setError('');
        if (step === 'setup') {
            if (pin.length < 4) setPin(prev => prev + d);
        } else if (step === 'confirm') {
            if (confirmPin.length < 4) setConfirmPin(prev => prev + d);
        } else {
            if (pin.length < 4) setPin(prev => prev + d);
        }
    }

    function handleDelete() {
        if (step === 'confirm') {
            setConfirmPin(prev => prev.slice(0, -1));
        } else {
            setPin(prev => prev.slice(0, -1));
        }
    }

    useEffect(() => {
        if (step === 'setup' && pin.length === 4) {
            setTimeout(() => {
                setStep('confirm');
            }, 200);
        } else if (step === 'confirm' && confirmPin.length === 4) {
            setTimeout(() => handleConfirm(), 200);
        } else if (step === 'enter' && pin.length === 4) {
            setTimeout(() => handleVerify(), 200);
        }
    }, [pin, confirmPin, step]);

    async function handleConfirm() {
        if (pin !== confirmPin) {
            triggerShake();
            setError('PINs do not match');
            setConfirmPin('');
            setStep('setup');
            setPin('');
            return;
        }
        const hashed = await hashPIN(pin);
        await db.settings.put({ key: 'pin', value: hashed });
        onUnlock();
    }

    async function handleVerify() {
        const setting = await db.settings.get('pin');
        const hashed = await hashPIN(pin);
        if (hashed === setting.value) {
            onUnlock();
        } else {
            triggerShake();
            setError('Incorrect PIN');
            setPin('');
        }
    }

    function triggerShake() {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    }

    const currentPin = step === 'confirm' ? confirmPin : pin;
    const title = step === 'setup' ? 'Create PIN' : step === 'confirm' ? 'Confirm PIN' : 'Enter PIN';
    const subtitle = step === 'setup' ? 'Set a 4-digit PIN to secure your data' : step === 'confirm' ? 'Enter your PIN again to confirm' : 'Enter your PIN to unlock';

    if (step === 'loading') {
        return (
            <div style={{
                minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0c0c0c',
            }}>
                <div style={{ fontSize: '1.25rem', color: '#999' }}>Loading...</div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100dvh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: '#0c0c0c',
            padding: '2rem 1rem', gap: '2rem',
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: 64, height: 64, borderRadius: 16,
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1rem', fontSize: '1.5rem', fontWeight: 800, color: '#fff',
                    letterSpacing: '-0.02em',
                }}>ZM</div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{title}</h1>
                <p style={{ color: '#999', fontSize: '0.95rem', margin: 0 }}>{subtitle}</p>
            </div>

            {/* PIN dots */}
            <div style={{
                display: 'flex', gap: '1rem',
                animation: shake ? 'shake 0.5s ease' : 'none',
            }}>
                {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: '2px solid #059669',
                        background: i < currentPin.length ? '#059669' : 'transparent',
                        transition: 'background 0.15s ease',
                    }} />
                ))}
            </div>

            {error && (
                <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '-0.5rem 0' }}>{error}</p>
            )}

            {/* Keypad */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem', maxWidth: 280, width: '100%',
            }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, idx) => (
                    <button
                        key={idx}
                        onClick={() => {
                            if (key === 'del') handleDelete();
                            else if (key !== null) handleDigit(String(key));
                        }}
                        style={{
                            width: '100%', aspectRatio: '1.3', borderRadius: 12,
                            border: key === null ? 'none' : '1px solid #333',
                            background: key === null ? 'transparent' : '#1a1a1a',
                            color: key === 'del' ? '#999' : '#f0f0f0',
                            fontSize: key === 'del' ? '1.1rem' : '1.5rem',
                            fontWeight: 600, cursor: key === null ? 'default' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            visibility: key === null ? 'hidden' : 'visible',
                            transition: 'background 0.15s',
                        }}
                        onTouchStart={(e) => { if (key !== null) e.currentTarget.style.background = '#333'; }}
                        onTouchEnd={(e) => { if (key !== null) e.currentTarget.style.background = '#1a1a1a'; }}
                    >
                        {key === 'del' ? '⌫' : key}
                    </button>
                ))}
            </div>

            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-10px); }
          80% { transform: translateX(10px); }
        }
      `}</style>
        </div>
    );
}
