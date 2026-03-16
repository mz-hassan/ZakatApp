import { db } from '../db/db';

export const BackupService = {
    async exportAll() {
        const data = {
            version: 2,
            exportedAt: new Date().toISOString(),
            profiles: await db.profiles.toArray(),
            holdings: await db.holdings.toArray(),
            recipients: await db.recipients.toArray(),
            trustees: await db.trustees.toArray(),
            zakatYears: await db.zakatYears.toArray(),
            ledger: await db.ledger.toArray(),
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zakat-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    async exportCSV() {
        const tables = {
            profiles: await db.profiles.toArray(),
            holdings: await db.holdings.toArray(),
            recipients: await db.recipients.toArray(),
            trustees: await db.trustees.toArray(),
            zakatYears: await db.zakatYears.toArray(),
            ledger: await db.ledger.toArray(),
        };

        let csv = '';
        for (const [tableName, rows] of Object.entries(tables)) {
            csv += `=== ${tableName.toUpperCase()} ===\n`;
            if (rows.length > 0) {
                const headers = Object.keys(rows[0]);
                csv += headers.join(',') + '\n';
                for (const row of rows) {
                    csv += headers.map(h => {
                        const val = row[h];
                        if (val == null) return '';
                        const str = String(val);
                        return str.includes(',') || str.includes('"') || str.includes('\n')
                            ? `"${str.replace(/"/g, '""')}"` : str;
                    }).join(',') + '\n';
                }
            }
            csv += '\n';
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zakat-data-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    async importBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data.version || !data.profiles) {
                        throw new Error('Invalid backup file');
                    }

                    await db.transaction('rw', db.profiles, db.holdings, db.recipients, db.trustees, db.zakatYears, db.ledger, async () => {
                        await db.profiles.clear();
                        await db.holdings.clear();
                        await db.recipients.clear();
                        await db.trustees.clear();
                        await db.zakatYears.clear();
                        await db.ledger.clear();

                        if (data.profiles?.length) await db.profiles.bulkAdd(data.profiles);
                        if (data.holdings?.length) await db.holdings.bulkAdd(data.holdings);
                        if (data.recipients?.length) await db.recipients.bulkAdd(data.recipients);
                        if (data.trustees?.length) await db.trustees.bulkAdd(data.trustees);
                        if (data.zakatYears?.length) await db.zakatYears.bulkAdd(data.zakatYears);
                        if (data.ledger?.length) await db.ledger.bulkAdd(data.ledger);
                    });

                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    },
};
