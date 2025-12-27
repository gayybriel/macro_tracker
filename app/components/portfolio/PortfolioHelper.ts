import { PortfolioPosition, PortfolioGroup } from '../types/portfolio';

export const groupPortfolio = (positions: PortfolioPosition[]): {
    groups: PortfolioGroup[];
    totalSgd: number;
    allocationByGroup: { name: string; value: number }[];
} => {
    // 1. Define Buckets
    const groups: Record<string, PortfolioPosition[]> = {
        cash: [],
        core: [],
        crypto: [],
        others: []
    };

    // 2. Sort into Buckets
    positions.forEach(pos => {
        const type = pos.asset_type?.toLowerCase() || 'other';

        if (type === 'cash') {
            groups.cash.push(pos);
        } else if (['etf', 'fund', 'mmf', 'gold'].includes(type)) {
            groups.core.push(pos);
        } else if (type === 'crypto') {
            groups.crypto.push(pos);
        } else {
            groups.others.push(pos);
        }
    });

    // 3. Helper to build Group Object
    const buildGroup = (id: string, label: string, items: PortfolioPosition[]): PortfolioGroup => {
        // Sort items by Value SGD Desc
        const sortedItems = items.sort((a, b) => (b.value_sgd || 0) - (a.value_sgd || 0));
        const total = sortedItems.reduce((sum, item) => sum + (item.value_sgd || 0), 0);

        return {
            id,
            label,
            items: sortedItems,
            totalSgd: total,
            weightPct: 0 // Will calc later
        };
    };

    // 4. Create Groups in Fixed Order
    const resultGroups = [
        buildGroup('cash', 'Cash / Liquidity', groups.cash),
        buildGroup('core', 'Core Portfolio', groups.core),
        buildGroup('crypto', 'Crypto', groups.crypto),
        buildGroup('others', 'Others', groups.others)
    ].filter(g => g.items.length > 0); // Only keep non-empty groups

    // 5. Grand Total & Weights
    const totalSgd = resultGroups.reduce((sum, g) => sum + g.totalSgd, 0);

    resultGroups.forEach(g => {
        g.weightPct = totalSgd > 0 ? (g.totalSgd / totalSgd) * 100 : 0;
    });

    // 6. Chart Data
    const allocationByGroup = resultGroups.map(g => ({
        name: g.label.split(' /')[0], // "Cash / Liquidity" -> "Cash"
        value: g.totalSgd
    }));

    return { groups: resultGroups, totalSgd, allocationByGroup };
};
