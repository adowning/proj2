// Server.ts - TurnYourFortuneNET game server
// Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines
// Data injection pattern - NO database calls or legacy PHP constructs

import { SlotSettings, ReelStrips } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'TurnYourFortuneNET';

    // The Server constructor uses the strongly-typed data object
    public constructor(slotSettingsData: ISlotSettingsData) {
        // Instantiate SlotSettings by passing the received data object
        this.slotSettings = new SlotSettings(slotSettingsData);
    }

    public get(request: any, game: any): any {
        try {
            // Handle request based on the data injection pattern
            const response = this.processRequest(request, game);
            return response;
        } catch (error) {
            return this.handleError(error);
        }
    }

    private processRequest(request: any, game: any): string {
        let postData = request;
        if (request.gameData) {
            postData = request.gameData;
        } else if (typeof request === 'string') {
            try {
                postData = JSON.parse(request);
            } catch (e) {
                // If not JSON, it might be raw object or legacy format
            }
        }

        // Map 'action' to 'slotEvent' logic
        postData.slotEvent = 'bet';
        if (postData.action === 'freespin') {
            postData.slotEvent = 'freespin';
            postData.action = 'spin';
        }
        if (postData.action === 'init' || postData.action === 'reloadbalance') {
            postData.action = 'init';
            postData.slotEvent = 'init';
        }
        if (postData.action === 'paytable') {
            postData.slotEvent = 'paytable';
        }
        if (postData.action === 'initfreespin') {
            postData.slotEvent = 'initfreespin';
        }
        if (postData.action === 'bonusaction') {
            postData.slotEvent = 'bonusaction';
        }

        // Denomination handling
        if (postData.bet_denomination && postData.bet_denomination >= 1) {
            const betDenom = postData.bet_denomination / 100;
            this.slotSettings.CurrentDenom = betDenom;
            this.slotSettings.CurrentDenomination = betDenom;
            this.slotSettings.SetGameData(this.slotId + 'GameDenom', betDenom);
        } else if (this.slotSettings.HasGameData(this.slotId + 'GameDenom')) {
            const betDenom = this.slotSettings.GetGameData(this.slotId + 'GameDenom');
            this.slotSettings.CurrentDenom = betDenom;
            this.slotSettings.CurrentDenomination = betDenom;
        }

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        // Basic validation
        if (postData.slotEvent === 'bet') {
            const lines = 20;
            const betline = postData.bet_betlevel;
            if (lines <= 0 || betline <= 0.0001) {
                return `{"responseEvent":"error","responseType":"${postData.slotEvent}","serverResponse":"invalid bet state"}`;
            }
            if (this.slotSettings.GetBalance() < (lines * betline)) {
                return `{"responseEvent":"error","responseType":"${postData.slotEvent}","serverResponse":"invalid balance"}`;
            }
        }

        // Validate bonus state
        if (this.slotSettings.GetGameData(this.slotId + 'FreeGames') <
            this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') &&
            postData.slotEvent === 'freespin') {
            return `{"responseEvent":"error","responseType":"${postData.slotEvent}","serverResponse":"invalid bonus state"}`;
        }

        const aid = postData.action;

        switch (aid) {
            case 'init':
                return this.handleInitRequest();
            case 'paytable':
                return this.handlePaytableRequest();
            case 'spin':
                return this.handleSpinRequest(postData);
            case 'bonusaction':
                return this.handleBonusActionRequest();
            default:
                return this.createErrorResponse("unknown action");
        }
    }

    private handleInitRequest(): string {
        const lastEvent = this.slotSettings.GetHistory();

        // Reset game state
        this.slotSettings.SetGameData(this.slotId + 'BonusWin', 0);
        this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
        this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
        this.slotSettings.SetGameData(this.slotId + 'TotalWin', 0);
        this.slotSettings.SetGameData(this.slotId + 'FreeBalance', 0);

        let freeState = '';
        let curReels = '';

        if (lastEvent && lastEvent !== 'NULL' && lastEvent.serverResponse) {
            const serverResponse = lastEvent.serverResponse;
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', serverResponse.totalFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', serverResponse.currentFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', serverResponse.Balance);
            freeState = serverResponse.freeState || '';

            const reels = serverResponse.reelsSymbols;
            if (reels) {
                curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1?.[0] || 0}%2CSYM${reels.reel1?.[1] || 0}%2CSYM${reels.reel1?.[2] || 0}%2CSYM${reels.reel1?.[3] || 0}`;
                curReels += `&rs.i0.r.i1.syms=SYM${reels.reel2?.[0] || 0}%2CSYM${reels.reel2?.[1] || 0}%2CSYM${reels.reel2?.[2] || 0}%2CSYM${reels.reel2?.[3] || 0}`;
                curReels += `&rs.i0.r.i2.syms=SYM${reels.reel3?.[0] || 0}%2CSYM${reels.reel3?.[1] || 0}%2CSYM${reels.reel3?.[2] || 0}%2CSYM${reels.reel3?.[3] || 0}`;
                curReels += `&rs.i0.r.i3.syms=SYM${reels.reel4?.[0] || 0}%2CSYM${reels.reel4?.[1] || 0}%2CSYM${reels.reel4?.[2] || 0}%2CSYM${reels.reel4?.[3] || 0}`;
                curReels += `&rs.i0.r.i4.syms=SYM${reels.reel5?.[0] || 0}%2CSYM${reels.reel5?.[1] || 0}%2CSYM${reels.reel5?.[2] || 0}%2CSYM${reels.reel5?.[3] || 0}`;
                curReels += `&rs.i1.r.i0.syms=SYM${reels.reel1?.[0] || 0}%2CSYM${reels.reel1?.[1] || 0}%2CSYM${reels.reel1?.[2] || 0}%2CSYM${reels.reel1?.[3] || 0}`;
                curReels += `&rs.i1.r.i1.syms=SYM${reels.reel2?.[0] || 0}%2CSYM${reels.reel2?.[1] || 0}%2CSYM${reels.reel2?.[2] || 0}%2CSYM${reels.reel2?.[3] || 0}`;
                curReels += `&rs.i1.r.i2.syms=SYM${reels.reel3?.[0] || 0}%2CSYM${reels.reel3?.[1] || 0}%2CSYM${reels.reel3?.[2] || 0}%2CSYM${reels.reel3?.[3] || 0}`;
                curReels += `&rs.i1.r.i3.syms=SYM${reels.reel4?.[0] || 0}%2CSYM${reels.reel4?.[1] || 0}%2CSYM${reels.reel4?.[2] || 0}%2CSYM${reels.reel4?.[3] || 0}`;
                curReels += `&rs.i1.r.i4.syms=SYM${reels.reel5?.[0] || 0}%2CSYM${reels.reel5?.[1] || 0}%2CSYM${reels.reel5?.[2] || 0}%2CSYM${reels.reel5?.[3] || 0}`;

                for(let i=0; i<5; i++) {
                    curReels += `&rs.i0.r.i${i}.pos=${reels.rp?.[0] || 0}`;
                    curReels += `&rs.i1.r.i${i}.pos=${reels.rp?.[0] || 0}`;
                }
            }
        } else {
            // Random initial reels
            curReels = `&rs.i0.r.i0.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            curReels += `&rs.i0.r.i1.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            curReels += `&rs.i0.r.i2.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            curReels += `&rs.i0.r.i3.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            curReels += `&rs.i0.r.i4.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;

            for(let i=0; i<5; i++) {
                curReels += `&rs.i0.r.i${i}.pos=${this.randomInt(1, 10)}`;
                curReels += `&rs.i1.r.i${i}.pos=${this.randomInt(1, 10)}`;
            }
        }

        const denominations = (this.slotSettings.game?.denominations || [1]).map(d => d * 100).join('%2C');
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        if (this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') < this.slotSettings.GetGameData(this.slotId + 'FreeGames') && this.slotSettings.GetGameData(this.slotId + 'FreeGames') > 0) {
             const totalWin = this.slotSettings.GetGameData(this.slotId + 'BonusWin');
             // Simplified restore logic for freeState based on PHP
             freeState = `rs.i1.r.i0.syms=SYM2%2CSYM5%2CSYM5&bl.i6.coins=1&bl.i17.reelset=ALL&rs.i0.nearwin=4&bl.i15.id=15&rs.i0.r.i4.hold=false&gamestate.history=basic%2Cfreespin&rs.i1.r.i2.hold=false&game.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&rs.i1.r.i1.overlay.i2.pos=61&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i10.line=1%2C2%2C1%2C2%2C1&bl.i0.reelset=ALL&bl.i18.coins=1&bl.i10.id=10&freespins.initial=15&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&bl.i13.coins=1&rs.i0.r.i0.syms=SYM5%2CSYM0%2CSYM6&bl.i2.id=2&rs.i1.r.i1.pos=59&rs.i0.r.i0.pos=24&bl.i14.reelset=ALL&game.win.coins=${totalWin}&rs.i1.r.i0.hold=false&bl.i3.id=3&ws.i1.reelset=freespin&bl.i12.coins=1&bl.i8.reelset=ALL&clientaction=init&rs.i0.r.i2.hold=false&bl.i16.id=16&casinoID=netent&bl.i5.coins=1&rs.i1.r.i1.overlay.i1.row=1&bl.i8.id=8&rs.i0.r.i3.pos=17&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i12.line=2%2C1%2C2%2C1%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&rs.i0.r.i2.syms=SYM7%2CSYM6%2CSYM6&rs.i1.r.i1.overlay.i1.with=SYM1_FS&game.win.amount=${totalWin}&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&denomination.all=${denominations}&ws.i0.reelset=freespin&bl.i1.id=1&rs.i0.r.i3.attention.i0=2&rs.i1.r.i1.overlay.i0.with=SYM1_FS&rs.i1.r.i4.pos=39&denomination.standard=${this.slotSettings.CurrentDenomination * 100}&multiplier=1&bl.i14.id=14&bl.i19.line=0%2C2%2C2%2C2%2C0&freespins.denomination=2.000&bl.i12.reelset=ALL&bl.i2.coins=1&bl.i6.id=6&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&freespins.totalwin.coins=${totalWin}&ws.i0.direction=left_to_right&freespins.total=${this.slotSettings.GetGameData(this.slotId + 'FreeGames')}&gamestate.stack=basic%2Cfreespin&rs.i1.r.i4.syms=SYM5%2CSYM4%2CSYM4&gamesoundurl=&bet.betlevel=1&bl.i5.reelset=ALL&bl.i19.coins=1&bl.i7.id=7&bl.i18.reelset=ALL&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=1&bl.i14.line=1%2C1%2C2%2C1%2C1&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM5%2CSYM5%2CSYM0&rs.i0.r.i2.pos=48&bl.i13.line=1%2C1%2C0%2C1%2C1&ws.i1.betline=19&rs.i1.r.i0.pos=20&bl.i0.coins=1&bl.i2.reelset=ALL&rs.i1.r.i1.overlay.i2.row=2&rs.i1.r.i4.hold=false&freespins.left=${this.slotSettings.GetGameData(this.slotId + 'FreeGames') - this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame')}&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&bl.i15.reelset=ALL&rs.i0.r.i3.hold=false&bet.denomination=${this.slotSettings.GetGameData(this.slotId + 'GameDenom') * 100}&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&freespins.win.coins=${totalWin}&historybutton=false&bl.i5.id=5&gameEventSetters.enabled=false&rs.i1.r.i3.pos=27&rs.i0.r.i1.syms=SYM5%2CSYM1%2CSYM3&bl.i3.coins=1&ws.i1.types.i0.coins=40&bl.i10.coins=1&bl.i18.id=18&ws.i0.betline=3&rs.i1.r.i3.hold=false&totalwin.coins=${totalWin}&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=freespin&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i0.r.i3.syms=SYM4%2CSYM4%2CSYM0&rs.i1.r.i1.syms=SYM7%2CSYM1_FS%2CSYM5&bl.i16.coins=1&freespins.win.cents=${totalWin * 100}&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&rs.i1.r.i1.overlay.i0.pos=59&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i0.r.i1.pos=61&rs.i1.r.i3.syms=SYM3%2CSYM3%2CSYM6&bl.i13.id=13&rs.i0.r.i1.hold=false&ws.i1.types.i0.wintype=coins&bl.i9.line=1%2C0%2C1%2C0%2C1&ws.i1.sym=SYM2&betlevel.standard=1&bl.i10.reelset=ALL&ws.i1.types.i0.cents=80&gameover=false&bl.i11.coins=1&ws.i1.direction=left_to_right&bl.i13.reelset=ALL&bl.i0.id=0&nextaction=freespin&bl.i15.line=0%2C1%2C1%2C1%2C0&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i19.id=19&bl.i4.reelset=ALL&bl.i4.coins=1&bl.i18.line=2%2C0%2C2%2C0%2C2&freespins.totalwin.cents=${totalWin * 100}&bl.i9.id=9&bl.i17.line=0%2C2%2C0%2C2%2C0&bl.i11.id=11&freespins.betlevel=1&ws.i0.pos.i2=2%2C2&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&bl.i17.coins=1&ws.i1.pos.i0=0%2C0&ws.i1.pos.i1=2%2C2&ws.i1.pos.i2=1%2C2&ws.i0.pos.i1=1%2C1&bl.i19.reelset=ALL&ws.i0.pos.i0=0%2C0&bl.i11.reelset=ALL&bl.i16.line=2%2C1%2C1%2C1%2C2&rs.i0.id=basic&credit=${balanceInCents}&ws.i0.types.i0.coins=40&bl.i1.reelset=ALL&rs.i1.r.i1.overlay.i1.pos=60&rs.i1.r.i1.overlay.i2.with=SYM1_FS&bl.i1.line=0%2C0%2C0%2C0%2C0&ws.i0.sym=SYM2&bl.i17.id=17&rs.i1.r.i2.pos=1&bl.i16.reelset=ALL&ws.i0.types.i0.wintype=coins&nearwinallowed=true&bl.i8.line=1%2C0%2C0%2C0%2C1&rs.i1.r.i1.overlay.i0.row=0&freespins.wavecount=1&rs.i0.r.i4.attention.i0=2&bl.i8.coins=1&bl.i15.coins=1&bl.i2.line=2%2C2%2C2%2C2%2C2&rs.i0.r.i0.attention.i0=1&rs.i1.r.i2.syms=SYM3%2CSYM3%2CSYM2&totalwin.cents=${totalWin * 100}&rs.i0.r.i0.hold=false&restore=true&rs.i1.id=freespin&bl.i12.id=12&bl.i4.id=4&rs.i0.r.i4.pos=10&bl.i7.coins=1&ws.i0.types.i0.cents=80&bl.i6.reelset=ALL&wavecount=1&bl.i14.coins=1&rs.i1.r.i1.hold=false`;
        }

        return `bl.i32.reelset=ALL&rs.i1.r.i0.syms=SYM5%2CSYM5%2CSYM5%2CSYM1&bl.i6.coins=0&bl.i17.reelset=ALL&bl.i15.id=15&rs.i0.r.i4.hold=false&rs.i1.r.i2.hold=false&bl.i21.id=21&game.win.cents=0&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i23.reelset=ALL&bl.i33.coins=0&bl.i10.line=1%2C0%2C1%2C0%2C1&bl.i0.reelset=ALL&bl.i20.coins=0&bl.i18.coins=0&bl.i10.id=10&bl.i3.reelset=ALL&bl.i4.line=3%2C2%2C1%2C2%2C3&bl.i13.coins=0&bl.i26.reelset=ALL&bl.i24.line=0%2C0%2C2%2C0%2C0&bl.i27.id=27&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&bl.i2.id=2&rs.i1.r.i1.pos=0&bl.i38.line=3%2C0%2C0%2C0%2C3&rs.i3.r.i4.pos=0&rs.i0.r.i0.pos=0&bl.i14.reelset=ALL&rs.i2.r.i3.pos=0&bl.i38.id=38&bl.i39.coins=0&rs.i5.r.i0.pos=0&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=0&rs.i2.id=respin_second&game.win.coins=0&bl.i28.line=0%2C2%2C0%2C2%2C0&rs.i1.r.i0.hold=false&bl.i3.id=3&bl.i22.line=2%2C2%2C0%2C2%2C2&bl.i12.coins=0&bl.i8.reelset=ALL&clientaction=init&rs.i4.r.i0.hold=false&rs.i0.r.i2.hold=false&rs.i4.r.i3.syms=SYM8%2CSYM8%2CSYM8%2CSYM5&bl.i16.id=16&bl.i37.reelset=ALL&bl.i39.id=39&casinoID=netent&bl.i5.coins=0&rs.i3.r.i2.hold=false&bl.i8.id=8&rs.i5.r.i1.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&rs.i0.r.i3.pos=0&bl.i33.id=33&rs.i4.r.i0.syms=SYM5%2CSYM5%2CSYM5%2CSYM1&rs.i5.r.i3.pos=0&bl.i6.line=0%2C1%2C2%2C1%2C0&bl.i22.id=22&bl.i12.line=1%2C2%2C1%2C2%2C1&bl.i0.line=1%2C1%2C1%2C1%2C1&bl.i29.reelset=ALL&bl.i34.line=2%2C1%2C1%2C1%2C2&rs.i4.r.i2.pos=0&bl.i31.line=1%2C2%2C2%2C2%2C1&rs.i0.r.i2.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&bl.i34.coins=0&game.win.amount=0&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&rs.i5.r.i2.hold=false&denomination.all=${denominations}&bl.i27.coins=0&bl.i34.reelset=ALL&rs.i2.r.i0.pos=0&bl.i30.reelset=ALL&bl.i1.id=1&rs.i3.r.i2.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&bl.i33.line=3%2C2%2C2%2C2%2C3&bl.i25.id=25&rs.i1.r.i4.pos=0&denomination.standard=${this.slotSettings.CurrentDenomination * 100}&rs.i3.id=respin_no_upgrade&bl.i31.id=31&bl.i32.line=2%2C3%2C3%2C3%2C2&multiplier=1&bl.i14.id=14&bl.i19.line=0%2C0%2C1%2C0%2C0&bl.i12.reelset=ALL&bl.i2.coins=0&bl.i6.id=6&bl.i21.reelset=ALL&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&bl.i20.id=20&rs.i1.r.i4.syms=SYM3%2CSYM5%2CSYM5%2CSYM8&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i5.r.i2.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&rs.i5.r.i3.hold=false&rs.i4.r.i2.hold=false&bl.i33.reelset=ALL&bl.i5.reelset=ALL&bl.i24.coins=0&rs.i4.r.i1.syms=SYM11%2CSYM11%2CSYM7%2CSYM4&bl.i19.coins=0&bl.i32.coins=0&bl.i7.id=7&bl.i18.reelset=ALL&rs.i2.r.i4.pos=0&rs.i3.r.i0.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=0&bl.i32.id=32&rs.i4.r.i1.hold=false&rs.i3.r.i2.pos=0&ladder_table.level.i0=5%2C10%2C20%2C50%2C150&bl.i14.line=1%2C1%2C0%2C1%2C1&ladder_table.level.i1=10%2C20%2C40%2C100%2C200&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&ladder_table.level.i4=50%2C100%2C200%2C500%2C2000&ladder_table.level.i2=20%2C30%2C50%2C150%2C400&rs.i0.r.i4.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&ladder_table.level.i3=30%2C50%2C100%2C300%2C1000&bl.i25.coins=0&rs.i0.r.i2.pos=0&bl.i39.reelset=ALL&bl.i13.line=2%2C3%2C2%2C3%2C2&bl.i24.reelset=ALL&rs.i1.r.i0.pos=0&bl.i0.coins=20&rs.i2.r.i0.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&bl.i2.reelset=ALL&bl.i31.coins=0&bl.i37.id=37&rs.i3.r.i1.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&rs.i1.r.i4.hold=false&rs.i4.r.i1.pos=0&bl.i26.coins=0&rs.i4.r.i2.syms=SYM10%2CSYM10%2CSYM5%2CSYM8&bl.i27.reelset=ALL&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35%2C36%2C37%2C38%2C39&bl.i29.line=1%2C3%2C1%2C3%2C1&rs.i5.r.i3.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&rs.i3.r.i0.hold=false&bl.i23.line=0%2C0%2C3%2C0%2C0&bl.i26.id=26&bl.i15.reelset=ALL&rs.i0.r.i3.hold=false&rs.i5.r.i4.pos=0&rs.i4.id=basic&rs.i2.r.i1.hold=false&gameServerVersion=1.0.2&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&bl.i30.id=30&historybutton=false&bl.i25.line=1%2C1%2C3%2C1%2C1&bl.i5.id=5&gameEventSetters.enabled=false&bl.i36.reelset=ALL&rs.i1.r.i3.pos=0&rs.i0.r.i1.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&bl.i3.coins=0&bl.i10.coins=0&bl.i18.id=18&rs.i2.r.i1.pos=0&rs.i4.r.i4.pos=0&bl.i30.coins=0&bl.i39.line=0%2C3%2C3%2C3%2C0&rs.i1.r.i3.hold=false&totalwin.coins=0&rs.i5.r.i4.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&bl.i5.line=2%2C1%2C0%2C1%2C2&gamestate.current=basic&bl.i28.coins=0&rs.i4.r.i0.pos=0&bl.i27.line=2%2C0%2C2%2C0%2C2&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C3%2C2%2C1&bl.i35.id=35&rs.i3.r.i1.hold=false&rs.i0.r.i3.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&rs.i1.r.i1.syms=SYM11%2CSYM11%2CSYM7%2CSYM4&bl.i16.coins=0&bl.i36.coins=0&bl.i9.coins=0&bl.i30.line=0%2C1%2C1%2C1%2C0&bl.i7.reelset=ALL&isJackpotWin=false&rs.i2.r.i3.hold=false&bl.i24.id=24&rs.i0.r.i1.pos=0&rs.i4.r.i4.syms=SYM3%2CSYM5%2CSYM5%2CSYM8&bl.i22.coins=0&rs.i1.r.i3.syms=SYM8%2CSYM8%2CSYM8%2CSYM5&bl.i29.coins=0&bl.i31.reelset=ALL&bl.i13.id=13&bl.i36.id=36&rs.i0.r.i1.hold=false&rs.i2.r.i1.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&bl.i9.line=2%2C1%2C2%2C1%2C2&bl.i35.coins=0&betlevel.standard=1&bl.i10.reelset=ALL&gameover=true&rs.i3.r.i3.pos=0&bl.i25.reelset=ALL&rs.i5.id=respin_first&bl.i23.coins=0&bl.i11.coins=0&rs.i5.r.i1.hold=false&bl.i22.reelset=ALL&rs.i5.r.i4.hold=false&bl.i13.reelset=ALL&bl.i0.id=0&nextaction=spin&bl.i15.line=2%2C2%2C1%2C2%2C2&bl.i3.line=3%2C3%2C3%2C3%2C3&bl.i19.id=19&bl.i4.reelset=ALL&bl.i4.coins=0&bl.i37.line=0%2C3%2C0%2C3%2C0&bl.i18.line=1%2C1%2C2%2C1%2C1&bl.i9.id=9&bl.i34.id=34&bl.i17.line=2%2C2%2C3%2C2%2C2&bl.i11.id=11&bl.i37.coins=0&rs.i4.r.i3.pos=0&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&rs.i4.r.i4.hold=false&bl.i17.coins=0&bl.i28.id=28&rs.i5.r.i0.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&bl.i19.reelset=ALL&rs.i2.r.i4.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&rs.i4.r.i3.hold=false&bl.i11.reelset=ALL&bl.i16.line=3%2C3%2C2%2C3%2C3&rs.i0.id=respin_third&bl.i38.reelset=ALL&credit=${balanceInCents}&bl.i21.line=3%2C3%2C1%2C3%2C3&bl.i35.line=1%2C0%2C0%2C0%2C1&bl.i1.reelset=ALL&rs.i2.r.i2.pos=0&bl.i21.coins=0&bl.i28.reelset=ALL&rs.i5.r.i1.pos=0&bl.i1.line=2%2C2%2C2%2C2%2C2&bl.i17.id=17&rs.i2.r.i2.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&rs.i1.r.i2.pos=0&bl.i16.reelset=ALL&rs.i3.r.i3.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&rs.i3.r.i4.hold=false&rs.i5.r.i0.hold=false&nearwinallowed=true&bl.i8.line=3%2C2%2C3%2C2%2C3&bl.i35.reelset=ALL&rs.i3.r.i3.hold=false&bl.i8.coins=0&bl.i23.id=23&bl.i15.coins=0&bl.i36.line=3%2C0%2C3%2C0%2C3&bl.i2.line=0%2C0%2C0%2C0%2C0&rs.i1.r.i2.syms=SYM10%2CSYM10%2CSYM5%2CSYM8&totalwin.cents=0&bl.i38.coins=0&rs.i5.r.i2.pos=0&rs.i0.r.i0.hold=false&rs.i2.r.i3.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&restore=false&rs.i1.id=freespin&rs.i3.r.i4.syms=SYM12%2CSYM13%2CSYM13%2CSYM13&bl.i12.id=12&bl.i29.id=29&bl.i4.id=4&rs.i0.r.i4.pos=0&bl.i7.coins=0&bl.i6.reelset=ALL&rs.i3.r.i0.pos=0&bl.i20.line=3%2C3%2C0%2C3%2C3&rs.i2.r.i2.hold=false&bl.i20.reelset=ALL&wavecount=1&bl.i14.coins=0&rs.i1.r.i1.hold=false&bl.i26.line=3%2C1%2C3%2C1%2C3${curReels}${freeState}`;
    }

    private handlePaytableRequest(): string {
        // Return static paytable string (simplified/condensed version of what PHP would return)
        // Since it's huge, I'll return the provided string in PHP to be safe
        return `bl.i32.reelset=ALL&bl.i17.reelset=ALL&bl.i15.id=15&pt.i0.comp.i29.type=betline&pt.i0.comp.i17.symbol=SYM7&pt.i0.comp.i5.freespins=0&pt.i0.comp.i23.n=5&pt.i0.comp.i13.symbol=SYM6&pt.i1.comp.i8.type=betline&pt.i1.comp.i4.n=4&pt.i0.comp.i15.multi=15&bl.i10.line=1%2C0%2C1%2C0%2C1&pt.i1.comp.i27.symbol=SYM11&pt.i0.comp.i28.multi=10&bl.i18.coins=0&pt.i1.comp.i29.freespins=0&pt.i1.comp.i30.symbol=SYM0&pt.i1.comp.i3.multi=40&pt.i0.comp.i11.n=5&pt.i1.comp.i23.symbol=SYM9&bl.i4.line=3%2C2%2C1%2C2%2C3&bl.i13.coins=0&bl.i27.id=27&pt.i0.id=basic&pt.i0.comp.i1.type=betline&bl.i2.id=2&bl.i38.line=3%2C0%2C0%2C0%2C3&pt.i1.comp.i10.type=betline&pt.i0.comp.i4.symbol=SYM3&pt.i1.comp.i5.freespins=0&pt.i1.comp.i8.symbol=SYM4&bl.i14.reelset=ALL&pt.i1.comp.i19.n=4&pt.i0.comp.i17.freespins=0&bl.i38.id=38&bl.i39.coins=0&pt.i0.comp.i8.symbol=SYM4&pt.i0.comp.i0.symbol=SYM1&pt.i0.comp.i3.freespins=0&pt.i0.comp.i10.multi=50&pt.i1.id=freespin&bl.i3.id=3&bl.i22.line=2%2C2%2C0%2C2%2C2&pt.i0.comp.i24.n=3&bl.i8.reelset=ALL&clientaction=paytable&pt.i1.comp.i27.freespins=0&bl.i16.id=16&bl.i39.id=39&pt.i1.comp.i5.n=5&bl.i5.coins=0&pt.i1.comp.i8.multi=120&pt.i0.comp.i22.type=betline&pt.i0.comp.i24.freespins=0&pt.i0.comp.i21.multi=7&pt.i1.comp.i13.multi=40&pt.i0.comp.i12.n=3&pt.i0.comp.i13.type=betline&bl.i0.line=1%2C1%2C1%2C1%2C1&pt.i1.comp.i7.freespins=0&bl.i34.line=2%2C1%2C1%2C1%2C2&bl.i31.line=1%2C2%2C2%2C2%2C1&pt.i0.comp.i3.multi=40&bl.i34.coins=0&pt.i1.comp.i22.type=betline&pt.i0.comp.i21.n=3&pt.i1.comp.i6.n=3&pt.i1.comp.i31.type=scatter&bl.i1.id=1&pt.i0.comp.i10.type=betline&pt.i1.comp.i11.symbol=SYM5&bl.i25.id=25&pt.i0.comp.i5.multi=200&pt.i1.comp.i1.freespins=0&bl.i14.id=14&pt.i1.comp.i16.symbol=SYM7&pt.i1.comp.i23.multi=30&pt.i1.comp.i4.type=betline&pt.i1.comp.i18.multi=10&bl.i2.coins=0&bl.i21.reelset=ALL&pt.i1.comp.i26.type=betline&pt.i0.comp.i8.multi=120&pt.i0.comp.i1.freespins=0&bl.i5.reelset=ALL&bl.i24.coins=0&pt.i0.comp.i22.n=4&pt.i0.comp.i28.symbol=SYM11&bl.i32.coins=0&pt.i1.comp.i17.type=betline&pt.i1.comp.i0.symbol=SYM1&pt.i1.comp.i7.n=4&pt.i1.comp.i5.multi=200&bl.i14.line=1%2C1%2C0%2C1%2C1&pt.i0.comp.i21.type=betline&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&pt.i0.comp.i8.type=betline&pt.i0.comp.i7.freespins=0&pt.i1.comp.i15.multi=15&pt.i0.comp.i13.multi=40&bl.i39.reelset=ALL&pt.i0.comp.i17.type=betline&bl.i13.line=2%2C3%2C2%2C3%2C2&pt.i0.comp.i30.type=scatter&pt.i1.comp.i22.symbol=SYM9&pt.i1.comp.i30.freespins=1&bl.i24.reelset=ALL&bl.i0.coins=20&bl.i2.reelset=ALL&pt.i0.comp.i10.n=4&pt.i1.comp.i6.multi=30&bl.i37.id=37&pt.i1.comp.i19.symbol=SYM8&pt.i0.comp.i22.freespins=0&bl.i26.coins=0&bl.i27.reelset=ALL&pt.i0.comp.i20.symbol=SYM8&bl.i29.line=1%2C3%2C1%2C3%2C1&pt.i0.comp.i15.freespins=0&bl.i23.line=0%2C0%2C3%2C0%2C0&bl.i26.id=26&pt.i0.comp.i28.freespins=0&pt.i0.comp.i0.n=3&pt.i1.comp.i21.multi=7&pt.i1.comp.i30.type=scatter&pt.i0.comp.i0.type=betline&pt.i1.comp.i0.multi=40&g4mode=false&pt.i1.comp.i8.n=5&bl.i30.id=30&pt.i0.comp.i25.multi=10&bl.i25.line=1%2C1%2C3%2C1%2C1&pt.i0.comp.i16.symbol=SYM7&pt.i1.comp.i21.freespins=0&pt.i0.comp.i1.multi=100&pt.i0.comp.i27.n=3&pt.i1.comp.i9.type=betline&pt.i1.comp.i24.multi=5&pt.i1.comp.i23.type=betline&pt.i1.comp.i26.n=5&bl.i18.id=18&pt.i1.comp.i28.symbol=SYM11&pt.i1.comp.i17.multi=60&pt.i0.comp.i18.multi=10&bl.i5.line=2%2C1%2C0%2C1%2C2&bl.i28.coins=0&pt.i0.comp.i9.n=3&bl.i27.line=2%2C0%2C2%2C0%2C2&pt.i1.comp.i21.type=betline&bl.i7.line=1%2C2%2C3%2C2%2C1&pt.i0.comp.i28.type=betline&pt.i1.comp.i31.multi=0&pt.i1.comp.i18.type=betline&pt.i0.comp.i10.symbol=SYM5&pt.i0.comp.i15.n=3&bl.i36.coins=0&bl.i30.line=0%2C1%2C1%2C1%2C0&pt.i0.comp.i21.symbol=SYM9&bl.i7.reelset=ALL&pt.i1.comp.i15.n=3&isJackpotWin=false&pt.i1.comp.i20.freespins=0&pt.i1.comp.i7.type=betline&pt.i0.comp.i10.freespins=0&pt.i0.comp.i20.multi=40&pt.i0.comp.i17.multi=60&bl.i29.coins=0&bl.i31.reelset=ALL&pt.i1.comp.i25.type=betline&pt.i1.comp.i9.n=3&pt.i0.comp.i28.n=4&bl.i9.line=2%2C1%2C2%2C1%2C2&pt.i0.comp.i2.multi=200&pt.i1.comp.i27.n=3&pt.i0.comp.i0.freespins=0&pt.i1.comp.i25.multi=10&bl.i35.coins=0&pt.i1.comp.i16.freespins=0&pt.i1.comp.i5.type=betline&bl.i25.reelset=ALL&pt.i1.comp.i24.symbol=SYM10&pt.i1.comp.i13.symbol=SYM6&pt.i1.comp.i17.symbol=SYM7&pt.i0.comp.i16.n=4&bl.i13.reelset=ALL&bl.i0.id=0&pt.i1.comp.i16.n=4&pt.i0.comp.i5.symbol=SYM3&bl.i15.line=2%2C2%2C1%2C2%2C2&pt.i1.comp.i7.symbol=SYM4&bl.i19.id=19&bl.i37.line=0%2C3%2C0%2C3%2C0&pt.i0.comp.i1.symbol=SYM1&pt.i1.comp.i31.freespins=2&bl.i9.id=9&bl.i17.line=2%2C2%2C3%2C2%2C2&pt.i1.comp.i9.freespins=0&bl.i37.coins=0&playercurrency=%26%23x20AC%3B&bl.i28.id=28&pt.i1.comp.i30.multi=0&bl.i19.reelset=ALL&pt.i0.comp.i25.n=4&pt.i1.comp.i28.n=4&pt.i1.comp.i32.freespins=3&pt.i0.comp.i9.freespins=0&bl.i38.reelset=ALL&credit=${Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100)}&pt.i0.comp.i5.type=betline&pt.i0.comp.i11.freespins=0&pt.i0.comp.i26.multi=25&pt.i0.comp.i25.type=betline&bl.i35.line=1%2C0%2C0%2C0%2C1&bl.i1.reelset=ALL&pt.i1.comp.i18.symbol=SYM8&pt.i1.comp.i12.symbol=SYM6&pt.i0.comp.i13.freespins=0&pt.i1.comp.i15.type=betline&pt.i0.comp.i26.freespins=0&pt.i1.comp.i13.type=betline&pt.i1.comp.i1.multi=100&pt.i1.comp.i8.freespins=0&pt.i0.comp.i13.n=4&pt.i1.comp.i17.n=5&pt.i0.comp.i23.type=betline&bl.i17.id=17&pt.i1.comp.i17.freespins=0&pt.i1.comp.i26.multi=25&pt.i1.comp.i32.multi=0&pt.i1.comp.i0.type=betline&pt.i1.comp.i1.symbol=SYM1&pt.i1.comp.i29.multi=20&pt.i0.comp.i25.freespins=0&pt.i0.comp.i26.n=5&pt.i0.comp.i27.symbol=SYM11&pt.i1.comp.i29.n=5&pt.i0.comp.i23.multi=30&bl.i2.line=0%2C0%2C0%2C0%2C0&pt.i0.comp.i30.multi=0&bl.i38.coins=0&pt.i1.comp.i28.multi=10&bl.i29.id=29&pt.i1.comp.i18.freespins=0&pt.i0.comp.i14.n=5&pt.i0.comp.i0.multi=40&bl.i6.reelset=ALL&pt.i0.comp.i19.multi=20&bl.i20.line=3%2C3%2C0%2C3%2C3&pt.i1.comp.i18.n=3&bl.i20.reelset=ALL&pt.i0.comp.i12.freespins=0&pt.i0.comp.i24.multi=5&pt.i0.comp.i19.symbol=SYM8&bl.i6.coins=0&pt.i0.comp.i15.type=betline&pt.i0.comp.i23.freespins=0&pt.i0.comp.i4.multi=100&pt.i0.comp.i15.symbol=SYM7&pt.i1.comp.i14.multi=80&pt.i0.comp.i22.multi=15&bl.i21.id=21&pt.i1.comp.i19.type=betline&pt.i0.comp.i11.symbol=SYM5&pt.i1.comp.i27.multi=5&bl.i23.reelset=ALL&bl.i33.coins=0&bl.i0.reelset=ALL&bl.i20.coins=0&pt.i0.comp.i16.freespins=0&pt.i1.comp.i6.freespins=0&pt.i1.comp.i29.symbol=SYM11&pt.i1.comp.i22.n=4&bl.i10.id=10&pt.i0.comp.i4.freespins=0&pt.i1.comp.i25.symbol=SYM10&bl.i3.reelset=ALL&pt.i0.comp.i30.freespins=0&bl.i26.reelset=ALL&bl.i24.line=0%2C0%2C2%2C0%2C0&pt.i1.comp.i24.type=betline&pt.i0.comp.i19.n=4&pt.i0.comp.i2.symbol=SYM1&pt.i0.comp.i20.type=betline&pt.i0.comp.i6.symbol=SYM4&pt.i1.comp.i11.n=5&pt.i0.comp.i5.n=5&pt.i1.comp.i2.symbol=SYM1&pt.i0.comp.i3.type=betline&pt.i1.comp.i19.multi=20&bl.i28.line=0%2C2%2C0%2C2%2C0&pt.i1.comp.i6.symbol=SYM4&pt.i0.comp.i27.multi=5&pt.i0.comp.i9.multi=25&bl.i12.coins=0&pt.i0.comp.i22.symbol=SYM9&pt.i0.comp.i26.symbol=SYM10&pt.i1.comp.i19.freespins=0&pt.i0.comp.i14.freespins=0&pt.i0.comp.i21.freespins=0&pt.i1.comp.i4.freespins=0&bl.i37.reelset=ALL&pt.i1.comp.i12.type=betline&pt.i1.comp.i21.symbol=SYM9&pt.i1.comp.i23.n=5&pt.i1.comp.i32.symbol=SYM0&bl.i8.id=8&pt.i0.comp.i16.multi=30&bl.i33.id=33&bl.i6.line=0%2C1%2C2%2C1%2C0&bl.i22.id=22&bl.i12.line=1%2C2%2C1%2C2%2C1&pt.i1.comp.i9.multi=25&bl.i29.reelset=ALL&pt.i0.comp.i19.type=betline&pt.i0.comp.i6.freespins=0&pt.i1.comp.i2.multi=200&pt.i0.comp.i6.n=3&pt.i1.comp.i12.n=3&pt.i1.comp.i3.type=betline&pt.i1.comp.i10.freespins=0&pt.i1.comp.i28.type=betline&bl.i27.coins=0&bl.i34.reelset=ALL&bl.i30.reelset=ALL&pt.i0.comp.i29.n=5&pt.i1.comp.i20.multi=40&pt.i0.comp.i27.freespins=0&pt.i1.comp.i24.n=3&bl.i33.line=3%2C2%2C2%2C2%2C3&pt.i1.comp.i27.type=betline&pt.i1.comp.i2.type=betline&pt.i0.comp.i2.freespins=0&pt.i0.comp.i7.n=4&bl.i31.id=31&bl.i32.line=2%2C3%2C3%2C3%2C2&pt.i0.comp.i11.multi=100&pt.i1.comp.i14.symbol=SYM6&pt.i0.comp.i7.type=betline&bl.i19.line=0%2C0%2C1%2C0%2C0&bl.i12.reelset=ALL&pt.i0.comp.i17.n=5&bl.i6.id=6&pt.i0.comp.i29.multi=20&pt.i1.comp.i13.n=4&pt.i0.comp.i8.freespins=0&bl.i20.id=20&pt.i1.comp.i4.multi=100&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&pt.i0.comp.i12.type=betline&pt.i0.comp.i14.multi=80&pt.i1.comp.i7.multi=60&bl.i33.reelset=ALL&bl.i19.coins=0&bl.i7.id=7&bl.i18.reelset=ALL&pt.i1.comp.i11.type=betline&pt.i0.comp.i6.multi=30&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=0&bl.i32.id=32&pt.i1.comp.i5.symbol=SYM3&pt.i0.comp.i18.type=betline&pt.i0.comp.i23.symbol=SYM9&playforfun=false&pt.i1.comp.i25.n=4&pt.i0.comp.i2.type=betline&pt.i1.comp.i20.type=betline&bl.i25.coins=0&pt.i1.comp.i22.multi=15&pt.i0.comp.i8.n=5&bl.i31.coins=0&pt.i1.comp.i22.freespins=0&pt.i0.comp.i11.type=betline&pt.i0.comp.i18.n=3&pt.i1.comp.i14.n=5&pt.i1.comp.i16.multi=30&pt.i1.comp.i15.freespins=0&pt.i0.comp.i27.type=betline&pt.i1.comp.i28.freespins=0&pt.i0.comp.i7.symbol=SYM4&bl.i15.reelset=ALL&pt.i1.comp.i0.freespins=0&gameServerVersion=1.0.2&bl.i11.line=0%2C1%2C0%2C1%2C0&historybutton=false&bl.i5.id=5&pt.i0.comp.i18.symbol=SYM8&bl.i36.reelset=ALL&pt.i0.comp.i12.multi=20&pt.i1.comp.i14.freespins=0&bl.i3.coins=0&bl.i10.coins=0&pt.i0.comp.i12.symbol=SYM6&pt.i0.comp.i14.symbol=SYM6&pt.i1.comp.i13.freespins=0&pt.i0.comp.i14.type=betline&bl.i30.coins=0&bl.i39.line=0%2C3%2C3%2C3%2C0&pt.i1.comp.i0.n=3&pt.i1.comp.i26.symbol=SYM10&pt.i1.comp.i31.symbol=SYM0&pt.i0.comp.i7.multi=60&pt.i0.comp.i30.n=3&jackpotcurrency=%26%23x20AC%3B&bl.i35.id=35&bl.i16.coins=0&bl.i9.coins=0&bl.i24.id=24&pt.i1.comp.i11.multi=100&pt.i1.comp.i30.n=1&pt.i0.comp.i1.n=4&bl.i22.coins=0&pt.i0.comp.i20.n=5&pt.i0.comp.i29.symbol=SYM11&pt.i1.comp.i3.symbol=SYM3&pt.i1.comp.i23.freespins=0&bl.i13.id=13&bl.i36.id=36&pt.i0.comp.i25.symbol=SYM10&pt.i0.comp.i26.type=betline&pt.i0.comp.i9.type=betline&pt.i1.comp.i16.type=betline&pt.i1.comp.i20.symbol=SYM8&bl.i10.reelset=ALL&pt.i1.comp.i12.multi=20&pt.i0.comp.i29.freespins=0&pt.i1.comp.i1.n=4&pt.i1.comp.i11.freespins=0&pt.i0.comp.i9.symbol=SYM5&bl.i23.coins=0&bl.i11.coins=0&bl.i22.reelset=ALL&pt.i0.comp.i16.type=betline&bl.i3.line=3%2C3%2C3%2C3%2C3&bl.i4.reelset=ALL&bl.i4.coins=0&pt.i0.comp.i2.n=5&bl.i18.line=1%2C1%2C2%2C1%2C1&pt.i1.comp.i31.n=2&bl.i34.id=34&pt.i0.comp.i19.freespins=0&pt.i1.comp.i14.type=betline&bl.i11.id=11&pt.i0.comp.i6.type=betline&pt.i1.comp.i2.freespins=0&pt.i1.comp.i25.freespins=0&bl.i9.reelset=ALL&bl.i17.coins=0&pt.i1.comp.i10.multi=50&pt.i1.comp.i10.symbol=SYM5&bl.i11.reelset=ALL&bl.i16.line=3%2C3%2C2%2C3%2C3&pt.i1.comp.i2.n=5&pt.i1.comp.i20.n=5&pt.i1.comp.i24.freespins=0&bl.i21.line=3%2C3%2C1%2C3%2C3&pt.i1.comp.i32.type=scatter&pt.i0.comp.i4.type=betline&bl.i21.coins=0&bl.i28.reelset=ALL&pt.i1.comp.i26.freespins=0&pt.i1.comp.i1.type=betline&bl.i1.line=2%2C2%2C2%2C2%2C2&pt.i0.comp.i20.freespins=0&pt.i1.comp.i29.type=betline&pt.i0.comp.i30.symbol=SYM0&bl.i16.reelset=ALL&pt.i1.comp.i32.n=3&pt.i0.comp.i3.n=3&pt.i1.comp.i6.type=betline&pt.i1.comp.i4.symbol=SYM3&bl.i8.line=3%2C2%2C3%2C2%2C3&pt.i0.comp.i24.symbol=SYM10&bl.i35.reelset=ALL&bl.i8.coins=0&bl.i23.id=23&bl.i15.coins=0&bl.i36.line=3%2C0%2C3%2C0%2C3&pt.i1.comp.i3.n=3&pt.i1.comp.i21.n=3&pt.i0.comp.i18.freespins=0&bl.i12.id=12&pt.i1.comp.i15.symbol=SYM7&pt.i1.comp.i3.freespins=0&bl.i4.id=4&bl.i7.coins=0&pt.i1.comp.i9.symbol=SYM5&pt.i0.comp.i3.symbol=SYM3&pt.i0.comp.i24.type=betline&bl.i14.coins=0&pt.i1.comp.i12.freespins=0&pt.i0.comp.i4.n=4&pt.i1.comp.i10.n=4&bl.i26.line=3%2C1%2C3%2C1%2C3`;
    }

    private handleBonusActionRequest(): string {
        const freeGames = this.slotSettings.GetGameData(this.slotId + 'FreeGames');
        const freeSym = this.slotSettings.GetGameData(this.slotId + 'FreeSym');

        return `freespins.betlevel=1&gameServerVersion=1.0.2&g4mode=false&freespins.win.coins=0&playercurrency=%26%23x20AC%3B&historybutton=false&current.rs.i0=freespin&next.rs=freespin&gamestate.history=basic%2Cbonus&game.win.cents=0&totalwin.coins=0&credit=${Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100)}&gamestate.current=freespin&ladder.freespin.jackpotwin.coins=0&freespins.initial=0&jackpotcurrency=%26%23x20AC%3B&multiplier=1&freespins.denomination=5.000&ladder.freespin.meter=0&freespins.win.cents=0&freespins.totalwin.coins=0&ladder.freespin.step=0&freespins.total=0&isJackpotWin=false&gamestate.stack=basic%2Cfreespin&bonuswin.cents=0&totalbonuswin.cents=0&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35%2C36%2C37%2C38%2C39&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&ladder.freespin.level=1&game.win.coins=0&playercurrencyiso=${this.slotSettings.slotCurrency}&freespins.wavecount=1&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=bonusaction&totalwin.cents=0&gameover=false&totalbonuswin.coins=0&freespins.left=${freeGames}&bonusgame.coinvalue=0.05&nextaction=freespin&wavecount=1&nextactiontype=spin&ladder.freespin.sym=SYM${freeSym}&ladder.freespin.jackpotwin.cents=0&game.win.amount=0&freespins.totalwin.cents=0&bonuswin.coins=0`;
    }

    private handleInitFreespinRequest(): string {
        // ... (Similar to init logic but specifically for FS restoration if any, generally unused or same as init)
        // Returning empty or minimal string as it seems to be handled via init/bonusaction
        return ""; // Stub
    }

    private handleSpinRequest(postData: any): string {
        const linesId = this.getLinesId();
        const lines = 20;
        const betline = postData.bet_betlevel;
        let allbet = betline * lines;

        // Handle transaction logic
        let bonusMpl = 1;
        if (postData.slotEvent !== 'freespin') {
            this.slotSettings.SetBalance(-1 * allbet, postData.slotEvent);
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(postData.slotEvent, bankSum, postData.slotEvent);
            this.slotSettings.UpdateJackpots(allbet);

            this.slotSettings.SetGameData(this.slotId + 'BonusWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'Bet', betline);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', this.slotSettings.GetBalance() * 100);

            // Ladder Init
            this.slotSettings.SetGameData(this.slotId + 'LadderStep', 0);
            this.slotSettings.SetGameData(this.slotId + 'LadderLevel', this.randomInt(1, 3));
            this.slotSettings.SetGameData(this.slotId + 'LadderMeter', 0);
            this.slotSettings.SetGameData(this.slotId + 'LadderWin', 0);
        } else {
            const storedBet = this.slotSettings.GetGameData(this.slotId + 'Bet');
            allbet = storedBet * lines;
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame',
                this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') + 1);
            bonusMpl = this.slotSettings.slotFreeMpl;
        }

        const winTypeTmp = this.slotSettings.GetSpinSettings(postData.slotEvent, allbet, lines);
        let winType = winTypeTmp[0];
        let spinWinLimit = winTypeTmp[1];

        if (winType === 'bonus' && postData.slotEvent === 'freespin') {
            winType = 'win';
        }

        let totalWin = 0;
        let lineWins: string[] = [];
        let reels: ReelStrips = { rp: [] };
        let mainSymAnim = '';

        // Simulation loop
        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            lineWins = [];
            const cWins: number[] = new Array(lines).fill(0);
            const wild = ['1'];
            const scatter = '0';

            reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent);

            // Ladder Logic Update for Freespin
            let LadderStep = this.slotSettings.GetGameData(this.slotId + 'LadderStep');
            let LadderLevel = this.slotSettings.GetGameData(this.slotId + 'LadderLevel');
            let LadderMeter = this.slotSettings.GetGameData(this.slotId + 'LadderMeter');
            let LadderWin = this.slotSettings.GetGameData(this.slotId + 'LadderWin');
            const FreeSym = this.slotSettings.GetGameData(this.slotId + 'FreeSym');

            if (postData.slotEvent === 'freespin') {
                for(let r=1; r<=5; r++) {
                    for(let p=0; p<=3; p++) { // 4 rows
                        if ((reels as any)[`reel${r}`][p] == FreeSym) {
                            LadderMeter++;
                        }
                    }
                }
            }

            // Win Calculation
            let winLineCount = 0;
            for (let k = 0; k < lines; k++) {
                let tmpStringWin = '';
                for (let j = 0; j < this.slotSettings.SymbolGame.length; j++) {
                    const csym = String(this.slotSettings.SymbolGame[j]);

                    if (csym === scatter || !this.slotSettings.Paytable['SYM_' + csym]) {
                        continue;
                    }

                    const s: any[] = [];
                    s[0] = reels.reel1?.[linesId[k][0] - 1];
                    s[1] = reels.reel2?.[linesId[k][1] - 1];
                    s[2] = reels.reel3?.[linesId[k][2] - 1];
                    s[3] = reels.reel4?.[linesId[k][3] - 1];
                    s[4] = reels.reel5?.[linesId[k][4] - 1];

                    const matchCounts = [3, 4, 5];
                    for (const count of matchCounts) {
                        let match = true;
                        let wildCount = 0;
                        for (let m = 0; m < count; m++) {
                            if (s[m] != csym && !wild.includes(String(s[m]))) {
                                match = false;
                                break;
                            }
                            if (wild.includes(String(s[m]))) wildCount++;
                        }

                        if (match) {
                            let mpl = 1;
                            if (wildCount > 0 && wildCount < count) {
                                mpl = this.slotSettings.slotWildMpl;
                            } else if (wildCount === count) {
                                mpl = 1; // All wilds
                            }

                            const tmpWin = this.slotSettings.Paytable['SYM_' + csym][count] * betline * mpl * bonusMpl;
                            if (cWins[k] < tmpWin) {
                                cWins[k] = tmpWin;
                                // Construct win string
                                let posStr = '';
                                for (let p = 0; p < count; p++) {
                                    posStr += `&ws.i${winLineCount}.pos.i${p}=${p}%2C${linesId[k][p] - 1}`;
                                }
                                tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${tmpWin}${posStr}&ws.i${winLineCount}.types.i0.wintype=coins&ws.i${winLineCount}.betline=${k}&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${tmpWin * this.slotSettings.CurrentDenomination * 100}`;
                                mainSymAnim = csym;
                            }
                        }
                    }
                }

                if (cWins[k] > 0 && tmpStringWin !== '') {
                    lineWins.push(tmpStringWin);
                    totalWin += cWins[k];
                    winLineCount++;
                }
            }

            // Scatter logic
            let scattersCount = 0;
            const scPos: string[] = [];
            let scattersStr = '';

            for (let r = 1; r <= 5; r++) {
                for (let p = 0; p <= 3; p++) {
                    if ((reels as any)[`reel${r}`][p] == scatter) {
                        scattersCount++;
                        scPos.push(`&ws.i0.pos.i${r - 1}=${r - 1}%2C${p}`);
                    }
                }
            }

            if (scattersCount >= 3) {
                 scattersStr = `&ws.i0.types.i0.freespins=${this.slotSettings.slotFreeCount[scattersCount]}&rs.i0.nearwin=2%2C4&ws.i0.reelset=basic&ws.i0.betline=null&ws.i0.types.i0.wintype=freespins&ws.i0.direction=none&ws.i0.types.i0.wintype=bonusgame&ws.i0.types.i0.bonusid=ladder_symbol_wheel&gamestate.current=bonus&nextaction=bonusaction&nextactiontype=pickbonus${scPos.join('')}`;
            }

            // Ladder Win logic
            let ladderWinAmount = 0;
            if (postData.slotEvent === 'freespin') {
                if (LadderMeter >= 20) {
                    const payTower = (this.slotSettings as any).PayTower;
                    ladderWinAmount = payTower[LadderLevel][LadderStep + 1] * allbet;
                    // Check logic against spinWinLimit is done later
                }
            } else if (scattersCount >= 3 && winType == 'bonus') {
                 // Check bonus win limit
                 const initLadderWin = (this.slotSettings as any).PayTower[this.randomInt(1, 3)][1] * allbet;
                 // ...
            }

            totalWin += 0; // Ladder win added separately in final calc in PHP

            if (i > 1000) winType = 'none';
            if (i > 1500) {
                return this.createErrorResponse('Bad Reel Strip');
            }

            if (this.slotSettings.MaxWin < (totalWin * this.slotSettings.CurrentDenom)) {
                continue;
            }

            const minWin = this.slotSettings.GetRandomPay();
            if (this.slotSettings.increaseRTP && winType === 'win' && totalWin < (minWin * allbet)) {
                continue;
            }

            // Ladder win limit check
            if (postData.slotEvent === 'freespin' && LadderMeter >= 20) {
                 const payTower = (this.slotSettings as any).PayTower;
                 const potentialLadderWin = payTower[LadderLevel][LadderStep + 1] * allbet;
                 // ... check limit
            }

            if (totalWin <= spinWinLimit && winType === 'bonus') {
                const cBank = this.slotSettings.GetBank(postData.slotEvent);
                if (cBank < spinWinLimit) {
                    spinWinLimit = cBank;
                } else {
                    break;
                }
            } else if (totalWin > 0 && totalWin <= spinWinLimit && winType === 'win') {
                const cBank = this.slotSettings.GetBank(postData.slotEvent);
                if (cBank < spinWinLimit) {
                    spinWinLimit = cBank;
                } else {
                    break;
                }
            } else if (totalWin === 0 && winType === 'none') {
                break;
            }
        }

        // Update balance and bank
        if (totalWin > 0) {
            this.slotSettings.SetBank(postData.slotEvent, -1 * totalWin);
            this.slotSettings.SetBalance(totalWin);
        }

        if (postData.slotEvent === 'freespin') {
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', this.slotSettings.GetGameData(this.slotId + 'BonusWin') + totalWin);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', this.slotSettings.GetGameData(this.slotId + 'TotalWin') + totalWin);
        } else {
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', totalWin);
        }

        let freeState = '';
        let LadderStep = this.slotSettings.GetGameData(this.slotId + 'LadderStep');
        let LadderLevel = this.slotSettings.GetGameData(this.slotId + 'LadderLevel');
        let LadderMeter = this.slotSettings.GetGameData(this.slotId + 'LadderMeter');
        let LadderWin = this.slotSettings.GetGameData(this.slotId + 'LadderWin');

        // Handle Freespin Ladder Updates
        let reportWin = totalWin;
        if (postData.slotEvent === 'freespin') {
             // Calculate Ladder Sym Count
             const FreeSym = this.slotSettings.GetGameData(this.slotId + 'FreeSym');
             for(let r=1; r<=5; r++) {
                 for(let p=0; p<=3; p++) {
                     if ((reels as any)[`reel${r}`][p] == FreeSym) {
                         LadderMeter++;
                     }
                 }
             }

             if (LadderMeter >= 20) {
                 const lw = LadderWin;
                 // Revert previous ladder win from bank/balance?
                 // PHP:
                 // $slotSettings->SetBank((isset($postData['slotEvent']) ? $postData['slotEvent'] : ''), $LadderWin);
                 // $slotSettings->SetBalance(-1 * $LadderWin);
                 this.slotSettings.SetBank(postData.slotEvent, LadderWin);
                 this.slotSettings.SetBalance(-1 * LadderWin);

                 LadderStep++;
                 const PayTower = (this.slotSettings as any).PayTower;
                 LadderWin = PayTower[LadderLevel][LadderStep] * allbet;

                 this.slotSettings.SetBank(postData.slotEvent, -1 * LadderWin);
                 this.slotSettings.SetBalance(LadderWin);

                 LadderMeter = 0;
                 const diff = LadderWin - lw; // New win - Old win
                 // Note: PHP does $lw = $lw - $LadderWin; which is Old - New.
                 // Then $reportWin += $lw;
                 // But wait, if we refunded Old and charged New, the net change is New - Old.
                 // Let's stick to the balance update operations which are correct.
                 // reportWin is for logging.
                 reportWin += (LadderWin - lw); // This is net gain
             }

             this.slotSettings.SetGameData(this.slotId + 'LadderStep', LadderStep);
             this.slotSettings.SetGameData(this.slotId + 'LadderLevel', LadderLevel);
             this.slotSettings.SetGameData(this.slotId + 'LadderMeter', LadderMeter);
             this.slotSettings.SetGameData(this.slotId + 'LadderWin', LadderWin);

             // Extra spins from scatters in FS
             let scattersCount = 0;
             for(let r=1; r<=5; r++) {
                 for(let p=0; p<=3; p++) {
                     if((reels as any)[`reel${r}`][p] == '0') scattersCount++;
                 }
             }
             if (scattersCount >= 1) {
                 this.slotSettings.SetGameData(this.slotId + 'FreeGames', this.slotSettings.GetGameData(this.slotId + 'FreeGames') + scattersCount);
             }

             let nextaction = 'freespin';
             let stack = 'basic%2Cfreespin';
             let gamestate = 'freespin';

             if (this.slotSettings.GetGameData(this.slotId + 'FreeGames') <= this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame')) {
                 nextaction = 'spin';
                 stack = 'basic';
                 gamestate = 'basic';
                 // Add final Ladder Win to Total Win
                 LadderWin = this.slotSettings.GetGameData(this.slotId + 'LadderWin');
                 totalWin += LadderWin;
             }

             const fs = this.slotSettings.GetGameData(this.slotId + 'FreeGames');
             const fsl = fs - this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame');

             freeState = `&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&freespins.totalwin.cents=0&nextaction=${nextaction}&freespins.left=${fsl}&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=${stack}&freespins.totalwin.coins=${totalWin}&freespins.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gamestate.current=${gamestate}&freespins.win.coins=${totalWin}&freespins.betlevel=${this.slotSettings.GetGameData(this.slotId + 'Bet')}&totalwin.coins=${totalWin}&credit=${Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100)}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&game.win.amount=${totalWin * this.slotSettings.CurrentDenomination}&ladder.freespin.meter=${LadderMeter}&ladder.freespin.step=${LadderStep}&ladder.freespin.level=${LadderLevel}&ladder.freespin.sym=SYM${this.slotSettings.GetGameData(this.slotId + 'FreeSym')}&ladder.freespin.jackpotwin.cents=${LadderWin * this.slotSettings.CurrentDenomination * 100}&ladder.freespin.jackpotwin.coins=${LadderWin}`;
        }

        let scattersCount = 0;
        const scPos: string[] = [];
        for (let r = 1; r <= 5; r++) {
            for (let p = 0; p <= 3; p++) {
                if ((reels as any)[`reel${r}`][p] == scatter) {
                    scattersCount++;
                    scPos.push(`&ws.i0.pos.i${r - 1}=${r - 1}%2C${p}`);
                }
            }
        }

        if (scattersCount >= 3 && postData.slotEvent !== 'freespin') {
             this.slotSettings.SetGameData(this.slotId + 'FreeStartWin', totalWin);
             this.slotSettings.SetGameData(this.slotId + 'BonusWin', totalWin);
             this.slotSettings.SetGameData(this.slotId + 'FreeGames', this.randomInt(7, 13));
             this.slotSettings.SetGameData(this.slotId + 'FreeSym', this.randomInt(6, 11));

             // Initial Ladder Win setup
             const PayTower = (this.slotSettings as any).PayTower;
             const ladderLevel = this.slotSettings.GetGameData(this.slotId + 'LadderLevel'); // Should utilize previously set level
             // PHP: $LadderWin_ = $slotSettings->PayTower[$slotSettings->GetGameData($slotSettings->slotId . 'LadderLevel')][1] * $allbet;
             // But wait, the PHP init logic in spin for scattersCount>=3:
             // $LadderWin_ = $slotSettings->GetGameData($slotSettings->slotId . 'LadderWin');
             // But LadderWin was reset to 0 in non-freespin branch?
             // Ah, PHP code:
             // if ($scattersCount >= 3 && $winType == 'bonus') { ... sets LadderWin ... }
             // But inside spin loop simulation.
             // If we reach here, we need to set it up if won.

             // Let's set it properly.
             const LadderWin_ = PayTower[ladderLevel][1] * allbet; // Step 1 win
             this.slotSettings.SetGameData(this.slotId + 'LadderWin', LadderWin_);
             this.slotSettings.SetGameData(this.slotId + 'LadderStep', 1);

             this.slotSettings.SetBank(postData.slotEvent, -1 * LadderWin_);
             this.slotSettings.SetBalance(LadderWin_);
             reportWin += LadderWin_;

             const fs = this.slotSettings.GetGameData(this.slotId + 'FreeGames');
             const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

             freeState = `&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&freespins.totalwin.cents=0&nextaction=bonus&freespins.left=${fs}&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=basic%2Cbonus&freespins.totalwin.coins=0&freespins.total=${fs}&freespins.win.cents=0&gamestate.current=bonus&freespins.initial=${fs}&freespins.win.coins=0&freespins.betlevel=${this.slotSettings.GetGameData(this.slotId + 'Bet')}&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&game.win.amount=${totalWin * this.slotSettings.CurrentDenomination}`;
        }

        const winString = lineWins.join('');
        let curReels = '';
        curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1?.[0]}%2CSYM${reels.reel1?.[1]}%2CSYM${reels.reel1?.[2]}%2CSYM${reels.reel1?.[3]}`;
        curReels += `&rs.i0.r.i1.syms=SYM${reels.reel2?.[0]}%2CSYM${reels.reel2?.[1]}%2CSYM${reels.reel2?.[2]}%2CSYM${reels.reel2?.[3]}`;
        curReels += `&rs.i0.r.i2.syms=SYM${reels.reel3?.[0]}%2CSYM${reels.reel3?.[1]}%2CSYM${reels.reel3?.[2]}%2CSYM${reels.reel3?.[3]}`;
        curReels += `&rs.i0.r.i3.syms=SYM${reels.reel4?.[0]}%2CSYM${reels.reel4?.[1]}%2CSYM${reels.reel4?.[2]}%2CSYM${reels.reel4?.[3]}`;
        curReels += `&rs.i0.r.i4.syms=SYM${reels.reel5?.[0]}%2CSYM${reels.reel5?.[1]}%2CSYM${reels.reel5?.[2]}%2CSYM${reels.reel5?.[3]}`;

        curReels += freeState;

        // Add Scatters string if applicable
        if (scattersCount >= 3 && postData.slotEvent !== 'freespin') {
             // Reconstruct scatter string logic from PHP if needed, but it seems PHP adds it to curReels via freeState or scPos logic?
             // Actually PHP appends $scattersStr at end of result.
             let scattersStr = `&ws.i0.types.i0.freespins=${this.slotSettings.slotFreeCount[scattersCount]}&rs.i0.nearwin=2%2C4&ws.i0.reelset=basic&ws.i0.betline=null&ws.i0.types.i0.wintype=freespins&ws.i0.direction=none&ws.i0.types.i0.wintype=bonusgame&ws.i0.types.i0.bonusid=ladder_symbol_wheel&gamestate.current=bonus&nextaction=bonusaction&nextactiontype=pickbonus${scPos.join('')}`;
             curReels += scattersStr;
        }

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        // Log response
        const logResponse = {
            responseEvent: 'spin',
            responseType: postData.slotEvent,
            serverResponse: {
                freeState: freeState,
                slotLines: lines,
                slotBet: betline,
                totalFreeGames: this.slotSettings.GetGameData(this.slotId + 'FreeGames'),
                currentFreeGames: this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame'),
                Balance: balanceInCents,
                afterBalance: balanceInCents,
                bonusWin: this.slotSettings.GetGameData(this.slotId + 'BonusWin'),
                totalWin: totalWin,
                winLines: [],
                Jackpots: this.slotSettings.Jackpots,
                reelsSymbols: reels
            }
        };
        this.slotSettings.SaveLogReport(JSON.stringify(logResponse), allbet, lines, reportWin, postData.slotEvent);

        return `rs.i0.r.i1.pos=18&g4mode=false&game.win.coins=${totalWin}&playercurrency=%26%23x20AC%3B&playercurrencyiso=${this.slotSettings.slotCurrency}&historybutton=false&rs.i0.r.i1.hold=false&rs.i0.r.i4.hold=false&gamestate.history=basic&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=spin&rs.i0.r.i2.hold=false&game.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&rs.i0.r.i2.pos=47&rs.i0.id=basic&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gamestate.current=basic&gameover=true&rs.i0.r.i0.hold=false&jackpotcurrency=%26%23x20AC%3B&multiplier=1&rs.i0.r.i3.pos=4&rs.i0.r.i4.pos=5&isJackpotWin=false&gamestate.stack=basic&nextaction=spin&rs.i0.r.i0.pos=7&wavecount=1&gamesoundurl=&rs.i0.r.i3.hold=false&game.win.amount=${totalWin * this.slotSettings.CurrentDenomination}${curReels}${winString}`;
    }

    private createErrorResponse(message: string): string {
        return JSON.stringify({
            responseEvent: "error",
            responseType: "",
            serverResponse: message
        });
    }

    private handleError(error: any): string {
        if (this.slotSettings) {
            this.slotSettings.InternalErrorSilent(error);
        }
        console.error(error);
        return this.createErrorResponse("InternalError");
    }

    private getLinesId(): number[][] {
        return [
            [2, 2, 2, 2, 2],
            [3, 3, 3, 3, 3],
            [1, 1, 1, 1, 1],
            [4, 4, 4, 4, 4],
            [4, 3, 2, 3, 4],
            [3, 2, 1, 2, 3],
            [1, 2, 3, 2, 1],
            [2, 3, 4, 3, 2],
            [4, 3, 4, 3, 4],
            [3, 2, 3, 2, 3],
            [2, 1, 2, 1, 2],
            [1, 2, 1, 2, 1],
            [2, 3, 2, 3, 2],
            [3, 4, 3, 4, 3],
            [2, 2, 1, 2, 2],
            [3, 3, 2, 3, 3],
            [4, 4, 3, 4, 4],
            [3, 3, 4, 3, 3],
            [2, 2, 3, 2, 2],
            [1, 1, 2, 1, 1]
        ];
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
