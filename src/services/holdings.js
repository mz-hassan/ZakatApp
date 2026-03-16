import { db } from '../db/db';

export const HoldingsService = {
    async getByProfile(profileId) {
        return db.holdings.where('profileId').equals(profileId).toArray();
    },

    async get(id) {
        return db.holdings.get(id);
    },

    async add(holding) {
        return db.holdings.add({
            ...holding,
            updatedAt: new Date().toISOString(),
        });
    },

    async update(id, changes) {
        return db.holdings.update(id, {
            ...changes,
            updatedAt: new Date().toISOString(),
        });
    },

    async delete(id) {
        return db.holdings.delete(id);
    },

    async getTotalByProfile(profileId) {
        const holdings = await this.getByProfile(profileId);
        return holdings.reduce((sum, h) => sum + (Number(h.value) || 0), 0);
    },
};
