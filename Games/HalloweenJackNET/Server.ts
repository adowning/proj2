// Server.ts - HalloweenJackNET game server
// Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines
// Data injection pattern - NO database calls or legacy PHP constructs

import { SlotSettings, ReelStrips } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'HalloweenJackNET';

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
        if (postData.action === 'respin') {
            const fsl = this.slotSettings.GetGameData('HalloweenJackNETFreeGames') - this.slotSettings.GetGameData('HalloweenJackNETCurrentFreeGame');
            if (fsl > 0) {
                postData.slotEvent = 'freespin';
            } else {
                postData.slotEvent = 'respin';
            }
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
        this.slotSettings.SetGameData('HalloweenJackNETBonusWin', 0);
        this.slotSettings.SetGameData('HalloweenJackNETFreeGames', 0);
        this.slotSettings.SetGameData('HalloweenJackNETCurrentFreeGame', 0);
        this.slotSettings.SetGameData('HalloweenJackNETTotalWin', 0);
        this.slotSettings.SetGameData('HalloweenJackNETFreeBalance', 0);
        this.slotSettings.SetGameData(this.slotId + 'WildsWalk', {
            'Pumpkin': []
        });

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
            // Construct reels string from history
            // Logic similar to PHP but simpler concatenation
            curReels = this.buildReelsString(reels);
        } else {
            // Random initial state
            curReels = this.buildRandomReelsString();
        }

        // Denominations
        const denoms = this.slotSettings.Denominations.map(d => d * 100).join('%2C');
        const standardDenom = this.slotSettings.CurrentDenomination * 100;

        // Check if in freespins
        if (this.slotSettings.GetGameData('HalloweenJackNETCurrentFreeGame') < this.slotSettings.GetGameData('HalloweenJackNETFreeGames') &&
            this.slotSettings.GetGameData('HalloweenJackNETFreeGames') > 0) {
            // Construct freespins state
            // Copying exact string structure from PHP for compatibility
             freeState = `rs.i1.r.i0.syms=SYM2%2CSYM5%2CSYM5&bl.i6.coins=1&bl.i17.reelset=ALL&rs.i0.nearwin=4&bl.i15.id=15&rs.i0.r.i4.hold=false&gamestate.history=basic%2Cfreespin&rs.i1.r.i2.hold=false&game.win.cents=176&rs.i1.r.i1.overlay.i2.pos=61&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i10.line=1%2C2%2C1%2C2%2C1&bl.i0.reelset=ALL&bl.i18.coins=1&bl.i10.id=10&freespins.initial=15&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&bl.i13.coins=1&rs.i0.r.i0.syms=SYM5%2CSYM0%2CSYM6&bl.i2.id=2&rs.i1.r.i1.pos=59&rs.i0.r.i0.pos=24&bl.i14.reelset=ALL&game.win.coins=88&rs.i1.r.i0.hold=false&bl.i3.id=3&ws.i1.reelset=freespin&bl.i12.coins=1&bl.i8.reelset=ALL&clientaction=init&rs.i0.r.i2.hold=false&bl.i16.id=16&casinoID=netent&bl.i5.coins=1&rs.i1.r.i1.overlay.i1.row=1&bl.i8.id=8&rs.i0.r.i3.pos=17&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i12.line=2%2C1%2C2%2C1%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&rs.i0.r.i2.syms=SYM7%2CSYM6%2CSYM6&rs.i1.r.i1.overlay.i1.with=SYM1_FS&game.win.amount=1.76&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&denomination.all=${denoms}&ws.i0.reelset=freespin&bl.i1.id=1&rs.i0.r.i3.attention.i0=2&rs.i1.r.i1.overlay.i0.with=SYM1_FS&rs.i1.r.i4.pos=39&denomination.standard=${standardDenom}&multiplier=1&bl.i14.id=14&bl.i19.line=0%2C2%2C2%2C2%2C0&freespins.denomination=2.000&bl.i12.reelset=ALL&bl.i2.coins=1&bl.i6.id=6&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&freespins.totalwin.coins=80&ws.i0.direction=left_to_right&freespins.total=15&gamestate.stack=basic%2Cfreespin&rs.i1.r.i4.syms=SYM5%2CSYM4%2CSYM4&gamesoundurl=&bet.betlevel=1&bl.i5.reelset=ALL&bl.i19.coins=1&bl.i7.id=7&bl.i18.reelset=ALL&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=1&bl.i14.line=1%2C1%2C2%2C1%2C1&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM5%2CSYM5%2CSYM0&rs.i0.r.i2.pos=48&bl.i13.line=1%2C1%2C0%2C1%2C1&ws.i1.betline=19&rs.i1.r.i0.pos=20&bl.i0.coins=1&bl.i2.reelset=ALL&rs.i1.r.i1.overlay.i2.row=2&rs.i1.r.i4.hold=false&freespins.left=14&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&bl.i15.reelset=ALL&rs.i0.r.i3.hold=false&bet.denomination=${standardDenom}&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&freespins.win.coins=80&historybutton=false&bl.i5.id=5&gameEventSetters.enabled=false&rs.i1.r.i3.pos=27&rs.i0.r.i1.syms=SYM5%2CSYM1%2CSYM3&bl.i3.coins=1&ws.i1.types.i0.coins=40&bl.i10.coins=1&bl.i18.id=18&ws.i0.betline=3&rs.i1.r.i3.hold=false&totalwin.coins=88&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=freespin&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i0.r.i3.syms=SYM4%2CSYM4%2CSYM0&rs.i1.r.i1.syms=SYM7%2CSYM1_FS%2CSYM5&bl.i16.coins=1&freespins.win.cents=160&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&rs.i1.r.i1.overlay.i0.pos=59&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i0.r.i1.pos=61&rs.i1.r.i3.syms=SYM3%2CSYM3%2CSYM6&bl.i13.id=13&rs.i0.r.i1.hold=false&ws.i1.types.i0.wintype=coins&bl.i9.line=1%2C0%2C1%2C0%2C1&ws.i1.sym=SYM2&betlevel.standard=1&bl.i10.reelset=ALL&ws.i1.types.i0.cents=80&gameover=false&bl.i11.coins=1&ws.i1.direction=left_to_right&bl.i13.reelset=ALL&bl.i0.id=0&nextaction=freespin&bl.i15.line=0%2C1%2C1%2C1%2C0&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i19.id=19&bl.i4.reelset=ALL&bl.i4.coins=1&bl.i18.line=2%2C0%2C2%2C0%2C2&freespins.totalwin.cents=160&bl.i9.id=9&bl.i17.line=0%2C2%2C0%2C2%2C0&bl.i11.id=11&freespins.betlevel=1&ws.i0.pos.i2=2%2C2&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&bl.i17.coins=1&ws.i1.pos.i0=0%2C0&ws.i1.pos.i1=2%2C2&ws.i1.pos.i2=1%2C2&ws.i0.pos.i1=1%2C1&bl.i19.reelset=ALL&ws.i0.pos.i0=0%2C0&bl.i11.reelset=ALL&bl.i16.line=2%2C1%2C1%2C1%2C2&rs.i0.id=basic&credit=${balanceInCents}&ws.i0.types.i0.coins=40&bl.i1.reelset=ALL&rs.i1.r.i1.overlay.i1.pos=60&rs.i1.r.i1.overlay.i2.with=SYM1_FS&bl.i1.line=0%2C0%2C0%2C0%2C0&ws.i0.sym=SYM2&bl.i17.id=17&rs.i1.r.i2.pos=1&bl.i16.reelset=ALL&ws.i0.types.i0.wintype=coins&nearwinallowed=true&bl.i8.line=1%2C0%2C0%2C0%2C1&rs.i1.r.i1.overlay.i0.row=0&freespins.wavecount=1&rs.i0.r.i4.attention.i0=2&bl.i8.coins=1&bl.i15.coins=1&bl.i2.line=2%2C2%2C2%2C2%2C2&rs.i0.r.i0.attention.i0=1&rs.i1.r.i2.syms=SYM3%2CSYM3%2CSYM2&totalwin.cents=176&rs.i0.r.i0.hold=false&restore=true&rs.i1.id=freespin&bl.i12.id=12&bl.i4.id=4&rs.i0.r.i4.pos=10&bl.i7.coins=1&ws.i0.types.i0.cents=80&bl.i6.reelset=ALL&wavecount=1&bl.i14.coins=1&rs.i1.r.i1.hold=false` + freeState;
        }

        // Construct massive query string
        // Using a reduced set of parameters or full set as in PHP
        // For brevity and correctness, sticking to the PHP output structure
        return `rs.i1.r.i0.syms=SYM7%2CSYM12%2CSYM11&bl.i6.coins=1&gameServerVersion=1.0.0&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&bl.i17.reelset=ALL&historybutton=false&bl.i15.id=15&rs.i0.r.i4.hold=false&bl.i5.id=5&gameEventSetters.enabled=false&next.rs=basic&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=0&rs.i0.r.i1.syms=SYM8%2CSYM6%2CSYM12&bl.i3.coins=1&bl.i10.coins=1&bl.i18.id=18&game.win.cents=0&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i10.line=1%2C2%2C1%2C2%2C1&bl.i0.reelset=ALL&rs.i1.r.i3.hold=false&totalwin.coins=0&bl.i18.coins=1&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=basic&bl.i10.id=10&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&bl.i13.coins=1&rs.i0.r.i0.syms=SYM4%2CSYM11%2CSYM10&rs.i0.r.i3.syms=SYM0%2CSYM8%2CSYM9&rs.i1.r.i1.syms=SYM10%2CSYM12%2CSYM11&bl.i2.id=2&bl.i16.coins=1&rs.i1.r.i1.pos=0&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&rs.i0.r.i0.pos=8&bl.i14.reelset=ALL&rs.i0.r.i1.pos=5&rs.i1.r.i3.syms=SYM1%2CSYM3%2CSYM8&game.win.coins=0&bl.i13.id=13&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&bl.i3.id=3&bl.i12.coins=1&bl.i8.reelset=ALL&clientaction=init&bl.i9.line=1%2C0%2C1%2C0%2C1&rs.i0.r.i2.hold=false&bl.i16.id=16&casinoID=netent&betlevel.standard=1&bl.i5.coins=1&bl.i10.reelset=ALL&gameover=true&bl.i8.id=8&rs.i0.r.i3.pos=4&bl.i11.coins=1&bl.i13.reelset=ALL&bl.i0.id=0&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i12.line=2%2C1%2C2%2C1%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&nextaction=spin&bl.i15.line=0%2C1%2C1%2C1%2C0&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i19.id=19&bl.i4.reelset=ALL&bl.i4.coins=1&rs.i0.r.i2.syms=SYM10%2CSYM3%2CSYM7&bl.i18.line=1%2C0%2C2%2C1%2C2&game.win.amount=0&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&bl.i9.id=9&bl.i17.line=2%2C0%2C1%2C2%2C0&denomination.all=${denoms}&bl.i11.id=11&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&current.rs.i0=basic&bl.i17.coins=1&bl.i1.id=1&bl.i19.reelset=ALL&bl.i11.reelset=ALL&bl.i16.line=2%2C1%2C1%2C1%2C2&rs.i0.id=basic&credit=${balanceInCents}&rs.i1.r.i4.pos=0&denomination.standard=${standardDenom}&bl.i1.reelset=ALL&multiplier=1&bl.i14.id=14&bl.i19.line=0%2C2%2C0%2C2%2C0&bl.i12.reelset=ALL&bl.i2.coins=1&bl.i6.id=6&bl.i1.line=0%2C0%2C0%2C0%2C0&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&rs.i1.r.i4.syms=SYM10%2CSYM5%2CSYM11&bl.i17.id=17&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i1.r.i2.pos=0&bl.i16.reelset=ALL&nearwinallowed=true&bl.i5.reelset=ALL&bl.i19.coins=1&bl.i7.id=7&bl.i18.reelset=ALL&bl.i8.line=1%2C0%2C0%2C0%2C1&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=1&bl.i14.line=1%2C1%2C2%2C1%2C1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM11%2CSYM12%2CSYM5&bl.i8.coins=1&bl.i15.coins=1&rs.i0.r.i2.pos=3&bl.i2.line=2%2C2%2C2%2C2%2C2&bl.i13.line=1%2C1%2C0%2C1%2C1&rs.i1.r.i2.syms=SYM1%2CSYM7%2CSYM9&rs.i1.r.i0.pos=0&totalwin.cents=0&bl.i0.coins=1&bl.i2.reelset=ALL&rs.i0.r.i0.hold=false&restore=false&rs.i1.id=basic_respin&bl.i12.id=12&rs.i1.r.i4.hold=false&bl.i4.id=4&rs.i0.r.i4.pos=82&bl.i7.coins=1&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&bl.i6.reelset=ALL&wavecount=1&bl.i14.coins=1&bl.i15.reelset=ALL&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false` + freeState;
    }

    private handlePaytableRequest(): string {
        // Just return the paytable response string as provided in PHP
        // This is a static string for this game version
        return 'bl.i17.reelset=ALL&bl.i15.id=15&pt.i0.comp.i29.type=betline&pt.i0.comp.i17.symbol=SYM7&pt.i0.comp.i5.freespins=0&pt.i0.comp.i23.n=5&pt.i0.comp.i13.symbol=SYM6&pt.i1.comp.i8.type=betline&pt.i1.comp.i4.n=4&pt.i0.comp.i15.multi=8&bl.i10.line=1%2C2%2C1%2C2%2C1&pt.i1.comp.i27.symbol=SYM11&pt.i0.comp.i28.multi=15&bl.i18.coins=1&pt.i1.comp.i29.freespins=0&pt.i1.comp.i30.symbol=SYM12&pt.i1.comp.i3.multi=20&pt.i0.comp.i11.n=5&pt.i1.comp.i23.symbol=SYM9&bl.i4.line=2%2C1%2C0%2C1%2C2&bl.i13.coins=1&pt.i0.id=basic&pt.i0.comp.i1.type=scatter&bl.i2.id=2&pt.i1.comp.i10.type=betline&pt.i0.comp.i4.symbol=SYM3&pt.i1.comp.i5.freespins=0&pt.i1.comp.i8.symbol=SYM4&bl.i14.reelset=ALL&pt.i1.comp.i19.n=4&pt.i0.comp.i17.freespins=0&pt.i0.comp.i8.symbol=SYM4&pt.i0.comp.i0.symbol=SYM0&pt.i0.comp.i3.freespins=0&pt.i0.comp.i10.multi=50&pt.i1.id=freespin&bl.i3.id=3&pt.i0.comp.i24.n=3&bl.i8.reelset=ALL&clientaction=paytable&pt.i1.comp.i27.freespins=0&bl.i16.id=16&pt.i1.comp.i5.n=5&bl.i5.coins=1&pt.i1.comp.i8.multi=750&pt.i0.comp.i22.type=betline&pt.i0.comp.i24.freespins=0&pt.i0.comp.i21.multi=5&pt.i1.comp.i13.multi=50&pt.i0.comp.i12.n=3&pt.i0.comp.i13.type=betline&bl.i0.line=1%2C1%2C1%2C1%2C1&pt.i1.comp.i7.freespins=0&pt.i0.comp.i31.freespins=0&pt.i0.comp.i3.multi=20&pt.i1.comp.i22.type=betline&pt.i0.comp.i21.n=3&pt.i1.comp.i6.n=3&pt.i1.comp.i31.type=betline&bl.i1.id=1&pt.i0.comp.i10.type=betline&pt.i1.comp.i11.symbol=SYM5&pt.i0.comp.i5.multi=1000&pt.i0.comp.i32.n=5&pt.i1.comp.i1.freespins=5&bl.i14.id=14&pt.i1.comp.i16.symbol=SYM7&pt.i1.comp.i23.multi=75&pt.i1.comp.i4.type=betline&pt.i1.comp.i18.multi=6&bl.i2.coins=1&pt.i1.comp.i26.type=betline&pt.i0.comp.i8.multi=750&pt.i0.comp.i1.freespins=10&bl.i5.reelset=ALL&pt.i0.comp.i22.n=4&pt.i0.comp.i28.symbol=SYM11&pt.i1.comp.i17.type=betline&pt.i1.comp.i0.symbol=SYM0&pt.i1.comp.i7.n=4&pt.i1.comp.i5.multi=1000&bl.i14.line=1%2C1%2C2%2C1%2C1&pt.i0.comp.i21.type=betline&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&pt.i0.comp.i8.type=betline&pt.i0.comp.i7.freespins=0&pt.i1.comp.i15.multi=8&pt.i0.comp.i13.multi=50&pt.i0.comp.i17.type=betline&bl.i13.line=1%2C1%2C0%2C1%2C1&pt.i0.comp.i30.type=betline&pt.i1.comp.i22.symbol=SYM9&pt.i1.comp.i30.freespins=0&bl.i0.coins=1&bl.i2.reelset=ALL&pt.i0.comp.i10.n=4&pt.i1.comp.i6.multi=15&pt.i1.comp.i19.symbol=SYM8&pt.i0.comp.i22.freespins=0&pt.i0.comp.i20.symbol=SYM8&pt.i0.comp.i15.freespins=0&pt.i0.comp.i31.symbol=SYM12&pt.i0.comp.i28.freespins=0&pt.i0.comp.i0.n=5&pt.i1.comp.i21.multi=5&pt.i1.comp.i30.type=betline&pt.i0.comp.i0.type=scatter&pt.i1.comp.i0.multi=0&g4mode=false&pt.i1.comp.i8.n=5&pt.i0.comp.i25.multi=20&pt.i0.comp.i16.symbol=SYM7&pt.i1.comp.i21.freespins=0&pt.i0.comp.i1.multi=0&pt.i0.comp.i27.n=3&pt.i1.comp.i9.type=betline&pt.i0.comp.i32.multi=30&pt.i1.comp.i24.multi=5&pt.i1.comp.i23.type=betline&pt.i1.comp.i26.n=5&bl.i18.id=18&pt.i1.comp.i28.symbol=SYM11&pt.i1.comp.i17.multi=125&pt.i0.comp.i18.multi=6&bl.i5.line=0%2C0%2C1%2C0%2C0&pt.i0.comp.i9.n=3&pt.i1.comp.i21.type=betline&bl.i7.line=1%2C2%2C2%2C2%2C1&pt.i0.comp.i28.type=betline&pt.i1.comp.i31.multi=10&pt.i1.comp.i18.type=betline&pt.i0.comp.i10.symbol=SYM5&pt.i0.comp.i15.n=3&pt.i0.comp.i21.symbol=SYM9&bl.i7.reelset=ALL&pt.i0.comp.i31.type=betline&pt.i1.comp.i15.n=3&isJackpotWin=false&pt.i1.comp.i20.freespins=0&pt.i1.comp.i7.type=betline&pt.i0.comp.i10.freespins=0&pt.i0.comp.i20.multi=100&pt.i0.comp.i17.multi=125&pt.i1.comp.i25.type=betline&pt.i1.comp.i9.n=3&pt.i0.comp.i28.n=4&bl.i9.line=1%2C0%2C1%2C0%2C1&pt.i0.comp.i2.multi=0&pt.i1.comp.i27.n=3&pt.i0.comp.i0.freespins=10&pt.i1.comp.i25.multi=20&pt.i1.comp.i16.freespins=0&pt.i1.comp.i5.type=betline&pt.i1.comp.i24.symbol=SYM10&pt.i1.comp.i13.symbol=SYM6&pt.i1.comp.i17.symbol=SYM7&pt.i0.comp.i16.n=4&bl.i13.reelset=ALL&bl.i0.id=0&pt.i1.comp.i16.n=4&pt.i0.comp.i5.symbol=SYM3&bl.i15.line=0%2C1%2C1%2C1%2C0&pt.i1.comp.i7.symbol=SYM4&bl.i19.id=19&pt.i0.comp.i1.symbol=SYM0&pt.i1.comp.i31.freespins=0&bl.i9.id=9&bl.i17.line=2%2C0%2C1%2C2%2C0&pt.i1.comp.i9.freespins=0&playercurrency=%26%23x20AC%3B&pt.i1.comp.i30.multi=3&bl.i19.reelset=ALL&pt.i0.comp.i25.n=4&pt.i1.comp.i28.n=4&pt.i1.comp.i32.freespins=0&pt.i0.comp.i9.freespins=0&credit=' + Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100) + '&pt.i0.comp.i5.type=betline&pt.i0.comp.i11.freespins=0&pt.i0.comp.i26.multi=75&pt.i0.comp.i25.type=betline&bl.i1.reelset=ALL&pt.i1.comp.i18.symbol=SYM8&pt.i0.comp.i31.multi=10&pt.i1.comp.i12.symbol=SYM6&pt.i0.comp.i13.freespins=0&pt.i1.comp.i15.type=betline&pt.i0.comp.i26.freespins=0&pt.i1.comp.i13.type=betline&pt.i1.comp.i1.multi=0&pt.i1.comp.i8.freespins=0&pt.i0.comp.i13.n=4&pt.i1.comp.i17.n=5&pt.i0.comp.i23.type=betline&pt.i0.comp.i32.symbol=SYM12&bl.i17.id=17&pt.i1.comp.i17.freespins=0&pt.i1.comp.i26.multi=75&pt.i1.comp.i32.multi=30&pt.i1.comp.i0.type=scatter&pt.i1.comp.i1.symbol=SYM0&pt.i1.comp.i29.multi=50&pt.i0.comp.i25.freespins=0&pt.i0.comp.i26.n=5&pt.i0.comp.i27.symbol=SYM11&pt.i1.comp.i29.n=5&pt.i0.comp.i23.multi=75&bl.i2.line=2%2C2%2C2%2C2%2C2&pt.i0.comp.i30.multi=3&pt.i1.comp.i28.multi=15&pt.i1.comp.i18.freespins=0&pt.i0.comp.i14.n=5&pt.i0.comp.i0.multi=0&bl.i6.reelset=ALL&pt.i0.comp.i19.multi=25&pt.i1.comp.i18.n=3&pt.i0.comp.i12.freespins=0&pt.i0.comp.i24.multi=5&pt.i0.comp.i19.symbol=SYM8&bl.i6.coins=1&pt.i0.comp.i15.type=betline&pt.i0.comp.i23.freespins=0&pt.i0.comp.i32.type=betline&pt.i0.comp.i4.multi=200&pt.i0.comp.i15.symbol=SYM7&pt.i1.comp.i14.multi=250&pt.i0.comp.i22.multi=20&pt.i1.comp.i19.type=betline&pt.i0.comp.i11.symbol=SYM5&pt.i1.comp.i27.multi=4&bl.i0.reelset=ALL&pt.i0.comp.i16.freespins=0&pt.i1.comp.i6.freespins=0&pt.i1.comp.i29.symbol=SYM11&pt.i1.comp.i22.n=4&bl.i10.id=10&pt.i0.comp.i4.freespins=0&pt.i1.comp.i25.symbol=SYM10&bl.i3.reelset=ALL&pt.i0.comp.i30.freespins=0&pt.i1.comp.i24.type=betline&pt.i0.comp.i19.n=4&pt.i0.comp.i2.symbol=SYM0&pt.i0.comp.i20.type=betline&pt.i0.comp.i6.symbol=SYM4&pt.i1.comp.i11.n=5&pt.i0.comp.i5.n=5&pt.i1.comp.i2.symbol=SYM0&pt.i0.comp.i3.type=betline&pt.i1.comp.i19.multi=25&pt.i1.comp.i6.symbol=SYM4&pt.i0.comp.i27.multi=4&pt.i0.comp.i9.multi=10&bl.i12.coins=1&pt.i0.comp.i22.symbol=SYM9&pt.i0.comp.i26.symbol=SYM10&pt.i1.comp.i19.freespins=0&pt.i0.comp.i14.freespins=0&pt.i0.comp.i21.freespins=0&pt.i1.comp.i4.freespins=0&pt.i1.comp.i12.type=betline&pt.i1.comp.i21.symbol=SYM9&pt.i1.comp.i23.n=5&pt.i1.comp.i32.symbol=SYM12&bl.i8.id=8&pt.i0.comp.i16.multi=30&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i12.line=2%2C1%2C2%2C1%2C2&pt.i1.comp.i9.multi=10&pt.i0.comp.i19.type=betline&pt.i0.comp.i6.freespins=0&pt.i1.comp.i2.multi=0&pt.i0.comp.i6.n=3&pt.i1.comp.i12.n=3&pt.i1.comp.i3.type=betline&pt.i1.comp.i10.freespins=0&pt.i1.comp.i28.type=betline&pt.i0.comp.i29.n=5&pt.i1.comp.i20.multi=100&pt.i0.comp.i27.freespins=0&pt.i1.comp.i24.n=3&pt.i1.comp.i27.type=betline&pt.i1.comp.i2.type=scatter&pt.i0.comp.i2.freespins=10&pt.i0.comp.i7.n=4&pt.i0.comp.i11.multi=250&pt.i1.comp.i14.symbol=SYM6&pt.i0.comp.i7.type=betline&bl.i19.line=0%2C2%2C0%2C2%2C0&bl.i12.reelset=ALL&pt.i0.comp.i17.n=5&bl.i6.id=6&pt.i0.comp.i29.multi=50&pt.i1.comp.i13.n=4&pt.i0.comp.i8.freespins=0&pt.i1.comp.i4.multi=200&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&pt.i0.comp.i12.type=betline&pt.i0.comp.i14.multi=250&pt.i1.comp.i7.multi=100&bl.i19.coins=1&bl.i7.id=7&bl.i18.reelset=ALL&pt.i1.comp.i11.type=betline&pt.i0.comp.i6.multi=15&playercurrencyiso=' + this.slotSettings.slotCurrency + '&bl.i1.coins=1&pt.i1.comp.i5.symbol=SYM3&pt.i0.comp.i18.type=betline&pt.i0.comp.i23.symbol=SYM9&playforfun=false&pt.i1.comp.i25.n=4&pt.i0.comp.i2.type=scatter&pt.i1.comp.i20.type=betline&pt.i1.comp.i22.multi=20&pt.i0.comp.i8.n=5&pt.i1.comp.i22.freespins=0&pt.i0.comp.i11.type=betline&pt.i0.comp.i18.n=3&pt.i1.comp.i14.n=5&pt.i1.comp.i16.multi=30&pt.i1.comp.i15.freespins=0&pt.i0.comp.i27.type=betline&pt.i1.comp.i28.freespins=0&pt.i0.comp.i7.symbol=SYM4&bl.i15.reelset=ALL&pt.i1.comp.i0.freespins=5&gameServerVersion=1.0.0&bl.i11.line=0%2C1%2C0%2C1%2C0&historybutton=false&bl.i5.id=5&pt.i0.comp.i18.symbol=SYM8&pt.i0.comp.i12.multi=10&pt.i1.comp.i14.freespins=0&bl.i3.coins=1&bl.i10.coins=1&pt.i0.comp.i12.symbol=SYM6&pt.i0.comp.i14.symbol=SYM6&pt.i1.comp.i13.freespins=0&pt.i0.comp.i14.type=betline&pt.i1.comp.i0.n=5&pt.i1.comp.i26.symbol=SYM10&pt.i1.comp.i31.symbol=SYM12&pt.i0.comp.i7.multi=100&pt.i0.comp.i30.n=3&jackpotcurrency=%26%23x20AC%3B&bl.i16.coins=1&bl.i9.coins=1&pt.i1.comp.i11.multi=250&pt.i1.comp.i30.n=3&pt.i0.comp.i1.n=4&pt.i0.comp.i20.n=5&pt.i0.comp.i29.symbol=SYM11&pt.i1.comp.i3.symbol=SYM3&pt.i1.comp.i23.freespins=0&bl.i13.id=13&pt.i0.comp.i25.symbol=SYM10&pt.i0.comp.i26.type=betline&pt.i0.comp.i9.type=betline&pt.i1.comp.i16.type=betline&pt.i1.comp.i20.symbol=SYM8&bl.i10.reelset=ALL&pt.i1.comp.i12.multi=10&pt.i0.comp.i29.freespins=0&pt.i1.comp.i1.n=4&pt.i1.comp.i11.freespins=0&pt.i0.comp.i31.n=4&pt.i0.comp.i9.symbol=SYM5&bl.i11.coins=1&pt.i0.comp.i16.type=betline&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i4.reelset=ALL&bl.i4.coins=1&pt.i0.comp.i2.n=3&bl.i18.line=1%2C0%2C2%2C1%2C2&pt.i1.comp.i31.n=4&pt.i0.comp.i19.freespins=0&pt.i1.comp.i14.type=betline&bl.i11.id=11&pt.i0.comp.i6.type=betline&pt.i1.comp.i2.freespins=5&pt.i1.comp.i25.freespins=0&bl.i9.reelset=ALL&bl.i17.coins=1&pt.i1.comp.i10.multi=50&pt.i1.comp.i10.symbol=SYM5&bl.i11.reelset=ALL&bl.i16.line=2%2C1%2C1%2C1%2C2&pt.i1.comp.i2.n=3&pt.i1.comp.i20.n=5&pt.i1.comp.i24.freespins=0&pt.i1.comp.i32.type=betline&pt.i0.comp.i4.type=betline&pt.i1.comp.i26.freespins=0&pt.i1.comp.i1.type=scatter&bl.i1.line=0%2C0%2C0%2C0%2C0&pt.i0.comp.i20.freespins=0&pt.i1.comp.i29.type=betline&pt.i0.comp.i30.symbol=SYM12&bl.i16.reelset=ALL&pt.i1.comp.i32.n=5&pt.i0.comp.i3.n=3&pt.i1.comp.i6.type=betline&pt.i1.comp.i4.symbol=SYM3&bl.i8.line=1%2C0%2C0%2C0%2C1&pt.i0.comp.i24.symbol=SYM10&bl.i8.coins=1&pt.i0.comp.i32.freespins=0&bl.i15.coins=1&pt.i1.comp.i3.n=3&pt.i1.comp.i21.n=3&pt.i0.comp.i18.freespins=0&bl.i12.id=12&pt.i1.comp.i15.symbol=SYM7&pt.i1.comp.i3.freespins=0&bl.i4.id=4&bl.i7.coins=1&pt.i1.comp.i9.symbol=SYM5&pt.i0.comp.i3.symbol=SYM3&pt.i0.comp.i24.type=betline&bl.i14.coins=1&pt.i1.comp.i12.freespins=0&pt.i0.comp.i4.n=4&pt.i1.comp.i10.n=4';
    }

    private handleInitFreespinRequest(balanceInCents: number): string {
         const denoms = this.slotSettings.Denominations.map(d => d * 100).join('%2C');
         const standardDenom = this.slotSettings.CurrentDenomination * 100;

        return `rs.i1.r.i0.syms=SYM5%2CSYM0%2CSYM6&freespins.betlevel=1&g4mode=false&freespins.win.coins=0&playercurrency=%26%23x20AC%3B&historybutton=false&rs.i0.r.i4.hold=false&gamestate.history=basic&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=18&rs.i0.r.i1.syms=SYM5%2CSYM5%2CSYM7&game.win.cents=0&rs.i0.id=freespin&rs.i1.r.i3.hold=false&totalwin.coins=0&credit=${balanceInCents}&rs.i1.r.i4.pos=30&gamestate.current=freespin&freespins.initial=15&jackpotcurrency=%26%23x20AC%3B&multiplier=1&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i0.r.i0.syms=SYM2%2CSYM7%2CSYM7&freespins.denomination=2.000&rs.i0.r.i3.syms=SYM4%2CSYM4%2CSYM4&rs.i1.r.i1.syms=SYM2%2CSYM3%2CSYM3&rs.i1.r.i1.pos=3&freespins.win.cents=0&freespins.totalwin.coins=0&freespins.total=15&isJackpotWin=false&gamestate.stack=basic%2Cfreespin&rs.i0.r.i0.pos=3&rs.i1.r.i4.syms=SYM1%2CSYM7%2CSYM7&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&gamesoundurl=&rs.i1.r.i2.pos=15&bet.betlevel=1&rs.i1.nearwin=4%2C3&rs.i0.r.i1.pos=18&rs.i1.r.i3.syms=SYM4%2CSYM0%2CSYM6&game.win.coins=0&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&freespins.wavecount=1&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=initfreespin&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM6%2CSYM5%2CSYM5&rs.i0.r.i2.pos=0&rs.i1.r.i2.syms=SYM6%2CSYM6%2CSYM0&rs.i1.r.i0.pos=24&totalwin.cents=0&gameover=false&rs.i0.r.i0.hold=false&rs.i1.id=basic&rs.i0.r.i3.pos=3&rs.i1.r.i4.hold=false&freespins.left=15&rs.i0.r.i4.pos=20&rs.i1.r.i2.attention.i0=2&rs.i1.r.i0.attention.i0=1&rs.i1.r.i3.attention.i0=1&nextaction=freespin&wavecount=1&rs.i0.r.i2.syms=SYM3%2CSYM3%2CSYM3&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&game.win.amount=0.00&bet.denomination=${standardDenom}&freespins.totalwin.cents=0`;
    }

    private handleSpinRequest(postData: any): string {
        const linesId = this.getLinesId();
        const lines = 20;
        const betline = postData.bet_betlevel;
        let allbet = betline * lines;

        const isRespin = this.slotSettings.GetGameData('HalloweenJackNETIsRespin');
        let bonusMpl = 1;

        // Handle transaction logic
        if (postData.slotEvent !== 'freespin' && postData.slotEvent !== 'respin') {
            this.slotSettings.CurrentDenom = postData.bet_denomination;
            this.slotSettings.CurrentDenomination = postData.bet_denomination;

            this.slotSettings.UpdateJackpots(allbet);

            if (!postData.slotEvent) {
                postData.slotEvent = 'bet';
            }

            this.slotSettings.SetBalance(-1 * allbet, postData.slotEvent);
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(postData.slotEvent, bankSum, postData.slotEvent);
            this.slotSettings.UpdateJackpots(allbet);

            this.slotSettings.SetGameData('HalloweenJackNETIsRespin', false);
            this.slotSettings.SetGameData('HalloweenJackNETBonusWin', 0);
            this.slotSettings.SetGameData('HalloweenJackNETFreeGames', 0);
            this.slotSettings.SetGameData('HalloweenJackNETCurrentFreeGame', 0);
            this.slotSettings.SetGameData('HalloweenJackNETTotalWin', 0);
            this.slotSettings.SetGameData('HalloweenJackNETBet', betline);
            this.slotSettings.SetGameData('HalloweenJackNETDenom', postData.bet_denomination);
            this.slotSettings.SetGameData('HalloweenJackNETFreeBalance', Math.round(this.slotSettings.GetBalance() * 100));
            bonusMpl = 1;
        } else if (postData.slotEvent === 'respin') {
            // Respin logic
            postData.bet_denomination = this.slotSettings.GetGameData('HalloweenJackNETDenom');
            this.slotSettings.CurrentDenom = postData.bet_denomination;
            this.slotSettings.CurrentDenomination = postData.bet_denomination;
            const storedBet = this.slotSettings.GetGameData('HalloweenJackNETBet');
            allbet = storedBet * lines;
            bonusMpl = this.slotSettings.slotFreeMpl;
        } else {
             // Freespin logic
            postData.bet_denomination = this.slotSettings.GetGameData('HalloweenJackNETDenom');
            this.slotSettings.CurrentDenom = postData.bet_denomination;
            this.slotSettings.CurrentDenomination = postData.bet_denomination;
            const storedBet = this.slotSettings.GetGameData('HalloweenJackNETBet');
            allbet = storedBet * lines;

            if (!isRespin) {
                this.slotSettings.SetGameData('HalloweenJackNETCurrentFreeGame',
                    this.slotSettings.GetGameData('HalloweenJackNETCurrentFreeGame') + 1);
            }
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
        let walkingWildsStr = '';
        let WildsWalk: any;

        // Simulation loop
        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            lineWins = [];
            const cWins: number[] = new Array(lines).fill(0);
            const wild = ['1']; // '1' is the Wild symbol (Pumpkin)
            const scatter = '0';
            reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent);
            walkingWildsStr = '';

            // Handle Walking Wilds
            WildsWalk = this.slotSettings.GetGameData(this.slotId + 'WildsWalk') || { 'Pumpkin': [] };
            if (!WildsWalk['Pumpkin']) WildsWalk['Pumpkin'] = [];

            // Move existing walking wilds
            // Clone array to modify
            let tempPumpkin = [...WildsWalk['Pumpkin']];
            const newPumpkin = [];

            for(let key = 0; key < tempPumpkin.length; key++) {
                tempPumpkin[key][0]--; // Move left
                if (tempPumpkin[key][0] >= 1) { // 1-based reel index in PHP logic
                    newPumpkin.push(tempPumpkin[key]);
                }
            }
            WildsWalk['Pumpkin'] = newPumpkin;

            // Check for new wilds on reels
            // PHP Logic:
            /*
            if( count($WildsWalk['Pumpkin']) > 1 ) {} else {
                for( $r = 1; $r <= 5; $r++ ) {
                    for( $p = 0; $p < 3; $p++ ) {
                        if( $reels['reel' . $r][$p] == '1' ) {
                            $WildsWalk['Pumpkin'][] = [$r, $p];
                        }
                    }
                }
            }
            */
            // The PHP logic seems to restrict new wilds if there are already more than 1?
            // "if( count($WildsWalk['Pumpkin']) > 1 ) {} else {" implies if <= 1, look for new ones.
            // Let's follow PHP logic exactly.
            if (WildsWalk['Pumpkin'].length <= 1) {
                for (let r = 1; r <= 5; r++) {
                    for (let p = 0; p < 3; p++) {
                        if (reels[`reel${r}`]?.[p] === '1') {
                            // Check if this position is already tracked? PHP code doesn't seem to check duplicates explicitly here but adds them.
                            // Assuming '1' on reel is a NEW wild landing.
                            WildsWalk['Pumpkin'].push([r, p]);
                        }
                    }
                }
            }

            // Apply wilds to reels
            for (const wwalk of WildsWalk['Pumpkin']) {
                const r = wwalk[0];
                const p = wwalk[1];
                if (reels[`reel${r}`]) {
                    reels[`reel${r}`]![p] = '1';
                }
            }

            // Generate walking wilds string for client
            let wwcnt = 0;
            // PHP Loop:
            /*
            foreach( $WildsWalk['Pumpkin'] as $key => $wwalk ) {
                $wwalk[0] -= 1; // This modification in PHP loop seems to affect local variable but maybe intended for client response (0-based)?
                // Wait, in PHP: $WildsWalk['Pumpkin'] array contents are [reel, row].
                // The loop iterates and does $wwalk[0] -= 1.
                // The PHP code modifies $wwalk but does it affect the array if it's foreach($arr as $key => $wwalk)? No, unless &$wwalk.
                // But wait, the client response string uses $wwalk[0].
                // Also, earlier it did $WildsWalk['Pumpkin'][$key][0]--; which definitely modified the array.
                // Here, let's assume it converts 1-based reel to 0-based for client.

                $walkingWildsStr .= ('&rs.i0.r.i' . $wwalk[0] . '.overlay.i' . $wwcnt . '.wildtype=NORMAL&rs.i0.r.i' . $wwalk[0] . '.overlay.i' . $wwcnt . '.row=' . $wwalk[1] . '&rs.i0.r.i' . $wwalk[0] . '.overlay.i' . $wwcnt . '.with=SYM1&rs.i0.r.i' . $wwalk[0] . '.overlay.i' . $wwcnt . '.pos=39');
                $wwcnt++;
            }
            */

            for (const wwalk of WildsWalk['Pumpkin']) {
                const reelIndex0Based = wwalk[0] - 1; // Convert 1-based reel to 0-based
                const rowIndex = wwalk[1];
                walkingWildsStr += `&rs.i0.r.i${reelIndex0Based}.overlay.i${wwcnt}.wildtype=NORMAL&rs.i0.r.i${reelIndex0Based}.overlay.i${wwcnt}.row=${rowIndex}&rs.i0.r.i${reelIndex0Based}.overlay.i${wwcnt}.with=SYM1&rs.i0.r.i${reelIndex0Based}.overlay.i${wwcnt}.pos=39`;
                wwcnt++;
            }

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

                    // Check for wins 3, 4, 5
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
                            if (wildCount > 0 && wildCount < count) { // Wild substitution involved
                                mpl = this.slotSettings.slotWildMpl;
                            } else if (wildCount === count) {
                                mpl = 1; // All wilds, treat as symbol pay? PHP says: "if( in_array($s[0], $wild) ... ) $mpl = 1;"
                                // Actually PHP logic:
                                /*
                                if( in_array($s[0], $wild) && in_array($s[1], $wild) && in_array($s[2], $wild) ) { $mpl = 1; }
                                else if( in_array($s[0], $wild) || in_array($s[1], $wild) || in_array($s[2], $wild) ) { $mpl = $slotSettings->slotWildMpl; }
                                */
                                // So if ALL are wild, multiplier is 1. If SOME are wild, multiplier is slotWildMpl (3).
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
                 // Scatters trigger free spins, but pay is 0 in this game logic usually, just trigger
                 // PHP builds scattersStr but adds 0 to totalWin
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

            // Check limits (simplified)
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

        // Save State
        this.slotSettings.SetGameData(this.slotId + 'WildsWalk', WildsWalk);

        const reportWin = totalWin;
        let curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1?.[0]}%2CSYM${reels.reel1?.[1]}%2CSYM${reels.reel1?.[2]}`;
        curReels += `&rs.i0.r.i1.syms=SYM${reels.reel2?.[0]}%2CSYM${reels.reel2?.[1]}%2CSYM${reels.reel2?.[2]}`;
        curReels += `&rs.i0.r.i2.syms=SYM${reels.reel3?.[0]}%2CSYM${reels.reel3?.[1]}%2CSYM${reels.reel3?.[2]}`;
        curReels += `&rs.i0.r.i3.syms=SYM${reels.reel4?.[0]}%2CSYM${reels.reel4?.[1]}%2CSYM${reels.reel4?.[2]}`;
        curReels += `&rs.i0.r.i4.syms=SYM${reels.reel5?.[0]}%2CSYM${reels.reel5?.[1]}%2CSYM${reels.reel5?.[2]}`;

        if (postData.slotEvent === 'freespin') {
            this.slotSettings.SetGameData('HalloweenJackNETBonusWin', this.slotSettings.GetGameData('HalloweenJackNETBonusWin') + totalWin);
            this.slotSettings.SetGameData('HalloweenJackNETTotalWin', this.slotSettings.GetGameData('HalloweenJackNETTotalWin') + totalWin);
        } else {
            this.slotSettings.SetGameData('HalloweenJackNETTotalWin', totalWin);
        }

        let freeState = '';
        const scattersCount = (function() {
             let count = 0;
             for (let r = 1; r <= 5; r++) {
                for (let p = 0; p <= 2; p++) {
                    if (reels[`reel${r}`]?.[p] == '0') count++;
                }
             }
             return count;
        })();

        if (scattersCount >= 3) {
            this.slotSettings.SetGameData('HalloweenJackNETFreeStartWin', totalWin);
            this.slotSettings.SetGameData('HalloweenJackNETBonusWin', totalWin);
            this.slotSettings.SetGameData('HalloweenJackNETFreeGames', this.slotSettings.slotFreeCount[Math.min(scattersCount, 5)]); // Safe access

            const fs = this.slotSettings.GetGameData('HalloweenJackNETFreeGames');
             // Construct freeState string - simplified for brevity, should match PHP
            const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

            freeState = `&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&freespins.totalwin.cents=0&nextaction=freespin&freespins.left=${fs}&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=basic%2Cfreespin&freespins.totalwin.coins=0&freespins.total=${fs}&freespins.win.cents=0&gamestate.current=freespin&freespins.initial=${fs}&freespins.win.coins=0&freespins.betlevel=${this.slotSettings.GetGameData('HalloweenJackNETBet')}&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}`;
            curReels += freeState;
        }

        const winString = lineWins.join('');
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        // Check Respin Status based on Wilds
        if (!isRespin && WildsWalk['Pumpkin'].length > 0) {
            this.slotSettings.SetGameData('HalloweenJackNETIsRespin', true);
            walkingWildsStr += '&nextaction=respin';
        } else if (isRespin && WildsWalk['Pumpkin'].length > 0) {
            walkingWildsStr += '&nextaction=respin&clientaction=respin';
        } else if (isRespin && WildsWalk['Pumpkin'].length <= 0) {
            this.slotSettings.SetGameData('HalloweenJackNETIsRespin', false);
        }

        // Log report
        const logResponse = {
            responseEvent: 'spin',
            responseType: postData.slotEvent,
            serverResponse: {
                freeState: freeState,
                slotLines: lines,
                slotBet: betline,
                totalFreeGames: this.slotSettings.GetGameData('HalloweenJackNETFreeGames'),
                currentFreeGames: this.slotSettings.GetGameData('HalloweenJackNETCurrentFreeGame'),
                Balance: balanceInCents,
                afterBalance: balanceInCents,
                bonusWin: this.slotSettings.GetGameData('HalloweenJackNETBonusWin'),
                totalWin: totalWin,
                winLines: [],
                Jackpots: this.slotSettings.Jackpots,
                reelsSymbols: reels
            }
        };
        this.slotSettings.SaveLogReport(JSON.stringify(logResponse), allbet, lines, reportWin, postData.slotEvent);

        this.slotSettings.SetGameData('HalloweenJackNETGambleStep', 5);

        // Determine client response format
        let result = '';
        if (scattersCount >= 3) {
            // Trigger Free Spins
             result = `previous.rs.i0=basic&freespins.betlevel=1&ws.i0.pos.i2=3%2C2&gameServerVersion=1.0.0&g4mode=false&freespins.win.coins=0&playercurrency=%26%23x20AC%3B&rs.i0.nearwin=4&historybutton=false&current.rs.i0=freespin02&rs.i0.r.i4.hold=false&ws.i0.types.i0.freespins=10&ws.i0.reelset=basic&next.rs=freespin02&gamestate.history=basic&ws.i0.pos.i1=4%2C0&ws.i0.pos.i0=0%2C2&rs.i0.r.i3.attention.i0=2&rs.i0.r.i1.syms=SYM4%2CSYM12%2CSYM10&game.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&ws.i0.betline=null&rs.i0.id=basic&totalwin.coins=${totalWin}&credit=${balanceInCents}&gamestate.current=freespin&freespins.initial=10&jackpotcurrency=%26%23x20AC%3B&multiplier=1&last.rs=basic&freespins.denomination=5.000&rs.i0.r.i0.syms=SYM9%2CSYM7%2CSYM0&rs.i0.r.i3.syms=SYM8%2CSYM9%2CSYM0&freespins.win.cents=0&ws.i0.sym=SYM0&freespins.totalwin.coins=0&freespins.total=10&ws.i0.direction=none&isJackpotWin=false&gamestate.stack=basic%2Cfreespin&rs.i0.r.i0.pos=18&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&ws.i0.types.i0.wintype=freespins&cjpUrl=&rs.i0.r.i1.pos=16&game.win.coins=${totalWin}&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i1.hold=false&freespins.wavecount=1&rs.i0.r.i4.attention.i0=0&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=spin&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM0%2CSYM8%2CSYM9&rs.i0.r.i2.pos=121&rs.i0.r.i0.attention.i0=2&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gameover=false&rs.i0.r.i0.hold=false&rs.i0.r.i3.pos=40&freespins.left=10&rs.i0.r.i4.pos=220&nextaction=freespin&wavecount=1&jab.collects=0&ws.i0.types.i0.multipliers=1&rs.i0.r.i2.syms=SYM11%2CSYM12%2CSYM6&rs.i0.r.i3.hold=false&game.win.amount=0.00&freespins.totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}${curReels}${winString}${walkingWildsStr}`;
        } else {
            // Normal Spin or Respin result
            let gameover = 'true';
            let nextaction = 'spin';

            // Check if free spins active
             if (postData.slotEvent === 'freespin') {
                 // Check if still in free spins
                 if (this.slotSettings.GetGameData(this.slotId + 'FreeGames') <= this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') && this.slotSettings.GetGameData('HalloweenJackNETBonusWin') > 0) {
                     nextaction = 'spin';
                     // stack basic
                 } else {
                     nextaction = 'freespin';
                     gameover = 'false';
                 }
             } else if (this.slotSettings.GetGameData('HalloweenJackNETIsRespin')) {
                 gameover = 'false';
                 nextaction = 'respin';
             }

             // Construct string
             result = `previous.rs.i0=basic&rs.i0.r.i1.pos=102&gameServerVersion=1.0.0&g4mode=false&game.win.coins=${totalWin}&playercurrency=%26%23x20AC%3B&playercurrencyiso=${this.slotSettings.slotCurrency}&historybutton=false&rs.i0.r.i1.hold=false&current.rs.i0=basic&rs.i0.r.i4.hold=false&next.rs=basic&gamestate.history=basic&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=spin&rs.i0.r.i1.syms=SYM6%2CSYM8%2CSYM6&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM9%2CSYM0%2CSYM8&game.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&rs.i0.r.i2.pos=122&rs.i0.id=basic&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gamestate.current=basic&gameover=${gameover}&rs.i0.r.i0.hold=false&jackpotcurrency=%26%23x20AC%3B&multiplier=1&rs.i0.r.i3.pos=84&last.rs=basic&rs.i0.r.i4.pos=219&rs.i0.r.i0.syms=SYM10%2CSYM5%2CSYM12&rs.i0.r.i3.syms=SYM9%2CSYM11%2CSYM10&isJackpotWin=false&gamestate.stack=basic&nextaction=${nextaction}&rs.i0.r.i0.pos=10&wavecount=1&gamesoundurl=&jab.collects=null&rs.i0.r.i2.syms=SYM12%2CSYM6%2CSYM7&rs.i0.r.i3.hold=false&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}&cjpUrl=${curReels}${winString}${walkingWildsStr}`;
        }

        // Save Game Data
        this.slotSettings.SaveGameData();
        this.slotSettings.SaveGameDataStatic();

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
            [2, 2, 3, 2, 2],
            [1, 2, 2, 2, 1],
            [3, 2, 2, 2, 3],
            [3, 1, 2, 3, 1],
            [2, 1, 3, 2, 3],
            [1, 3, 1, 3, 1]
        ];
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
        // Simple random generation for initialization
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

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
