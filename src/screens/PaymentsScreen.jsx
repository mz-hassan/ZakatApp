import { useState, useEffect } from 'react';
import { LedgerService } from '../services/ledger';
import { RecipientsService } from '../services/recipients';
import { ProfilesService } from '../services/profiles';
import { ZakatYearsService } from '../services/zakatYears';
import { TrusteesService } from '../services/trustees';
import { LEDGER_TYPES } from '../utils/constants';
import { formatCurrency, formatDate } from '../utils/format';
import EmptyState from '../components/EmptyState';

export default function PaymentsScreen({ yearId, profileId, onBack }) {
    const [tab, setTab] = useState('completed');
    const [planned, setPlanned] = useState([]);
    const [completed, setCompleted] = useState([]);
    const [recipients, setRecipients] = useState({});
    const [trustees, setTrustees] = useState({});
    const [profile, setProfile] = useState(null);
    const [year, setYear] = useState(null);

    useEffect(() => { loadData(); }, [yearId, profileId]);

    async function loadData() {
        const [entries, allRecipients, allTrustees, p, y] = await Promise.all([
            LedgerService.getByYearAndProfile(yearId, profileId),
            RecipientsService.getAll(),
            TrusteesService.getAll(),
            ProfilesService.get(profileId),
            ZakatYearsService.get(yearId),
        ]);

        const recipientMap = {};
        allRecipients.forEach(r => { recipientMap[r.id] = r.name; });
        setRecipients(recipientMap);

        const trusteeMap = {};
        allTrustees.forEach(t => { trusteeMap[t.id] = t.name; });
        setTrustees(trusteeMap);

        setProfile(p);
        setYear(y);

        setPlanned(entries.filter(e => e.type === LEDGER_TYPES.ZAKAT_PAYMENT_PLANNED).reverse());
        setCompleted(entries.filter(e => e.type === LEDGER_TYPES.ZAKAT_PAYMENT_COMPLETED).reverse());
    }

    async function markAsPaid(entry) {
        await LedgerService.update(entry.id, {
            type: LEDGER_TYPES.ZAKAT_PAYMENT_COMPLETED,
            date: new Date().toISOString(),
        });
        await loadData();
    }

    async function deleteEntry(id) {
        if (!confirm('Delete this entry?')) return;
        await LedgerService.delete(id);
        await loadData();
    }

    if (!profile || !year) return null;

    return (
        <div className="fade-in">
            <div className="screen-header">
                <button className="back-btn" onClick={onBack}>←</button>
                <div>
                    <h1 style={{ margin: 0 }}>Payments</h1>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{profile.name} · {year.label}</div>
                </div>
            </div>

            <div className="screen">
                {/* Tabs */}
                <div className="tabs">
                    <button className={`tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>
                        Completed ({completed.length})
                    </button>
                    <button className={`tab ${tab === 'planned' ? 'active' : ''}`} onClick={() => setTab('planned')}>
                        Planned ({planned.length})
                    </button>
                </div>

                {/* Completed Tab */}
                {tab === 'completed' && (
                    completed.length === 0 ? (
                        <EmptyState title="No Completed Payments" subtitle="Payments you make will appear here" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {completed.map(entry => (
                                <div key={entry.id} className="card" style={{ padding: '0.875rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{recipients[entry.recipientId] || 'Unknown'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                                                {formatDate(entry.date)}
                                            </div>
                                            {entry.trusteeId && trustees[entry.trusteeId] && (
                                                <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginTop: '0.125rem' }}>
                                                    In trust of: {trustees[entry.trusteeId]}
                                                </div>
                                            )}
                                            {entry.notes && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{entry.notes}</div>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(entry.amount)}</div>
                                            {!year.locked && (
                                                <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', marginTop: '0.25rem' }}
                                                    onClick={() => deleteEntry(entry.id)}>Delete</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* Planned Tab */}
                {tab === 'planned' && (
                    planned.length === 0 ? (
                        <EmptyState title="No Planned Payments" subtitle="Plan payments to track who to give to" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {planned.map(entry => (
                                <div key={entry.id} className="card" style={{ padding: '0.875rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{recipients[entry.recipientId] || 'Unknown'}</div>
                                            {entry.trusteeId && trustees[entry.trusteeId] && (
                                                <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginTop: '0.125rem' }}>
                                                    In trust of: {trustees[entry.trusteeId]}
                                                </div>
                                            )}
                                            {entry.notes && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{entry.notes}</div>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700 }}>{formatCurrency(entry.amount)}</div>
                                        </div>
                                    </div>
                                    {!year.locked && (
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                                            <button className="btn btn-primary" style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                                                onClick={() => markAsPaid(entry)}>
                                                Mark Paid
                                            </button>
                                            <button className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.85rem', maxWidth: 80 }}
                                                onClick={() => deleteEntry(entry.id)}>
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
