export default function EmptyState({ title, subtitle }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center',
            opacity: 0.7,
        }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.375rem' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{subtitle}</div>}
        </div>
    );
}
