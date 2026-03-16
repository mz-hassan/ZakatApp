import { useState, useEffect } from 'react';
import { RecipientsService } from '../services/recipients';
import { LedgerService } from '../services/ledger';
import { TrusteesService } from '../services/trustees';
import { LEDGER_TYPES } from '../utils/constants';
import { formatCurrency, formatDate } from '../utils/format';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function RecipientsScreen({ onBack }) {
    const [recipients, setRecipients] = useState([]);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedRecipient, setSelectedRecipient] = useState(null);
    const [recipientPayments, setRecipientPayments] = useState([]);
    const [recipientTotal, setRecipientTotal] = useState(0);
    const [trustees, setTrustees] = useState({});

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const [r, t] = await Promise.all([
            RecipientsService.getAll(),
            TrusteesService.getAll(),
        ]);
        setRecipients(r);
        const trusteeMap = {};
        t.forEach(tr => { trusteeMap[tr.id] = tr.name; });
        setTrustees(trusteeMap);
    }

    async function handleAdd() {
        if (!newName.trim()) return;
        await RecipientsService.add(newName.trim());
        setShowAdd(false);
        setNewName('');
        await loadData();
    }

    async function viewRecipient(recipient) {
        setSelectedRecipient(recipient);
        const entries = await LedgerService.getByRecipient(recipient.id);
        const payments = entries.filter(e => e.type === LEDGER_TYPES.ZAKAT_PAYMENT_COMPLETED)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        setRecipientPayments(payments);
        setRecipientTotal(payments.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));
    }

    const filtered = search
        ? recipients.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
        : recipients;

    return (
        <div className="fade-in">
            <div className="screen-header">
                <button className="back-btn" onClick={onBack}>←</button>
                <h1 style={{ margin: 0 }}>Recipients</h1>
            </div>

            <div className="screen">
                {/* Search + Add */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input className="input-field" style={{ flex: 1 }}
                        placeholder="Search recipients..." value={search}
                        onChange={e => setSearch(e.target.value)} />
                    <button className="btn btn-primary" style={{ width: 'auto', padding: '0 1rem', fontSize: '0.85rem' }}
                        onClick={() => setShowAdd(true)}>
                        + Add
                    </button>
                </div>

                {/* Recipients List */}
                {filtered.length === 0 ? (
                    <EmptyState title="No Recipients" subtitle={search ? 'No matches found' : 'Add recipients to track distributions'} />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filtered.map(r => (
                            <div key={r.id} className="card card-interactive" style={{ padding: '0.875rem' }}
                                onClick={() => viewRecipient(r)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>View →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Recipient Modal */}
                <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Recipient">
                    <label className="label">Name</label>
                    <input className="input-field" placeholder="Recipient name" value={newName}
                        onChange={e => setNewName(e.target.value)} autoFocus />
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleAdd}>
                        Add Recipient
                    </button>
                </Modal>

                {/* Recipient Detail Modal */}
                <Modal isOpen={!!selectedRecipient} onClose={() => setSelectedRecipient(null)}
                    title={selectedRecipient?.name || ''}>
                    <div className="stat-row" style={{ marginBottom: '1rem' }}>
                        <span className="stat-label" style={{ fontWeight: 600 }}>Total Given</span>
                        <span className="stat-value" style={{ color: '#10b981', fontSize: '1.25rem' }}>{formatCurrency(recipientTotal)}</span>
                    </div>

                    {recipientPayments.length === 0 ? (
                        <EmptyState title="No Payment History" subtitle="No completed payments to this recipient" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '40vh', overflowY: 'auto' }}>
                            {recipientPayments.map(entry => (
                                <div key={entry.id} className="card" style={{ padding: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '0.85rem' }}>{formatDate(entry.date)}</div>
                                            {entry.trusteeId && trustees[entry.trusteeId] && (
                                                <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginTop: '0.125rem' }}>
                                                    In trust of: {trustees[entry.trusteeId]}
                                                </div>
                                            )}
                                            {entry.notes && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>{entry.notes}</div>
                                            )}
                                        </div>
                                        <div style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(entry.amount)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Modal>
            </div>
        </div>
    );
}
