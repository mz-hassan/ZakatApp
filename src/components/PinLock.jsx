import { useState, useEffect } from 'react';
import { db } from '../db/db';
import AppIntro from './AppIntro';

async function hashPIN(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'zakat-salt-2024');
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function PinLock({ onUnlock, mode = 'unlock', onBack, onComplete }) {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [step, setStep] = useState('loading');
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);

    useEffect(() => { checkPin(); }, [mode]);

    async function checkPin() {
        if (mode === 'setup') {
            setPin('');
            setConfirmPin('');
            setError('');
            setStep('setup');
            return;
        }

        const pinEnabledSetting = await db.settings.get('pinEnabled');
        if (pinEnabledSetting && pinEnabledSetting.value === false) {
            onUnlock();
            return;
        }
        const setting = await db.settings.get('pin');
        if (!setting || !setting.value) {
            setStep('landing');
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
        } else if (step === 'enter') {
            if (pin.length < 4) setPin(prev => prev + d);
        }
    }

    function handleDelete() {
        if (step === 'confirm') setConfirmPin(prev => prev.slice(0, -1));
        else setPin(prev => prev.slice(0, -1));
    }

    useEffect(() => {
        if (step === 'setup' && pin.length === 4) {
            setTimeout(() => setStep('confirm'), 200);
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
        await db.settings.put({ key: 'pinEnabled', value: true });
        if (mode === 'setup') {
            onComplete?.();
            return;
        }
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

    async function handleContinueWithoutPin() {
        await db.settings.put({ key: 'pinEnabled', value: false });
        onUnlock();
    }

    function triggerShake() {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    }

    if (step === 'loading') {
        return (
            <div style={{
                minHeight: '100dvh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'var(--bg, #0c0c0c)',
            }}>
                <div style={{ color: 'var(--text-muted, #555)' }}>Loading…</div>
            </div>
        );
    }

    // Landing - shown only on first launch when no PIN has been set
    if (step === 'landing') {
        return (
            <div style={{
                minHeight: '100dvh', background: 'var(--bg, #0c0c0c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '2.5rem 1.5rem',
            }}>
                <AppIntro>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        <button
                            onClick={() => { setPin(''); setStep('setup'); }}
                            style={{
                                width: '100%', padding: '0.9rem', borderRadius: '0.875rem',
                                background: 'linear-gradient(135deg, #059669, #047857)',
                                border: 'none', color: '#fff', fontSize: '0.95rem',
                                fontWeight: 700, cursor: 'pointer',
                            }}
                        >
                            Set up PIN security
                        </button>
                        <button
                            onClick={handleContinueWithoutPin}
                            style={{
                                width: '100%', padding: '0.875rem', borderRadius: '0.875rem',
                                background: 'transparent',
                                border: '1px solid var(--border, #252525)',
                                color: 'var(--text-muted, #666)', fontSize: '0.9rem',
                                fontWeight: 500, cursor: 'pointer',
                            }}
                        >
                            Continue without PIN
                        </button>
                        <p style={{
                            textAlign: 'center', fontSize: '0.72rem',
                            color: 'var(--text-muted, #3d3d3d)', margin: '0.125rem 0 0',
                        }}>
                            You can change this anytime in Settings
                        </p>
                    </div>
                </AppIntro>
            </div>
        );
    }

    // PIN keypad (setup / confirm / enter)
    const currentPin = step === 'confirm' ? confirmPin : pin;
    const title =
        step === 'setup' ? 'Create PIN'
            : step === 'confirm' ? 'Confirm PIN'
                : 'Enter PIN';
    const subtitle =
        step === 'setup' ? 'Choose a 4-digit PIN to secure your data'
            : step === 'confirm' ? 'Enter your PIN again to confirm'
                : 'Enter your PIN to unlock';

    return (
        <div style={{
            minHeight: '100dvh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg, #0c0c0c)', padding: '2rem 1rem', gap: '2rem',
        }}>
            {mode === 'setup' && onBack && (
                <div style={{
                    position: 'absolute',
                    top: '1rem',
                    left: '1rem',
                }}>
                    <button className="back-btn" onClick={onBack}>←</button>
                </div>
            )}
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: 50, height: 50, borderRadius: 13,
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1rem',
                    fontSize: '0.9rem', fontWeight: 800, color: '#fff',
                }}>ZM</div>
                <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 0.375rem', color: 'var(--text, #f0f0f0)' }}>{title}</h1>
                <p style={{ color: 'var(--text-muted, #666)', fontSize: '0.875rem', margin: 0 }}>{subtitle}</p>
            </div>

            <div style={{
                display: 'flex', gap: '1rem',
                animation: shake ? 'shake 0.5s ease' : 'none',
            }}>
                {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{
                        width: 16, height: 16, borderRadius: '50%',
                        border: '2px solid #059669',
                        background: i < currentPin.length ? '#059669' : 'transparent',
                        transition: 'background 0.15s ease',
                    }} />
                ))}
            </div>

            {error && (
                <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: '-0.5rem 0' }}>{error}</p>
            )}

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
                            border: key === null ? 'none' : '1px solid var(--pin-btn-border, #222)',
                            background: key === null ? 'transparent' : 'var(--pin-btn-bg, #141414)',
                            color: key === 'del' ? 'var(--text-muted, #666)' : 'var(--text, #f0f0f0)',
                            fontSize: key === 'del' ? '1.1rem' : '1.5rem',
                            fontWeight: 600, cursor: key === null ? 'default' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            visibility: key === null ? 'hidden' : 'visible',
                            transition: 'background 0.15s',
                        }}
                        onTouchStart={e => { if (key !== null) e.currentTarget.style.background = 'var(--surface-4, #2a2a2a)'; }}
                        onTouchEnd={e => { if (key !== null) e.currentTarget.style.background = 'var(--pin-btn-bg, #141414)'; }}
                    >
                        {key === 'del' ? '⌫' : key}
                    </button>
                ))}
            </div>

            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%  { transform: translateX(-10px); }
          40%  { transform: translateX(10px); }
          60%  { transform: translateX(-10px); }
          80%  { transform: translateX(10px); }
        }
      `}</style>
        </div>
    );
}
