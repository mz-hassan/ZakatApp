import { db } from '../db/db';
import { LEDGER_TYPES } from '../utils/constants';

export const TrusteesService = {
    async getAll() {
        return db.trustees.toArray();
    },

    async get(id) {
        return db.trustees.get(id);
    },

    async add(name) {
        return db.trustees.add({ name });
    },

    async update(id, changes) {
        return db.trustees.update(id, changes);
    },

    async delete(id) {
        return db.trustees.delete(id);
    },

    async search(query) {
        const all = await db.trustees.toArray();
        if (!query) return all;
        const q = query.toLowerCase();
        return all.filter(t => t.name.toLowerCase().includes(q));
    },

    async getTotalByTrustee(trusteeId) {
        const entries = await db.ledger
            .where('trusteeId')
            .equals(trusteeId)
            .toArray();
        const completed = entries.filter(e => e.type === LEDGER_TYPES.ZAKAT_PAYMENT_COMPLETED);
        return completed.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    },

    async getEntriesByTrustee(trusteeId) {
        const entries = await db.ledger
            .where('trusteeId')
            .equals(trusteeId)
            .toArray();
        return entries
            .filter(e => e.type === LEDGER_TYPES.ZAKAT_PAYMENT_COMPLETED)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    },
};
