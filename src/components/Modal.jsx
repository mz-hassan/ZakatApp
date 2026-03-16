export default function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content slide-up" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h2 className="modal-title" style={{ margin: 0 }}>{title}</h2>
                    <button
                        onClick={onClose}
                        style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
                            color: 'var(--color-text-secondary)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.1rem',
                        }}
                    >✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}
