export class Subsession {
    public id: number;
    public user_id: number;
    public subsession: string;
    public active: boolean;

    constructor(data: Partial<Subsession>) {
        Object.assign(this, data);
    }
}
