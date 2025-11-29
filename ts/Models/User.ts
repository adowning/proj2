// User.ts - User model class
export class User {
    constructor(data?: any) {
        this.id = data?.id || 0;
        this.balance = data?.balance || 0;
        this.count_balance = data?.count_balance || 0;
        this.address = data?.address || 0;
        this.session = data?.session || '';
        this.status = data?.status || '';
        this.is_blocked = data?.is_blocked || false;
        this.remember_token = data?.remember_token || null;
    }

    public id: number;
    public balance: number;
    public count_balance: number;
    public address: number;
    public session: string;
    public status: string;
    public is_blocked: boolean;
    public remember_token: string | null;

    public save?(): void {
        // Implementation would depend on the data persistence layer

    }

    public increment(field: string, amount: number): void {
        // Implementation would depend on the data persistence layer
        (this as any)[field] += amount;
    }

    public refresh?(): void {
        // Implementation would depend on the data persistence layer
    }
}