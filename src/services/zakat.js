import { db } from '../db/db';
import { LEDGER_TYPES } from '../utils/constants';

export const ZakatService = {
    async calculate(yearId, profileId) {
        // Read configurable zakat percentage
        const pctSetting = await db.settings.get('zakatPercentage');
        const zakatRate = pctSetting?.value ?? 0.025;

        const entries = await db.ledger
            .where('[zakatYearId+profileId]')
            .equals([yearId, profileId])
            .toArray();

        const totalHoldings = entries
            .filter(e => e.type === LEDGER_TYPES.HOLDING_UPDATE)
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const interestRemoved = entries
            .filter(e => e.type === LEDGER_TYPES.INTEREST_REMOVED)
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const eligible = Math.max(0, totalHoldings - interestRemoved);
        const zakatDue = eligible * zakatRate;

        const given = entries
            .filter(e => e.type === LEDGER_TYPES.ZAKAT_PAYMENT_COMPLETED)
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const planned = entries
            .filter(e => e.type === LEDGER_TYPES.ZAKAT_PAYMENT_PLANNED)
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const remaining = Math.max(0, zakatDue - given);
        const surplus = given > zakatDue ? given - zakatDue : 0;
        const allocated = given + planned;
        const unallocated = Math.max(0, zakatDue - allocated);

        return {
            totalHoldings,
            interestRemoved,
            eligible,
            zakatRate,
            zakatDue,
            given,
            planned,
            remaining,
            surplus,
            allocated,
            unallocated,
        };
    },

    async calculateForYear(yearId) {
        const entries = await db.ledger
            .where('zakatYearId')
            .equals(yearId)
            .toArray();

        let totalDue = 0;
        let totalGiven = 0;

        // Group by profile
        const profileIds = [...new Set(entries.map(e => e.profileId))];
        for (const profileId of profileIds) {
            const result = await this.calculate(yearId, profileId);
            totalDue += result.zakatDue;
            totalGiven += result.given;
        }

        const remaining = Math.max(0, totalDue - totalGiven);
        const surplus = totalGiven > totalDue ? totalGiven - totalDue : 0;

        return { totalDue, totalGiven, remaining, surplus };
    },
};
