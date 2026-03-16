import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { BackupService } from '../services/backup';

export default function SettingsScreen({ onBack }) {
    const [importing, setImporting] = useState(false);
    const [message, setMessage] = useState('');
    const [zakatPct, setZakatPct] = useState('2.5');
    const [pinEnabled, setPinEnabled] = useState(true);

    useEffect(() => { loadSettings(); }, []);

    async function loadSettings() {
        const pctSetting = await db.settings.get('zakatPercentage');
        if (pctSetting) setZakatPct(String((pctSetting.value * 100).toFixed(1)));
        const pinSetting = await db.settings.get('pinEnabled');
        if (pinSetting !== undefined) setPinEnabled(pinSetting.value !== false);
    }

    async function handleSaveZakatPct() {
        const val = parseFloat(zakatPct);
        if (isNaN(val) || val <= 0 || val > 100) {
            setMessage('Error: Enter a valid percentage (e.g., 2.5)');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        await db.settings.put({ key: 'zakatPercentage', value: val / 100 });
        setMessage('Zakat percentage updated');
        setTimeout(() => setMessage(''), 2000);
    }

    async function handleTogglePin() {
        const newVal = !pinEnabled;
        if (!newVal && !confirm('Disable PIN lock? Anyone with access to your device can view your data.')) return;
        await db.settings.put({ key: 'pinEnabled', value: newVal });
        setPinEnabled(newVal);
        setMessage(newVal ? 'PIN lock enabled' : 'PIN lock disabled');
        setTimeout(() => setMessage(''), 2000);
    }

    async function handleExportJSON() {
        await BackupService.exportAll();
        setMessage('Backup downloaded');
        setTimeout(() => setMessage(''), 2000);
    }

    async function handleExportCSV() {
        await BackupService.exportCSV();
        setMessage('Data downloaded');
        setTimeout(() => setMessage(''), 2000);
    }

    async function handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setImporting(true);
            try {
                await BackupService.importBackup(file);
                setMessage('Backup restored successfully');
                setTimeout(() => setMessage(''), 3000);
            } catch (err) {
                setMessage('Error: ' + err.message);
                setTimeout(() => setMessage(''), 4000);
            }
            setImporting(false);
        };
        input.click();
    }

    return (
        <div className="fade-in">
            <div className="screen-header">
                <button className="back-btn" onClick={onBack}>←</button>
                <h1 style={{ margin: 0 }}>Settings</h1>
            </div>

            <div className="screen">
                {message && (
                    <div style={{
                        padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem',
                        background: message.startsWith('Error') ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                        color: message.startsWith('Error') ? '#ef4444' : '#10b981',
                        fontSize: '0.9rem', fontWeight: 500,
                    }}>{message}</div>
                )}

                {/* Zakat Configuration */}
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Zakat Configuration</h2>
                    <div className="card" style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>Zakat Percentage</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>Applied to eligible holdings</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input className="input-field" type="number" step="0.1" min="0.1" max="100"
                                    style={{ width: '4.5rem', textAlign: 'center', padding: '0.5rem' }}
                                    value={zakatPct} onChange={e => setZakatPct(e.target.value)} />
                                <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>%</span>
                            </div>
                        </div>
                        <button className="btn btn-primary" style={{ marginTop: '0.75rem', fontSize: '0.85rem', padding: '0.5rem' }}
                            onClick={handleSaveZakatPct}>
                            Save
                        </button>
                    </div>
                </div>

                {/* Security */}
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Security</h2>
                    <div className="card" style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>PIN Lock</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                                    {pinEnabled ? 'App is secured with a 4-digit PIN' : 'PIN lock is disabled'}
                                </div>
                            </div>
                            <button onClick={handleTogglePin} style={{
                                width: '3rem', height: '1.625rem', borderRadius: '1rem', border: 'none',
                                background: pinEnabled ? '#10b981' : 'var(--color-border)',
                                cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                            }}>
                                <div style={{
                                    width: '1.25rem', height: '1.25rem', borderRadius: '50%',
                                    background: '#fff', position: 'absolute', top: '0.1875rem',
                                    left: pinEnabled ? '1.5rem' : '0.25rem',
                                    transition: 'left 0.2s',
                                }} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Data Management */}
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Data Management</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        <button className="btn btn-primary" onClick={handleExportJSON}>
                            Download Backup
                        </button>
                        <button className="btn btn-secondary" onClick={handleExportCSV}>
                            Download as Spreadsheet
                        </button>
                        <button className="btn btn-secondary" onClick={handleImport} disabled={importing}>
                            {importing ? 'Restoring...' : 'Restore from Backup'}
                        </button>
                    </div>
                </div>

                {/* About */}
                <div>
                    <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>About</h2>
                    <div className="card" style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Zakat Manager</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Local-first Zakat tracking app</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>Version 1.1</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                            All data stored on your device. No server or internet required.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
