export class Statistic {
    public id: number;
    public title: string;
    public user_id: number;
    public payeer_id: number;
    public system: string;
    public type: string;
    public sum: number;
    public sum2: number;
    public old: number;
    public item_id: number;
    public shop_id: number;
    public credit_in: number;
    public credit_out: number;
    public money_in: number;
    public money_out: number;
    public hh_multiplier: number;
    public created_at: Date;
    public user_agent: string;
    public ip_address: string;
    public country: string;
    public city: string;
    public os: string;
    public device: string;
    public browser: string;

    constructor(data: Partial<Statistic>) {
        Object.assign(this, data);
    }
}
