import { useState, useEffect } from 'react';
import { TrusteesService } from '../services/trustees';
import { ProfilesService } from '../services/profiles';
import { ZakatYearsService } from '../services/zakatYears';
import { RecipientsService } from '../services/recipients';
import { LEDGER_TYPES } from '../utils/constants';
import { formatCurrency, formatDate } from '../utils/format';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function TrusteesScreen({ onBack }) {
    const [trustees, setTrustees] = useState([]);
    const [trusteeTotals, setTrusteeTotals] = useState({});
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedTrustee, setSelectedTrustee] = useState(null);
    const [trusteeHistory, setTrusteeHistory] = useState([]);
    const [trusteeTotal, setTrusteeTotal] = useState(0);
    const [profiles, setProfiles] = useState({});
    const [years, setYears] = useState({});
    const [recipients, setRecipients] = useState({});

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const [t, p, y, r] = await Promise.all([
            TrusteesService.getAll(),
            ProfilesService.getAll(),
            ZakatYearsService.getAll(),
            RecipientsService.getAll(),
        ]);
        setTrustees(t);
        const profileMap = {};
        p.forEach(pr => { profileMap[pr.id] = pr.name; });
        setProfiles(profileMap);
        const yearMap = {};
        y.forEach(yr => { yearMap[yr.id] = yr.label; });
        setYears(yearMap);
        const recipientMap = {};
        r.forEach(rc => { recipientMap[rc.id] = rc.name; });
        setRecipients(recipientMap);

        const totals = {};
        for (const trustee of t) {
            totals[trustee.id] = await TrusteesService.getTotalByTrustee(trustee.id);
        }
        setTrusteeTotals(totals);
    }

    async function handleAdd() {
        if (!newName.trim()) return;
        await TrusteesService.add(newName.trim());
        setShowAdd(false);
        setNewName('');
        await loadData();
    }

    async function viewTrustee(trustee) {
        setSelectedTrustee(trustee);
        const entries = await TrusteesService.getEntriesByTrustee(trustee.id);
        setTrusteeHistory(entries);
        setTrusteeTotal(entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));
    }

    async function handleDeleteTrustee(id) {
        if (!confirm('Delete this trustee? This will not remove any payment records.')) return;
        await TrusteesService.delete(id);
        setSelectedTrustee(null);
        await loadData();
    }

    const filtered = search
        ? trustees.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
        : trustees;

    return (
        <div className="fade-in">
            <div className="screen-header">
                <button className="back-btn" onClick={onBack}>←</button>
                <h1 style={{ margin: 0 }}>Trustees</h1>
            </div>

            <div className="screen">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>All Trustees</h2>
                    <button className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        onClick={() => setShowAdd(true)}>
                        + Add
                    </button>
                </div>

                <input className="input-field" placeholder="Search trustees..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ marginBottom: '0.75rem' }} />

                {filtered.length === 0 ? (
                    <EmptyState title="No Trustees" subtitle={search ? 'No matches found' : 'Add a trustee to track distributions'} />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filtered.map(t => (
                            <div key={t.id} className="card card-interactive" style={{ padding: '0.875rem' }}
                                onClick={() => viewTrustee(t)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                                        {(trusteeTotals[t.id] || 0) > 0 && (
                                            <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.125rem' }}>
                                                Distributed: {formatCurrency(trusteeTotals[t.id])}
                                            </div>
                                        )}
                                    </div>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>View →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Trustee Modal */}
                <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Trustee">
                    <label className="label">Name</label>
                    <input className="input-field" placeholder="Trustee name" value={newName}
                        onChange={e => setNewName(e.target.value)} autoFocus />
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleAdd}>
                        Add Trustee
                    </button>
                </Modal>

                {/* Trustee Detail Modal */}
                <Modal isOpen={!!selectedTrustee} onClose={() => setSelectedTrustee(null)}
                    title={selectedTrustee?.name || ''}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div className="stat-row">
                            <span className="stat-label" style={{ fontWeight: 600 }}>Total Distributed</span>
                            <span className="stat-value" style={{ color: '#10b981', fontSize: '1.25rem' }}>{formatCurrency(trusteeTotal)}</span>
                        </div>

                        {trusteeHistory.length === 0 ? (
                            <EmptyState title="No History" subtitle="No payments distributed through this trustee" />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '40vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                {trusteeHistory.map(entry => (
                                    <div key={entry.id} className="card" style={{ padding: '0.75rem', flexShrink: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                {/* Recipient - who the money went to */}
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                    → {entry.recipientId && recipients[entry.recipientId]
                                                        ? recipients[entry.recipientId]
                                                        : 'Anonymous'}
                                                </div>
                                                {/* Profile - whose zakat it was */}
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                                                    From: {profiles[entry.profileId] || 'Unknown profile'}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                                                    {years[entry.zakatYearId] || 'Unknown year'} · {formatDate(entry.date)}
                                                </div>
                                                {entry.notes && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>{entry.notes}</div>
                                                )}
                                            </div>
                                            <div style={{ fontWeight: 700, color: '#10b981', flexShrink: 0, marginLeft: '0.5rem' }}>
                                                {formatCurrency(entry.amount)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedTrustee && selectedTrustee.name !== 'Anonymous' && (
                            <button className="btn btn-secondary" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                                onClick={() => handleDeleteTrustee(selectedTrustee.id)}>
                                Delete Trustee
                            </button>
                        )}
                    </div>
                </Modal>
            </div>
        </div>
    );
}
