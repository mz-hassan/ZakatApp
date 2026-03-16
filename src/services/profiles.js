import { db } from '../db/db';

export const ProfilesService = {
    async getAll() {
        return db.profiles.toArray();
    },

    async get(id) {
        return db.profiles.get(id);
    },

    async add(name) {
        return db.profiles.add({
            name,
            createdAt: new Date().toISOString(),
        });
    },

    async update(id, changes) {
        return db.profiles.update(id, changes);
    },

    async delete(id) {
        return db.profiles.delete(id);
    },
};
