export function formatCurrency(amount) {
    if (amount == null || isNaN(amount)) return '₹0';
    const absAmount = Math.abs(amount);
    // Indian locale formatting
    return (amount < 0 ? '-' : '') + '₹' + absAmount.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

export function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function todayISO() {
    return new Date().toISOString().split('T')[0];
}
