import { useState, useEffect } from 'react';
import { ZakatYearsService } from '../services/zakatYears';
import { ProfilesService } from '../services/profiles';
import { ZakatService } from '../services/zakat';
import { HoldingsService } from '../services/holdings';
import { LedgerService } from '../services/ledger';
import { RecipientsService } from '../services/recipients';
import { TrusteesService } from '../services/trustees';
import { LEDGER_TYPES } from '../utils/constants';
import { formatCurrency, formatDate } from '../utils/format';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

const PROFILE_COLORS = [
    '#10b981', '#3b82f6', '#a78bfa', '#f59e0b', '#ec4899',
    '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#ef4444',
];

export default function YearViewScreen({ yearId, onNavigate, onBack }) {
    const [year, setYear] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const [profileStats, setProfileStats] = useState({});
    const [showAddProfile, setShowAddProfile] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [showPlannedPayments, setShowPlannedPayments] = useState(false);
    const [plannedPayments, setPlannedPayments] = useState([]);
    const [recipientMap, setRecipientMap] = useState({});
    const [trusteeMap, setTrusteeMap] = useState({});
    const [showSummary, setShowSummary] = useState(false);
    const [summaryText, setSummaryText] = useState('');

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
        const holdings = await HoldingsService.getByProfile(profileId);
        for (const h of holdings) {
            await HoldingsService.delete(h.id);
        }
        const entries = await LedgerService.getByYearAndProfile(yearId, profileId);
        for (const e of entries) {
            await LedgerService.delete(e.id);
        }
        await ProfilesService.delete(profileId);
        setShowDeleteConfirm(null);
        setOpenMenuId(null);
        await loadData();
    }

    async function loadPlannedPayments() {
        const allEntries = await LedgerService.getByYear(yearId);
        const planned = allEntries.filter(e => e.type === LEDGER_TYPES.ZAKAT_PAYMENT_PLANNED);
        const allRecipients = await RecipientsService.getAll();
        const allTrustees = await TrusteesService.getAll();
        const rMap = {};
        allRecipients.forEach(r => { rMap[r.id] = r.name; });
        setRecipientMap(rMap);
        const tMap = {};
        allTrustees.forEach(t => { tMap[t.id] = t.name; });
        setTrusteeMap(tMap);
        // Attach profile name
        const allProfiles = await ProfilesService.getAll();
        const pMap = {};
        allProfiles.forEach(p => { pMap[p.id] = p.name; });
        setPlannedPayments(planned.map(e => ({ ...e, profileName: pMap[e.profileId] || '—' })));
        setShowPlannedPayments(true);
    }

    async function generateSummary() {
        const allRecipients = await RecipientsService.getAll();
        const allTrustees = await TrusteesService.getAll();
        const rMap = {};
        allRecipients.forEach(r => { rMap[r.id] = r.name; });
        const tMap = {};
        allTrustees.forEach(t => { tMap[t.id] = t.name; });

        let text = `ZAKAT SUMMARY — ${year.label}\n`;
        text += '═'.repeat(40) + '\n\n';

        let grandTotalDue = 0;
        let grandTotalGiven = 0;
        let grandTotalPlanned = 0;

        for (const p of profiles) {
            const s = profileStats[p.id] || {};
            const holdings = await HoldingsService.getByProfile(p.id);
            const entries = await LedgerService.getByYearAndProfile(yearId, p.id);

            text += `▸ ${p.name}\n`;
            text += '─'.repeat(30) + '\n';

            // Holdings
            if (holdings.length > 0) {
                text += `  Holdings:\n`;
                for (const h of holdings) {
                    text += `    • ${h.name} (${h.category}): ${formatCurrency(h.value)}`;
                    if (h.updatedAt) text += ` — updated ${formatDate(h.updatedAt)}`;
                    else if (h.createdAt) text += ` — added ${formatDate(h.createdAt)}`;
                    text += '\n';
                }
                text += `    Total: ${formatCurrency(s.totalHoldings || 0)}\n`;
            } else {
                text += `  Holdings: None\n`;
            }

            // Interest
            const interestEntries = entries.filter(e => e.type === LEDGER_TYPES.INTEREST_REMOVED);
            if (interestEntries.length > 0) {
                text += `\n  Interest Deducted:\n`;
                for (const ie of interestEntries) {
                    const linkedHolding = ie.holdingId ? holdings.find(h => h.id === ie.holdingId) : null;
                    text += `    • ${formatCurrency(ie.amount)}`;
                    if (linkedHolding) text += ` (from ${linkedHolding.name})`;
                    if (ie.notes) text += ` — ${ie.notes}`;
                    if (ie.date) text += ` [${formatDate(ie.date)}]`;
                    text += '\n';
                }
                text += `    Total: ${formatCurrency(s.interestRemoved || 0)}\n`;
            }

            // Zakat calculation
            text += `\n  Eligible Amount: ${formatCurrency(s.eligible || 0)}\n`;
            text += `  Zakat Due (${((s.zakatRate || 0.025) * 100).toFixed(1)}%): ${formatCurrency(s.zakatDue || 0)}\n`;

            // Payments
            const completed = entries.filter(e => e.type === LEDGER_TYPES.ZAKAT_PAYMENT_COMPLETED);
            const planned = entries.filter(e => e.type === LEDGER_TYPES.ZAKAT_PAYMENT_PLANNED);

            if (completed.length > 0) {
                text += `\n  Payments Completed:\n`;
                for (const c of completed) {
                    text += `    • ${formatCurrency(c.amount)} → ${rMap[c.recipientId] || 'Unknown'}`;
                    if (c.trusteeId && tMap[c.trusteeId]) text += ` (via ${tMap[c.trusteeId]})`;
                    text += ` on ${formatDate(c.date)}`;
                    if (c.notes) text += ` — ${c.notes}`;
                    text += '\n';
                }
            }
            if (planned.length > 0) {
                text += `\n  Payments Planned:\n`;
                for (const pl of planned) {
                    text += `    • ${formatCurrency(pl.amount)} → ${rMap[pl.recipientId] || 'Unknown'}`;
                    if (pl.trusteeId && tMap[pl.trusteeId]) text += ` (via ${tMap[pl.trusteeId]})`;
                    if (pl.notes) text += ` — ${pl.notes}`;
                    text += '\n';
                }
            }

            text += `\n  Given: ${formatCurrency(s.given || 0)} | Remaining: ${formatCurrency(s.remaining || 0)}`;
            if ((s.surplus || 0) > 0) text += ` | Surplus: +${formatCurrency(s.surplus)}`;
            text += '\n\n';

            grandTotalDue += s.zakatDue || 0;
            grandTotalGiven += s.given || 0;
            grandTotalPlanned += s.planned || 0;
        }

        text += '═'.repeat(40) + '\n';
        text += `TOTAL DUE: ${formatCurrency(grandTotalDue)}\n`;
        text += `TOTAL GIVEN: ${formatCurrency(grandTotalGiven)}\n`;
        text += `TOTAL PLANNED: ${formatCurrency(grandTotalPlanned)}\n`;
        text += `REMAINING: ${formatCurrency(Math.max(0, grandTotalDue - grandTotalGiven))}\n`;

        setSummaryText(text);
        setShowSummary(true);
    }

    function copySummary() {
        navigator.clipboard.writeText(summaryText);
    }

    if (!year) return null;

    const plannedTotal = plannedPayments.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return (
        <div className="fade-in" onClick={() => setOpenMenuId(null)}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.75rem' }}>
                    <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.75rem 0.5rem' }}
                        onClick={() => onNavigate('recipients')}>
                        Recipients
                    </button>
                    <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.75rem 0.5rem' }}
                        onClick={loadPlannedPayments}>
                        Planned Payments
                    </button>
                </div>


                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>Profiles</h2>

                {profiles.length === 0 ? (
                    <EmptyState title="No Profiles" subtitle="Add a profile to start tracking" />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {profiles.map((p, idx) => {
                            const stats = profileStats[p.id] || {};
                            const accent = PROFILE_COLORS[idx % PROFILE_COLORS.length];
                            return (
                                <div key={p.id} className="card card-interactive"
                                    onClick={() => onNavigate('profile', { yearId, profileId: p.id })}
                                    style={{
                                        position: 'relative',
                                        borderLeft: `3px solid ${accent}`,
                                        background: `linear-gradient(135deg, ${accent}08 0%, transparent 60%)`,
                                    }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{p.name}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            {!year.locked && profiles.length > 1 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(openMenuId === p.id ? null : p.id);
                                                    }}
                                                    style={{
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: 'var(--color-text-muted)', fontSize: '1.25rem',
                                                        padding: '0.25rem 0.5rem', lineHeight: 1, letterSpacing: '0.05em',
                                                    }}
                                                    aria-label="Profile options"
                                                >⋮</button>
                                            )}
                                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>→</span>
                                        </div>
                                    </div>

                                    {/* Dropdown menu */}
                                    {openMenuId === p.id && (
                                        <div onClick={e => e.stopPropagation()} style={{
                                            position: 'absolute', top: '3rem', right: '0.75rem', zIndex: 10,
                                            background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
                                            borderRadius: '0.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                                            overflow: 'hidden', minWidth: 140,
                                        }}>
                                            <button onClick={() => { setOpenMenuId(null); setShowDeleteConfirm(p); }}
                                                style={{
                                                    display: 'block', width: '100%', textAlign: 'left',
                                                    padding: '0.75rem 1rem', background: 'none', border: 'none',
                                                    color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem',
                                                }}>
                                                Delete Profile
                                            </button>
                                        </div>
                                    )}

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

                <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.625rem 0.5rem', marginTop: '1rem', width: '100%' }}
                    onClick={generateSummary}>
                    View Year Summary
                </button>

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

                {/* Planned Payments Modal */}
                <Modal isOpen={showPlannedPayments} onClose={() => setShowPlannedPayments(false)} title="Planned Payments">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {plannedPayments.length === 0 ? (
                            <EmptyState title="No Planned Payments" subtitle="Add planned payments from individual profiles" />
                        ) : (
                            <>
                                <div className="stat-row" style={{ marginBottom: '0.25rem' }}>
                                    <span className="stat-label" style={{ fontWeight: 600 }}>Total Planned</span>
                                    <span className="stat-value" style={{ color: '#a78bfa', fontSize: '1.125rem' }}>{formatCurrency(plannedTotal)}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '45vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                    {plannedPayments.map(entry => (
                                        <div key={entry.id} className="card" style={{ padding: '0.75rem', flexShrink: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{recipientMap[entry.recipientId] || 'Unknown'}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                                                        Profile: {entry.profileName}
                                                    </div>
                                                    {entry.trusteeId && trusteeMap[entry.trusteeId] && (
                                                        <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginTop: '0.125rem' }}>
                                                            Via: {trusteeMap[entry.trusteeId]}
                                                        </div>
                                                    )}
                                                    {entry.notes && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>{entry.notes}</div>
                                                    )}
                                                </div>
                                                <div style={{ fontWeight: 700, color: '#a78bfa' }}>{formatCurrency(entry.amount)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </Modal>

                {/* Year Summary Modal */}
                <Modal isOpen={showSummary} onClose={() => setShowSummary(false)} title="Year Summary">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <pre style={{
                            whiteSpace: 'pre-wrap', wordWrap: 'break-word',
                            fontSize: '0.75rem', lineHeight: 1.6,
                            background: 'var(--color-surface-1)', padding: '1rem',
                            borderRadius: '0.5rem', border: '1px solid var(--color-border)',
                            maxHeight: '50vh', overflowY: 'auto',
                            fontFamily: 'ui-monospace, monospace', color: 'var(--color-text-secondary)',
                        }}>
                            {summaryText}
                        </pre>
                        <button className="btn btn-primary" onClick={copySummary}>
                            Copy to Clipboard
                        </button>
                    </div>
                </Modal>
            </div>
        </div>
    );
}
