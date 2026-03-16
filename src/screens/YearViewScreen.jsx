import { useState, useEffect } from 'react';
import { ZakatYearsService } from '../services/zakatYears';
import { ProfilesService } from '../services/profiles';
import { ZakatService } from '../services/zakat';
import { HoldingsService } from '../services/holdings';
import { LedgerService } from '../services/ledger';
import { formatCurrency } from '../utils/format';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function YearViewScreen({ yearId, onNavigate, onBack }) {
    const [year, setYear] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const [profileStats, setProfileStats] = useState({});
    const [showAddProfile, setShowAddProfile] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    useEffect(() => { loadData(); }, [yearId]);

    async function loadData() {
        const y = await ZakatYearsService.get(yearId);
        setYear(y);
        const allProfiles = await ProfilesService.getAll();
        setProfiles(allProfiles);

        const stats = {};
        for (const p of allProfiles) {
            stats[p.id] = await ZakatService.calculate(yearId, p.id);
        }
        setProfileStats(stats);
    }

    async function handleAddProfile() {
        if (!newProfileName.trim()) return;
        await ProfilesService.add(newProfileName.trim());
        setShowAddProfile(false);
        setNewProfileName('');
        await loadData();
    }

    async function handleDeleteProfile(profileId) {
        // Delete all holdings for this profile
        const holdings = await HoldingsService.getByProfile(profileId);
        for (const h of holdings) {
            await HoldingsService.delete(h.id);
        }
        // Delete all ledger entries for this profile in this year
        const entries = await LedgerService.getByYearAndProfile(yearId, profileId);
        for (const e of entries) {
            await LedgerService.delete(e.id);
        }
        // Delete the profile itself
        await ProfilesService.delete(profileId);
        setShowDeleteConfirm(null);
        await loadData();
    }

    if (!year) return null;

    return (
        <div className="fade-in">
            <div className="screen-header">
                <button className="back-btn" onClick={onBack}>←</button>
                <div>
                    <h1 style={{ fontSize: '1.375rem', fontWeight: 800, margin: 0 }}>{year.label}</h1>
                    <div style={{ fontSize: '0.8rem', color: year.locked ? 'var(--color-text-muted)' : '#10b981' }}>
                        {year.locked ? 'Locked' : 'Active'}
                    </div>
                </div>
            </div>

            <div className="screen">
                {/* Navigation buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
                    <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.75rem 0.5rem' }}
                        onClick={() => onNavigate('recipients')}>
                        Recipients
                    </button>
                    <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.75rem 0.5rem' }}
                        onClick={() => onNavigate('trustees')}>
                        Trustees
                    </button>
                </div>

                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>Profiles</h2>

                {profiles.length === 0 ? (
                    <EmptyState title="No Profiles" subtitle="Add a profile to start tracking" />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {profiles.map(p => {
                            const stats = profileStats[p.id] || {};
                            return (
                                <div key={p.id} className="card card-interactive"
                                    onClick={() => onNavigate('profile', { yearId, profileId: p.id })}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{p.name}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {!year.locked && profiles.length > 1 && (
                                                <button style={{
                                                    background: 'none', border: 'none', color: '#ef4444',
                                                    cursor: 'pointer', fontSize: '0.75rem', padding: '0.25rem',
                                                }}
                                                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(p); }}>
                                                    Delete
                                                </button>
                                            )}
                                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>→</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Due</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{formatCurrency(stats.zakatDue || 0)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Given</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{formatCurrency(stats.given || 0)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Remaining</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: (stats.remaining || 0) > 0 ? '#fbbf24' : '#10b981' }}>
                                                {formatCurrency(stats.remaining || 0)}
                                            </div>
                                        </div>
                                        {(stats.surplus || 0) > 0 && (
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Surplus</div>
                                                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#22c55e' }}>+{formatCurrency(stats.surplus)}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!year.locked && (
                    <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setShowAddProfile(true)}>
                        + Add Profile
                    </button>
                )}

                <Modal isOpen={showAddProfile} onClose={() => setShowAddProfile(false)} title="Add Profile">
                    <label className="label">Name</label>
                    <input
                        className="input-field"
                        placeholder="e.g. Wife, Mother"
                        value={newProfileName}
                        onChange={e => setNewProfileName(e.target.value)}
                        autoFocus
                    />
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleAddProfile}>
                        Add Profile
                    </button>
                </Modal>

                {/* Delete Profile Confirmation */}
                <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)}
                    title="Delete Profile">
                    {showDeleteConfirm && (
                        <div>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>? This will permanently remove all their holdings, interest entries, and payment records.
                            </p>
                            <div style={{ display: 'flex', gap: '0.625rem' }}>
                                <button className="btn btn-secondary" style={{ flex: 1 }}
                                    onClick={() => setShowDeleteConfirm(null)}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }}
                                    onClick={() => handleDeleteProfile(showDeleteConfirm.id)}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </div>
    );
}
