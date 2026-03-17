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

const PROFILE_ACCENT_COLORS = [
    '#10b981', '#6366f1', '#f59e0b', '#06b6d4',
    '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#3b82f6', '#a3a3a3',
];

export default function YearViewScreen({ yearId, onNavigate, onBack }) {
    const [year, setYear] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const [profileStats, setProfileStats] = useState({});

    const [showAddProfile, setShowAddProfile] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');

    const [openProfileMenuId, setOpenProfileMenuId] = useState(null);
    const [showDeleteProfileConfirm, setShowDeleteProfileConfirm] = useState(null);
    const [showRenameProfile, setShowRenameProfile] = useState(null);
    const [renameProfileValue, setRenameProfileValue] = useState('');

    const [showYearMenu, setShowYearMenu] = useState(false);
    const [showRenameYear, setShowRenameYear] = useState(false);
    const [renameYearValue, setRenameYearValue] = useState('');
    const [showUnlockYearConfirm, setShowUnlockYearConfirm] = useState(false);

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

    async function handleRenameProfile() {
        if (!renameProfileValue.trim() || !showRenameProfile) return;
        await ProfilesService.update(showRenameProfile.id, { name: renameProfileValue.trim() });
        setShowRenameProfile(null);
        setRenameProfileValue('');
        await loadData();
    }

    async function handleDeleteProfile(profileId) {
        const holdings = await HoldingsService.getByProfile(profileId);
        for (const h of holdings) await HoldingsService.delete(h.id);
        const entries = await LedgerService.getByYearAndProfile(yearId, profileId);
        for (const e of entries) await LedgerService.delete(e.id);
        await ProfilesService.delete(profileId);
        setShowDeleteProfileConfirm(null);
        setOpenProfileMenuId(null);
        await loadData();
    }

    async function handleRenameYear() {
        if (!renameYearValue.trim()) return;
        await ZakatYearsService.rename(yearId, renameYearValue.trim());
        setShowRenameYear(false);
        setRenameYearValue('');
        await loadData();
    }

    async function handleUnlockYear() {
        await ZakatYearsService.unlock(yearId);
        setShowUnlockYearConfirm(false);
        await loadData();
    }

    async function loadPlannedPayments() {
        const allEntries = await LedgerService.getByYear(yearId);
        const planned = allEntries.filter(e => e.type === LEDGER_TYPES.ZAKAT_PAYMENT_PLANNED);
        const [allRecipients, allTrustees, allProfiles] = await Promise.all([
            RecipientsService.getAll(),
            TrusteesService.getAll(),
            ProfilesService.getAll(),
        ]);
        const rMap = {};
        allRecipients.forEach(r => { rMap[r.id] = r.name; });
        setRecipientMap(rMap);
        const tMap = {};
        allTrustees.forEach(t => { tMap[t.id] = t.name; });
        setTrusteeMap(tMap);
        const pMap = {};
        allProfiles.forEach(p => { pMap[p.id] = p.name; });
        setPlannedPayments(planned.map(e => ({ ...e, profileName: pMap[e.profileId] || 'Unknown profile' })));
        setShowPlannedPayments(true);
    }

    async function generateSummary() {
        const [allRecipients, allTrustees] = await Promise.all([
            RecipientsService.getAll(), TrusteesService.getAll(),
        ]);
        const rMap = {};
        allRecipients.forEach(r => { rMap[r.id] = r.name; });
        const tMap = {};
        allTrustees.forEach(t => { tMap[t.id] = t.name; });

        let text = `ZAKAT SUMMARY - ${year.label}\n${'═'.repeat(40)}\n\n`;
        let grandTotalDue = 0, grandTotalGiven = 0, grandTotalPlanned = 0;

        for (const p of profiles) {
            const s = profileStats[p.id] || {};
            const holdings = await HoldingsService.getByProfile(p.id);
            const entries = await LedgerService.getByYearAndProfile(yearId, p.id);

            text += `▸ ${p.name}\n${'─'.repeat(30)}\n`;

            if (holdings.length > 0) {
                text += `  Holdings:\n`;
                for (const h of holdings) {
                    const dateStr = h.updatedAt || h.createdAt;
                    text += `    • ${h.name} (${h.category}): ${formatCurrency(h.value)}`;
                    if (dateStr) text += ` [${formatDate(dateStr)}]`;
                    text += '\n';
                }
                text += `    Total: ${formatCurrency(s.totalHoldings || 0)}\n`;
            } else {
                text += `  Holdings: None\n`;
            }

            const interestEntries = entries.filter(e => e.type === LEDGER_TYPES.INTEREST_REMOVED);
            if (interestEntries.length > 0) {
                text += `\n  Interest Deducted:\n`;
                for (const ie of interestEntries) {
                    const linkedHolding = ie.holdingId ? holdings.find(h => h.id === ie.holdingId) : null;
                    text += `    • ${formatCurrency(ie.amount)}`;
                    if (linkedHolding) text += ` (from ${linkedHolding.name})`;
                    if (ie.notes) text += ` - ${ie.notes}`;
                    if (ie.date) text += ` [${formatDate(ie.date)}]`;
                    text += '\n';
                }
                text += `    Total: ${formatCurrency(s.interestRemoved || 0)}\n`;
            }

            text += `\n  Eligible Amount: ${formatCurrency(s.eligible || 0)}\n`;
            text += `  Zakat Due (${((s.zakatRate || 0.025) * 100).toFixed(1)}%): ${formatCurrency(s.zakatDue || 0)}\n`;

            const completed = entries.filter(e => e.type === LEDGER_TYPES.ZAKAT_PAYMENT_COMPLETED);
            const planned = entries.filter(e => e.type === LEDGER_TYPES.ZAKAT_PAYMENT_PLANNED);

            if (completed.length > 0) {
                text += `\n  Payments Completed:\n`;
                for (const c of completed) {
                    text += `    • ${formatCurrency(c.amount)} → ${rMap[c.recipientId] || 'Unknown'}`;
                    if (c.trusteeId && tMap[c.trusteeId]) text += ` (via ${tMap[c.trusteeId]})`;
                    text += ` [${formatDate(c.date)}]`;
                    if (c.notes) text += ` - ${c.notes}`;
                    text += '\n';
                }
            }
            if (planned.length > 0) {
                text += `\n  Payments Planned:\n`;
                for (const pl of planned) {
                    text += `    • ${formatCurrency(pl.amount)} → ${rMap[pl.recipientId] || 'Unknown'}`;
                    if (pl.trusteeId && tMap[pl.trusteeId]) text += ` (via ${tMap[pl.trusteeId]})`;
                    if (pl.notes) text += ` - ${pl.notes}`;
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

        text += `${'═'.repeat(40)}\n`;
        text += `TOTAL DUE: ${formatCurrency(grandTotalDue)}\n`;
        text += `TOTAL GIVEN: ${formatCurrency(grandTotalGiven)}\n`;
        text += `TOTAL PLANNED: ${formatCurrency(grandTotalPlanned)}\n`;
        text += `REMAINING: ${formatCurrency(Math.max(0, grandTotalDue - grandTotalGiven))}\n`;

        setSummaryText(text);
        setShowSummary(true);
    }

    if (!year) return null;

    const plannedTotal = plannedPayments.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return (
        <div className="fade-in" onClick={() => { setOpenProfileMenuId(null); setShowYearMenu(false); }}>

            {/* Header */}
            <div className="screen-header">
                <button className="back-btn" onClick={onBack}>←</button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text, #f0f0f0)' }}>{year.label}</h1>
                    <div style={{ fontSize: '0.78rem', color: year.locked ? 'var(--text-muted, #666)' : '#10b981', marginTop: '0.1rem' }}>
                        {year.locked ? 'Locked' : 'Active'}
                    </div>
                </div>

                {/* Year-level ⋮ menu */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={e => { e.stopPropagation(); setShowYearMenu(v => !v); }}
                        style={{
                            background: 'var(--surface-3, #222)', border: '1px solid var(--border, #333)',
                            borderRadius: '0.5rem', color: 'var(--text-muted, #666)',
                            fontSize: '1.2rem', padding: '0.35rem 0.625rem', lineHeight: 1,
                            cursor: 'pointer', letterSpacing: '0.06em',
                        }}
                        aria-label="Year options"
                    >⋮</button>
                    {showYearMenu && (
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                position: 'absolute', top: '2.5rem', right: 0, zIndex: 20,
                                background: 'var(--surface-3, #222)', border: '1px solid var(--border, #333)',
                                borderRadius: '0.625rem', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                overflow: 'hidden', minWidth: 160,
                            }}
                        >
                            <button
                                onClick={() => { setShowYearMenu(false); setRenameYearValue(year.label); setShowRenameYear(true); }}
                                style={menuItemStyle}
                            >Rename Year</button>
                            {year.locked && (
                                <button
                                    onClick={() => { setShowYearMenu(false); setShowUnlockYearConfirm(true); }}
                                    style={menuItemStyle}
                                >Unlock Year</button>
                            )}
                        </div>
                    )}
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

                <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary, #999)', marginBottom: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Profiles
                </h2>

                {profiles.length === 0 ? (
                    <EmptyState title="No Profiles" subtitle="Add a profile to start tracking" />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {profiles.map((p, idx) => {
                            const stats = profileStats[p.id] || {};
                            const accent = PROFILE_ACCENT_COLORS[idx % PROFILE_ACCENT_COLORS.length];
                            const initial = p.name.trim()[0]?.toUpperCase() || '?';

                            return (
                                <div
                                    key={p.id}
                                    className="card card-interactive"
                                    onClick={() => onNavigate('profile', { yearId, profileId: p.id })}
                                    style={{ position: 'relative' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                            <div style={{
                                                width: 34, height: 34, borderRadius: '50%',
                                                background: accent + '18',
                                                border: `1.5px solid ${accent}3a`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.8rem', fontWeight: 700, color: accent,
                                                flexShrink: 0,
                                            }}>
                                                {initial}
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text, #f0f0f0)' }}>{p.name}</div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            {!year.locked && profiles.length >= 1 && (
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        setOpenProfileMenuId(openProfileMenuId === p.id ? null : p.id);
                                                    }}
                                                    style={{
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: 'var(--text-muted, #666)', fontSize: '1.2rem',
                                                        padding: '0.25rem 0.5rem', lineHeight: 1, letterSpacing: '0.06em',
                                                    }}
                                                    aria-label="Profile options"
                                                >⋮</button>
                                            )}
                                            <span style={{ color: 'var(--text-muted, #666)', fontSize: '0.9rem' }}>→</span>
                                        </div>
                                    </div>

                                    {/* Profile dropdown */}
                                    {openProfileMenuId === p.id && (
                                        <div onClick={e => e.stopPropagation()} style={{
                                            position: 'absolute', top: '3rem', right: '0.75rem', zIndex: 10,
                                            background: 'var(--surface-3, #222)', border: '1px solid var(--border, #333)',
                                            borderRadius: '0.625rem', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                            overflow: 'hidden', minWidth: 150,
                                        }}>
                                            <button
                                                onClick={() => { setOpenProfileMenuId(null); setRenameProfileValue(p.name); setShowRenameProfile(p); }}
                                                style={menuItemStyle}
                                            >Rename</button>
                                            {profiles.length > 1 && (
                                                <button
                                                    onClick={() => { setOpenProfileMenuId(null); setShowDeleteProfileConfirm(p); }}
                                                    style={{ ...menuItemStyle, color: '#ef4444', borderTop: '1px solid var(--border, #333)' }}
                                                >Delete Profile</button>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <Stat label="Due" value={formatCurrency(stats.zakatDue || 0)} />
                                        <Stat label="Given" value={formatCurrency(stats.given || 0)} />
                                        <Stat
                                            label="Remaining"
                                            value={formatCurrency(stats.remaining || 0)}
                                            valueColor={(stats.remaining || 0) > 0 ? '#fbbf24' : '#10b981'}
                                        />
                                        {(stats.surplus || 0) > 0 && (
                                            <Stat label="Surplus" value={`+${formatCurrency(stats.surplus)}`} valueColor="#22c55e" />
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

                <button className="btn btn-secondary" style={{ fontSize: '0.85rem', marginTop: '1rem', width: '100%' }}
                    onClick={generateSummary}>
                    View Year Summary
                </button>

                {/* Add Profile Modal */}
                <Modal isOpen={showAddProfile} onClose={() => setShowAddProfile(false)} title="Add Profile">
                    <label className="label">Name</label>
                    <input className="input-field" placeholder="e.g. Wife, Mother" value={newProfileName}
                        onChange={e => setNewProfileName(e.target.value)} autoFocus />
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleAddProfile}>Add Profile</button>
                </Modal>

                {/* Rename Profile Modal */}
                <Modal isOpen={!!showRenameProfile} onClose={() => setShowRenameProfile(null)} title="Rename Profile">
                    <label className="label">Name</label>
                    <input className="input-field" value={renameProfileValue}
                        onChange={e => setRenameProfileValue(e.target.value)} autoFocus />
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleRenameProfile}>Save</button>
                </Modal>

                {/* Delete Profile Confirmation */}
                <Modal isOpen={!!showDeleteProfileConfirm} onClose={() => setShowDeleteProfileConfirm(null)} title="Delete Profile">
                    {showDeleteProfileConfirm && (
                        <div>
                            <p style={{ color: 'var(--text-secondary, #999)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                Delete <strong>{showDeleteProfileConfirm.name}</strong>? This permanently removes all their holdings, interest entries, and payments.
                            </p>
                            <div style={{ display: 'flex', gap: '0.625rem' }}>
                                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDeleteProfileConfirm(null)}>Cancel</button>
                                <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444' }}
                                    onClick={() => handleDeleteProfile(showDeleteProfileConfirm.id)}>Delete</button>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* Rename Year Modal */}
                <Modal isOpen={showRenameYear} onClose={() => setShowRenameYear(false)} title="Rename Year">
                    <label className="label">Year Label</label>
                    <input className="input-field" value={renameYearValue}
                        onChange={e => setRenameYearValue(e.target.value)} autoFocus />
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleRenameYear}>Save</button>
                </Modal>

                {/* Unlock Year Confirmation */}
                <Modal isOpen={showUnlockYearConfirm} onClose={() => setShowUnlockYearConfirm(false)} title="Unlock Year">
                    <p style={{ color: 'var(--text-secondary, #999)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Unlock <strong>{year.label}</strong>? You'll be able to edit holdings, interest, and payments again.
                    </p>
                    <div style={{ display: 'flex', gap: '0.625rem' }}>
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowUnlockYearConfirm(false)}>Cancel</button>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleUnlockYear}>Unlock</button>
                    </div>
                </Modal>

                {/* Planned Payments Modal */}
                <Modal isOpen={showPlannedPayments} onClose={() => setShowPlannedPayments(false)} title="Planned Payments">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {plannedPayments.length === 0 ? (
                            <EmptyState title="No Planned Payments" subtitle="Add planned payments from individual profiles" />
                        ) : (
                            <>
                                <div className="stat-row">
                                    <span className="stat-label" style={{ fontWeight: 600 }}>Total Planned</span>
                                    <span className="stat-value" style={{ color: '#a78bfa', fontSize: '1.125rem' }}>{formatCurrency(plannedTotal)}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '45vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                    {plannedPayments.map(entry => (
                                        <div key={entry.id} className="card" style={{ padding: '0.75rem', flexShrink: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{recipientMap[entry.recipientId] || 'Unknown'}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #666)', marginTop: '0.125rem' }}>
                                                        Profile: {entry.profileName}
                                                    </div>
                                                    {entry.trusteeId && trusteeMap[entry.trusteeId] && (
                                                        <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginTop: '0.125rem' }}>
                                                            Via: {trusteeMap[entry.trusteeId]}
                                                        </div>
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
                            fontSize: '0.72rem', lineHeight: 1.6,
                            background: 'var(--surface, #111)', padding: '1rem',
                            borderRadius: '0.5rem', border: '1px solid var(--border, #333)',
                            maxHeight: '50vh', overflowY: 'auto',
                            fontFamily: 'ui-monospace, monospace', color: 'var(--text-secondary, #999)',
                            margin: 0,
                        }}>
                            {summaryText}
                        </pre>
                        <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(summaryText)}>
                            Copy to Clipboard
                        </button>
                    </div>
                </Modal>
            </div>
        </div>
    );
}

function Stat({ label, value, valueColor }) {
    return (
        <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #666)' }}>{label}</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: valueColor || 'var(--text, #f0f0f0)' }}>{value}</div>
        </div>
    );
}

const menuItemStyle = {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '0.75rem 1rem', background: 'none', border: 'none',
    color: 'var(--text, #f0f0f0)', cursor: 'pointer', fontSize: '0.875rem',
};
