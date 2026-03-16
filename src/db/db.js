import Dexie from 'dexie';

export const db = new Dexie('ZakatManagerDB');

db.version(1).stores({
    settings: 'key',
    profiles: '++id, name, createdAt',
    holdings: '++id, profileId, category',
    recipients: '++id, name',
    zakatYears: '++id, label, locked',
    ledger: '++id, type, profileId, recipientId, holdingId, zakatYearId, date, [zakatYearId+profileId], [zakatYearId+type]',
});

db.version(2).stores({
    settings: 'key',
    profiles: '++id, name, createdAt',
    holdings: '++id, profileId, category',
    recipients: '++id, name, trusteeId',
    zakatYears: '++id, label, locked',
    ledger: '++id, type, profileId, recipientId, holdingId, trusteeId, zakatYearId, date, [zakatYearId+profileId], [zakatYearId+type]',
    trustees: '++id, name',
});

// Seed default data on first run
export async function seedDatabase() {
    const profileCount = await db.profiles.count();
    if (profileCount === 0) {
        await db.profiles.add({
            name: 'Self',
            createdAt: new Date().toISOString(),
        });
    }

    const pinSetting = await db.settings.get('pin');
    if (!pinSetting) {
        await db.settings.put({ key: 'pin', value: null });
    }

    // Seed Anonymous trustee
    const trusteeCount = await db.trustees.count();
    if (trusteeCount === 0) {
        await db.trustees.add({ name: 'Anonymous' });
    }
}
