import { db } from '../db/db';

export const RecipientsService = {
    async getAll() {
        return db.recipients.toArray();
    },

    async get(id) {
        return db.recipients.get(id);
    },

    async add(name) {
        return db.recipients.add({ name });
    },

    async update(id, changes) {
        return db.recipients.update(id, changes);
    },

    async delete(id) {
        return db.recipients.delete(id);
    },

    async search(query) {
        const all = await db.recipients.toArray();
        if (!query) return all;
        const q = query.toLowerCase();
        return all.filter(r => r.name.toLowerCase().includes(q));
    },
};
