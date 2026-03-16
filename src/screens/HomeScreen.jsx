import { useState, useEffect } from 'react';
import { ZakatYearsService } from '../services/zakatYears';
import { ZakatService } from '../services/zakat';
import { formatCurrency } from '../utils/format';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function HomeScreen({ onNavigate }) {
    const [years, setYears] = useState([]);
    const [yearStats, setYearStats] = useState({});
    const [showNewYear, setShowNewYear] = useState(false);
    const [newYearLabel, setNewYearLabel] = useState('');
    const [loading, setLoading] = useState(true);

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

    const activeYear = years.find(y => !y.locked);
    const pastYears = years.filter(y => y.locked);

    return (
        <div className="screen fade-in">
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
                <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 0.75rem', fontSize: '1.25rem', fontWeight: 800, color: '#fff',
                    letterSpacing: '-0.02em',
                }}>ZM</div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem' }}>Zakat Manager</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>Track & distribute your zakat</p>
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
                            <div style={{ fontSize: '0.8rem', color: '#6ee7b7', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Year</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{activeYear.label}</div>
                        </div>
                        <div style={{
                            padding: '0.25rem 0.75rem', borderRadius: '2rem',
                            background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontSize: '0.75rem', fontWeight: 600, color: '#6ee7b7',
                        }}>Active</div>
                    </div>

                    {yearStats[activeYear.id] && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>Zakat Due</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatCurrency(yearStats[activeYear.id].totalDue)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>Given</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatCurrency(yearStats[activeYear.id].totalGiven)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>Remaining</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: yearStats[activeYear.id].remaining > 0 ? '#fbbf24' : '#6ee7b7' }}>
                                    {formatCurrency(yearStats[activeYear.id].remaining)}
                                </div>
                            </div>
                            {yearStats[activeYear.id].surplus > 0 && (
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>Surplus</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#22c55e' }}>+{formatCurrency(yearStats[activeYear.id].surplus)}</div>
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
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No Active Zakat Year</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Start a new year to begin tracking</div>
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <button className="btn btn-gold" onClick={() => setShowNewYear(true)}>
                    New Year
                </button>
                <button className="btn btn-secondary" onClick={() => onNavigate('settings')}>
                    Settings
                </button>
            </div>

            {/* Past Years */}
            {pastYears.length > 0 && (
                <>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>Past Years</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {pastYears.map(y => (
                            <div key={y.id} className="card card-interactive" onClick={() => onNavigate('year', { yearId: y.id })}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{y.label}</div>
                                        {yearStats[y.id] && (
                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                                                Due: {formatCurrency(yearStats[y.id].totalDue)} · Given: {formatCurrency(yearStats[y.id].totalGiven)}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{
                                        padding: '0.2rem 0.6rem', borderRadius: '1rem',
                                        background: 'var(--color-surface-3)', fontSize: '0.7rem',
                                        color: 'var(--color-text-muted)', fontWeight: 600,
                                    }}>Locked</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* New Year Modal */}
            <Modal isOpen={showNewYear} onClose={() => setShowNewYear(false)} title="Start New Zakat Year">
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    This will lock the current year and create a new one with a snapshot of all holdings.
                </p>
                <label className="label">Hijri Year Label</label>
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
        </div>
    );
}
