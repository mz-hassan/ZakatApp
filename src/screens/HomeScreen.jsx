import { useState, useEffect } from 'react';
import { ZakatYearsService } from '../services/zakatYears';
import { ZakatService } from '../services/zakat';
import { formatCurrency } from '../utils/format';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function HomeScreen({ onNavigate }) {
    const [years, setYears] = useState([]);
    const [yearStats, setYearStats] = useState({});
    const [loading, setLoading] = useState(true);

    const [showNewYear, setShowNewYear] = useState(false);
    const [newYearLabel, setNewYearLabel] = useState('');

    const [openMenuId, setOpenMenuId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [showRenameYear, setShowRenameYear] = useState(null); // year object
    const [renameLabel, setRenameLabel] = useState('');
    const [showUnlockConfirm, setShowUnlockConfirm] = useState(null);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setLoading(true);
        const allYears = await ZakatYearsService.getAll();
        setYears(allYears);
        const stats = {};
        for (const y of allYears) {
            stats[y.id] = await ZakatService.calculateForYear(y.id);
        }
        setYearStats(stats);
        setLoading(false);
    }

    async function handleNewYear() {
        if (!newYearLabel.trim()) return;
        await ZakatYearsService.startNewYear(newYearLabel.trim());
        setShowNewYear(false);
        setNewYearLabel('');
        await loadData();
    }

    async function handleRenameYear() {
        if (!renameLabel.trim() || !showRenameYear) return;
        await ZakatYearsService.rename(showRenameYear.id, renameLabel.trim());
        setShowRenameYear(null);
        setRenameLabel('');
        await loadData();
    }

    async function handleUnlockYear(year) {
        await ZakatYearsService.unlock(year.id);
        setShowUnlockConfirm(null);
        await loadData();
    }

    async function handleDeleteYear(year) {
        await ZakatYearsService.delete(year.id);
        setShowDeleteConfirm(null);
        await loadData();
    }

    const activeYear = years.find(y => !y.locked);
    const pastYears = years.filter(y => y.locked);

    return (
        <div className="screen fade-in" onClick={() => setOpenMenuId(null)}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
                <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 0.75rem',
                    fontSize: '1rem', fontWeight: 800, color: '#fff',
                    letterSpacing: '-0.02em',
                }}>ZM</div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem', color: 'var(--text, #f0f0f0)' }}>Zakat Manager</h1>
                <p style={{ color: 'var(--text-muted, #666)', fontSize: '0.85rem', margin: 0 }}>Track & distribute your zakat</p>
            </div>

            {/* Active Year Card */}
            {activeYear ? (
                <div className="card" style={{
                    marginBottom: '1rem',
                    background: 'linear-gradient(135deg, #064e3b, #065f46)',
                    border: '1px solid #047857',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Year</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{activeYear.label}</div>
                        </div>
                        <div style={{
                            padding: '0.2rem 0.7rem', borderRadius: '2rem',
                            background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)',
                            fontSize: '0.72rem', fontWeight: 600, color: '#6ee7b7',
                        }}>Active</div>
                    </div>

                    {yearStats[activeYear.id] && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#a7f3d0' }}>Zakat Due</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{formatCurrency(yearStats[activeYear.id].totalDue)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#a7f3d0' }}>Given</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{formatCurrency(yearStats[activeYear.id].totalGiven)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#a7f3d0' }}>Remaining</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: yearStats[activeYear.id].remaining > 0 ? '#fbbf24' : '#6ee7b7' }}>
                                    {formatCurrency(yearStats[activeYear.id].remaining)}
                                </div>
                            </div>
                            {yearStats[activeYear.id].surplus > 0 && (
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: '#a7f3d0' }}>Surplus</div>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#22c55e' }}>+{formatCurrency(yearStats[activeYear.id].surplus)}</div>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        className="btn btn-primary"
                        style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
                        onClick={() => onNavigate('year', { yearId: activeYear.id })}
                    >Open Year →</button>
                </div>
            ) : (
                <div className="card" style={{ marginBottom: '1rem', textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text, #f0f0f0)' }}>No Active Zakat Year</div>
                    <div style={{ color: 'var(--text-muted, #666)', fontSize: '0.85rem' }}>Start a new year to begin tracking</div>
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <button className="btn btn-gold" onClick={() => setShowNewYear(true)}>New Year</button>
                <button className="btn btn-secondary" onClick={() => onNavigate('settings')}>Settings</button>
            </div>

            {/* Past Years */}
            {pastYears.length > 0 && (
                <>
                    <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary, #999)', marginBottom: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Past Years
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {pastYears.map(y => (
                            <div
                                key={y.id}
                                className="card card-interactive"
                                style={{ position: 'relative', padding: '0.875rem 1rem' }}
                                onClick={() => onNavigate('year', { yearId: y.id })}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text, #f0f0f0)' }}>{y.label}</div>
                                        {yearStats[y.id] && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #999)', marginTop: '0.2rem' }}>
                                                Due: {formatCurrency(yearStats[y.id].totalDue)} · Given: {formatCurrency(yearStats[y.id].totalGiven)}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <div style={{
                                            padding: '0.175rem 0.55rem', borderRadius: '1rem',
                                            background: 'var(--surface-3, #222)', fontSize: '0.68rem',
                                            color: 'var(--text-muted, #666)', fontWeight: 600,
                                        }}>Locked</div>
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === y.id ? null : y.id);
                                            }}
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                color: 'var(--text-muted, #666)', fontSize: '1.2rem',
                                                padding: '0.25rem 0.375rem', lineHeight: 1,
                                                letterSpacing: '0.06em',
                                            }}
                                            aria-label="Year options"
                                        >⋮</button>
                                    </div>
                                </div>

                                {/* Dropdown */}
                                {openMenuId === y.id && (
                                    <div
                                        onClick={e => e.stopPropagation()}
                                        style={{
                                            position: 'absolute', top: '3rem', right: '0.75rem', zIndex: 20,
                                            background: 'var(--surface-3, #222)', border: '1px solid var(--border, #333)',
                                            borderRadius: '0.625rem', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                            overflow: 'hidden', minWidth: 150,
                                        }}
                                    >
                                        <button
                                            onClick={() => { setOpenMenuId(null); setRenameLabel(y.label); setShowRenameYear(y); }}
                                            style={menuItemStyle}
                                        >Rename</button>
                                        <button
                                            onClick={() => { setOpenMenuId(null); setShowUnlockConfirm(y); }}
                                            style={menuItemStyle}
                                        >Unlock Year</button>
                                        <button
                                            onClick={() => { setOpenMenuId(null); setShowDeleteConfirm(y); }}
                                            style={{ ...menuItemStyle, color: '#ef4444', borderTop: '1px solid var(--border, #333)' }}
                                        >Delete</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* New Year Modal */}
            <Modal isOpen={showNewYear} onClose={() => setShowNewYear(false)} title="Start New Zakat Year">
                <p style={{ color: 'var(--text-secondary, #999)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    This will lock the current year and create a new one with a snapshot of all holdings.
                </p>
                <label className="label">Year Label</label>
                <input
                    className="input-field"
                    placeholder="e.g. 1447 AH"
                    value={newYearLabel}
                    onChange={e => setNewYearLabel(e.target.value)}
                    autoFocus
                />
                <button className="btn btn-gold" style={{ marginTop: '1rem' }} onClick={handleNewYear}>
                    Confirm & Start Year
                </button>
            </Modal>

            {/* Rename Year Modal */}
            <Modal isOpen={!!showRenameYear} onClose={() => setShowRenameYear(null)} title="Rename Year">
                <label className="label">Year Label</label>
                <input
                    className="input-field"
                    value={renameLabel}
                    onChange={e => setRenameLabel(e.target.value)}
                    autoFocus
                />
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleRenameYear}>
                    Save
                </button>
            </Modal>

            {/* Unlock Year Modal */}
            <Modal isOpen={!!showUnlockConfirm} onClose={() => setShowUnlockConfirm(null)} title="Unlock Year">
                {showUnlockConfirm && (
                    <div>
                        <p style={{ color: 'var(--text-secondary, #999)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                            Unlock <strong>{showUnlockConfirm.label}</strong> to make changes? This will let you edit holdings and payments for this year.
                        </p>
                        <div style={{ display: 'flex', gap: '0.625rem' }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowUnlockConfirm(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleUnlockYear(showUnlockConfirm)}>Unlock</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Year Modal */}
            <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Delete Year">
                {showDeleteConfirm && (
                    <div>
                        <p style={{ color: 'var(--text-secondary, #999)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                            Permanently delete <strong>{showDeleteConfirm.label}</strong>? All payments, interest entries, and snapshots for this year will be removed.
                        </p>
                        <div style={{ display: 'flex', gap: '0.625rem' }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444' }} onClick={() => handleDeleteYear(showDeleteConfirm)}>Delete</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

const menuItemStyle = {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '0.75rem 1rem', background: 'none', border: 'none',
    color: 'var(--text, #f0f0f0)', cursor: 'pointer', fontSize: '0.875rem',
};