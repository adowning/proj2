export class GameReel {
    public reelsStrip: { [key: string]: string[] } = {
        reelStrip1: [],
        reelStrip2: [],
        reelStrip3: [],
        reelStrip4: [],
        reelStrip5: [],
        reelStrip6: [],
    };
    public reelsStripBonus: { [key: string]: string[] } = {
        reelStripBonus1: [],
        reelStripBonus2: [],
        reelStripBonus3: [],
        reelStripBonus4: [],
        reelStripBonus5: [],
        reelStripBonus6: [],
    };

    constructor(reelStrips: any) {
        for (const key in reelStrips) {
            if (this.reelsStrip.hasOwnProperty(key)) {
                this.reelsStrip[key] = reelStrips[key];
            } else if (this.reelsStripBonus.hasOwnProperty(key)) {
                this.reelsStripBonus[key] = reelStrips[key];
            }
        }
    }
}
