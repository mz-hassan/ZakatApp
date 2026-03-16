import { useState, useEffect } from 'react';
import { LedgerService } from '../services/ledger';
import { RecipientsService } from '../services/recipients';
import { ProfilesService } from '../services/profiles';
import { ZakatYearsService } from '../services/zakatYears';
import { TrusteesService } from '../services/trustees';
import { LEDGER_TYPES } from '../utils/constants';
import { formatCurrency, formatDate, todayISO } from '../utils/format';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function PaymentsScreen({ yearId, profileId, onBack }) {
    const [tab, setTab] = useState('completed');
    const [planned, setPlanned] = useState([]);
    const [completed, setCompleted] = useState([]);
    const [recipients, setRecipients] = useState({});
    const [trustees, setTrustees] = useState({});
    const [profile, setProfile] = useState(null);
    const [year, setYear] = useState(null);
    const [editEntry, setEditEntry] = useState(null);
    const [editForm, setEditForm] = useState({ amount: '', date: '', notes: '' });

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

    function openEdit(entry) {
        setEditEntry(entry);
        setEditForm({
            amount: String(entry.amount),
            date: entry.date ? entry.date.split('T')[0] : todayISO(),
            notes: entry.notes || '',
        });
    }

    async function handleSaveEdit() {
        if (!editEntry || !editForm.amount) return;
        await LedgerService.update(editEntry.id, {
            amount: Number(editForm.amount),
            date: editForm.date || editEntry.date,
            notes: editForm.notes,
        });
        setEditEntry(null);
        await loadData();
    }

    if (!profile || !year) return null;

    const renderEntry = (entry, showMarkPaid = false) => (
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
                <div style={{ fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>{formatCurrency(entry.amount)}</div>
            </div>
            {!year.locked && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
                    {showMarkPaid && (
                        <button style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '0.25rem 0' }}
                            onClick={() => markAsPaid(entry)}>Mark Paid</button>
                    )}
                    <button style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '0.25rem 0' }}
                        onClick={() => openEdit(entry)}>Edit</button>
                    <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', padding: '0.25rem 0' }}
                        onClick={() => deleteEntry(entry.id)}>Delete</button>
                </div>
            )}
        </div>
    );

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
                            {completed.map(entry => renderEntry(entry, false))}
                        </div>
                    )
                )}

                {/* Planned Tab */}
                {tab === 'planned' && (
                    planned.length === 0 ? (
                        <EmptyState title="No Planned Payments" subtitle="Plan payments to track who to give to" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {planned.map(entry => renderEntry(entry, true))}
                        </div>
                    )
                )}

                {/* Edit Payment Modal */}
                <Modal isOpen={!!editEntry} onClose={() => setEditEntry(null)} title="Edit Payment">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        <div>
                            <label className="label">Amount (₹)</label>
                            <input className="input-field" type="number" value={editForm.amount}
                                onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Date</label>
                            <input className="input-field" type="date" value={editForm.date}
                                onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Notes</label>
                            <input className="input-field" placeholder="Optional notes" value={editForm.notes}
                                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                        </div>
                        <button className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
                    </div>
                </Modal>
            </div>
        </div>
    );
}
