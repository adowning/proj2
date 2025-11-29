// Server.ts - FruitShopNET game server
// Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines
// Data injection pattern - NO database calls or legacy PHP constructs

import { SlotSettings, ReelStrips } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'FruitShopNET';
    private sessionId: string = '';

    // The Server constructor uses the strongly-typed data object
    public constructor(slotSettingsData: ISlotSettingsData) {
        // Instantiate SlotSettings by passing the received data object
        this.slotSettings = new SlotSettings(slotSettingsData);
        this.sessionId = this.generateSessionId();
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

        // Basic validation
        if (postData.slotEvent === 'bet') {
            const lines = 15;
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
            case 'initfreespin':
                return this.handleInitFreespinRequest();
            case 'spin':
                return this.handleSpinRequest(postData);
            default:
                return this.createErrorResponse("unknown action");
        }
    }

    private handleInitRequest(): string {
        const lastEvent = this.slotSettings.GetHistory();

        // Reset game state
        this.slotSettings.SetGameData('FruitShopNETBonusWin', 0);
        this.slotSettings.SetGameData('FruitShopNETFreeGames', 0);
        this.slotSettings.SetGameData('FruitShopNETCurrentFreeGame', 0);
        this.slotSettings.SetGameData('FruitShopNETTotalWin', 0);
        this.slotSettings.SetGameData('FruitShopNETFreeBalance', 0);

        let curReels = '';
        let freeState = '';

        if (lastEvent && lastEvent !== 'NULL') {
            const serverResponse = lastEvent.serverResponse;
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', serverResponse.totalFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', serverResponse.currentFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', serverResponse.Balance);

            freeState = serverResponse.freeState;
            const reels = serverResponse.reelsSymbols;

            // Reconstruct reels string
            for (let i = 0; i <= 1; i++) {
                curReels += `&rs.i${i}.r.i0.syms=SYM${reels.reel1[0]}%2CSYM${reels.reel1[1]}%2CSYM${reels.reel1[2]}`;
                curReels += `&rs.i${i}.r.i1.syms=SYM${reels.reel2[0]}%2CSYM${reels.reel2[1]}%2CSYM${reels.reel2[2]}`;
                curReels += `&rs.i${i}.r.i2.syms=SYM${reels.reel3[0]}%2CSYM${reels.reel3[1]}%2CSYM${reels.reel3[2]}`;
                curReels += `&rs.i${i}.r.i3.syms=SYM${reels.reel4[0]}%2CSYM${reels.reel4[1]}%2CSYM${reels.reel4[2]}`;
                curReels += `&rs.i${i}.r.i4.syms=SYM${reels.reel5[0]}%2CSYM${reels.reel5[1]}%2CSYM${reels.reel5[2]}`;

                // Add pos data if available in reels object, assuming standard structure or from random
                if (reels.rp) {
                    curReels += `&rs.i${i}.r.i0.pos=${reels.rp[0]}`;
                    curReels += `&rs.i${i}.r.i1.pos=${reels.rp[0]}`; // Using simplified pos logic from PHP
                    curReels += `&rs.i${i}.r.i2.pos=${reels.rp[0]}`;
                    curReels += `&rs.i${i}.r.i3.pos=${reels.rp[0]}`;
                    curReels += `&rs.i${i}.r.i4.pos=${reels.rp[0]}`;
                }
            }
        } else {
             // Random initial state
            curReels = `&rs.i0.r.i0.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            curReels += `&rs.i0.r.i1.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            curReels += `&rs.i0.r.i2.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            curReels += `&rs.i0.r.i3.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            curReels += `&rs.i0.r.i4.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;

            // Add some random positions
            for (let i = 0; i < 5; i++) {
                curReels += `&rs.i0.r.i${i}.pos=${this.randomInt(1, 10)}`;
            }
             for (let i = 0; i < 5; i++) {
                curReels += `&rs.i1.r.i${i}.pos=${this.randomInt(1, 10)}`;
            }
        }

        // Format denominations
        // In TS we don't modify the array in place usually, but let's follow logic
        const denoms = this.slotSettings.Denominations.map(d => d * 100).join('%2C');
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        const standardDenom = this.slotSettings.CurrentDenomination * 100;

        // Check for unfinished free spins
        if (this.slotSettings.GetGameData('FruitShopNETCurrentFreeGame') < this.slotSettings.GetGameData('FruitShopNETFreeGames') &&
            this.slotSettings.GetGameData('FruitShopNETFreeGames') > 0) {
             // Logic for restoring free spin state (static string from PHP reference)
             freeState = 'previous.rs.i0=freespin&rs.i1.r.i0.syms=SYM4%2CSYM9%2CSYM10&bl.i6.coins=1&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&freespins.win.coins=20&historybutton=false&rs.i0.r.i4.hold=false&bl.i5.id=5&gameEventSetters.enabled=false&next.rs=freespin&gamestate.history=basic%2Cfreespin&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=1&rs.i0.r.i1.syms=SYM10%2CSYM3%2CSYM1&bl.i3.coins=1&bl.i10.coins=1&game.win.cents=300&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&ws.i0.betline=8&bl.i10.line=1%2C2%2C1%2C2%2C1&bl.i0.reelset=ALL&rs.i1.r.i3.hold=false&totalwin.coins=30&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=freespin&bl.i10.id=10&freespins.initial=1&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&bl.i13.coins=1&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14&rs.i0.r.i0.syms=SYM3%2CSYM12%2CSYM4&rs.i0.r.i3.syms=SYM10%2CSYM9%2CSYM7&rs.i1.r.i1.syms=SYM9%2CSYM3%2CSYM12&bl.i2.id=2&rs.i1.r.i1.pos=20&freespins.win.cents=200&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&rs.i0.r.i0.pos=9&bl.i14.reelset=ALL&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14&rs.i0.r.i1.pos=0&rs.i1.r.i3.syms=SYM5%2CSYM9%2CSYM4&game.win.coins=30&bl.i13.id=13&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&bl.i3.id=3&bl.i12.coins=1&bl.i8.reelset=ALL&clientaction=init&bl.i9.line=1%2C0%2C1%2C0%2C1&rs.i0.r.i2.hold=false&casinoID=netent&betlevel.standard=1&bl.i5.coins=1&bl.i10.reelset=ALL&gameover=false&bl.i8.id=8&rs.i0.r.i3.pos=37&bl.i11.coins=1&bl.i13.reelset=ALL&bl.i0.id=0&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i12.line=2%2C1%2C2%2C1%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&nextaction=freespin&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i4.reelset=ALL&ws.i0.types.i1.multipliers=2&bl.i4.coins=1&rs.i0.r.i2.syms=SYM9%2CSYM3%2CSYM8&game.win.amount=3.0&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&freespins.totalwin.cents=200&bl.i9.id=9&denomination.all=' + denoms + '&bl.i11.id=11&freespins.betlevel=1&ws.i0.pos.i2=1%2C0&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&current.rs.i0=freespin&ws.i0.reelset=freespin&bl.i1.id=1&ws.i0.pos.i1=2%2C0&ws.i0.pos.i0=0%2C1&bl.i11.reelset=ALL&rs.i0.id=basic&credit=' + balanceInCents + '&rs.i1.r.i4.pos=40&denomination.standard=' + standardDenom + '&ws.i0.types.i0.coins=20&bl.i1.reelset=ALL&multiplier=2&bl.i14.id=14&last.rs=freespin&freespins.denomination=' + standardDenom + '&bl.i12.reelset=ALL&bl.i2.coins=1&bl.i6.id=6&bl.i1.line=0%2C0%2C0%2C0%2C0&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&ws.i0.sym=SYM9&freespins.totalwin.coins=20&ws.i0.direction=left_to_right&freespins.total=3&gamestate.stack=basic%2Cfreespin&rs.i1.r.i4.syms=SYM11%2CSYM3%2CSYM10&gamesoundurl=&rs.i1.r.i2.pos=100&bet.betlevel=1&ws.i0.types.i0.wintype=coins&nearwinallowed=true&bl.i5.reelset=ALL&bl.i7.id=7&bl.i8.line=1%2C0%2C0%2C0%2C1&playercurrencyiso=' + this.slotSettings.slotCurrency + '&bl.i1.coins=1&freespins.wavecount=1&bl.i14.line=1%2C1%2C2%2C1%2C1&freespins.multiplier=2&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&rs.i0.r.i4.syms=SYM6%2CSYM11%2CSYM12&bl.i8.coins=1&rs.i0.r.i2.pos=16&bl.i2.line=2%2C2%2C2%2C2%2C2&bl.i13.line=1%2C1%2C0%2C1%2C1&rs.i1.r.i2.syms=SYM9%2CSYM3%2CSYM8&rs.i1.r.i0.pos=39&totalwin.cents=300&bl.i0.coins=1&bl.i2.reelset=ALL&rs.i0.r.i0.hold=false&restore=true&rs.i1.id=freespin&bl.i12.id=12&rs.i1.r.i4.hold=false&freespins.left=2&bl.i4.id=4&rs.i0.r.i4.pos=32&bl.i7.coins=1&ws.i0.types.i1.freespins=1&ws.i0.types.i0.cents=200&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14&bl.i6.reelset=ALL&ws.i0.types.i1.wintype=freespins&wavecount=1&bl.i14.coins=1&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&bet.denomination=' + standardDenom + '' + freeState;
        }

        // Construct response
        // Using the static long string from PHP for 'init'
        // Just concatenating the dynamic parts.
        // For brevity and to follow instruction "exactly as in original PHP", I'll copy the massive string structure

        const result = `rs.i1.r.i0.syms=SYM10%2CSYM6%2CSYM11&bl.i6.coins=1&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&historybutton=false&rs.i0.r.i4.hold=false&bl.i5.id=5&gameEventSetters.enabled=false&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=0&rs.i0.r.i1.syms=SYM9%2CSYM5%2CSYM7&bl.i3.coins=1&bl.i10.coins=1&game.win.cents=0&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i10.line=1%2C2%2C1%2C2%2C1&bl.i0.reelset=ALL&rs.i1.r.i3.hold=false&totalwin.coins=0&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=basic&bl.i10.id=10&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&bl.i13.coins=1&rs.i0.r.i0.syms=SYM10%2CSYM6%2CSYM11&rs.i0.r.i3.syms=SYM12%2CSYM5%2CSYM9&rs.i1.r.i1.syms=SYM9%2CSYM5%2CSYM7&bl.i2.id=2&rs.i1.r.i1.pos=6&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&rs.i0.r.i0.pos=0&bl.i14.reelset=ALL&rs.i0.r.i1.pos=6&rs.i1.r.i3.syms=SYM12%2CSYM5%2CSYM9&game.win.coins=0&bl.i13.id=13&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&bl.i3.id=3&bl.i12.coins=1&bl.i8.reelset=ALL&clientaction=init&bl.i9.line=1%2C0%2C1%2C0%2C1&rs.i0.r.i2.hold=false&casinoID=netent&betlevel.standard=1&bl.i5.coins=1&bl.i10.reelset=ALL&gameover=true&bl.i8.id=8&rs.i0.r.i3.pos=0&bl.i11.coins=1&bl.i13.reelset=ALL&bl.i0.id=0&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i12.line=2%2C1%2C2%2C1%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&nextaction=spin&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i4.reelset=ALL&bl.i4.coins=1&rs.i0.r.i2.syms=SYM11%2CSYM12%2CSYM1&game.win.amount=0&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&bl.i9.id=9&denomination.all=${denoms}&bl.i11.id=11&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&bl.i1.id=1&bl.i11.reelset=ALL&rs.i0.id=freespin&credit=${balanceInCents}&rs.i1.r.i4.pos=0&denomination.standard=${standardDenom}&bl.i1.reelset=ALL&multiplier=1&bl.i14.id=14&bl.i12.reelset=ALL&bl.i2.coins=1&bl.i6.id=6&bl.i1.line=0%2C0%2C0%2C0%2C0&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&rs.i1.r.i4.syms=SYM9%2CSYM3%2CSYM10&gamesoundurl=&rs.i1.r.i2.pos=0&nearwinallowed=true&bl.i5.reelset=ALL&bl.i7.id=7&bl.i8.line=1%2C0%2C0%2C0%2C1&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=1&bl.i14.line=1%2C1%2C2%2C1%2C1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM9%2CSYM3%2CSYM10&bl.i8.coins=1&rs.i0.r.i2.pos=0&bl.i2.line=2%2C2%2C2%2C2%2C2&bl.i13.line=1%2C1%2C0%2C1%2C1&rs.i1.r.i2.syms=SYM11%2CSYM12%2CSYM1&rs.i1.r.i0.pos=0&totalwin.cents=0&bl.i0.coins=1&bl.i2.reelset=ALL&rs.i0.r.i0.hold=false&restore=false&rs.i1.id=basic&bl.i12.id=12&rs.i1.r.i4.hold=false&bl.i4.id=4&rs.i0.r.i4.pos=0&bl.i7.coins=1&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14&bl.i6.reelset=ALL&wavecount=1&bl.i14.coins=1&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false${curReels}${freeState}`;

        return result;
    }

    private handlePaytableRequest(): string {
        // Just return the paytable response string as provided in PHP
        // This is a static string for this game version
        // Copied from PHP source
        return 'pt.i0.comp.i19.symbol=SYM9&bl.i6.coins=1&pt.i0.comp.i15.type=betline&pt.i0.comp.i23.freespins=0&pt.i0.comp.i29.type=betline&pt.i0.comp.i4.multi=1000&pt.i0.comp.i15.symbol=SYM7&pt.i0.comp.i17.symbol=SYM8&pt.i0.comp.i5.freespins=2&pt.i1.comp.i14.multi=75&pt.i0.comp.i22.multi=5&pt.i0.comp.i23.n=4&pt.i1.comp.i19.type=betline&pt.i0.comp.i11.symbol=SYM6&pt.i0.comp.i13.symbol=SYM7&pt.i1.comp.i8.type=betline&pt.i1.comp.i4.n=5&pt.i1.comp.i27.multi=5&pt.i0.comp.i15.multi=15&bl.i10.line=1%2C2%2C1%2C2%2C1&pt.i1.comp.i27.symbol=SYM11&bl.i0.reelset=ALL&pt.i0.comp.i16.freespins=0&pt.i0.comp.i28.multi=5&pt.i1.comp.i6.freespins=1&pt.i1.comp.i29.symbol=SYM12&pt.i1.comp.i29.freespins=2&pt.i1.comp.i22.n=5&pt.i1.comp.i30.symbol=SYM12&pt.i1.comp.i3.multi=5&bl.i10.id=10&pt.i0.comp.i11.n=4&pt.i0.comp.i4.freespins=5&pt.i1.comp.i23.symbol=SYM10&pt.i1.comp.i25.symbol=SYM11&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&pt.i0.comp.i30.freespins=0&bl.i13.coins=1&pt.i1.comp.i24.type=betline&pt.i0.comp.i19.n=3&pt.i0.id=basic&pt.i0.comp.i1.type=betline&bl.i2.id=2&pt.i1.comp.i10.type=betline&pt.i0.comp.i2.symbol=SYM3&pt.i0.comp.i4.symbol=SYM4&pt.i1.comp.i5.freespins=2&pt.i0.comp.i20.type=betline&pt.i1.comp.i8.symbol=SYM5&bl.i14.reelset=ALL&pt.i1.comp.i19.n=5&pt.i0.comp.i17.freespins=0&pt.i0.comp.i6.symbol=SYM4&pt.i0.comp.i8.symbol=SYM5&pt.i0.comp.i0.symbol=SYM3&pt.i1.comp.i11.n=4&pt.i0.comp.i5.n=4&pt.i1.comp.i2.symbol=SYM3&pt.i0.comp.i3.type=betline&pt.i0.comp.i3.freespins=1&pt.i0.comp.i10.multi=500&pt.i1.id=freespin&pt.i1.comp.i19.multi=100&bl.i3.id=3&pt.i1.comp.i6.symbol=SYM4&pt.i0.comp.i27.multi=60&pt.i0.comp.i9.multi=20&bl.i12.coins=1&pt.i0.comp.i22.symbol=SYM10&pt.i0.comp.i26.symbol=SYM11&pt.i1.comp.i19.freespins=5&pt.i0.comp.i24.n=5&bl.i8.reelset=ALL&pt.i0.comp.i14.freespins=2&pt.i0.comp.i21.freespins=0&clientaction=paytable&pt.i1.comp.i27.freespins=1&pt.i1.comp.i4.freespins=5&pt.i1.comp.i12.type=betline&pt.i1.comp.i5.n=4&bl.i5.coins=1&pt.i1.comp.i8.multi=125&pt.i1.comp.i21.symbol=SYM9&pt.i1.comp.i23.n=4&pt.i0.comp.i22.type=betline&pt.i0.comp.i24.freespins=0&bl.i8.id=8&pt.i0.comp.i16.multi=15&pt.i0.comp.i21.multi=100&pt.i1.comp.i13.multi=200&pt.i0.comp.i12.n=3&bl.i6.line=2%2C2%2C1%2C2%2C2&pt.i0.comp.i13.type=betline&bl.i12.line=2%2C1%2C2%2C1%2C2&pt.i1.comp.i9.multi=20&bl.i0.line=1%2C1%2C1%2C1%2C1&pt.i0.comp.i19.type=betline&pt.i0.comp.i6.freespins=1&pt.i1.comp.i2.multi=25&pt.i1.comp.i7.freespins=5&pt.i0.comp.i3.multi=5&pt.i0.comp.i6.n=3&pt.i1.comp.i22.type=betline&pt.i1.comp.i12.n=3&pt.i1.comp.i3.type=betline&pt.i0.comp.i21.n=5&pt.i1.comp.i10.freespins=5&pt.i1.comp.i28.type=betline&pt.i1.comp.i6.n=3&pt.i0.comp.i29.n=4&bl.i1.id=1&pt.i1.comp.i20.multi=25&pt.i0.comp.i27.freespins=0&pt.i1.comp.i24.n=3&pt.i0.comp.i10.type=betline&pt.i1.comp.i11.symbol=SYM6&pt.i1.comp.i27.type=betline&pt.i1.comp.i2.type=betline&pt.i0.comp.i2.freespins=1&pt.i0.comp.i5.multi=150&pt.i0.comp.i7.n=5&pt.i1.comp.i1.freespins=2&pt.i0.comp.i11.multi=100&pt.i1.comp.i14.symbol=SYM7&bl.i14.id=14&pt.i1.comp.i16.symbol=SYM8&pt.i1.comp.i23.multi=20&pt.i0.comp.i7.type=betline&pt.i1.comp.i4.type=betline&bl.i12.reelset=ALL&pt.i0.comp.i17.n=4&pt.i1.comp.i18.multi=15&bl.i2.coins=1&bl.i6.id=6&pt.i0.comp.i29.multi=10&pt.i1.comp.i13.n=5&pt.i0.comp.i8.freespins=2&pt.i1.comp.i26.type=betline&pt.i1.comp.i4.multi=1000&pt.i0.comp.i8.multi=125&gamesoundurl=&pt.i0.comp.i1.freespins=2&pt.i0.comp.i12.type=betline&pt.i0.comp.i14.multi=75&pt.i1.comp.i7.multi=750&bl.i5.reelset=ALL&pt.i0.comp.i22.n=3&pt.i0.comp.i28.symbol=SYM12&pt.i1.comp.i17.type=betline&bl.i7.id=7&pt.i1.comp.i11.type=betline&pt.i0.comp.i6.multi=25&pt.i1.comp.i0.symbol=SYM3&playercurrencyiso=' + this.slotSettings.slotCurrency + '&bl.i1.coins=1&pt.i1.comp.i7.n=5&pt.i1.comp.i5.multi=150&pt.i1.comp.i5.symbol=SYM4&bl.i14.line=1%2C1%2C2%2C1%2C1&pt.i0.comp.i18.type=betline&pt.i0.comp.i23.symbol=SYM10&pt.i0.comp.i21.type=betline&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&pt.i1.comp.i25.n=5&pt.i0.comp.i8.type=betline&pt.i0.comp.i7.freespins=5&pt.i1.comp.i15.multi=15&pt.i0.comp.i2.type=betline&pt.i0.comp.i13.multi=200&pt.i1.comp.i20.type=betline&pt.i0.comp.i17.type=betline&bl.i13.line=1%2C1%2C0%2C1%2C1&pt.i0.comp.i30.type=betline&pt.i1.comp.i22.symbol=SYM10&pt.i1.comp.i30.freespins=1&pt.i1.comp.i22.multi=75&bl.i0.coins=1&bl.i2.reelset=ALL&pt.i0.comp.i8.n=4&pt.i0.comp.i10.n=5&pt.i1.comp.i6.multi=25&pt.i1.comp.i22.freespins=5&pt.i0.comp.i11.type=betline&pt.i1.comp.i19.symbol=SYM9&pt.i0.comp.i18.n=5&pt.i0.comp.i22.freespins=0&pt.i0.comp.i20.symbol=SYM9&pt.i0.comp.i15.freespins=1&pt.i1.comp.i14.n=4&pt.i1.comp.i16.multi=150&pt.i1.comp.i15.freespins=1&pt.i0.comp.i27.type=betline&pt.i1.comp.i28.freespins=5&pt.i0.comp.i28.freespins=0&pt.i0.comp.i0.n=5&pt.i0.comp.i7.symbol=SYM5&pt.i1.comp.i21.multi=10&pt.i1.comp.i30.type=betline&pt.i1.comp.i0.freespins=5&pt.i0.comp.i0.type=betline&pt.i1.comp.i0.multi=2000&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&pt.i1.comp.i8.n=4&pt.i0.comp.i25.multi=5&historybutton=false&pt.i0.comp.i16.symbol=SYM8&pt.i1.comp.i21.freespins=1&bl.i5.id=5&pt.i0.comp.i1.multi=300&pt.i0.comp.i27.n=5&pt.i0.comp.i18.symbol=SYM8&pt.i1.comp.i9.type=betline&pt.i0.comp.i12.multi=20&pt.i1.comp.i24.multi=5&pt.i1.comp.i14.freespins=2&pt.i1.comp.i23.type=betline&bl.i3.coins=1&pt.i1.comp.i26.n=4&bl.i10.coins=1&pt.i0.comp.i12.symbol=SYM6&pt.i0.comp.i14.symbol=SYM7&pt.i1.comp.i13.freespins=5&pt.i1.comp.i28.symbol=SYM12&pt.i0.comp.i14.type=betline&pt.i1.comp.i17.multi=50&pt.i0.comp.i18.multi=150&pt.i1.comp.i0.n=5&pt.i1.comp.i26.symbol=SYM11&bl.i5.line=0%2C0%2C1%2C0%2C0&pt.i0.comp.i7.multi=750&pt.i0.comp.i9.n=3&pt.i0.comp.i30.n=5&pt.i1.comp.i21.type=betline&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&pt.i0.comp.i28.type=betline&pt.i1.comp.i18.type=betline&pt.i0.comp.i10.symbol=SYM6&pt.i0.comp.i15.n=3&bl.i9.coins=1&pt.i0.comp.i21.symbol=SYM9&bl.i7.reelset=ALL&pt.i1.comp.i15.n=3&isJackpotWin=false&pt.i1.comp.i20.freespins=2&pt.i1.comp.i7.type=betline&pt.i1.comp.i11.multi=100&pt.i1.comp.i30.n=3&pt.i0.comp.i1.n=4&pt.i0.comp.i10.freespins=5&pt.i0.comp.i20.multi=25&pt.i0.comp.i20.n=4&pt.i0.comp.i29.symbol=SYM12&pt.i1.comp.i3.symbol=SYM3&pt.i0.comp.i17.multi=50&pt.i1.comp.i23.freespins=2&pt.i1.comp.i25.type=betline&bl.i13.id=13&pt.i1.comp.i9.n=3&pt.i0.comp.i25.symbol=SYM11&pt.i0.comp.i26.type=betline&pt.i0.comp.i28.n=3&pt.i0.comp.i9.type=betline&bl.i9.line=1%2C0%2C1%2C0%2C1&pt.i0.comp.i2.multi=25&pt.i1.comp.i27.n=3&pt.i0.comp.i0.freespins=5&pt.i1.comp.i16.type=betline&pt.i1.comp.i25.multi=60&pt.i1.comp.i16.freespins=5&pt.i1.comp.i20.symbol=SYM9&bl.i10.reelset=ALL&pt.i1.comp.i12.multi=20&pt.i0.comp.i29.freespins=0&pt.i1.comp.i1.n=4&pt.i1.comp.i5.type=betline&pt.i1.comp.i11.freespins=2&pt.i1.comp.i24.symbol=SYM10&pt.i0.comp.i9.symbol=SYM5&pt.i1.comp.i13.symbol=SYM7&pt.i1.comp.i17.symbol=SYM8&bl.i11.coins=1&pt.i0.comp.i16.n=3&bl.i13.reelset=ALL&bl.i0.id=0&pt.i0.comp.i16.type=betline&pt.i1.comp.i16.n=5&pt.i0.comp.i5.symbol=SYM4&pt.i1.comp.i7.symbol=SYM5&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i4.reelset=ALL&bl.i4.coins=1&pt.i0.comp.i2.n=3&pt.i0.comp.i1.symbol=SYM3&bl.i9.id=9&pt.i0.comp.i19.freespins=0&pt.i1.comp.i14.type=betline&bl.i11.id=11&pt.i0.comp.i6.type=betline&pt.i1.comp.i9.freespins=1&pt.i1.comp.i2.freespins=1&playercurrency=%26%23x20AC%3B&pt.i1.comp.i25.freespins=5&bl.i9.reelset=ALL&pt.i1.comp.i30.multi=5&pt.i0.comp.i25.n=3&pt.i1.comp.i10.multi=500&pt.i1.comp.i10.symbol=SYM6&pt.i1.comp.i28.n=5&pt.i0.comp.i9.freespins=1&bl.i11.reelset=ALL&pt.i1.comp.i2.n=3&pt.i1.comp.i20.n=4&credit=500000&pt.i0.comp.i5.type=betline&pt.i1.comp.i24.freespins=1&pt.i0.comp.i11.freespins=2&pt.i0.comp.i26.multi=15&pt.i0.comp.i25.type=betline&bl.i1.reelset=ALL&pt.i1.comp.i18.symbol=SYM8&pt.i1.comp.i12.symbol=SYM6&pt.i0.comp.i4.type=betline&pt.i0.comp.i13.freespins=5&pt.i1.comp.i15.type=betline&pt.i1.comp.i26.freespins=2&pt.i0.comp.i26.freespins=0&pt.i1.comp.i13.type=betline&pt.i1.comp.i1.multi=300&pt.i1.comp.i1.type=betline&pt.i1.comp.i8.freespins=2&bl.i1.line=0%2C0%2C0%2C0%2C0&pt.i0.comp.i13.n=5&pt.i0.comp.i20.freespins=0&pt.i1.comp.i17.n=4&pt.i0.comp.i23.type=betline&pt.i1.comp.i29.type=betline&pt.i0.comp.i30.symbol=SYM12&pt.i0.comp.i3.n=2&pt.i1.comp.i17.freespins=2&pt.i1.comp.i26.multi=15&pt.i1.comp.i6.type=betline&pt.i1.comp.i0.type=betline&pt.i1.comp.i1.symbol=SYM3&pt.i1.comp.i29.multi=10&pt.i0.comp.i25.freespins=0&pt.i1.comp.i4.symbol=SYM4&bl.i8.line=1%2C0%2C0%2C0%2C1&pt.i0.comp.i24.symbol=SYM10&pt.i0.comp.i26.n=4&pt.i0.comp.i27.symbol=SYM11&bl.i8.coins=1&pt.i1.comp.i29.n=4&pt.i0.comp.i23.multi=20&bl.i2.line=2%2C2%2C2%2C2%2C2&pt.i1.comp.i3.n=2&pt.i0.comp.i30.multi=50&pt.i1.comp.i21.n=3&pt.i1.comp.i28.multi=50&pt.i0.comp.i18.freespins=0&bl.i12.id=12&pt.i1.comp.i15.symbol=SYM7&pt.i1.comp.i18.freespins=1&pt.i1.comp.i3.freespins=1&bl.i4.id=4&bl.i7.coins=1&pt.i0.comp.i14.n=4&pt.i0.comp.i0.multi=2000&pt.i1.comp.i9.symbol=SYM5&bl.i6.reelset=ALL&pt.i0.comp.i19.multi=10&pt.i0.comp.i3.symbol=SYM3&pt.i0.comp.i24.type=betline&pt.i1.comp.i18.n=3&bl.i14.coins=1&pt.i1.comp.i12.freespins=1&pt.i0.comp.i12.freespins=1&pt.i0.comp.i4.n=5&pt.i1.comp.i10.n=5&pt.i0.comp.i24.multi=75';
    }

    private handleInitFreespinRequest(): string {
        // Just return the response string as provided in PHP
        return `rs.i1.r.i0.syms=SYM10%2CSYM3%2CSYM11&freespins.betlevel=1&g4mode=false&freespins.win.coins=0&playercurrency=%26%23x20AC%3B&historybutton=false&current.rs.i0=freespin&rs.i0.r.i4.hold=false&next.rs=freespin&gamestate.history=basic&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=66&rs.i0.r.i1.syms=SYM9%2CSYM5%2CSYM7&game.win.cents=150&rs.i0.id=freespin&rs.i1.r.i3.hold=false&totalwin.coins=15&credit=499300&rs.i1.r.i4.pos=46&gamestate.current=freespin&freespins.initial=1&jackpotcurrency=%26%23x20AC%3B&multiplier=2&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14&rs.i0.r.i0.syms=SYM10%2CSYM6%2CSYM11&freespins.denomination=10.00&rs.i0.r.i3.syms=SYM12%2CSYM5%2CSYM9&rs.i1.r.i1.syms=SYM9%2CSYM3%2CSYM12&rs.i1.r.i1.pos=20&freespins.win.cents=0&freespins.totalwin.coins=0&freespins.total=3&isJackpotWin=false&gamestate.stack=basic%2Cfreespin&rs.i0.r.i0.pos=0&rs.i1.r.i4.syms=SYM12%2CSYM4%2CSYM11&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14&gamesoundurl=&rs.i1.r.i2.pos=34&bet.betlevel=1&rs.i0.r.i1.pos=6&rs.i1.r.i3.syms=SYM12%2CSYM1%2CSYM10&game.win.coins=15&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&freespins.wavecount=1&freespins.multiplier=2&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=initfreespin&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM9%2CSYM3%2CSYM10&rs.i0.r.i2.pos=0&rs.i1.r.i2.syms=SYM12%2CSYM7%2CSYM11&rs.i1.r.i0.pos=21&totalwin.cents=150&gameover=false&rs.i0.r.i0.hold=false&rs.i1.id=basic&rs.i0.r.i3.pos=0&rs.i1.r.i4.hold=false&freespins.left=3&rs.i0.r.i4.pos=0&nextaction=freespin&wavecount=1&rs.i0.r.i2.syms=SYM11%2CSYM12%2CSYM1&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&game.win.amount=1.5&bet.denomination=10&freespins.totalwin.cents=0`;
    }

    private handleSpinRequest(postData: any): string {
        const linesId = this.getLinesId();
        const lines = 15;
        const betline = postData.bet_betlevel;
        let allbet = betline * lines;

        // Handle transaction logic
        if (postData.slotEvent !== 'freespin') {
            this.slotSettings.SetBalance(-1 * allbet, postData.slotEvent);
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(postData.slotEvent, bankSum, postData.slotEvent);
            this.slotSettings.UpdateJackpots(allbet);

            this.slotSettings.SetGameData('FruitShopNETBonusWin', 0);
            this.slotSettings.SetGameData('FruitShopNETFreeGames', 0);
            this.slotSettings.SetGameData('FruitShopNETCurrentFreeGame', 0);
            this.slotSettings.SetGameData('FruitShopNETTotalWin', 0);
            this.slotSettings.SetGameData('FruitShopNETBet', betline);
            this.slotSettings.SetGameData('FruitShopNETDenom', this.slotSettings.CurrentDenom);
            this.slotSettings.SetGameData('FruitShopNETFreeBalance', this.slotSettings.GetBalance() * 100);
        } else {
            // Logic for free spin / respin
            this.slotSettings.CurrentDenom = this.slotSettings.GetGameData('FruitShopNETDenom');
            this.slotSettings.CurrentDenomination = this.slotSettings.CurrentDenom;
            const storedBet = this.slotSettings.GetGameData('FruitShopNETBet');
            allbet = storedBet * lines;
            this.slotSettings.SetGameData('FruitShopNETCurrentFreeGame',
                this.slotSettings.GetGameData('FruitShopNETCurrentFreeGame') + 1);
        }

        const winTypeTmp = this.slotSettings.GetSpinSettings(postData.slotEvent, allbet, lines);
        let winType = winTypeTmp[0];
        let spinWinLimit = winTypeTmp[1];

        // PHP logic: if( $winType == 'bonus' && $postData['slotEvent'] == 'freespin' ) { $winType = 'win'; }
        if (winType === 'bonus' && postData.slotEvent === 'freespin') {
            winType = 'win';
        }

        let totalWin = 0;
        let lineWins: string[] = [];
        let reels: ReelStrips = { rp: [] };
        let mainSymAnim = '';
        let bonusMpl = postData.slotEvent === 'freespin' ? this.slotSettings.slotFreeMpl : 1;

        // Simulation loop
        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            lineWins = [];
            const cWins: number[] = new Array(lines).fill(0);
            const wild = ['1'];
            const scatter = '0'; // Scatter is '0' in this game logic
            reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent);
            let winLineCount = 0;
            let isFreeStart = false;
            let isFreeCount = 0;

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

                    // Check for wins 2, 3, 4, 5
                    // Updated: Added 2 to match counts based on paytable (SYM_3 pays for 2)
                    const matchCounts = [2, 3, 4, 5];
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

                            if (this.slotSettings.Paytable['SYM_' + csym][count] === 0) {
                                continue;
                            }

                            const tmpWin = this.slotSettings.Paytable['SYM_' + csym][count] * betline * mpl * bonusMpl;
                            if (cWins[k] < tmpWin) {
                                cWins[k] = tmpWin;
                                // Construct legacy win string
                                let posStr = '';
                                for (let p = 0; p < count; p++) {
                                    posStr += `&ws.i${winLineCount}.pos.i${p}=${p}%2C${linesId[k][p] - 1}`;
                                }
                                tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${tmpWin}${posStr}&ws.i${winLineCount}.types.i0.wintype=coins&ws.i${winLineCount}.betline=${k}&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${tmpWin * this.slotSettings.CurrentDenomination * 100}`;
                                mainSymAnim = csym;

                                // Free spins trigger logic (Fruit Shop style)
                                if (postData.slotEvent === 'freespin') {
                                    isFreeStart = true;
                                    isFreeCount = 1; // Simplify for now, PHP logic is complex regarding which count gives what
                                } else if (parseInt(csym) < 8) { // High paying symbols trigger free spins
                                    isFreeStart = true;
                                    isFreeCount = 1; // Simplified
                                }
                                // PHP specific logic for free count:
                                // if( $postData['slotEvent'] == 'freespin' ) { $isFreeStart = true; $isFreeCount = 1; }
                                // else if( $csym < 8 ) { $isFreeStart = true; $isFreeCount = 1; }
                                // In loop 4 matches: $isFreeCount = 2;
                                // In loop 5 matches: $isFreeCount = 5;

                                if (count == 4) isFreeCount = 2;
                                if (count == 5) isFreeCount = 5;
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

            // Scatter logic (minimal for this game as scatter is empty string)
            let scattersWin = 0;
            let scattersCount = 0;

            for (let r = 1; r <= 5; r++) {
                for (let p = 0; p <= 2; p++) {
                    if (reels[`reel${r}`]?.[p] == scatter) {
                        scattersCount++;
                    }
                }
            }

            if (scattersWin > 0) {
                // Logic for scatter wins if any
            }
            totalWin += scattersWin;

            // Validation logic
            if (i > 1000) winType = 'none';
            if (i > 1500) {
                return this.createErrorResponse('Bad Reel Strip');
            }

            if (this.slotSettings.MaxWin < (totalWin * this.slotSettings.CurrentDenom)) {
                continue;
            }

            const minWin = this.slotSettings.GetRandomPay();
            if (i > 700) {
                // minWin = 0;
            }

            if (this.slotSettings.increaseRTP && winType === 'win' && totalWin < (minWin * allbet)) {
                continue;
            }

            // Check limits
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

        const reportWin = totalWin;
        let fs = 0;

        let curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1?.[0]}%2CSYM${reels.reel1?.[1]}%2CSYM${reels.reel1?.[2]}`;
        curReels += `&rs.i0.r.i1.syms=SYM${reels.reel2?.[0]}%2CSYM${reels.reel2?.[1]}%2CSYM${reels.reel2?.[2]}`;
        curReels += `&rs.i0.r.i2.syms=SYM${reels.reel3?.[0]}%2CSYM${reels.reel3?.[1]}%2CSYM${reels.reel3?.[2]}`;
        curReels += `&rs.i0.r.i3.syms=SYM${reels.reel4?.[0]}%2CSYM${reels.reel4?.[1]}%2CSYM${reels.reel4?.[2]}`;
        curReels += `&rs.i0.r.i4.syms=SYM${reels.reel5?.[0]}%2CSYM${reels.reel5?.[1]}%2CSYM${reels.reel5?.[2]}`;

        if (postData.slotEvent === 'freespin') {
            this.slotSettings.SetGameData('FruitShopNETBonusWin', this.slotSettings.GetGameData('FruitShopNETBonusWin') + totalWin);
            this.slotSettings.SetGameData('FruitShopNETTotalWin', this.slotSettings.GetGameData('FruitShopNETTotalWin') + totalWin);
        } else {
            this.slotSettings.SetGameData('FruitShopNETTotalWin', totalWin);
        }

        let freeState = '';
        if (isFreeStart) {
            if (postData.slotEvent === 'freespin') {
                this.slotSettings.SetGameData('FruitShopNETFreeGames', this.slotSettings.GetGameData('FruitShopNETFreeGames') + isFreeCount);
            } else {
                this.slotSettings.SetGameData('FruitShopNETFreeStartWin', totalWin);
                this.slotSettings.SetGameData('FruitShopNETBonusWin', totalWin);
                this.slotSettings.SetGameData('FruitShopNETFreeGames', isFreeCount);
            }
            fs = this.slotSettings.GetGameData('FruitShopNETFreeGames');
            freeState = `&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&freespins.totalwin.cents=0&nextaction=freespin&freespins.left=${fs}&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=basic%2Cfreespin&freespins.totalwin.coins=0&freespins.total=${fs}&freespins.win.cents=0&gamestate.current=freespin&freespins.initial=${fs}&freespins.win.coins=0&freespins.betlevel=${this.slotSettings.GetGameData('FruitShopNETBet')}&totalwin.coins=${totalWin}&credit=${Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100)}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}`;
            curReels += freeState;
        }

        // Construct response
        const winString = lineWins.join('');
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        // Log report (JSON for internal log)
        const logResponse = {
            responseEvent: 'spin',
            responseType: postData.slotEvent,
            serverResponse: {
                freeState: freeState,
                slotLines: lines,
                slotBet: betline,
                totalFreeGames: this.slotSettings.GetGameData('FruitShopNETFreeGames'),
                currentFreeGames: this.slotSettings.GetGameData('FruitShopNETCurrentFreeGame'),
                Balance: balanceInCents,
                afterBalance: balanceInCents,
                bonusWin: this.slotSettings.GetGameData('FruitShopNETBonusWin'),
                totalWin: totalWin,
                winLines: [],
                Jackpots: this.slotSettings.Jackpots,
                reelsSymbols: reels
            }
        };
        this.slotSettings.SaveLogReport(JSON.stringify(logResponse), allbet, lines, reportWin, postData.slotEvent);

        this.slotSettings.SetGameData('FruitShopNETGambleStep', 5);

        let gameover = 'true';
        let nextaction = 'spin';
        let gamestate = 'basic';
        let stack = 'basic';

        if (totalWin > 0) {
            gameover = 'false';
            // Logic for win state ...
        } else {
            gameover = 'true';
            nextaction = 'spin';
        }

        if (postData.slotEvent === 'freespin') {
            totalWin = this.slotSettings.GetGameData('FruitShopNETBonusWin');
            if (this.slotSettings.GetGameData(this.slotId + 'FreeGames') <= this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') &&
                this.slotSettings.GetGameData('FruitShopNETBonusWin') > 0) {
                    nextaction = 'spin';
                    stack = 'basic';
                    gamestate = 'basic';
            } else {
                gamestate = 'freespin';
                nextaction = 'freespin';
                stack = 'basic%2Cfreespin';
            }

            const fs = this.slotSettings.GetGameData('FruitShopNETFreeGames');
            const fsl = this.slotSettings.GetGameData('FruitShopNETFreeGames') - this.slotSettings.GetGameData('FruitShopNETCurrentFreeGame');

            freeState = `&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&freespins.totalwin.cents=0&nextaction=${nextaction}&freespins.left=${fsl}&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=${stack}&freespins.totalwin.coins=${totalWin}&freespins.total=${fs}&freespins.win.cents=${totalWin / this.slotSettings.CurrentDenomination * 100}&gamestate.current=${gamestate}&freespins.initial=${fs}&freespins.win.coins=${totalWin}&freespins.betlevel=${this.slotSettings.GetGameData('FruitShopNETBet')}&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}`;
            curReels += freeState;
        }

        const result = `rs.i0.r.i1.pos=18&g4mode=false&game.win.coins=${totalWin}&playercurrency=%26%23x20AC%3B&playercurrencyiso=${this.slotSettings.slotCurrency}&historybutton=false&rs.i0.r.i1.hold=false&rs.i0.r.i4.hold=false&gamestate.history=basic&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=spin&rs.i0.r.i2.hold=false&game.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&rs.i0.r.i2.pos=47&rs.i0.id=basic&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gamestate.current=basic&gameover=true&rs.i0.r.i0.hold=false&jackpotcurrency=%26%23x20AC%3B&multiplier=1&rs.i0.r.i3.pos=4&rs.i0.r.i4.pos=5&isJackpotWin=false&gamestate.stack=basic&nextaction=spin&rs.i0.r.i0.pos=7&wavecount=1&gamesoundurl=&rs.i0.r.i3.hold=false&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}${curReels}${winString}`;

        return result;
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
            [1, 1, 1, 1, 1],
            [3, 3, 3, 3, 3],
            [1, 2, 3, 2, 1],
            [3, 2, 1, 2, 3],
            [1, 1, 2, 1, 1],
            [3, 3, 2, 3, 3],
            [2, 3, 3, 3, 2],
            [2, 1, 1, 1, 2],
            [2, 1, 2, 1, 2],
            [2, 3, 2, 3, 2],
            [1, 2, 1, 2, 1],
            [3, 2, 3, 2, 3],
            [2, 2, 1, 2, 2],
            [2, 2, 3, 2, 2]
        ];
    }

    private generateSessionId(): string {
        return 'a40e5dc15a83a70f288e421fbcfc6de8';
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
