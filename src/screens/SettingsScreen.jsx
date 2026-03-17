import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { BackupService } from '../services/backup';

export default function SettingsScreen({ onBack, onNavigate }) {
    const [importing, setImporting] = useState(false);
    const [message, setMessage] = useState('');
    const [zakatPct, setZakatPct] = useState('2.5');
    const [pinEnabled, setPinEnabled] = useState(true);
    const [theme, setTheme] = useState('dark');

    useEffect(() => { loadSettings(); }, []);

    async function loadSettings() {
        const pctSetting = await db.settings.get('zakatPercentage');
        if (pctSetting) setZakatPct(String((pctSetting.value * 100).toFixed(1)));

        const pinSetting = await db.settings.get('pinEnabled');
        if (pinSetting !== undefined) setPinEnabled(pinSetting.value !== false);

        const themeSetting = await db.settings.get('theme');
        setTheme(themeSetting?.value || 'dark');
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

        if (newVal) {
            const existingPin = await db.settings.get('pin');
            if (!existingPin?.value) {
                onNavigate('pin-setup');
                return;
            }
        }

        await db.settings.put({ key: 'pinEnabled', value: newVal });
        setPinEnabled(newVal);
        setMessage(newVal ? 'PIN lock enabled' : 'PIN lock disabled');
        setTimeout(() => setMessage(''), 2000);
    }

    async function handleToggleTheme() {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        await db.settings.put({ key: 'theme', value: newTheme });
        setTheme(newTheme);
        if (newTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        setMessage(`Switched to ${newTheme} mode`);
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

    async function handleDeleteAllData() {
        const confirmed = confirm('Delete all app data and start fresh? This will permanently remove all years, holdings, payments, recipients, trustees, PIN settings, and backups stored in this app.');
        if (!confirmed) return;

        try {
            document.documentElement.removeAttribute('data-theme');
            await db.delete();
            window.location.reload();
        } catch (err) {
            setMessage('Error: ' + err.message);
            setTimeout(() => setMessage(''), 4000);
        }
    }

    const isLight = theme === 'light';

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
                        background: message.startsWith('Error') ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                        color: message.startsWith('Error') ? '#ef4444' : '#10b981',
                        fontSize: '0.875rem', fontWeight: 500,
                        border: `1px solid ${message.startsWith('Error') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                    }}>{message}</div>
                )}

                {/* Zakat Configuration */}
                <Section label="Zakat">
                    <div className="card" style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>Zakat Percentage</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #666)', marginTop: '0.1rem' }}>Applied to eligible holdings</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    className="input-field"
                                    type="number" step="0.1" min="0.1" max="100"
                                    style={{ width: '4.5rem', textAlign: 'center', padding: '0.5rem' }}
                                    value={zakatPct}
                                    onChange={e => setZakatPct(e.target.value)}
                                />
                                <span style={{ color: 'var(--text-muted, #666)', fontWeight: 600 }}>%</span>
                            </div>
                        </div>
                        <button className="btn btn-primary" style={{ marginTop: '0.75rem', fontSize: '0.85rem', padding: '0.5rem' }}
                            onClick={handleSaveZakatPct}>
                            Save
                        </button>
                    </div>
                </Section>

                {/* Appearance */}
                <Section label="Appearance">
                    <ToggleRow
                        label="Light Theme"
                        description={isLight ? 'Light mode is on' : 'Dark mode is on'}
                        active={isLight}
                        onToggle={handleToggleTheme}
                    />
                </Section>

                {/* Security */}
                <Section label="Security">
                    <ToggleRow
                        label="PIN Lock"
                        description={pinEnabled ? 'App is secured with a 4-digit PIN' : 'PIN lock is disabled'}
                        active={pinEnabled}
                        onToggle={handleTogglePin}
                    />
                </Section>

                {/* Data Management */}
                <Section label="Data">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        <button className="btn btn-primary" onClick={handleExportJSON}>Download Backup</button>
                        <button className="btn btn-secondary" onClick={handleExportCSV}>Download as Spreadsheet</button>
                        <button className="btn btn-secondary" onClick={handleImport} disabled={importing}>
                            {importing ? 'Restoring…' : 'Restore from Backup'}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={handleDeleteAllData}
                            style={{
                                color: '#ef4444',
                                borderColor: 'rgba(239,68,68,0.35)',
                                background: 'var(--surface-2, #171717)',
                            }}
                        >
                            Delete All Data
                        </button>
                    </div>
                </Section>

                {/* About */}
                <Section label="About">
                    <button
                        className="card card-interactive"
                        style={{
                            width: '100%',
                            padding: '1rem',
                            textAlign: 'left',
                            background: 'var(--surface-2, #171717)',
                        }}
                        onClick={() => onNavigate('about')}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                            <div>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text, #f0f0f0)' }}>Zakat Manager</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #666)' }}>Version 1.2 - Local-first, offline</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #666)', marginTop: '0.375rem' }}>
                                    View the app overview and feature summary.
                                </div>
                            </div>
                            <div style={{ color: 'var(--text-muted, #666)', fontSize: '1.1rem', flexShrink: 0 }}>→</div>
                        </div>
                    </button>
                </Section>
            </div>
        </div>
    );
}

function Section({ label, children }) {
    return (
        <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{
                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', color: 'var(--text-muted, #666)',
                margin: '0 0 0.625rem',
            }}>{label}</h2>
            {children}
        </div>
    );
}

function ToggleRow({ label, description, active, onToggle }) {
    return (
        <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #666)', marginTop: '0.1rem' }}>{description}</div>
                </div>
                {/* Toggle pill */}
                <button
                    onClick={onToggle}
                    style={{
                        width: '3rem', height: '1.625rem', borderRadius: '1rem', border: 'none',
                        background: active ? '#10b981' : 'var(--border, #333)',
                        cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                        flexShrink: 0,
                    }}
                    aria-checked={active}
                    role="switch"
                >
                    <div style={{
                        width: '1.25rem', height: '1.25rem', borderRadius: '50%',
                        background: '#fff', position: 'absolute', top: '0.1875rem',
                        left: active ? '1.5rem' : '0.25rem',
                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }} />
                </button>
            </div>
        </div>
    );
}
