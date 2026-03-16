import { useState, useEffect } from 'react';
import { RecipientsService } from '../services/recipients';
import { TrusteesService } from '../services/trustees';
import { LedgerService } from '../services/ledger';
import { LEDGER_TYPES } from '../utils/constants';
import { formatCurrency, formatDate } from '../utils/format';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function RecipientsScreen({ onBack }) {
    const [tab, setTab] = useState('recipients');
    const [recipients, setRecipients] = useState([]);
    const [trustees, setTrustees] = useState([]);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedRecipient, setSelectedRecipient] = useState(null);
    const [recipientPayments, setRecipientPayments] = useState([]);
    const [recipientTotal, setRecipientTotal] = useState(0);
    const [trusteeMap, setTrusteeMap] = useState({});
    const [profileMap, setProfileMap] = useState({});
    const [yearMap, setYearMap] = useState({});

    // Trustee detail
    const [selectedTrustee, setSelectedTrustee] = useState(null);
    const [trusteeHistory, setTrusteeHistory] = useState([]);
    const [trusteeTotal, setTrusteeTotal] = useState(0);
    const [profiles, setProfiles] = useState({});
    const [years, setYears] = useState({});

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const [r, t] = await Promise.all([
            RecipientsService.getAll(),
            TrusteesService.getAll(),
        ]);
        setRecipients(r);
        setTrustees(t);
        const tMap = {};
        t.forEach(tr => { tMap[tr.id] = tr.name; });
        setTrusteeMap(tMap);
    }

    async function handleAddRecipient() {
        if (!newName.trim()) return;
        await RecipientsService.add(newName.trim());
        setShowAdd(false);
        setNewName('');
        await loadData();
    }

    async function handleAddTrustee() {
        if (!newName.trim()) return;
        await TrusteesService.add(newName.trim());
        setShowAdd(false);
        setNewName('');
        await loadData();
    }

    async function handleDeleteRecipient(id) {
        if (!confirm('Delete this recipient?')) return;
        setSelectedRecipient(null);
        await RecipientsService.delete(id);
        await loadData();
    }

    async function handleDeleteTrustee(id) {
        if (!confirm('Delete this trustee?')) return;
        setSelectedTrustee(null);
        await TrusteesService.delete(id);
        await loadData();
    }

    async function viewRecipient(recipient) {
        setSelectedRecipient(recipient);
        const entries = await LedgerService.getByRecipient(recipient.id);
        const payments = entries.filter(e => e.type === LEDGER_TYPES.ZAKAT_PAYMENT_COMPLETED)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        setRecipientPayments(payments);
        setRecipientTotal(payments.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));

        // Load profile and year names
        const { ProfilesService } = await import('../services/profiles');
        const { ZakatYearsService } = await import('../services/zakatYears');
        const allProfiles = await ProfilesService.getAll();
        const allYears = await ZakatYearsService.getAll();
        const pMap = {};
        allProfiles.forEach(p => { pMap[p.id] = p.name; });
        setProfileMap(pMap);
        const yMap = {};
        allYears.forEach(y => { yMap[y.id] = y.label; });
        setYearMap(yMap);
    }

    async function viewTrustee(trustee) {
        setSelectedTrustee(trustee);
        // Load all ledger entries with this trusteeId
        const { db } = await import('../db/db');
        const entries = await db.ledger.where('trusteeId').equals(trustee.id).toArray();
        const payments = entries.filter(e =>
            e.type === LEDGER_TYPES.ZAKAT_PAYMENT_COMPLETED || e.type === LEDGER_TYPES.ZAKAT_PAYMENT_PLANNED
        ).sort((a, b) => new Date(b.date) - new Date(a.date));
        setTrusteeHistory(payments);
        setTrusteeTotal(payments.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));

        // Load profile and year names for display
        const { ProfilesService } = await import('../services/profiles');
        const { ZakatYearsService } = await import('../services/zakatYears');
        const allProfiles = await ProfilesService.getAll();
        const allYears = await ZakatYearsService.getAll();
        const pMap = {};
        allProfiles.forEach(p => { pMap[p.id] = p.name; });
        setProfiles(pMap);
        const yMap = {};
        allYears.forEach(y => { yMap[y.id] = y.label; });
        setYears(yMap);
    }

    const filteredRecipients = search
        ? recipients.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
        : recipients;

    const filteredTrustees = search
        ? trustees.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
        : trustees;

    return (
        <div className="fade-in">
            <div className="screen-header">
                <button className="back-btn" onClick={onBack}>←</button>
                <h1 style={{ margin: 0 }}>Recipients & Trustees</h1>
            </div>

            <div className="screen">
                {/* Tabs */}
                <div className="tabs" style={{ marginBottom: '0.75rem' }}>
                    <button className={`tab ${tab === 'recipients' ? 'active' : ''}`}
                        onClick={() => { setTab('recipients'); setSearch(''); }}>
                        Recipients ({recipients.length})
                    </button>
                    <button className={`tab ${tab === 'trustees' ? 'active' : ''}`}
                        onClick={() => { setTab('trustees'); setSearch(''); }}>
                        Trustees ({trustees.length})
                    </button>
                </div>

                {/* Search + Add */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input className="input-field" style={{ flex: 1 }}
                        placeholder={`Search ${tab}...`} value={search}
                        onChange={e => setSearch(e.target.value)} />
                    <button className="btn btn-primary" style={{ width: 'auto', padding: '0 1rem', fontSize: '0.85rem' }}
                        onClick={() => { setNewName(''); setShowAdd(true); }}>
                        + Add
                    </button>
                </div>

                {/* Recipients Tab */}
                {tab === 'recipients' && (
                    filteredRecipients.length === 0 ? (
                        <EmptyState title="No Recipients" subtitle={search ? 'No matches found' : 'Add recipients to track distributions'} />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {filteredRecipients.map(r => (
                                <div key={r.id} className="card card-interactive" style={{ padding: '0.875rem' }}
                                    onClick={() => viewRecipient(r)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>View →</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* Trustees Tab */}
                {tab === 'trustees' && (
                    filteredTrustees.length === 0 ? (
                        <EmptyState title="No Trustees" subtitle={search ? 'No matches found' : 'Add trustees to track distributions'} />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {filteredTrustees.map(t => (
                                <div key={t.id} className="card card-interactive" style={{ padding: '0.875rem' }}
                                    onClick={() => viewTrustee(t)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>View →</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* Add Modal */}
                <Modal isOpen={showAdd} onClose={() => setShowAdd(false)}
                    title={tab === 'recipients' ? 'Add Recipient' : 'Add Trustee'}>
                    <label className="label">Name</label>
                    <input className="input-field" placeholder={`${tab === 'recipients' ? 'Recipient' : 'Trustee'} name`}
                        value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }}
                        onClick={tab === 'recipients' ? handleAddRecipient : handleAddTrustee}>
                        Add {tab === 'recipients' ? 'Recipient' : 'Trustee'}
                    </button>
                </Modal>

                {/* Recipient Detail Modal */}
                <Modal isOpen={!!selectedRecipient} onClose={() => setSelectedRecipient(null)}
                    title={selectedRecipient?.name || ''}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div className="stat-row">
                            <span className="stat-label" style={{ fontWeight: 600 }}>Total Given</span>
                            <span className="stat-value" style={{ color: '#10b981', fontSize: '1.25rem' }}>{formatCurrency(recipientTotal)}</span>
                        </div>

                        {recipientPayments.length === 0 ? (
                            <EmptyState title="No Payment History" subtitle="No completed payments to this recipient" />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '30vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                {recipientPayments.map(entry => (
                                    <div key={entry.id} className="card" style={{ padding: '0.75rem', flexShrink: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '0.85rem' }}>{formatDate(entry.date)}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                                                    {profileMap[entry.profileId] || '—'} · {yearMap[entry.zakatYearId] || '—'}
                                                </div>
                                                {entry.trusteeId && trusteeMap[entry.trusteeId] && (
                                                    <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginTop: '0.125rem' }}>
                                                        In trust of: {trusteeMap[entry.trusteeId]}
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

                        {selectedRecipient && selectedRecipient.name.toLowerCase() !== 'anonymous' && (
                            <button className="btn btn-secondary" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                                onClick={() => handleDeleteRecipient(selectedRecipient.id)}>
                                Delete Recipient
                            </button>
                        )}
                    </div>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '30vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                {trusteeHistory.map(entry => (
                                    <div key={entry.id} className="card" style={{ padding: '0.75rem', flexShrink: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '0.85rem' }}>{profiles[entry.profileId] || '—'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                    {years[entry.zakatYearId] || '—'} · {formatDate(entry.date)}
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(entry.amount)}</div>
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
