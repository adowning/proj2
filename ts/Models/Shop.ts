export class Shop {
    public id!: number;
    public name!: string;
    public balance!: number;
    public percent!: number;
    public max_win!: number;
    public frontend!: string;
    public password!: string; // Hidden in API usually
    public currency!: string;
    public shop_limit!: number;
    public is_blocked: boolean = false;
    public orderby!: string;
    public user_id!: number;
    public pending!: number;
    public access!: number;
    public country!: string;
    public os!: string;
    public device!: string;
    public rules_terms_and_conditions: boolean = false;
    public rules_privacy_policy: boolean = false;
    public rules_general_bonus_policy: boolean = false;
    public rules_why_bitcoin: boolean = false;
    public rules_responsible_gaming: boolean = false;
    public happyhours_active: boolean = false;
    public progress_active: boolean = false;
    public invite_active: boolean = false;
    public welcome_bonuses_active: boolean = false;
    public sms_bonuses_active: boolean = false;
    public wheelfortune_active: boolean = false;

    public static values: any = {
        'currency': ['BTC', 'ARS', 'mBTC', 'EUR', 'GBP', 'USD', 'AUD', 'CAD', 'NZD', 'NOK', 'SEK', 'ZAR', 'INR', 'RUB', 'CFA', 'HRK', 'HUF', 'GEL', 'UAH', 'RON', 'BRL', 'MYR', 'CNY', 'JPY', 'KRW', 'IDR', 'VND', 'THB', 'TND'],
        'percent': [90, 84, 82, 74],
        'orderby': ['RTP'],
        'max_win': [50, 100, 200, 300, 400, 500, 1000, 2000, 3000, 4000, 5000, 10000, 50000, 100000],
        'shop_limit': [100, 200, 300, 400, 500, 1000, 10000, 100000],
        'percent_labels': {
            '90': '90 - 92',
            '84': '84 - 86',
            '82': '82 - 84',
            '74': '74 - 76'
        }
    };

    constructor(data: Partial<Shop>) {
        Object.assign(this, data);
    }

    public get_values(key: string, add_empty = false, add_value: any = false): any {
        const values = Shop.values[key];
        const keys = values;

        let result: any = {};
        if (add_empty) {
            const keysWithEmpty = [''].concat(values);
            const valuesWithEmpty = ['---'].concat(keys);
            for (let i = 0; i < keysWithEmpty.length; i++) {
                result[keysWithEmpty[i]] = valuesWithEmpty[i] || '';
            }
        } else {
            for (let i = 0; i < values.length; i++) {
                result[values[i]] = keys[i] || '';
            }
        }

        if (add_value) {
            return { [add_value]: add_value, ...result };
        }
        return result;
    }

    public get_percent_label(percent: any = false): string {
        if (!percent) {
            percent = this.percent;
        }
        if (Shop.values['percent_labels'][percent]) {
            return Shop.values['percent_labels'][percent];
        }
        return Shop.values['percent_labels'][96] || '';
    }

    public blocked(): boolean {
        // Check global settings or user blocked status
        // Placeholder
        if (this.is_blocked) return true;
        return false;
    }
}
