import AppIntro from '../components/AppIntro';

export default function AboutScreen({ onBack }) {
    return (
        <div style={{
            minHeight: '100dvh',
            background: 'var(--bg, #0c0c0c)',
            padding: '1rem 1.5rem 2.5rem',
        }}>
            <div style={{ maxWidth: 480, margin: '0 auto' }}>
                <button className="back-btn" onClick={onBack} style={{ marginBottom: '1rem' }}>←</button>

                <div style={{
                    minHeight: 'calc(100dvh - 5rem)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <AppIntro>
                        <button className="btn btn-primary" onClick={onBack}>
                            Back to Settings
                        </button>
                    </AppIntro>
                </div>
            </div>
        </div>
    );
}
