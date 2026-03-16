import { db } from '../db/db';
import { LEDGER_TYPES } from '../utils/constants';
import { HoldingsService } from './holdings';
import { ProfilesService } from './profiles';

export const ZakatYearsService = {
    async getAll() {
        return db.zakatYears.orderBy('id').reverse().toArray();
    },

    async get(id) {
        return db.zakatYears.get(id);
    },

    async getActive() {
        const years = await db.zakatYears.where('locked').equals(0).toArray();
        return years.length > 0 ? years[0] : null;
    },

    async create(label) {
        return db.zakatYears.add({
            label,
            startDate: new Date().toISOString(),
            locked: 0,
            createdAt: new Date().toISOString(),
        });
    },

    async lock(id) {
        return db.zakatYears.update(id, { locked: 1 });
    },

    async startNewYear(label) {
        // 1. Lock all existing unlocked years
        const unlocked = await db.zakatYears.where('locked').equals(0).toArray();
        for (const y of unlocked) {
            await db.zakatYears.update(y.id, { locked: 1 });
        }

        // 2. Create new year
        const newYearId = await this.create(label);

        // 3. Snapshot holdings for all profiles
        const profiles = await ProfilesService.getAll();
        for (const profile of profiles) {
            const total = await HoldingsService.getTotalByProfile(profile.id);
            if (total > 0) {
                await db.ledger.add({
                    type: LEDGER_TYPES.HOLDING_UPDATE,
                    profileId: profile.id,
                    amount: total,
                    date: new Date().toISOString(),
                    notes: `Holdings snapshot for ${label}`,
                    zakatYearId: newYearId,
                });
            }
        }

        return newYearId;
    },
};
