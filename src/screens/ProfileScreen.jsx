import { useState, useEffect, useMemo } from 'react';
import { ProfilesService } from '../services/profiles';
import { HoldingsService } from '../services/holdings';
import { ZakatService } from '../services/zakat';
import { ZakatYearsService } from '../services/zakatYears';
import { LedgerService } from '../services/ledger';
import { RecipientsService } from '../services/recipients';
import { TrusteesService } from '../services/trustees';
import { HOLDING_CATEGORIES, LEDGER_TYPES } from '../utils/constants';
import { formatCurrency, formatDate, todayISO } from '../utils/format';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function ProfileScreen({ yearId, profileId, onNavigate, onBack }) {
    const [profile, setProfile] = useState(null);
    const [year, setYear] = useState(null);
    const [holdings, setHoldings] = useState([]);
    const [stats, setStats] = useState({});
    const [showHoldings, setShowHoldings] = useState(false);
    const [showAddHolding, setShowAddHolding] = useState(false);
    const [showInterest, setShowInterest] = useState(false);
    const [showAddInterest, setShowAddInterest] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentType, setPaymentType] = useState('completed');

    // Form state
    const [holdingForm, setHoldingForm] = useState({ name: '', category: 'Bank', value: '', notes: '' });
    const [interestForm, setInterestForm] = useState({ amount: '', holdingId: '', notes: '' });
    const [paymentForm, setPaymentForm] = useState({ recipientId: '', recipientName: '', amount: '', notes: '', date: todayISO(), trusteeId: '', newTrusteeName: '' });
    const [recipientSearch, setRecipientSearch] = useState('');
    const [recipients, setRecipients] = useState([]);
    const [trustees, setTrustees] = useState([]);
    const [editHolding, setEditHolding] = useState(null);
    const [interestEntries, setInterestEntries] = useState([]);
    const [editInterest, setEditInterest] = useState(null);

    useEffect(() => { loadData(); }, [yearId, profileId]);

    async function loadData() {
        const [p, y, h, s, r, t] = await Promise.all([
            ProfilesService.get(profileId),
            ZakatYearsService.get(yearId),
            HoldingsService.getByProfile(profileId),
            ZakatService.calculate(yearId, profileId),
            RecipientsService.getAll(),
            TrusteesService.getAll(),
        ]);
        setProfile(p);
        setYear(y);
        setHoldings(h);
        setStats(s);
        setRecipients(r);
        setTrustees(t);

        const entries = await LedgerService.getByYearAndProfile(yearId, profileId);
        setInterestEntries(entries.filter(e => e.type === LEDGER_TYPES.INTEREST_REMOVED).reverse());
    }

    async function handleAddHolding() {
        if (!holdingForm.name.trim() || !holdingForm.value) return;
        if (editHolding) {
            await HoldingsService.update(editHolding.id, {
                name: holdingForm.name.trim(),
                category: holdingForm.category,
                value: Number(holdingForm.value),
                notes: holdingForm.notes,
            });
        } else {
            await HoldingsService.add({
                profileId,
                name: holdingForm.name.trim(),
                category: holdingForm.category,
                value: Number(holdingForm.value),
                notes: holdingForm.notes,
            });
        }
        await updateHoldingsSnapshot();
        setShowAddHolding(false);
        setEditHolding(null);
        setHoldingForm({ name: '', category: 'Bank', value: '', notes: '' });
        await loadData();
    }

    async function updateHoldingsSnapshot() {
        const total = await HoldingsService.getTotalByProfile(profileId);
        const existingEntries = await LedgerService.getByYearAndProfile(yearId, profileId);
        const oldSnapshot = existingEntries.find(e => e.type === LEDGER_TYPES.HOLDING_UPDATE);
        if (oldSnapshot) await LedgerService.delete(oldSnapshot.id);
        if (total > 0) {
            await LedgerService.add({
                type: LEDGER_TYPES.HOLDING_UPDATE,
                profileId,
                amount: total,
                zakatYearId: yearId,
                notes: 'Holdings updated',
            });
        }
    }

    async function handleDeleteHolding(id) {
        if (!confirm('Delete this holding?')) return;
        await HoldingsService.delete(id);
        await updateHoldingsSnapshot();
        await loadData();
    }

    async function handleAddInterest() {
        if (!interestForm.amount) return;
        if (editInterest) {
            await LedgerService.update(editInterest.id, {
                amount: Number(interestForm.amount),
                holdingId: interestForm.holdingId ? Number(interestForm.holdingId) : undefined,
                notes: interestForm.notes,
            });
        } else {
            await LedgerService.add({
                type: LEDGER_TYPES.INTEREST_REMOVED,
                profileId,
                amount: Number(interestForm.amount),
                holdingId: interestForm.holdingId ? Number(interestForm.holdingId) : undefined,
                zakatYearId: yearId,
                notes: interestForm.notes,
            });
        }
        setShowAddInterest(false);
        setEditInterest(null);
        setInterestForm({ amount: '', holdingId: '', notes: '' });
        await loadData();
    }

    async function handleDeleteInterest(id) {
        if (!confirm('Delete this interest entry?')) return;
        await LedgerService.delete(id);
        await loadData();
    }

    async function handleAddPayment() {
        if (!paymentForm.amount) return;
        let recipientId = paymentForm.recipientId;

        // If "anonymous" is selected, find or create an Anonymous recipient
        if (recipientId === '__anonymous__') {
            let anon = recipients.find(r => r.name.toLowerCase() === 'anonymous');
            if (!anon) {
                recipientId = await RecipientsService.add('Anonymous');
            } else {
                recipientId = anon.id;
            }
        } else if (!recipientId && paymentForm.recipientName.trim()) {
            recipientId = await RecipientsService.add(paymentForm.recipientName.trim());
        }
        if (!recipientId) return;

        // Handle trustee — could be existing or new
        let trusteeId = paymentForm.trusteeId ? Number(paymentForm.trusteeId) : undefined;
        if (paymentForm.trusteeId === '__new__' && paymentForm.newTrusteeName.trim()) {
            trusteeId = await TrusteesService.add(paymentForm.newTrusteeName.trim());
        } else if (paymentForm.trusteeId === '__new__') {
            trusteeId = undefined; // new name was empty, skip
        }

        const type = paymentType === 'planned' ? LEDGER_TYPES.ZAKAT_PAYMENT_PLANNED : LEDGER_TYPES.ZAKAT_PAYMENT_COMPLETED;
        await LedgerService.add({
            type,
            profileId,
            recipientId,
            trusteeId,
            amount: Number(paymentForm.amount),
            zakatYearId: yearId,
            notes: paymentForm.notes,
            date: paymentForm.date || new Date().toISOString(),
        });
        setShowPayment(false);
        setPaymentForm({ recipientId: '', recipientName: '', amount: '', notes: '', date: todayISO(), trusteeId: '', newTrusteeName: '' });
        setRecipientSearch('');
        await loadData();
    }

    // Filter recipients by search
    const filteredRecipients = useMemo(() => {
        if (!recipientSearch) return recipients;
        return recipients.filter(r => r.name.toLowerCase().includes(recipientSearch.toLowerCase()));
    }, [recipients, recipientSearch]);

    // Get display name for selected recipient
    const selectedRecipientName = useMemo(() => {
        if (paymentForm.recipientId === '__anonymous__') return 'Anonymous';
        if (paymentForm.recipientId === '__new__') return 'New: ' + paymentForm.recipientName;
        const found = recipients.find(r => r.id === paymentForm.recipientId);
        return found ? found.name : '';
    }, [paymentForm.recipientId, paymentForm.recipientName, recipients]);

    if (!profile || !year) return null;
    const isLocked = year.locked;

    return (
        <div className="fade-in">
            <div className="screen-header">
                <button className="back-btn" onClick={onBack}>←</button>
                <div>
                    <h1 style={{ margin: 0 }}>{profile.name}</h1>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{year.label}</div>
                </div>
            </div>

            <div className="screen">
                {/* Section 1: Holdings Summary */}
                <div className="card" style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Holdings</div>
                    <div className="stat-row">
                        <span className="stat-label">Total Holdings</span>
                        <span className="stat-value">{formatCurrency(stats.totalHoldings)}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Interest Removed</span>
                        <span className="stat-value" style={{ color: '#ef4444' }}>-{formatCurrency(stats.interestRemoved)}</span>
                    </div>
                    <div className="stat-row" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                        <span className="stat-label" style={{ fontWeight: 600, color: 'var(--color-text)' }}>Eligible Amount</span>
                        <span className="stat-value" style={{ color: '#10b981' }}>{formatCurrency(stats.eligible)}</span>
                    </div>
                    {!isLocked && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                            <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.625rem' }}
                                onClick={() => setShowHoldings(true)}>
                                Manage Holdings
                            </button>
                            <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.625rem', color: '#ef4444' }}
                                onClick={() => setShowInterest(true)}>
                                Manage Interest
                            </button>
                        </div>
                    )}
                </div>

                {/* Section 2: Zakat Summary */}
                <div className="card" style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Zakat</div>
                    <div className="stat-row">
                        <span className="stat-label">Zakat Due (2.5%)</span>
                        <span className="stat-value">{formatCurrency(stats.zakatDue)}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Given</span>
                        <span className="stat-value">{formatCurrency(stats.given)}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Remaining</span>
                        <span className="stat-value" style={{ color: stats.remaining > 0 ? '#fbbf24' : '#10b981' }}>
                            {formatCurrency(stats.remaining)}
                        </span>
                    </div>
                    {stats.zakatDue > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', paddingLeft: '0.25rem' }}>
                            Allocated: {formatCurrency(stats.allocated)} · Unallocated: {formatCurrency(stats.unallocated)}
                        </div>
                    )}
                    {stats.surplus > 0 && (
                        <div className="stat-row" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                            <span className="stat-label" style={{ fontWeight: 600, color: '#22c55e' }}>Surplus</span>
                            <span className="stat-value" style={{ color: '#22c55e' }}>+{formatCurrency(stats.surplus)}</span>
                        </div>
                    )}
                </div>

                {/* Section 3: Action Buttons */}
                {!isLocked && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginTop: '0.75rem' }}>
                        <button className="btn btn-primary" style={{ fontSize: '0.9rem', padding: '0.875rem 0.5rem' }}
                            onClick={() => { setPaymentType('completed'); setShowPayment(true); }}>
                            Add Payment
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize: '0.9rem', padding: '0.875rem 0.5rem' }}
                            onClick={() => { setPaymentType('planned'); setShowPayment(true); }}>
                            Plan Payment
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize: '0.9rem', padding: '0.875rem 0.5rem' }}
                            onClick={() => onNavigate('payments', { yearId, profileId })}>
                            View Payments
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize: '0.9rem', padding: '0.875rem 0.5rem' }}
                            onClick={() => onNavigate('recipients')}>
                            Recipients
                        </button>
                    </div>
                )}

                {/* Holdings Modal */}
                <Modal isOpen={showHoldings} onClose={() => setShowHoldings(false)} title="Manage Holdings">
                    {holdings.length === 0 ? (
                        <EmptyState title="No Holdings" subtitle="Add your first holding" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                            {holdings.map(h => (
                                <div key={h.id} className="card" style={{ padding: '0.875rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{h.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{h.category}</div>
                                            {h.updatedAt && (
                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                                                    Updated: {formatDate(h.updatedAt)}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(h.value)}</div>
                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                <button style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    onClick={() => {
                                                        setEditHolding(h);
                                                        setHoldingForm({ name: h.name, category: h.category, value: String(h.value), notes: h.notes || '' });
                                                        setShowAddHolding(true);
                                                    }}>Edit</button>
                                                <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    onClick={() => handleDeleteHolding(h.id)}>Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <button className="btn btn-primary" onClick={() => { setEditHolding(null); setHoldingForm({ name: '', category: 'Bank', value: '', notes: '' }); setShowAddHolding(true); }}>
                        + Add Holding
                    </button>
                </Modal>

                {/* Add/Edit Holding Modal */}
                <Modal isOpen={showAddHolding} onClose={() => { setShowAddHolding(false); setEditHolding(null); }} title={editHolding ? 'Edit Holding' : 'Add Holding'}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        <div>
                            <label className="label">Name</label>
                            <input className="input-field" placeholder="e.g. SBI Savings" value={holdingForm.name}
                                onChange={e => setHoldingForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Category</label>
                            <select className="input-field" value={holdingForm.category}
                                onChange={e => setHoldingForm(f => ({ ...f, category: e.target.value }))}>
                                {HOLDING_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Current Value (₹)</label>
                            <input className="input-field" type="number" placeholder="0" value={holdingForm.value}
                                onChange={e => setHoldingForm(f => ({ ...f, value: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Notes (optional)</label>
                            <input className="input-field" placeholder="Optional notes" value={holdingForm.notes}
                                onChange={e => setHoldingForm(f => ({ ...f, notes: e.target.value }))} />
                        </div>
                        <button className="btn btn-primary" onClick={handleAddHolding}>
                            {editHolding ? 'Update Holding' : 'Add Holding'}
                        </button>
                    </div>
                </Modal>

                {/* Manage Interest Modal */}
                <Modal isOpen={showInterest} onClose={() => setShowInterest(false)} title="Manage Interest">
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        Interest earned is excluded from zakat calculation.
                    </p>
                    {interestEntries.length === 0 ? (
                        <EmptyState title="No Interest Entries" subtitle="Add interest amounts to exclude from zakat" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', maxHeight: '35vh', overflowY: 'auto' }}>
                            {interestEntries.map(entry => (
                                <div key={entry.id} className="card" style={{ padding: '0.875rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#ef4444' }}>{formatCurrency(entry.amount)}</div>
                                            {entry.holdingId && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                                                    From: {holdings.find(h => h.id === entry.holdingId)?.name || 'Unknown'}
                                                </div>
                                            )}
                                            {entry.notes && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>{entry.notes}</div>
                                            )}
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                                                {formatDate(entry.date)}
                                            </div>
                                        </div>
                                        {!isLocked && (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    onClick={() => {
                                                        setEditInterest(entry);
                                                        setInterestForm({
                                                            amount: String(entry.amount),
                                                            holdingId: entry.holdingId ? String(entry.holdingId) : '',
                                                            notes: entry.notes || '',
                                                        });
                                                        setShowAddInterest(true);
                                                    }}>Edit</button>
                                                <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    onClick={() => handleDeleteInterest(entry.id)}>Delete</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {!isLocked && (
                        <button className="btn btn-primary" onClick={() => {
                            setEditInterest(null);
                            setInterestForm({ amount: '', holdingId: '', notes: '' });
                            setShowAddInterest(true);
                        }}>
                            + Add Interest Entry
                        </button>
                    )}
                </Modal>

                {/* Add/Edit Interest Modal */}
                <Modal isOpen={showAddInterest} onClose={() => { setShowAddInterest(false); setEditInterest(null); }}
                    title={editInterest ? 'Edit Interest' : 'Add Interest'}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        <div>
                            <label className="label">Amount (₹)</label>
                            <input className="input-field" type="number" placeholder="0" value={interestForm.amount}
                                onChange={e => setInterestForm(f => ({ ...f, amount: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Linked Holding (optional)</label>
                            <select className="input-field" value={interestForm.holdingId}
                                onChange={e => setInterestForm(f => ({ ...f, holdingId: e.target.value }))}>
                                <option value="">None</option>
                                {holdings.map(h => <option key={h.id} value={h.id}>{h.name} ({h.category})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Notes (optional)</label>
                            <input className="input-field" placeholder="e.g. FD interest" value={interestForm.notes}
                                onChange={e => setInterestForm(f => ({ ...f, notes: e.target.value }))} />
                        </div>
                        <button className="btn btn-primary" onClick={handleAddInterest}>
                            {editInterest ? 'Update Interest' : 'Add Interest'}
                        </button>
                    </div>
                </Modal>

                {/* Add Payment Modal */}
                <Modal isOpen={showPayment} onClose={() => { setShowPayment(false); setRecipientSearch(''); }}
                    title={paymentType === 'planned' ? 'Plan Payment' : 'Add Payment'}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        {/* Recipient — searchable dropdown */}
                        <div>
                            <label className="label">Recipient</label>
                            <select className="input-field" value={paymentForm.recipientId}
                                style={{ fontSize: '0.9rem' }}
                                onChange={e => {
                                    const val = e.target.value;
                                    setPaymentForm(f => ({ ...f, recipientId: val, recipientName: '' }));
                                }}>
                                <option value="">-- Select Recipient --</option>
                                <option value="__anonymous__">Anonymous</option>
                                {recipients.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                                <option value="__new__">+ Add New Recipient</option>
                            </select>
                            {paymentForm.recipientId === '__new__' && (
                                <input className="input-field" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}
                                    placeholder="Enter new recipient name"
                                    value={paymentForm.recipientName}
                                    onChange={e => setPaymentForm(f => ({ ...f, recipientName: e.target.value }))}
                                    autoFocus />
                            )}
                        </div>

                        <div>
                            <label className="label">Amount (₹)</label>
                            <input className="input-field" type="number" placeholder="0" value={paymentForm.amount}
                                onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} />
                        </div>

                        {paymentType === 'completed' && (
                            <div>
                                <label className="label">Date</label>
                                <input className="input-field" type="date" value={paymentForm.date}
                                    onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))} />
                            </div>
                        )}

                        {/* Trustee — dropdown with inline add */}
                        <div>
                            <label className="label">Trustee (optional)</label>
                            <select className="input-field" value={paymentForm.trusteeId}
                                style={{ fontSize: '0.9rem' }}
                                onChange={e => setPaymentForm(f => ({ ...f, trusteeId: e.target.value, newTrusteeName: '' }))}>
                                <option value="">None</option>
                                {trustees.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                <option value="__new__">+ Add New Trustee</option>
                            </select>
                            {paymentForm.trusteeId === '__new__' && (
                                <input className="input-field" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}
                                    placeholder="Enter new trustee name"
                                    value={paymentForm.newTrusteeName}
                                    onChange={e => setPaymentForm(f => ({ ...f, newTrusteeName: e.target.value }))} />
                            )}
                        </div>

                        <div>
                            <label className="label">Notes (optional)</label>
                            <input className="input-field" placeholder="Optional notes" value={paymentForm.notes}
                                onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} />
                        </div>
                        <button className="btn btn-primary" onClick={handleAddPayment}>
                            {paymentType === 'planned' ? 'Plan Payment' : 'Add Payment'}
                        </button>
                    </div>
                </Modal>
            </div>
        </div>
    );
}
