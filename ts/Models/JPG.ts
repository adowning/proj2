export class JPG {
    public id: number;
    public date_time: Date;
    public name: string;
    public balance: number;
    public pay_sum: number; // enum index or value
    public start_balance: number; // enum index or value
    public percent: number;
    public user_id: number;
    public shop_id: number;

    private _pay_sum: number | null = null;
    private _start_balance: number | null = null;

    public static values: any = {
        'percent': ['1.00', '0.90', '0.80', '0.70', '0.60', '0.50', '0.40', '0.30', '0.20', '0.10'],
        'balances': ['', '0', '100', '200', '300', '400', '500', '1000', '2000', '3000', '4000', '5000', '10000'],
        'start_balance': ['1 - 5', '5 - 10'],
        'pay_sum': ['50 - 60', '100 - 110', '200 - 210', '300 - 310', '400 - 410', '500 - 510', '1000 - 1010', '2000 - 2010', '3000 - 3010', '4000 - 4010', '5000 - 5010', '10000 - 10010']
    };

    constructor(data: Partial<JPG>) {
        Object.assign(this, data);
    }

    public add_jpg(type: string, sum: number, check = true): any {
        // Note: Needs access to Shop and User models/DB
        const old = this.balance;
        
        if (!sum) {
            return { success: false, text: 'Wrong sum' };
        }

        if (type == 'out' && this.balance < sum) {
             return {
                'success': false,
                'text': 'Not enough money in the jackpot balance "' + this.name + '". Only ' + this.balance
            };
        }

        const signedSum = (type == 'out' ? -1 * sum : sum);
        if (this.balance + signedSum < 0) {
             return {
                'success': false,
                'text': 'Balance < 0'
            };
        }

        this.balance += signedSum;
        
        // Log statistic here if needed
        
        return { 'success': true };
    }

    public get_pay_sum(): number {
        if (this._pay_sum !== null) {
            return this._pay_sum;
        }
        
        const range = JPG.values['pay_sum'][this.pay_sum];
        if (range) {
            const parts = range.split(' - ');
            const min = parseInt(parts[0]);
            const max = parseInt(parts[1]);
            this._pay_sum = Math.floor(Math.random() * (max - min + 1)) + min;
            return this._pay_sum;
        }
        return 0;
    }

    public get_start_balance(): number {
        if (this._start_balance !== null) {
            return this._start_balance;
        }

        const range = JPG.values['start_balance'][this.start_balance];
        if (range) {
            const parts = range.split(' - ');
            const min = parseInt(parts[0]);
            const max = parseInt(parts[1]);
            this._start_balance = Math.floor(Math.random() * (max - min + 1)) + min;
            return this._start_balance;
        }
        return 0;
    }

    public get_min(field: string): number {
        if (['pay_sum', 'start_balance'].includes(field)) {
            const valIndex = (this as any)[field];
            const range = JPG.values[field][valIndex];
            if (range) {
                const parts = range.split(' - ');
                return parseInt(parts[0]);
            }
        }
        return 0;
    }
}
