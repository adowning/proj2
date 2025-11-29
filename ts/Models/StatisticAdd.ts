export class StatisticAdd {
    public id: number;
    public agent_in: number;
    public agent_out: number;
    public distributor_in: number;
    public distributor_out: number;
    public type_in: number;
    public type_out: number;
    public credit_in: number;
    public credit_out: number;
    public money_in: number;
    public money_out: number;
    public statistic_id: number;
    public user_id: number;
    public shop_id: number;

    constructor(data: Partial<StatisticAdd>) {
        Object.assign(this, data);
    }
}
