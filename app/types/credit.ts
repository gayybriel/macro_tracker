export interface CreditDataPoint {
    obs_date: string;
    hy_oas_pct: number;
    ig_oas_pct: number;
    gap_pct: number;
    gap_bps: number;
}

export interface CreditStats {
    as_of: string;
    gap_bps: number;
    hy_oas_pct: number;
    ig_oas_pct: number;
    change_30d_bps: number;
}
