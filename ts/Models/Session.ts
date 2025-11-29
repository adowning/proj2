export class Session {
    public id: number;
    public user_id: number;
    public ip: string;
    public user_agent: string;
    public payload: string;
    public last_activity: number;

    constructor(data: Partial<Session>) {
        Object.assign(this, data);
    }
}
