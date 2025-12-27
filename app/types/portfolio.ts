export interface PortfolioPosition {
    account: string;
    code: string;
    asset_name: string;
    asset_type: string;     // 'stock','etf','fund','mmf','gold','crypto','cash'
    exchange: string | null;
    asset_ccy: string;
    quantity: number;

    // Price Used
    price_used: number | null;
    price_date_used: string | null;
    price_source_used: string | null;

    // FX Used
    sgd_per_ccy: number | null;
    fx_date_used: string | null;
    fx_source_used: string | null;

    // Valuation
    value_native: number | null;
    value_sgd: number | null;
}

export interface PortfolioGroup {
    id: string; // 'cash', 'core', 'crypto', 'others'
    label: string;
    items: PortfolioPosition[];
    totalSgd: number;
    weightPct: number;
}
