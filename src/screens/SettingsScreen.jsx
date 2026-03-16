import { useState } from 'react';
import { BackupService } from '../services/backup';

export default function SettingsScreen({ onBack }) {
    const [importing, setImporting] = useState(false);
    const [message, setMessage] = useState('');

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

                {/* Security */}
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Security</h2>
                    <div className="card" style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>PIN Lock</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>App is secured with a 4-digit PIN</div>
                            </div>
                            <div style={{
                                padding: '0.25rem 0.75rem', borderRadius: '2rem',
                                background: 'rgba(16,185,129,0.15)', color: '#10b981',
                                fontSize: '0.75rem', fontWeight: 600,
                            }}>Enabled</div>
                        </div>
                    </div>
                </div>

                {/* About */}
                <div>
                    <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>About</h2>
                    <div className="card" style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Zakat Manager</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Local-first Zakat tracking app</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>Version 1.0</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                            All data stored on your device. No server or internet required.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
