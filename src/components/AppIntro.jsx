function Dot() {
    return (
        <div style={{
            width: 5,
            height: 5,
            borderRadius: 1.5,
            background: '#059669',
            flexShrink: 0,
            marginTop: 4,
        }} />
    );
}

const FEATURES = [
    'Local-only, nothing leaves your device',
    'Fully offline - no server needed',
    'No ads, no accounts, no tracking',
    'Full backup & restore as JSON',
    'Multiple household profiles',
    'You are always in control',
];

export default function AppIntro({ children }) {
    return (
        <div style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ marginBottom: '2rem' }}>
                <div style={{
                    width: 50,
                    height: 50,
                    borderRadius: 13,
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.125rem',
                    boxShadow: '0 0 0 1px rgba(5,150,105,0.25), 0 6px 20px rgba(5,150,105,0.12)',
                }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>ZM</span>
                </div>
                <h1 style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    margin: '0 0 0.375rem',
                    color: 'var(--text, #f0f0f0)',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.1,
                }}>
                    Zakat Manager
                </h1>
                <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    lineHeight: 1.55,
                    color: 'var(--text-muted, #666)',
                }}>
                    Track, calculate, and distribute zakat for your household - entirely on your device.
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                marginBottom: children ? '1.75rem' : 0,
            }}>
                {FEATURES.map((feature) => (
                    <div
                        key={feature}
                        style={{
                            background: 'var(--surface-2, #1a1a1a)',
                            border: '1px solid var(--border, #252525)',
                            borderRadius: '0.75rem',
                            padding: '0.75rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.5rem',
                        }}
                    >
                        <Dot />
                        <span style={{
                            fontSize: '0.775rem',
                            lineHeight: 1.45,
                            color: 'var(--text-secondary, #aaa)',
                            fontWeight: 500,
                        }}>
                            {feature}
                        </span>
                    </div>
                ))}
            </div>

            {children}
        </div>
    );
}
