export class GameLog {
    public id: number;
    public time: Date;
    public game_id: number;
    public user_id: number;
    public ip: string;
    public str: string;
    public shop_id: number;

    constructor(data: Partial<GameLog>) {
        Object.assign(this, data);
    }
}
