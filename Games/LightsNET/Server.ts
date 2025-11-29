// Server.ts - LightsNET game server
// Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines
// Data injection pattern - NO database calls or legacy PHP constructs

import { SlotSettings, ReelStrips } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'LightsNET';

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
            const lines = 9;
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
                return this.handleInitFreespinRequest(balanceInCents);
            case 'spin':
                return this.handleSpinRequest(postData);
            default:
                return this.createErrorResponse("unknown action");
        }
    }

    private handleInitRequest(): string {
        const lastEvent = this.slotSettings.GetHistory();
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        // Reset game state
        this.slotSettings.SetGameData('LightsNETBonusWin', 0);
        this.slotSettings.SetGameData('LightsNETFreeGames', 0);
        this.slotSettings.SetGameData('LightsNETCurrentFreeGame', 0);
        this.slotSettings.SetGameData('LightsNETTotalWin', 0);
        this.slotSettings.SetGameData('LightsNETFreeBalance', 0);

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
            curReels = this.buildReelsString(reels);
        } else {
            curReels = this.buildRandomReelsString();
        }

        const denoms = this.slotSettings.Denominations.map(d => d * 100).join('%2C');
        const standardDenom = this.slotSettings.CurrentDenomination * 100;

        if (this.slotSettings.GetGameData('LightsNETCurrentFreeGame') < this.slotSettings.GetGameData('LightsNETFreeGames') && this.slotSettings.GetGameData('LightsNETFreeGames') > 0) {
             // Construct free state string
             freeState = `previous.rs.i0=freespin&rs.i1.r.i0.syms=SYM9%2CSYM9%2CSYM11&bl.i6.coins=1&g4mode=false&freespins.win.coins=75&rs.i0.nearwin=4&historybutton=false&rs.i0.r.i4.hold=false&bl.i5.id=5&gameEventSetters.enabled=false&next.rs=freespin&gamestate.history=basic%2Cfreespin&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=114&rs.i0.r.i1.syms=SYM9%2CSYM9%2CSYM9&bl.i3.coins=1&game.win.cents=375&staticsharedurl=&ws.i0.betline=3&bl.i0.reelset=ALL&rs.i1.r.i2.overlay.i2.row=2&rs.i1.r.i3.hold=false&totalwin.coins=75&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=freespin&freespins.initial=10&bl.i3.reelset=ALL&rs.i0.r.i2.overlay.i0.row=2&bl.i4.line=2%2C1%2C0%2C1%2C2&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&rs.i1.r.i0.overlay.i0.pos=291&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8&rs.i0.r.i0.syms=SYM0%2CSYM12%2CSYM12&rs.i1.r.i2.overlay.i0.with=SYM1&rs.i0.r.i3.syms=SYM7%2CSYM7%2CSYM0&rs.i1.r.i1.syms=SYM0%2CSYM6%2CSYM6&bl.i2.id=2&rs.i1.r.i1.pos=49&freespins.win.cents=375&rs.i0.r.i2.overlay.i0.with=SYM1&bl.i7.reelset=ALL&isJackpotWin=false&rs.i0.r.i0.pos=277&rs.i1.r.i2.overlay.i1.pos=82&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8&rs.i1.r.i2.overlay.i0.row=0&rs.i0.r.i1.pos=28&rs.i1.r.i3.syms=SYM4%2CSYM4%2CSYM8&rs.i1.r.i2.overlay.i2.with=SYM1&game.win.coins=75&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&bl.i3.id=3&bl.i8.reelset=ALL&clientaction=init&rs.i0.r.i2.hold=false&rs.i0.r.i3.overlay.i0.with=SYM1&casinoID=netent&betlevel.standard=1&bl.i5.coins=1&gameover=false&bl.i8.id=8&rs.i0.r.i3.pos=49&rs.i0.r.i3.overlay.i0.row=0&bl.i0.id=0&bl.i6.line=2%2C2%2C1%2C2%2C2&rs.i1.r.i2.attention.i0=0&bl.i0.line=1%2C1%2C1%2C1%2C1&nextaction=freespin&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i4.reelset=ALL&bl.i4.coins=1&rs.i0.r.i2.syms=SYM10%2CSYM10%2CSYM10&game.win.amount=3.75&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&rs.i1.r.i0.overlay.i0.with=SYM1&rs.i1.r.i3.overlay.i0.with=SYM1&freespins.totalwin.cents=375&denomination.all=${denoms}&ws.i0.pos.i3=3%2C1&freespins.betlevel=1&ws.i0.pos.i2=2%2C2&playercurrency=%26%23x20AC%3B&rs.i1.r.i2.overlay.i0.pos=81&rs.i1.r.i2.overlay.i1.row=1&current.rs.i0=freespin&ws.i0.reelset=freespin&bl.i1.id=1&ws.i0.pos.i1=1%2C1&ws.i0.pos.i0=0%2C0&rs.i0.r.i3.attention.i0=2&rs.i0.r.i2.overlay.i0.pos=130&rs.i0.id=basic&rs.i1.r.i0.overlay.i0.row=0&credit=${balanceInCents}&rs.i1.r.i4.pos=162&denomination.standard=${standardDenom}&ws.i0.types.i0.coins=75&bl.i1.reelset=ALL&rs.i1.r.i2.overlay.i2.pos=83&multiplier=1&last.rs=freespin&freespins.denomination=5.000&bl.i2.coins=1&bl.i6.id=6&bl.i1.line=0%2C0%2C0%2C0%2C0&rs.i1.r.i3.overlay.i0.row=1&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&ws.i0.sym=SYM6&freespins.totalwin.coins=75&ws.i0.direction=left_to_right&freespins.total=10&gamestate.stack=basic%2Cfreespin&rs.i1.r.i4.syms=SYM11%2CSYM11%2CSYM11&gamesoundurl=&rs.i1.r.i2.pos=81&bet.betlevel=1&rs.i1.nearwin=4%2C3&ws.i0.types.i0.wintype=coins&nearwinallowed=true&bl.i5.reelset=ALL&bl.i7.id=7&bl.i8.line=1%2C0%2C0%2C0%2C1&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=1&freespins.wavecount=1&rs.i0.r.i4.attention.i0=1&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM12%2CSYM0%2CSYM11&rs.i1.r.i2.overlay.i1.with=SYM1&rs.i1.r.i3.overlay.i0.pos=115&bl.i8.coins=1&rs.i0.r.i2.pos=128&bl.i2.line=2%2C2%2C2%2C2%2C2&rs.i0.r.i0.attention.i0=0&rs.i1.r.i2.syms=SYM0%2CSYM9%2CSYM9&rs.i1.r.i0.pos=291&totalwin.cents=375&bl.i0.coins=1&bl.i2.reelset=ALL&rs.i0.r.i0.hold=false&restore=true&rs.i1.id=freespin&rs.i1.r.i4.hold=false&freespins.left=9&bl.i4.id=4&rs.i0.r.i4.pos=260&bl.i7.coins=1&rs.i0.r.i3.overlay.i0.pos=49&ws.i0.types.i0.cents=375&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8&rs.i1.r.i1.attention.i0=0&bl.i6.reelset=ALL&wavecount=1&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&bet.denomination=${standardDenom}` + freeState;
        }

        return `rs.i1.r.i0.syms=SYM12%2CSYM0%2CSYM11&bl.i6.coins=1&g4mode=false&historybutton=false&rs.i0.r.i4.hold=false&bl.i5.id=5&gameEventSetters.enabled=false&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=71&rs.i0.r.i1.syms=SYM9%2CSYM9%2CSYM9&bl.i3.coins=1&game.win.cents=0&staticsharedurl=&bl.i0.reelset=ALL&rs.i1.r.i3.hold=false&totalwin.coins=0&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=basic&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&rs.i0.r.i0.syms=SYM12%2CSYM12%2CSYM12&rs.i0.r.i3.syms=SYM3%2CSYM3%2CSYM3&rs.i1.r.i1.syms=SYM10%2CSYM10%2CSYM3&bl.i2.id=2&rs.i1.r.i1.pos=14&bl.i7.reelset=ALL&isJackpotWin=false&rs.i0.r.i0.pos=0&rs.i0.r.i1.pos=0&rs.i1.r.i3.syms=SYM6%2CSYM6%2CSYM8&game.win.coins=0&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&bl.i3.id=3&bl.i8.reelset=ALL&clientaction=init&rs.i0.r.i2.hold=false&casinoID=netent&betlevel.standard=1&bl.i5.coins=1&gameover=true&bl.i8.id=8&rs.i0.r.i3.pos=0&bl.i0.id=0&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&nextaction=spin&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i4.reelset=ALL&bl.i4.coins=1&rs.i0.r.i2.syms=SYM3%2CSYM3%2CSYM3&game.win.amount=0&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&denomination.all=${denoms}&playercurrency=%26%23x20AC%3B&bl.i1.id=1&rs.i0.id=freespin&credit=${balanceInCents}&rs.i1.r.i4.pos=16&denomination.standard=${standardDenom}&bl.i1.reelset=ALL&multiplier=1&bl.i2.coins=1&bl.i6.id=6&bl.i1.line=0%2C0%2C0%2C0%2C0&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&rs.i1.r.i4.syms=SYM9%2CSYM9%2CSYM5&gamesoundurl=&rs.i1.r.i2.pos=29&nearwinallowed=true&bl.i5.reelset=ALL&bl.i7.id=7&bl.i8.line=1%2C0%2C0%2C0%2C1&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM11%2CSYM11%2CSYM11&bl.i8.coins=1&rs.i0.r.i2.pos=0&bl.i2.line=2%2C2%2C2%2C2%2C2&rs.i1.r.i2.syms=SYM7%2CSYM4%2CSYM4&rs.i1.r.i0.pos=163&totalwin.cents=0&bl.i0.coins=1&bl.i2.reelset=ALL&rs.i0.r.i0.hold=false&restore=false&rs.i1.id=basic&rs.i1.r.i4.hold=false&bl.i4.id=4&rs.i0.r.i4.pos=0&bl.i7.coins=1&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8&bl.i6.reelset=ALL&wavecount=1&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false` + curReels + freeState;
    }

    private handlePaytableRequest(): string {
        return 'bl.i32.reelset=ALL&pt.i0.comp.i19.symbol=SYM8&bl.i6.coins=1&pt.i0.comp.i15.type=betline&pt.i0.comp.i23.freespins=0&pt.i0.comp.i32.type=betline&pt.i0.comp.i29.type=betline&pt.i0.comp.i4.multi=200&pt.i0.comp.i15.symbol=SYM7&pt.i0.comp.i17.symbol=SYM7&pt.i0.comp.i5.freespins=0&pt.i1.comp.i14.multi=400&pt.i0.comp.i22.multi=15&pt.i0.comp.i23.n=5&pt.i1.comp.i19.type=betline&pt.i0.comp.i11.symbol=SYM5&pt.i0.comp.i13.symbol=SYM6&pt.i1.comp.i8.type=betline&pt.i1.comp.i4.n=4&pt.i1.comp.i27.multi=3&pt.i0.comp.i15.multi=9&pt.i1.comp.i27.symbol=SYM11&bl.i0.reelset=ALL&pt.i0.comp.i16.freespins=0&pt.i0.comp.i28.multi=15&pt.i1.comp.i6.freespins=0&pt.i1.comp.i29.symbol=SYM11&pt.i1.comp.i29.freespins=0&pt.i1.comp.i22.n=4&pt.i1.comp.i30.symbol=SYM12&pt.i1.comp.i3.multi=15&pt.i0.comp.i11.n=5&pt.i0.comp.i4.freespins=0&pt.i1.comp.i23.symbol=SYM9&pt.i1.comp.i25.symbol=SYM10&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&pt.i0.comp.i30.freespins=0&pt.i1.comp.i24.type=betline&pt.i0.comp.i19.n=4&pt.i0.id=basic&pt.i0.comp.i1.type=scatter&bl.i2.id=2&pt.i1.comp.i10.type=betline&pt.i0.comp.i2.symbol=SYM0&pt.i0.comp.i4.symbol=SYM3&pt.i1.comp.i5.freespins=0&pt.i0.comp.i20.type=betline&pt.i1.comp.i8.symbol=SYM4&pt.i1.comp.i19.n=4&pt.i0.comp.i17.freespins=0&pt.i0.comp.i6.symbol=SYM4&pt.i0.comp.i8.symbol=SYM4&pt.i0.comp.i0.symbol=SYM0&pt.i1.comp.i11.n=5&pt.i0.comp.i5.n=5&pt.i1.comp.i2.symbol=SYM0&pt.i0.comp.i3.type=betline&pt.i0.comp.i3.freespins=0&pt.i0.comp.i10.multi=100&pt.i1.id=freespin&pt.i1.comp.i19.multi=15&bl.i3.id=3&pt.i1.comp.i6.symbol=SYM4&pt.i0.comp.i27.multi=3&pt.i0.comp.i9.multi=9&pt.i0.comp.i22.symbol=SYM9&pt.i0.comp.i26.symbol=SYM10&pt.i1.comp.i19.freespins=0&pt.i0.comp.i24.n=3&bl.i8.reelset=ALL&pt.i0.comp.i14.freespins=0&pt.i0.comp.i21.freespins=0&clientaction=paytable&pt.i1.comp.i27.freespins=0&pt.i1.comp.i4.freespins=0&pt.i1.comp.i12.type=betline&pt.i1.comp.i5.n=5&bl.i5.coins=1&pt.i1.comp.i8.multi=750&pt.i1.comp.i21.symbol=SYM9&pt.i1.comp.i23.n=5&pt.i0.comp.i22.type=betline&pt.i0.comp.i24.freespins=0&pt.i1.comp.i32.symbol=SYM12&bl.i8.id=8&pt.i0.comp.i16.multi=50&pt.i0.comp.i21.multi=3&pt.i1.comp.i13.multi=75&pt.i0.comp.i12.n=3&bl.i6.line=2%2C2%2C1%2C2%2C2&pt.i0.comp.i13.type=betline&pt.i1.comp.i9.multi=9&bl.i0.line=1%2C1%2C1%2C1%2C1&pt.i0.comp.i19.type=betline&pt.i0.comp.i6.freespins=0&pt.i1.comp.i2.multi=0&pt.i1.comp.i7.freespins=0&pt.i0.comp.i31.freespins=0&pt.i0.comp.i3.multi=15&pt.i0.comp.i6.n=3&pt.i1.comp.i22.type=betline&pt.i1.comp.i12.n=3&pt.i1.comp.i3.type=betline&pt.i0.comp.i21.n=3&pt.i1.comp.i10.freespins=0&pt.i1.comp.i28.type=betline&pt.i1.comp.i6.n=3&pt.i0.comp.i29.n=5&pt.i1.comp.i31.type=betline&bl.i1.id=1&pt.i1.comp.i20.multi=100&pt.i0.comp.i27.freespins=0&pt.i1.comp.i24.n=3&pt.i0.comp.i10.type=betline&pt.i1.comp.i11.symbol=SYM5&pt.i1.comp.i27.type=betline&pt.i1.comp.i2.type=scatter&pt.i0.comp.i2.freespins=30&pt.i0.comp.i5.multi=1000&pt.i0.comp.i7.n=4&pt.i0.comp.i32.n=5&pt.i1.comp.i1.freespins=20&pt.i0.comp.i11.multi=500&pt.i1.comp.i14.symbol=SYM6&pt.i1.comp.i16.symbol=SYM7&pt.i1.comp.i23.multi=75&pt.i0.comp.i7.type=betline&pt.i1.comp.i4.type=betline&pt.i0.comp.i17.n=5&pt.i1.comp.i18.multi=3&bl.i2.coins=1&bl.i6.id=6&pt.i0.comp.i29.multi=40&pt.i1.comp.i13.n=4&pt.i0.comp.i8.freespins=0&pt.i1.comp.i26.type=betline&pt.i1.comp.i4.multi=200&pt.i0.comp.i8.multi=750&gamesoundurl=&pt.i0.comp.i1.freespins=20&pt.i0.comp.i12.type=betline&pt.i0.comp.i14.multi=400&pt.i1.comp.i7.multi=150&bl.i5.reelset=ALL&pt.i0.comp.i22.n=4&pt.i0.comp.i28.symbol=SYM11&pt.i1.comp.i17.type=betline&bl.i7.id=7&pt.i1.comp.i11.type=betline&pt.i0.comp.i6.multi=15&pt.i1.comp.i0.symbol=SYM0&playercurrencyiso=' + this.slotSettings.slotCurrency + '&bl.i1.coins=1&pt.i1.comp.i7.n=4&pt.i1.comp.i5.multi=1000&pt.i1.comp.i5.symbol=SYM3&pt.i0.comp.i18.type=betline&pt.i0.comp.i23.symbol=SYM9&pt.i0.comp.i21.type=betline&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&pt.i1.comp.i25.n=4&pt.i0.comp.i8.type=betline&pt.i0.comp.i7.freespins=0&pt.i1.comp.i15.multi=9&pt.i0.comp.i2.type=scatter&pt.i0.comp.i13.multi=75&pt.i1.comp.i20.type=betline&pt.i0.comp.i17.type=betline&pt.i0.comp.i30.type=betline&pt.i1.comp.i22.symbol=SYM9&pt.i1.comp.i30.freespins=0&pt.i1.comp.i22.multi=15&bl.i0.coins=1&bl.i2.reelset=ALL&pt.i0.comp.i8.n=5&pt.i0.comp.i10.n=4&pt.i1.comp.i6.multi=15&pt.i1.comp.i22.freespins=0&pt.i0.comp.i11.type=betline&pt.i1.comp.i19.symbol=SYM8&pt.i0.comp.i18.n=3&pt.i0.comp.i22.freespins=0&pt.i0.comp.i20.symbol=SYM8&pt.i0.comp.i15.freespins=0&pt.i1.comp.i14.n=5&pt.i1.comp.i16.multi=50&pt.i0.comp.i31.symbol=SYM12&pt.i1.comp.i15.freespins=0&pt.i0.comp.i27.type=betline&pt.i1.comp.i28.freespins=0&pt.i0.comp.i28.freespins=0&pt.i0.comp.i0.n=3&pt.i0.comp.i7.symbol=SYM4&pt.i1.comp.i21.multi=3&pt.i1.comp.i30.type=betline&pt.i1.comp.i0.freespins=10&pt.i0.comp.i0.type=scatter&pt.i1.comp.i0.multi=0&g4mode=false&pt.i1.comp.i8.n=5&pt.i0.comp.i25.multi=15&historybutton=false&pt.i0.comp.i16.symbol=SYM7&pt.i1.comp.i21.freespins=0&bl.i5.id=5&pt.i0.comp.i1.multi=0&pt.i0.comp.i27.n=3&pt.i0.comp.i18.symbol=SYM8&pt.i1.comp.i9.type=betline&pt.i0.comp.i12.multi=9&pt.i0.comp.i32.multi=30&pt.i1.comp.i24.multi=3&pt.i1.comp.i14.freespins=0&pt.i1.comp.i23.type=betline&bl.i3.coins=1&pt.i1.comp.i26.n=5&pt.i0.comp.i12.symbol=SYM6&pt.i0.comp.i14.symbol=SYM6&pt.i1.comp.i13.freespins=0&pt.i1.comp.i28.symbol=SYM11&pt.i0.comp.i14.type=betline&pt.i1.comp.i17.multi=300&pt.i0.comp.i18.multi=3&pt.i1.comp.i0.n=3&pt.i1.comp.i26.symbol=SYM10&pt.i1.comp.i31.symbol=SYM12&bl.i5.line=0%2C0%2C1%2C0%2C0&pt.i0.comp.i7.multi=150&pt.i0.comp.i9.n=3&pt.i0.comp.i30.n=3&pt.i1.comp.i21.type=betline&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&pt.i0.comp.i28.type=betline&pt.i1.comp.i31.multi=15&pt.i1.comp.i18.type=betline&pt.i0.comp.i10.symbol=SYM5&pt.i0.comp.i15.n=3&pt.i0.comp.i21.symbol=SYM9&bl.i7.reelset=ALL&pt.i0.comp.i31.type=betline&pt.i1.comp.i15.n=3&isJackpotWin=false&pt.i1.comp.i20.freespins=0&pt.i1.comp.i7.type=betline&pt.i1.comp.i11.multi=500&pt.i1.comp.i30.n=3&pt.i0.comp.i1.n=4&pt.i0.comp.i10.freespins=0&pt.i0.comp.i20.multi=100&pt.i0.comp.i20.n=5&pt.i0.comp.i29.symbol=SYM11&pt.i1.comp.i3.symbol=SYM3&pt.i0.comp.i17.multi=300&pt.i1.comp.i23.freespins=0&pt.i1.comp.i25.type=betline&pt.i1.comp.i9.n=3&pt.i0.comp.i25.symbol=SYM10&pt.i0.comp.i26.type=betline&pt.i0.comp.i28.n=4&pt.i0.comp.i9.type=betline&pt.i0.comp.i2.multi=0&pt.i1.comp.i27.n=3&pt.i0.comp.i0.freespins=10&pt.i1.comp.i16.type=betline&pt.i1.comp.i25.multi=15&pt.i1.comp.i16.freespins=0&pt.i1.comp.i20.symbol=SYM8&pt.i1.comp.i12.multi=9&pt.i0.comp.i29.freespins=0&pt.i1.comp.i1.n=4&pt.i1.comp.i5.type=betline&pt.i1.comp.i11.freespins=0&pt.i1.comp.i24.symbol=SYM10&pt.i0.comp.i31.n=4&pt.i0.comp.i9.symbol=SYM5&pt.i1.comp.i13.symbol=SYM6&pt.i1.comp.i17.symbol=SYM7&pt.i0.comp.i16.n=4&bl.i0.id=0&pt.i0.comp.i16.type=betline&pt.i1.comp.i16.n=4&pt.i0.comp.i5.symbol=SYM3&pt.i1.comp.i7.symbol=SYM4&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i4.reelset=ALL&bl.i4.coins=1&pt.i0.comp.i2.n=5&pt.i0.comp.i1.symbol=SYM0&pt.i1.comp.i31.n=4&pt.i1.comp.i31.freespins=0&pt.i0.comp.i19.freespins=0&pt.i1.comp.i14.type=betline&pt.i0.comp.i6.type=betline&pt.i1.comp.i9.freespins=0&pt.i1.comp.i2.freespins=30&playercurrency=%26%23x20AC%3B&pt.i1.comp.i25.freespins=0&pt.i1.comp.i30.multi=3&pt.i0.comp.i25.n=4&pt.i1.comp.i10.multi=100&pt.i1.comp.i10.symbol=SYM5&pt.i1.comp.i28.n=4&pt.i1.comp.i32.freespins=0&pt.i0.comp.i9.freespins=0&pt.i1.comp.i2.n=5&pt.i1.comp.i20.n=5&credit=500000&pt.i0.comp.i5.type=betline&pt.i1.comp.i24.freespins=0&pt.i0.comp.i11.freespins=0&pt.i0.comp.i26.multi=50&pt.i0.comp.i25.type=betline&pt.i1.comp.i32.type=betline&bl.i1.reelset=ALL&pt.i1.comp.i18.symbol=SYM8&pt.i0.comp.i31.multi=15&pt.i1.comp.i12.symbol=SYM6&pt.i0.comp.i4.type=betline&pt.i0.comp.i13.freespins=0&pt.i1.comp.i15.type=betline&pt.i1.comp.i26.freespins=0&pt.i0.comp.i26.freespins=0&pt.i1.comp.i13.type=betline&pt.i1.comp.i1.multi=0&pt.i1.comp.i1.type=scatter&pt.i1.comp.i8.freespins=0&bl.i1.line=0%2C0%2C0%2C0%2C0&pt.i0.comp.i13.n=4&pt.i0.comp.i20.freespins=0&pt.i1.comp.i17.n=5&pt.i0.comp.i23.type=betline&pt.i1.comp.i29.type=betline&pt.i0.comp.i30.symbol=SYM12&pt.i0.comp.i32.symbol=SYM12&pt.i1.comp.i32.n=5&pt.i0.comp.i3.n=3&pt.i1.comp.i17.freespins=0&pt.i1.comp.i26.multi=50&pt.i1.comp.i32.multi=30&pt.i1.comp.i6.type=betline&pt.i1.comp.i0.type=scatter&pt.i1.comp.i1.symbol=SYM0&pt.i1.comp.i29.multi=40&pt.i0.comp.i25.freespins=0&pt.i1.comp.i4.symbol=SYM3&bl.i8.line=1%2C0%2C0%2C0%2C1&pt.i0.comp.i24.symbol=SYM10&pt.i0.comp.i26.n=5&pt.i0.comp.i27.symbol=SYM11&bl.i8.coins=1&pt.i0.comp.i32.freespins=0&pt.i1.comp.i29.n=5&pt.i0.comp.i23.multi=75&bl.i2.line=2%2C2%2C2%2C2%2C2&pt.i1.comp.i3.n=3&pt.i0.comp.i30.multi=3&pt.i1.comp.i21.n=3&pt.i1.comp.i28.multi=15&pt.i0.comp.i18.freespins=0&pt.i1.comp.i15.symbol=SYM7&pt.i1.comp.i18.freespins=0&pt.i1.comp.i3.freespins=0&bl.i4.id=4&bl.i7.coins=1&pt.i0.comp.i14.n=5&pt.i0.comp.i0.multi=0&pt.i1.comp.i9.symbol=SYM5&bl.i6.reelset=ALL&pt.i0.comp.i19.multi=15&pt.i0.comp.i3.symbol=SYM3&pt.i0.comp.i24.type=betline&pt.i1.comp.i18.n=3&pt.i1.comp.i12.freespins=0&pt.i0.comp.i12.freespins=0&pt.i0.comp.i4.n=4&pt.i1.comp.i10.n=4&pt.i0.comp.i24.multi=3';
    }

    private handleInitFreespinRequest(balanceInCents: number): string {
        return `rs.i1.r.i0.syms=SYM0%2CSYM12%2CSYM12&freespins.betlevel=1&g4mode=false&freespins.win.coins=0&playercurrency=%26%23x20AC%3B&rs.i1.r.i2.overlay.i0.pos=130&historybutton=false&current.rs.i0=freespin&rs.i0.r.i4.hold=false&next.rs=freespin&gamestate.history=basic&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=49&rs.i0.r.i1.syms=SYM9%2CSYM9%2CSYM9&game.win.cents=0&rs.i0.id=freespin&rs.i1.r.i3.hold=false&totalwin.coins=0&credit=${balanceInCents}&rs.i1.r.i4.pos=260&gamestate.current=freespin&freespins.initial=10&jackpotcurrency=%26%23x20AC%3B&multiplier=1&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8&rs.i0.r.i0.syms=SYM12%2CSYM12%2CSYM12&rs.i1.r.i2.overlay.i0.with=SYM1&freespins.denomination=5.000&rs.i0.r.i3.syms=SYM3%2CSYM3%2CSYM3&rs.i1.r.i1.syms=SYM9%2CSYM9%2CSYM9&rs.i1.r.i1.pos=28&rs.i1.r.i3.overlay.i0.row=0&freespins.win.cents=0&freespins.totalwin.coins=0&freespins.total=10&isJackpotWin=false&gamestate.stack=basic%2Cfreespin&rs.i0.r.i0.pos=0&rs.i1.r.i4.syms=SYM12%2CSYM0%2CSYM11&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8&gamesoundurl=&rs.i1.r.i2.pos=128&bet.betlevel=1&rs.i1.nearwin=4&rs.i1.r.i2.overlay.i0.row=2&rs.i0.r.i1.pos=0&rs.i1.r.i3.syms=SYM7%2CSYM7%2CSYM0&game.win.coins=0&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&freespins.wavecount=1&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=initfreespin&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM11%2CSYM11%2CSYM11&rs.i1.r.i3.overlay.i0.pos=49&rs.i0.r.i2.pos=0&rs.i1.r.i2.syms=SYM10%2CSYM10%2CSYM10&rs.i1.r.i0.pos=277&totalwin.cents=0&gameover=false&rs.i0.r.i0.hold=false&rs.i1.id=basic&rs.i0.r.i3.pos=0&rs.i1.r.i4.hold=false&freespins.left=10&rs.i0.r.i4.pos=0&rs.i1.r.i0.attention.i0=0&rs.i1.r.i3.attention.i0=2&nextaction=freespin&wavecount=1&rs.i1.r.i4.attention.i0=1&rs.i0.r.i2.syms=SYM3%2CSYM3%2CSYM3&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&game.win.amount=0.00&bet.denomination=${this.slotSettings.CurrentDenomination * 100}&rs.i1.r.i3.overlay.i0.with=SYM1&freespins.totalwin.cents=0`;
    }

    private handleSpinRequest(postData: any): string {
        const linesId = this.getLinesId();
        const lines = 9;
        let betline = postData.bet_betlevel;
        let allbet = betline * lines;
        let bonusMpl = 1;
        let rset = 'basic';

        if (postData.slotEvent !== 'freespin') {
            this.slotSettings.CurrentDenom = postData.bet_denomination;
            this.slotSettings.CurrentDenomination = postData.bet_denomination;

            this.slotSettings.UpdateJackpots(allbet);

            if (!postData.slotEvent) postData.slotEvent = 'bet';

            this.slotSettings.SetBalance(-1 * allbet, postData.slotEvent);
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(postData.slotEvent, bankSum, postData.slotEvent);
            this.slotSettings.UpdateJackpots(allbet);

            this.slotSettings.SetGameData('LightsNETBonusWin', 0);
            this.slotSettings.SetGameData('LightsNETFreeGames', 0);
            this.slotSettings.SetGameData('LightsNETCurrentFreeGame', 0);
            this.slotSettings.SetGameData('LightsNETTotalWin', 0);
            this.slotSettings.SetGameData('LightsNETBet', betline);
            this.slotSettings.SetGameData('LightsNETDenom', postData.bet_denomination);
            this.slotSettings.SetGameData('LightsNETFreeBalance', Math.round(this.slotSettings.GetBalance() * 100));
            bonusMpl = 1;
            rset = 'basic';
        } else {
            postData.bet_denomination = this.slotSettings.GetGameData('LightsNETDenom');
            this.slotSettings.CurrentDenom = postData.bet_denomination;
            this.slotSettings.CurrentDenomination = postData.bet_denomination;
            betline = this.slotSettings.GetGameData('LightsNETBet');
            allbet = betline * lines;
            this.slotSettings.SetGameData('LightsNETCurrentFreeGame', this.slotSettings.GetGameData('LightsNETCurrentFreeGame') + 1);
            bonusMpl = this.slotSettings.slotFreeMpl;
            rset = 'freespin';
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
        let wildStr = '';
        let scattersStr = '';

        // Simulation loop
        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            lineWins = [];
            const cWins: number[] = new Array(lines).fill(0);
            const wild = ['1']; // '1' is wild
            const scatter = '0';
            reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent);
            const tmpReels = JSON.parse(JSON.stringify(reels)); // Deep copy manually if needed or just use

            // Random Wilds Logic (Floating Wilds)
            let wildStrArr: string[] = [];
            let wildsCount = 0;
            if (postData.slotEvent === 'freespin') {
                wildsCount = this.randomInt(3, 6);
            } else {
                wildsCount = this.randomInt(2, 4);
            }

            let wc = 0;
            // Attempt to place random wilds
            for (let r = 0; r < 200; r++) {
                const rew0 = this.randomInt(1, 5); // reel 1-5
                const rew = this.randomInt(0, 2); // row 0-2

                // Don't overwrite existing wild or scatter
                if (reels[`reel${rew0}`]?.[rew] === '1' || reels[`reel${rew0}`]?.[rew] === '0') {
                    continue;
                } else {
                    wc++;
                    if (reels[`reel${rew0}`]) {
                        reels[`reel${rew0}`]![rew] = '1';
                    }
                }

                if (wildsCount <= wc) break;
            }

            // Build wild string
            for (let r = 1; r <= 5; r++) {
                let wcc = 0;
                for (let p = 0; p <= 2; p++) {
                    if (reels[`reel${r}`]?.[p] === '1') {
                        // Check if it was originally wild? No, the logic above replaces symbols.
                        // But wait, we need to know if it's an overlay wild.
                        // PHP logic implies we modified $reels for check, and build overlay string.
                        // The loop above modifies $reels.
                        // PHP: if( $reels['reel' . $r][$p] == '1' ) ... overlay ...
                        // Wait, if it was naturally wild '1' from strip, it also adds overlay?
                        // PHP logic: "if( $reels['reel' . $rew0][$rew] == '1' ... ) {} else { $wc++; $reels... = '1'; }"
                        // So only added wilds count towards limit.
                        // But when building string: "if( $reels['reel' . $r][$p] == '1' ) ... $wildStrArr[] ..."
                        // This implies ALL wilds (natural + added) get overlay string?
                        // Yes, likely.
                        wildStrArr.push(`&rs.i0.r.i${r-1}.overlay.i${wcc}.pos=321&rs.i0.r.i${r-1}.overlay.i${wcc}.with=SYM1&rs.i0.r.i${r-1}.overlay.i${wcc}.row=${p}`);
                        wcc++;
                    }
                }
            }

            // Calculate Wins
            let winLineCount = 0;
            for (let k = 0; k < lines; k++) {
                let tmpStringWin = '';
                for (let j = 0; j < this.slotSettings.SymbolGame.length; j++) {
                    const csym = String(this.slotSettings.SymbolGame[j]);

                    if (csym === scatter || !this.slotSettings.Paytable['SYM_' + csym]) continue;

                    const s: any[] = [];
                    s[0] = reels.reel1?.[linesId[k][0] - 1];
                    s[1] = reels.reel2?.[linesId[k][1] - 1];
                    s[2] = reels.reel3?.[linesId[k][2] - 1];
                    s[3] = reels.reel4?.[linesId[k][3] - 1];
                    s[4] = reels.reel5?.[linesId[k][4] - 1];

                    // Check matches 3, 4, 5
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
                                mpl = this.slotSettings.slotWildMpl; // 1?
                            } else if (wildCount === count) {
                                mpl = 1;
                            }

                            // PHP Logic uses slotWildMpl for wins with wild?
                            // $mpl = $slotSettings->slotWildMpl;
                            // Check SlotSettings.ts -> slotWildMpl = 1. So it's 1.

                            const tmpWin = this.slotSettings.Paytable['SYM_' + csym][count] * betline * mpl * bonusMpl;
                            if (cWins[k] < tmpWin) {
                                cWins[k] = tmpWin;
                                // Construct win string
                                let posStr = '';
                                for (let p = 0; p < count; p++) {
                                    posStr += `&ws.i${winLineCount}.pos.i${p}=${p}%2C${linesId[k][p] - 1}`;
                                }
                                tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${tmpWin}${posStr}&ws.i${winLineCount}.types.i0.wintype=coins&ws.i${winLineCount}.betline=${k}&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${tmpWin * this.slotSettings.CurrentDenomination * 100}&ws.i${winLineCount}.reelset=${rset}`;
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

            // Restore original reels for scatter check?
            // PHP: $reels = $tmpReels;
            // PHP restores reels to original state before calculating scatters.
            // Why? Scatters under wilds?
            // "if( $reels['reel' . $r][$p] == $scatter )" using restored reels.
            reels = tmpReels; // Use original symbols for scatter check

            let scattersWin = 0;
            let scattersCount = 0;
            let scPos = [];

            for (let r = 1; r <= 5; r++) {
                for (let p = 0; p <= 2; p++) {
                    if (reels[`reel${r}`]?.[p] == scatter) {
                        scattersCount++;
                        scPos.push(`&ws.i0.pos.i${r-1}=${r-1}%2C${p}`);
                    }
                }
            }

            if (scattersCount >= 3) {
                // Free spins won
                // PHP adds 0 to totalWin for scatters usually
                scattersStr = `&ws.i0.types.i0.freespins=${this.slotSettings.slotFreeCount[scattersCount]}&ws.i0.reelset=basic&ws.i0.betline=null&ws.i0.types.i0.wintype=freespins&ws.i0.direction=none` + scPos.join('');
            }

            totalWin += scattersWin;

            // Check limits
            if (i > 1000) winType = 'none';
            if (i > 1500) return this.createErrorResponse('Bad Reel Strip');

            if (totalWin <= spinWinLimit) {
                 // Check bank
                 const cBank = this.slotSettings.GetBank(postData.slotEvent);
                 if (cBank < spinWinLimit) {
                     spinWinLimit = cBank;
                 } else {
                     wildStr = wildStrArr.join('');
                     break;
                 }
            } else if (totalWin == 0 && winType == 'none') {
                wildStr = wildStrArr.join('');
                break;
            }
        }

        if (totalWin > 0) {
            this.slotSettings.SetBank(postData.slotEvent, -1 * totalWin);
            this.slotSettings.SetBalance(totalWin);
        }

        const reportWin = totalWin;
        let curReels = this.buildReelsString(reels);

        if (postData.slotEvent === 'freespin') {
            this.slotSettings.SetGameData('LightsNETBonusWin', this.slotSettings.GetGameData('LightsNETBonusWin') + totalWin);
            this.slotSettings.SetGameData('LightsNETTotalWin', this.slotSettings.GetGameData('LightsNETTotalWin') + totalWin);
        } else {
            this.slotSettings.SetGameData('LightsNETTotalWin', totalWin);
        }

        const scattersCount = (function() {
             let count = 0;
             for (let r = 1; r <= 5; r++) {
                for (let p = 0; p <= 2; p++) {
                    if (reels[`reel${r}`]?.[p] == '0') count++;
                }
             }
             return count;
        })();

        let freeState = '';
        if (scattersCount >= 3) {
            this.slotSettings.SetGameData('LightsNETFreeStartWin', totalWin);
            this.slotSettings.SetGameData('LightsNETBonusWin', totalWin);
            this.slotSettings.SetGameData('LightsNETFreeGames', this.slotSettings.slotFreeCount[Math.min(scattersCount, 5)]);

            const fs = this.slotSettings.GetGameData('LightsNETFreeGames');
            freeState = `&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8&freespins.totalwin.cents=0&nextaction=freespin&freespins.left=${fs}&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=basic%2Cfreespin&freespins.totalwin.coins=0&freespins.total=${fs}&freespins.win.cents=0&gamestate.current=freespin&freespins.initial=${fs}&freespins.win.coins=0&freespins.betlevel=${this.slotSettings.GetGameData('LightsNETBet')}&totalwin.coins=${totalWin}&credit=${Math.round(this.slotSettings.GetBalance() * 100)}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}`;
            curReels += freeState;
        }

        const winString = lineWins.join('');
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        // Handle Freespin logic for next action
        let nextaction = 'spin';
        let gameover = 'true';
        if (postData.slotEvent === 'freespin') {
            const fs = this.slotSettings.GetGameData('LightsNETFreeGames');
            const fsl = fs - this.slotSettings.GetGameData('LightsNETCurrentFreeGame');

            if (fsl <= 0 && this.slotSettings.GetGameData('LightsNETBonusWin') > 0) {
                nextaction = 'spin';
                // End of freespins
            } else {
                nextaction = 'freespin';
                gameover = 'false';
            }

            freeState = `&freespins.totalwin.cents=0&nextaction=${nextaction}&freespins.left=${fsl}&freespins.wavecount=1&next.rs=freespin&current.rs.i0=freespin&freespins.multiplier=1&gamestate.stack=basic%2Cfreespin&freespins.totalwin.coins=${this.slotSettings.GetGameData('LightsNETBonusWin')}&freespins.total=${fs}&freespins.win.cents=${totalWin * 100}&gamestate.current=freespin&freespins.initial=${fs}&freespins.win.coins=${totalWin}&freespins.betlevel=${this.slotSettings.GetGameData('LightsNETBet')}&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * 100}&game.win.amount=${totalWin}`;
            curReels += freeState;
        }

        const response = {
            responseEvent: 'spin',
            responseType: postData.slotEvent,
            serverResponse: {
                freeState: freeState,
                slotLines: lines,
                slotBet: betline,
                totalFreeGames: this.slotSettings.GetGameData('LightsNETFreeGames'),
                currentFreeGames: this.slotSettings.GetGameData('LightsNETCurrentFreeGame'),
                Balance: balanceInCents,
                afterBalance: balanceInCents,
                bonusWin: this.slotSettings.GetGameData('LightsNETBonusWin'),
                totalWin: totalWin,
                winLines: [],
                Jackpots: this.slotSettings.Jackpots,
                reelsSymbols: reels
            }
        };
        this.slotSettings.SaveLogReport(JSON.stringify(response), allbet, lines, reportWin, postData.slotEvent);

        if (totalWin > 0) {
            gameover = 'false';
        }

        return `rs.i0.r.i1.pos=18&g4mode=false&game.win.coins=${totalWin}&playercurrency=%26%23x20AC%3B&playercurrencyiso=${this.slotSettings.slotCurrency}&historybutton=false&rs.i0.r.i1.hold=false&rs.i0.r.i4.hold=false&gamestate.history=basic&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=spin&rs.i0.r.i2.hold=false&game.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&rs.i0.r.i2.pos=47&rs.i0.id=basic&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gamestate.current=basic&gameover=${gameover}&rs.i0.r.i0.hold=false&jackpotcurrency=%26%23x20AC%3B&multiplier=1&rs.i0.r.i3.pos=4&rs.i0.r.i4.pos=5&isJackpotWin=false&gamestate.stack=basic&nextaction=${nextaction}&rs.i0.r.i0.pos=7&wavecount=1&gamesoundurl=&rs.i0.r.i3.hold=false&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}${curReels}${winString}${wildStr}${scattersStr}`;
    }

    private buildReelsString(reels: any): string {
        let curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1[0]}%2CSYM${reels.reel1[1]}%2CSYM${reels.reel1[2]}`;
        curReels += `&rs.i0.r.i1.syms=SYM${reels.reel2[0]}%2CSYM${reels.reel2[1]}%2CSYM${reels.reel2[2]}`;
        curReels += `&rs.i0.r.i2.syms=SYM${reels.reel3[0]}%2CSYM${reels.reel3[1]}%2CSYM${reels.reel3[2]}`;
        curReels += `&rs.i0.r.i3.syms=SYM${reels.reel4[0]}%2CSYM${reels.reel4[1]}%2CSYM${reels.reel4[2]}`;
        curReels += `&rs.i0.r.i4.syms=SYM${reels.reel5[0]}%2CSYM${reels.reel5[1]}%2CSYM${reels.reel5[2]}`;
        return curReels;
    }

    private buildRandomReelsString(): string {
        const r1 = [this.randomInt(1, 12), this.randomInt(1, 12), this.randomInt(1, 12)];
        const r2 = [this.randomInt(1, 12), this.randomInt(1, 12), this.randomInt(1, 12)];
        const r3 = [this.randomInt(1, 12), this.randomInt(1, 12), this.randomInt(1, 12)];
        const r4 = [this.randomInt(1, 12), this.randomInt(1, 12), this.randomInt(1, 12)];
        const r5 = [this.randomInt(1, 12), this.randomInt(1, 12), this.randomInt(1, 12)];

        let curReels = `&rs.i0.r.i0.syms=SYM${r1[0]}%2CSYM${r1[1]}%2CSYM${r1[2]}`;
        curReels += `&rs.i0.r.i1.syms=SYM${r2[0]}%2CSYM${r2[1]}%2CSYM${r2[2]}`;
        curReels += `&rs.i0.r.i2.syms=SYM${r3[0]}%2CSYM${r3[1]}%2CSYM${r3[2]}`;
        curReels += `&rs.i0.r.i3.syms=SYM${r4[0]}%2CSYM${r4[1]}%2CSYM${r4[2]}`;
        curReels += `&rs.i0.r.i4.syms=SYM${r5[0]}%2CSYM${r5[1]}%2CSYM${r5[2]}`;
        return curReels;
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
            [2, 1, 1, 1, 2]
        ];
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
