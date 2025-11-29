// Game.ts - Game model class
export class Game {
    constructor(data?: any) {
        this.id = data?.id || 0;
        this.view = data?.view !== undefined ? data.view : true;
        this.stat_in = data?.stat_in || 0;
        this.stat_out = data?.stat_out || 0;
        this.denominations = data?.denominations || [];
        this.advanced = data?.advanced || '';
        this.rezerv = data?.rezerv || 0;
        this.balance = data?.balance || 0;
        this.name = data?.name || '';
        this.denomination = data?.denomination || '';
        this.bet = data?.bet || '';
        this.slotViewState = data?.slotViewState || ''
    }

    public id: number;
    public view: boolean;
    public stat_in: number;
    public stat_out: number;
    public denominations: number[];
    public advanced: string;
    public rezerv: number;
    public denomination: number;
    public balance: number;
    public name?: string;
    public slotViewState?: string;
    public bet?: string;

    public save?(): void {
        // Implementation would depend on the data persistence layer
    }

    public refresh?(): void {
        // Implementation would depend on the data persistence layer
    }

    public get_gamebank?(state: string): number {
        // Implementation would depend on the data persistence layer
        return 0;
    }

    public set_gamebank?(amount: number, operation: string, state: string): void {
        // Implementation would depend on the data persistence layer
    }
}