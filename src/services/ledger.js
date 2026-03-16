import { db } from '../db/db';

export const LedgerService = {
    async add(entry) {
        return db.ledger.add({
            ...entry,
            date: entry.date || new Date().toISOString(),
        });
    },

    async getByYearAndProfile(yearId, profileId) {
        return db.ledger
            .where('[zakatYearId+profileId]')
            .equals([yearId, profileId])
            .toArray();
    },

    async getByYearAndType(yearId, type) {
        return db.ledger
            .where('[zakatYearId+type]')
            .equals([yearId, type])
            .toArray();
    },

    async getByRecipient(recipientId) {
        return db.ledger
            .where('recipientId')
            .equals(recipientId)
            .toArray();
    },

    async getByYear(yearId) {
        return db.ledger
            .where('zakatYearId')
            .equals(yearId)
            .toArray();
    },

    async delete(id) {
        return db.ledger.delete(id);
    },

    async update(id, changes) {
        return db.ledger.update(id, changes);
    },
};
