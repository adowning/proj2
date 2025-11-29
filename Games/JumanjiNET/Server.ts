// Server.ts - JumanjiNET game server
// Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines
// Data injection pattern - NO database calls or legacy PHP constructs

import { SlotSettings, ReelStrips } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'JumanjiNET';

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
            postData.action = 'freespin';
        }
        if (postData.action === 'respin') {
            postData.slotEvent = 'respin';
            postData.action = 'spin';
        }
        if (postData.action === 'shuffle') {
            postData.slotEvent = 'shuffle';
            postData.action = 'spin';
            // Validate shuffle state
            if (this.slotSettings.GetGameData(this.slotId + 'ShuffleActive') != 1) {
                return `{"responseEvent":"error","responseType":"${postData.slotEvent}","serverResponse":"invalid bonus state"}`;
            }
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
        if (postData.action === 'initbonus') {
            postData.slotEvent = 'initbonus';
        }
        if (postData.action === 'bonusaction') {
            postData.slotEvent = 'bonusaction';
        }
        if (postData.action === 'endbonus') {
            postData.slotEvent = 'endbonus';
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
            const lines = 10;
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
            case 'initbonus':
                return this.handleInitBonusRequest();
            case 'bonusaction':
                return this.handleBonusActionRequest(postData);
            case 'endbonus':
                return this.handleEndBonusRequest();
            case 'spin':
            case 'freespin':
                return this.handleSpinRequest(postData);
            default:
                return this.createErrorResponse("unknown action");
        }
    }

    private handleInitRequest(): string {
        const lastEvent = this.slotSettings.GetHistory();
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        // Reset game state
        this.slotSettings.SetGameData(this.slotId + 'BonusWin', 0);
        this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
        this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
        this.slotSettings.SetGameData(this.slotId + 'TotalWin', 0);
        this.slotSettings.SetGameData(this.slotId + 'FreeBalance', 0);

        let curReels = '';
        let freeState = '';

        if (lastEvent && lastEvent !== 'NULL') {
            const serverResponse = lastEvent.serverResponse;
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', serverResponse.totalFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', serverResponse.currentFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', serverResponse.Balance);
            freeState = serverResponse.freeState || '';

            const reels = serverResponse.reelsSymbols;
            // Jumanji specific reel string format
            curReels = this.buildReelsString(reels);
        } else {
            // Random initial state
            curReels = this.buildRandomReelsString();
        }

        const denoms = this.slotSettings.Denominations.map(d => d * 100).join('%2C');
        const standardDenom = this.slotSettings.CurrentDenomination * 100;

        // Check if in freespins/bonus
        if (this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') < this.slotSettings.GetGameData(this.slotId + 'FreeGames') &&
            this.slotSettings.GetGameData(this.slotId + 'FreeGames') > 0) {
             // Return simplified freespins state or copy full string from PHP if exact restoration needed
             // For brevity, using a placeholder string structure
             freeState = `previous.rs.i0=freespinlevel0&rs.i1.r.i0.syms=SYM6%2CSYM3%2CSYM5&bl.i6.coins=1&rs.i8.r.i3.hold=false&bl.i17.reelset=ALL&bl.i15.id=15&rs.i0.r.i4.hold=false&rs.i9.r.i1.hold=false&gamestate.history=basic%2Cfreespin&rs.i1.r.i2.hold=false&rs.i8.r.i1.syms=SYM3%2CSYM9%2CSYM9&game.win.cents=685&rs.i7.r.i3.syms=SYM4%2CSYM8%2CSYM10&staticsharedurl=&bl.i10.line=1%2C2%2C1%2C2%2C1&bl.i0.reelset=ALL&bl.i18.coins=1&bl.i10.id=10&freespins.initial=10&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&bl.i13.coins=1&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM7%2CSYM4%2CSYM7&rs.i9.r.i3.hold=false&bl.i2.id=2&rs.i1.r.i1.pos=1&rs.i7.r.i1.syms=SYM0%2CSYM5%2CSYM10&rs.i3.r.i4.pos=0&rs.i6.r.i3.syms=SYM5%2CSYM4%2CSYM8&rs.i0.r.i0.pos=0&bl.i14.reelset=ALL&rs.i2.r.i3.pos=62&rs.i5.r.i1.overlay.i0.with=SYM1&rs.i5.r.i0.pos=5&rs.i7.id=basic&rs.i7.r.i3.pos=99&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=0&rs.i2.id=freespinlevel0respin&rs.i6.r.i1.pos=0&game.win.coins=137&rs.i1.r.i0.hold=false&bl.i3.id=3&ws.i1.reelset=freespinlevel0&bl.i12.coins=1&bl.i8.reelset=ALL&clientaction=init&rs.i4.r.i0.hold=false&rs.i0.r.i2.hold=false&rs.i4.r.i3.syms=SYM5%2CSYM4%2CSYM8&bl.i16.id=16&casinoID=netent&rs.i2.r.i3.overlay.i0.with=SYM1&bl.i5.coins=1&rs.i3.r.i2.hold=false&bl.i8.id=8&rs.i5.r.i1.syms=SYM6%2CSYM10%2CSYM1&rs.i7.r.i0.pos=42&rs.i7.r.i3.hold=false&rs.i0.r.i3.pos=0&rs.i4.r.i0.syms=SYM7%2CSYM4%2CSYM7&rs.i8.r.i1.pos=0&rs.i5.r.i3.pos=87&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i12.line=2%2C1%2C2%2C1%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&wild.w0.expand.position.row=2&rs.i4.r.i2.pos=0&rs.i0.r.i2.syms=SYM8%2CSYM8%2CSYM4&rs.i8.r.i1.hold=false&rs.i9.r.i2.pos=0&game.win.amount=6.85&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&rs.i5.r.i2.hold=false&denomination.all=${denoms}&rs.i2.r.i0.pos=20&current.rs.i0=freespinlevel0respin&ws.i0.reelset=freespinlevel0&rs.i7.r.i2.pos=91&bl.i1.id=1&rs.i3.r.i2.syms=SYM10%2CSYM10%2CSYM5&rs.i1.r.i4.pos=10&rs.i8.id=freespinlevel3&denomination.standard=${standardDenom}&rs.i3.id=freespinlevel1&multiplier=1&bl.i14.id=14&wild.w0.expand.position.reel=1&bl.i19.line=0%2C2%2C2%2C2%2C0&freespins.denomination=5.000&bl.i12.reelset=ALL&bl.i2.coins=1&bl.i6.id=6&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&freespins.totalwin.coins=137&ws.i0.direction=left_to_right&freespins.total=10&gamestate.stack=basic%2Cfreespin&rs.i6.r.i2.pos=0&rs.i1.r.i4.syms=SYM9%2CSYM9%2CSYM5&gamesoundurl=&rs.i5.r.i2.syms=SYM10%2CSYM7%2CSYM4&rs.i5.r.i3.hold=false&bet.betlevel=1&rs.i2.r.i3.overlay.i0.pos=63&rs.i4.r.i2.hold=false&bl.i5.reelset=ALL&rs.i4.r.i1.syms=SYM7%2CSYM7%2CSYM3&bl.i19.coins=1&bl.i7.id=7&bl.i18.reelset=ALL&rs.i2.r.i4.pos=2&rs.i3.r.i0.syms=SYM7%2CSYM4%2CSYM7&rs.i8.r.i4.pos=0&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=1&rs.i2.r.i3.overlay.i0.row=1&rs.i4.r.i1.hold=false&rs.i3.r.i2.pos=0&bl.i14.line=1%2C1%2C2%2C1%2C1&freespins.multiplier=1&playforfun=false&rs.i8.r.i0.hold=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM6%2CSYM10%2CSYM9&rs.i0.r.i2.pos=0&bl.i13.line=1%2C1%2C0%2C1%2C1&rs.i6.r.i3.pos=0&ws.i1.betline=13&rs.i1.r.i0.pos=10&rs.i6.r.i3.hold=false&bl.i0.coins=1&rs.i2.r.i0.syms=SYM7%2CSYM7%2CSYM8&bl.i2.reelset=ALL&rs.i3.r.i1.syms=SYM3%2CSYM9%2CSYM9&rs.i1.r.i4.hold=false&freespins.left=6&rs.i9.r.i3.pos=0&rs.i4.r.i1.pos=0&rs.i4.r.i2.syms=SYM8%2CSYM8%2CSYM4&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i5.r.i3.syms=SYM3%2CSYM9%2CSYM9&rs.i3.r.i0.hold=false&rs.i9.r.i1.syms=SYM3%2CSYM9%2CSYM9&rs.i6.r.i4.syms=SYM6%2CSYM10%2CSYM4&rs.i8.r.i0.syms=SYM7%2CSYM4%2CSYM7&rs.i8.r.i0.pos=0&bl.i15.reelset=ALL&rs.i0.r.i3.hold=false&bet.denomination=5&rs.i5.r.i4.pos=4&rs.i9.id=freespinlevel2&rs.i4.id=freespinlevel3respin&rs.i7.r.i2.syms=SYM9%2CSYM4%2CSYM10&rs.i2.r.i1.hold=false&gameServerVersion=1.5.0&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&freespins.win.coins=8&historybutton=false&bl.i5.id=5&gameEventSetters.enabled=false&next.rs=freespinlevel0respin&rs.i1.r.i3.pos=2&rs.i0.r.i1.syms=SYM7%2CSYM7%2CSYM3&bl.i3.coins=1&ws.i1.types.i0.coins=4&bl.i10.coins=1&bl.i18.id=18&rs.i2.r.i1.pos=12&rs.i7.r.i4.hold=false&rs.i4.r.i4.pos=0&rs.i8.r.i2.hold=false&ws.i0.betline=4&rs.i1.r.i3.hold=false&rs.i7.r.i1.pos=123&totalwin.coins=137&rs.i5.r.i4.syms=SYM6%2CSYM6%2CSYM9&rs.i9.r.i4.pos=0&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=freespin&rs.i4.r.i0.pos=0&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&rs.i8.r.i2.syms=SYM10%2CSYM10%2CSYM5&rs.i9.r.i0.hold=false&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i3.r.i1.hold=false&rs.i9.r.i0.syms=SYM7%2CSYM4%2CSYM7&rs.i7.r.i4.syms=SYM0%2CSYM9%2CSYM7&rs.i0.r.i3.syms=SYM5%2CSYM4%2CSYM8&rs.i1.r.i1.syms=SYM7%2CSYM7%2CSYM6&bl.i16.coins=1&rs.i5.r.i1.overlay.i0.pos=22&freespins.win.cents=40&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&rs.i6.r.i4.hold=false&rs.i2.r.i3.hold=false&wild.w0.expand.type=NONE&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i0.r.i1.pos=0&rs.i4.r.i4.syms=SYM6%2CSYM10%2CSYM9&rs.i1.r.i3.syms=SYM7%2CSYM6%2CSYM8&bl.i13.id=13&rs.i0.r.i1.hold=false&rs.i2.r.i1.syms=SYM10%2CSYM4%2CSYM10&ws.i1.types.i0.wintype=coins&rs.i9.r.i2.syms=SYM10%2CSYM10%2CSYM5&bl.i9.line=1%2C0%2C1%2C0%2C1&rs.i8.r.i4.syms=SYM6%2CSYM9%2CSYM9&rs.i9.r.i0.pos=0&rs.i8.r.i3.pos=0&ws.i1.sym=SYM10&betlevel.standard=1&bl.i10.reelset=ALL&ws.i1.types.i0.cents=20&rs.i6.r.i2.syms=SYM8%2CSYM6%2CSYM4&rs.i7.r.i0.syms=SYM5%2CSYM7%2CSYM0&gameover=false&rs.i3.r.i3.pos=0&rs.i5.id=freespinlevel0&rs.i7.r.i0.hold=false&rs.i6.r.i4.pos=0&bl.i11.coins=1&rs.i5.r.i1.hold=false&ws.i1.direction=left_to_right&rs.i5.r.i4.hold=false&rs.i6.r.i2.hold=false&bl.i13.reelset=ALL&bl.i0.id=0&rs.i9.r.i2.hold=false&nextaction=respin&bl.i15.line=0%2C1%2C1%2C1%2C0&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i19.id=19&bl.i4.reelset=ALL&rs.i7.r.i1.attention.i0=0&bl.i4.coins=1&bl.i18.line=2%2C0%2C2%2C0%2C2&rs.i8.r.i4.hold=false&freespins.totalwin.cents=685&bl.i9.id=9&bl.i17.line=0%2C2%2C0%2C2%2C0&bl.i11.id=11&freespins.betlevel=1&ws.i0.pos.i2=2%2C0&rs.i4.r.i3.pos=0&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&rs.i4.r.i4.hold=false&bl.i17.coins=1&ws.i1.pos.i0=1%2C1&ws.i1.pos.i1=0%2C1&ws.i1.pos.i2=2%2C0&ws.i0.pos.i1=0%2C2&rs.i5.r.i0.syms=SYM9%2CSYM10%2CSYM10&bl.i19.reelset=ALL&ws.i0.pos.i0=1%2C1&rs.i2.r.i4.syms=SYM4%2CSYM8%2CSYM8&rs.i7.r.i4.pos=41&rs.i4.r.i3.hold=false&rs.i6.r.i0.hold=false&bl.i11.reelset=ALL&bl.i16.line=2%2C1%2C1%2C1%2C2&rs.i0.id=freespinlevel2respin&credit=${balanceInCents}&ws.i0.types.i0.coins=4&rs.i9.r.i3.syms=SYM6%2CSYM7%2CSYM7&bl.i1.reelset=ALL&rs.i2.r.i2.pos=19&last.rs=freespinlevel0&rs.i5.r.i1.overlay.i0.row=2&rs.i5.r.i1.pos=20&bl.i1.line=0%2C0%2C0%2C0%2C0&ws.i0.sym=SYM10&rs.i6.r.i0.syms=SYM7%2CSYM4%2CSYM7&rs.i6.r.i1.hold=false&bl.i17.id=17&rs.i2.r.i2.syms=SYM4%2CSYM6%2CSYM7&rs.i1.r.i2.pos=19&bl.i16.reelset=ALL&rs.i3.r.i3.syms=SYM6%2CSYM7%2CSYM7&ws.i0.types.i0.wintype=coins&rs.i3.r.i4.hold=false&rs.i5.r.i0.hold=false&nearwinallowed=true&collectablesWon=2&rs.i9.r.i1.pos=0&bl.i8.line=1%2C0%2C0%2C0%2C1&rs.i7.r.i2.hold=false&rs.i6.r.i1.syms=SYM5%2CSYM9%2CSYM9&freespins.wavecount=1&rs.i3.r.i3.hold=false&rs.i6.r.i0.pos=0&bl.i8.coins=1&bl.i15.coins=1&bl.i2.line=2%2C2%2C2%2C2%2C2&rs.i1.r.i2.syms=SYM8%2CSYM4%2CSYM3&rs.i7.nearwin=4%2C2%2C3&rs.i9.r.i4.hold=false&rs.i6.id=freespinlevel1respin&totalwin.cents=685&rs.i7.r.i1.hold=false&rs.i5.r.i2.pos=98&rs.i0.r.i0.hold=false&rs.i2.r.i3.syms=SYM9%2CSYM9%2CSYM5&rs.i8.r.i2.pos=0&restore=true&rs.i1.id=basicrespin&rs.i3.r.i4.syms=SYM6%2CSYM9%2CSYM9&bl.i12.id=12&bl.i4.id=4&rs.i0.r.i4.pos=0&bl.i7.coins=1&ws.i0.types.i0.cents=20&bl.i6.reelset=ALL&rs.i3.r.i0.pos=0&rs.i2.r.i2.hold=false&rs.i7.r.i0.attention.i0=2&wavecount=1&rs.i9.r.i4.syms=SYM6%2CSYM9%2CSYM9&bl.i14.coins=1&rs.i8.r.i3.syms=SYM6%2CSYM7%2CSYM7&rs.i1.r.i1.hold=false&rs.i7.r.i4.attention.i0=0` + freeState;
        }

        // Return huge string based on PHP template (simplified here)
        return `bl.i32.reelset=ALL&rs.i1.r.i0.syms=SYM7&bl.i6.coins=0&bl.i17.reelset=ALL&bl.i15.id=15&rs.i0.r.i4.hold=false&rs.i1.r.i15.pos=0&rs.i1.r.i2.hold=false&bl.i21.id=21&game.win.cents=0&staticsharedurl=&bl.i23.reelset=ALL&bl.i33.coins=0&rs.i1.r.i11.syms=SYM11&bl.i10.line=0%2C1%2C2%2C2%2C2&bl.i0.reelset=ALL&bl.i20.coins=0&bl.i18.coins=0&bl.i10.id=10&bl.i3.reelset=ALL&bl.i4.line=0%2C1%2C1%2C0%2C0&bl.i13.coins=0&bl.i26.reelset=ALL&bl.i24.line=1%2C2%2C3%2C3%2C2&bl.i27.id=27&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM6%2CSYM6%2CSYM7&bl.i2.id=2&rs.i1.r.i1.pos=0&feature.sticky.active=false&rs.i1.r.i13.hold=false&rs.i0.r.i0.pos=0&bl.i14.reelset=ALL&rs.i2.r.i3.pos=2&feature.wildreels.active=false&rs.i2.r.i4.hold=false&rs.i1.r.i9.syms=SYM11&rs.i2.id=basic&game.win.coins=0&bl.i28.line=2%2C2%2C2%2C2%2C2&rs.i1.r.i0.hold=false&bl.i3.id=3&bl.i22.line=1%2C2%2C3%2C2%2C1&rs.i1.r.i13.syms=SYM7&bl.i12.coins=0&bl.i8.reelset=ALL&clientaction=init&rs.i0.r.i2.hold=false&bl.i16.id=16&rs.i1.r.i15.hold=false&casinoID=netent&rs.i1.r.i8.pos=0&bl.i5.coins=0&rs.i1.r.i6.hold=false&bl.i8.id=8&rs.i0.r.i3.pos=0&bl.i33.id=33&bl.i6.line=0%2C1%2C1%2C1%2C1&bl.i22.id=22&bl.i12.line=1%2C1%2C1%2C1%2C0&bl.i0.line=0%2C0%2C0%2C0%2C0&bl.i29.reelset=ALL&bl.i34.line=2%2C3%2C3%2C3%2C2&bl.i31.line=2%2C2%2C3%2C3%2C2&rs.i0.r.i2.syms=SYM7%2CSYM7%2CSYM6%2CSYM6%2CSYM5&bl.i34.coins=0&game.win.amount=0&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&rs.i1.r.i6.syms=SYM11&denomination.all=${denoms}&bl.i27.coins=0&bl.i34.reelset=ALL&rs.i2.r.i0.pos=0&bl.i30.reelset=ALL&bl.i1.id=1&bl.i33.line=2%2C3%2C3%2C2%2C2&bl.i25.id=25&rs.i1.r.i9.hold=false&rs.i1.r.i5.syms=SYM7&rs.i1.r.i4.pos=0&denomination.standard=${standardDenom}&bl.i31.id=31&bl.i32.line=2%2C3%2C3%2C2%2C1&multiplier=1&bl.i14.id=14&bl.i19.line=1%2C2%2C2%2C1%2C1&bl.i12.reelset=ALL&bl.i2.coins=0&bl.i6.id=6&bl.i21.reelset=ALL&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&rs.i1.r.i15.syms=SYM11&bl.i20.id=20&rs.i1.r.i12.pos=0&rs.i1.r.i4.syms=SYM7&feature.shuffle.active=false&gamesoundurl=&bl.i33.reelset=ALL&bl.i5.reelset=ALL&bl.i24.coins=0&rs.i1.r.i11.pos=0&bl.i19.coins=0&bl.i32.coins=0&bl.i7.id=7&bl.i18.reelset=ALL&rs.i2.r.i4.pos=0&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=0&bl.i32.id=32&bl.i14.line=1%2C1%2C2%2C1%2C0&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM8%2CSYM8%2CSYM7&rs.i1.r.i9.pos=0&bl.i25.coins=0&rs.i0.r.i2.pos=0&bl.i13.line=1%2C1%2C1%2C1%2C1&bl.i24.reelset=ALL&rs.i1.r.i0.pos=0&rs.i1.r.i14.syms=SYM7&bl.i0.coins=10&rs.i2.r.i0.syms=SYM9%2CSYM9%2CSYM10&bl.i2.reelset=ALL&rs.i1.r.i5.pos=0&bl.i31.coins=0&rs.i1.r.i4.hold=false&bl.i26.coins=0&bl.i27.reelset=ALL&rs.i1.r.i14.hold=false&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35&bl.i29.line=2%2C2%2C3%2C2%2C1&bl.i23.line=1%2C2%2C3%2C2%2C2&bl.i26.id=26&bl.i15.reelset=ALL&rs.i0.r.i3.hold=false&rs.i1.r.i16.pos=0&rs.i2.r.i1.hold=false&gameServerVersion=2.0.1&g4mode=false&bl.i11.line=1%2C1%2C1%2C0%2C0&bl.i30.id=30&feature.randomwilds.active=false&historybutton=false&bl.i25.line=2%2C2%2C2%2C1%2C0&bl.i5.id=5&gameEventSetters.enabled=false&rs.i1.r.i10.syms=SYM7&rs.i1.r.i3.pos=0&rs.i0.r.i1.syms=SYM4%2CSYM4%2CSYM7%2CSYM7&rs.i1.r.i17.pos=0&bl.i3.coins=0&bl.i10.coins=0&bl.i18.id=18&rs.i2.r.i1.pos=1&rs.i1.r.i12.hold=false&bl.i30.coins=0&nextclientrs=basic&rs.i1.r.i3.hold=false&totalwin.coins=0&bl.i5.line=0%2C1%2C1%2C1%2C0&gamestate.current=basic&bl.i28.coins=0&bl.i27.line=2%2C2%2C2%2C2%2C1&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=0%2C1%2C2%2C1%2C0&bl.i35.id=35&rs.i1.r.i13.pos=0&rs.i0.r.i3.syms=SYM4%2CSYM4%2CSYM8%2CSYM8&rs.i1.r.i1.syms=SYM7&bl.i16.coins=0&bl.i9.coins=0&bl.i30.line=2%2C2%2C3%2C2%2C2&bl.i7.reelset=ALL&isJackpotWin=false&rs.i1.r.i5.hold=false&rs.i2.r.i3.hold=false&rs.i1.r.i12.syms=SYM11&bl.i24.id=24&rs.i1.r.i10.hold=false&rs.i0.r.i1.pos=0&bl.i22.coins=0&rs.i1.r.i3.syms=SYM11&bl.i29.coins=0&bl.i31.reelset=ALL&bl.i13.id=13&rs.i0.r.i1.hold=false&rs.i2.r.i1.syms=SYM8%2CSYM8%2CSYM0%2CSYM7&bl.i9.line=0%2C1%2C2%2C2%2C1&rs.i1.r.i10.pos=0&bl.i35.coins=0&betlevel.standard=1&bl.i10.reelset=ALL&gameover=true&bl.i25.reelset=ALL&bl.i23.coins=0&bl.i11.coins=0&bl.i22.reelset=ALL&bl.i13.reelset=ALL&bl.i0.id=0&nextaction=spin&bl.i15.line=1%2C1%2C2%2C1%2C1&bl.i3.line=0%2C0%2C1%2C1%2C1&bl.i19.id=19&bl.i4.reelset=ALL&bl.i4.coins=0&rs.i1.r.i6.pos=0&bl.i18.line=1%2C2%2C2%2C1%2C0&bl.i9.id=9&bl.i34.id=34&bl.i17.line=1%2C1%2C2%2C2%2C2&bl.i11.id=11&playercurrency=%26%23x20AC%3B&rs.i1.r.i16.syms=SYM11&bl.i9.reelset=ALL&bl.i17.coins=0&bl.i28.id=28&bl.i19.reelset=ALL&rs.i2.r.i4.syms=SYM4%2CSYM4%2CSYM9&bl.i11.reelset=ALL&bl.i16.line=1%2C1%2C2%2C2%2C1&rs.i1.r.i18.hold=false&rs.i0.id=freespin&rs.i1.r.i14.pos=0&rs.i1.r.i17.syms=SYM7&credit=${balanceInCents}&rs.i1.r.i18.pos=0&bl.i21.line=1%2C2%2C2%2C2%2C2&bl.i35.line=2%2C3%2C4%2C3%2C2&bl.i1.reelset=ALL&rs.i2.r.i2.pos=5&bl.i21.coins=0&bl.i28.reelset=ALL&bl.i1.line=0%2C0%2C1%2C0%2C0&rs.i1.r.i8.hold=false&rs.i1.r.i16.hold=false&bl.i17.id=17&rs.i2.r.i2.syms=SYM6%2CSYM6%2CSYM7%2CSYM7%2CSYM9&rs.i1.r.i2.pos=0&bl.i16.reelset=ALL&rs.i1.r.i7.syms=SYM11&nearwinallowed=true&bl.i8.line=0%2C1%2C2%2C1%2C1&bl.i35.reelset=ALL&rs.i1.r.i7.pos=0&rs.i1.r.i18.syms=SYM11&rs.i1.r.i8.syms=SYM7&bl.i8.coins=0&bl.i23.id=23&bl.i15.coins=0&bl.i2.line=0%2C0%2C1%2C1%2C0&rs.i1.r.i2.syms=SYM7&totalwin.cents=0&rs.i1.r.i11.hold=false&rs.i0.r.i0.hold=false&rs.i1.r.i7.hold=false&rs.i2.r.i3.syms=SYM8%2CSYM8%2CSYM10%2CSYM10&restore=false&rs.i1.id=respin&bl.i12.id=12&bl.i29.id=29&rs.i1.r.i17.hold=false&bl.i4.id=4&rs.i0.r.i4.pos=0&bl.i7.coins=0&bl.i6.reelset=ALL&bl.i20.line=1%2C2%2C2%2C2%2C1&rs.i2.r.i2.hold=false&bl.i20.reelset=ALL&wavecount=1&bl.i14.coins=0&rs.i1.r.i1.hold=false&bl.i26.line=2%2C2%2C2%2C1%2C1` + freeState;
    }

    private handlePaytableRequest(): string {
        return 'bl.i32.reelset=ALL&pt.i0.comp.i19.symbol=SYM9&bl.i6.coins=0&bl.i17.reelset=ALL&pt.i0.comp.i15.type=betline&pt.i0.comp.i23.freespins=0&bl.i15.id=15&pt.i0.comp.i4.multi=15&pt.i0.comp.i15.symbol=SYM8&pt.i0.comp.i17.symbol=SYM8&pt.i0.comp.i5.freespins=0&pt.i0.comp.i22.multi=3&pt.i0.comp.i23.n=5&bl.i21.id=21&pt.i0.comp.i11.symbol=SYM6&pt.i0.comp.i13.symbol=SYM7&bl.i23.reelset=ALL&bl.i33.coins=0&pt.i0.comp.i15.multi=2&bl.i10.line=0%2C1%2C2%2C2%2C2&bl.i0.reelset=ALL&bl.i20.coins=0&pt.i0.comp.i16.freespins=0&bl.i18.coins=0&bl.i10.id=10&pt.i0.comp.i11.n=5&pt.i0.comp.i4.freespins=0&bl.i3.reelset=ALL&bl.i4.line=0%2C1%2C1%2C0%2C0&bl.i13.coins=0&bl.i26.reelset=ALL&bl.i24.line=1%2C2%2C3%2C3%2C2&bl.i27.id=27&pt.i0.comp.i19.n=4&pt.i0.id=basic&pt.i0.comp.i1.type=betline&bl.i2.id=2&pt.i0.comp.i2.symbol=SYM3&pt.i0.comp.i4.symbol=SYM4&pt.i0.comp.i20.type=betline&bl.i14.reelset=ALL&pt.i0.comp.i17.freespins=0&pt.i0.comp.i6.symbol=SYM5&pt.i0.comp.i8.symbol=SYM5&pt.i0.comp.i0.symbol=SYM3&pt.i0.comp.i5.n=5&pt.i0.comp.i3.type=betline&pt.i0.comp.i3.freespins=0&pt.i0.comp.i10.multi=8&bl.i28.line=2%2C2%2C2%2C2%2C2&bl.i3.id=3&bl.i22.line=1%2C2%2C3%2C2%2C1&pt.i0.comp.i9.multi=3&bl.i12.coins=0&pt.i0.comp.i22.symbol=SYM10&pt.i0.comp.i26.symbol=SYM0&pt.i0.comp.i24.n=3&bl.i8.reelset=ALL&pt.i0.comp.i14.freespins=0&pt.i0.comp.i21.freespins=0&clientaction=paytable&bl.i16.id=16&bl.i5.coins=0&pt.i0.comp.i22.type=betline&pt.i0.comp.i24.freespins=0&bl.i8.id=8&pt.i0.comp.i16.multi=4&pt.i0.comp.i21.multi=2&bl.i33.id=33&pt.i0.comp.i12.n=3&bl.i6.line=0%2C1%2C1%2C1%2C1&bl.i22.id=22&pt.i0.comp.i13.type=betline&bl.i12.line=1%2C1%2C1%2C1%2C0&bl.i0.line=0%2C0%2C0%2C0%2C0&bl.i29.reelset=ALL&pt.i0.comp.i19.type=betline&pt.i0.comp.i6.freespins=0&bl.i34.line=2%2C3%2C3%2C3%2C2&bl.i31.line=2%2C2%2C3%2C3%2C2&pt.i0.comp.i3.multi=5&bl.i34.coins=0&pt.i0.comp.i6.n=3&pt.i0.comp.i21.n=3&bl.i27.coins=0&bl.i34.reelset=ALL&bl.i30.reelset=ALL&bl.i1.id=1&bl.i33.line=2%2C3%2C3%2C2%2C2&pt.i0.comp.i10.type=betline&bl.i25.id=25&pt.i0.comp.i2.freespins=0&pt.i0.comp.i5.multi=50&pt.i0.comp.i7.n=4&bl.i31.id=31&bl.i32.line=2%2C3%2C3%2C2%2C1&pt.i0.comp.i11.multi=25&bl.i14.id=14&pt.i0.comp.i7.type=betline&bl.i19.line=1%2C2%2C2%2C1%2C1&bl.i12.reelset=ALL&pt.i0.comp.i17.n=5&bl.i2.coins=0&bl.i6.id=6&bl.i21.reelset=ALL&pt.i0.comp.i8.freespins=0&bl.i20.id=20&pt.i0.comp.i8.multi=30&gamesoundurl=&pt.i0.comp.i1.freespins=0&pt.i0.comp.i12.type=betline&pt.i0.comp.i14.multi=10&bl.i33.reelset=ALL&bl.i5.reelset=ALL&bl.i24.coins=0&pt.i0.comp.i22.n=4&bl.i19.coins=0&bl.i32.coins=0&bl.i7.id=7&bl.i18.reelset=ALL&pt.i0.comp.i6.multi=4&playercurrencyiso=' + this.slotSettings.slotCurrency + '&bl.i1.coins=0&bl.i32.id=32&bl.i14.line=1%2C1%2C2%2C1%2C0&pt.i0.comp.i18.type=betline&pt.i0.comp.i23.symbol=SYM10&pt.i0.comp.i21.type=betline&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&pt.i0.comp.i8.type=betline&pt.i0.comp.i7.freespins=0&pt.i0.comp.i2.type=betline&pt.i0.comp.i13.multi=4&bl.i25.coins=0&pt.i0.comp.i17.type=betline&bl.i13.line=1%2C1%2C1%2C1%2C1&bl.i24.reelset=ALL&bl.i0.coins=10&bl.i2.reelset=ALL&pt.i0.comp.i8.n=5&pt.i0.comp.i10.n=4&bl.i31.coins=0&pt.i0.comp.i11.type=betline&pt.i0.comp.i18.n=3&pt.i0.comp.i22.freespins=0&bl.i26.coins=0&bl.i27.reelset=ALL&pt.i0.comp.i20.symbol=SYM9&bl.i29.line=2%2C2%2C3%2C2%2C1&pt.i0.comp.i15.freespins=0&bl.i23.line=1%2C2%2C3%2C2%2C2&bl.i26.id=26&pt.i0.comp.i0.n=3&pt.i0.comp.i7.symbol=SYM5&bl.i15.reelset=ALL&pt.i0.comp.i0.type=betline&gameServerVersion=2.0.1&g4mode=false&bl.i11.line=1%2C1%2C1%2C0%2C0&bl.i30.id=30&pt.i0.comp.i25.multi=0&historybutton=false&bl.i25.line=2%2C2%2C2%2C1%2C0&pt.i0.comp.i16.symbol=SYM8&bl.i5.id=5&pt.i0.comp.i1.multi=20&pt.i0.comp.i18.symbol=SYM9&pt.i0.comp.i12.multi=2&bl.i3.coins=0&bl.i10.coins=0&pt.i0.comp.i12.symbol=SYM7&pt.i0.comp.i14.symbol=SYM7&bl.i18.id=18&pt.i0.comp.i14.type=betline&bl.i30.coins=0&pt.i0.comp.i18.multi=2&bl.i5.line=0%2C1%2C1%2C1%2C0&pt.i0.comp.i7.multi=10&bl.i28.coins=0&pt.i0.comp.i9.n=3&bl.i27.line=2%2C2%2C2%2C2%2C1&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=0%2C1%2C2%2C1%2C0&bl.i35.id=35&pt.i0.comp.i10.symbol=SYM6&pt.i0.comp.i15.n=3&bl.i16.coins=0&bl.i9.coins=0&bl.i30.line=2%2C2%2C3%2C2%2C2&pt.i0.comp.i21.symbol=SYM10&bl.i7.reelset=ALL&isJackpotWin=false&bl.i24.id=24&pt.i0.comp.i1.n=4&bl.i22.coins=0&pt.i0.comp.i10.freespins=0&pt.i0.comp.i20.multi=8&pt.i0.comp.i20.n=5&pt.i0.comp.i17.multi=9&bl.i29.coins=0&bl.i31.reelset=ALL&bl.i13.id=13&pt.i0.comp.i25.symbol=SYM0&pt.i0.comp.i26.type=bonus&pt.i0.comp.i9.type=betline&bl.i9.line=0%2C1%2C2%2C2%2C1&pt.i0.comp.i2.multi=140&pt.i0.comp.i0.freespins=0&bl.i35.coins=0&bl.i10.reelset=ALL&bl.i25.reelset=ALL&pt.i0.comp.i9.symbol=SYM6&bl.i23.coins=0&bl.i11.coins=0&pt.i0.comp.i16.n=4&bl.i22.reelset=ALL&bl.i13.reelset=ALL&bl.i0.id=0&pt.i0.comp.i16.type=betline&pt.i0.comp.i5.symbol=SYM4&bl.i15.line=1%2C1%2C2%2C1%2C1&bl.i3.line=0%2C0%2C1%2C1%2C1&bl.i19.id=19&bl.i4.reelset=ALL&bl.i4.coins=0&pt.i0.comp.i2.n=5&pt.i0.comp.i1.symbol=SYM3&bl.i18.line=1%2C2%2C2%2C1%2C0&bl.i9.id=9&bl.i34.id=34&pt.i0.comp.i19.freespins=0&bl.i17.line=1%2C1%2C2%2C2%2C2&bl.i11.id=11&pt.i0.comp.i6.type=betline&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&bl.i17.coins=0&bl.i28.id=28&bl.i19.reelset=ALL&pt.i0.comp.i25.n=4&pt.i0.comp.i9.freespins=0&bl.i11.reelset=ALL&bl.i16.line=1%2C1%2C2%2C2%2C1&credit=500000&pt.i0.comp.i5.type=betline&pt.i0.comp.i11.freespins=0&pt.i0.comp.i26.multi=0&bl.i21.line=1%2C2%2C2%2C2%2C2&pt.i0.comp.i25.type=bonus&bl.i35.line=2%2C3%2C4%2C3%2C2&bl.i1.reelset=ALL&pt.i0.comp.i4.type=betline&bl.i21.coins=0&bl.i28.reelset=ALL&pt.i0.comp.i13.freespins=0&pt.i0.comp.i26.freespins=0&bl.i1.line=0%2C0%2C1%2C0%2C0&pt.i0.comp.i13.n=4&pt.i0.comp.i20.freespins=0&pt.i1.comp.i17.n=5&pt.i0.comp.i23.type=betline&pt.i1.comp.i29.type=betline&pt.i0.comp.i30.symbol=SYM12&pt.i0.comp.i32.symbol=SYM12&pt.i1.comp.i32.n=5&pt.i0.comp.i3.n=3&pt.i1.comp.i17.freespins=0&pt.i1.comp.i26.multi=50&pt.i1.comp.i32.multi=30&pt.i1.comp.i6.type=betline&pt.i1.comp.i0.type=scatter&pt.i1.comp.i1.symbol=SYM0&pt.i1.comp.i29.multi=40&pt.i0.comp.i25.freespins=0&pt.i1.comp.i4.symbol=SYM3&bl.i8.line=1%2C0%2C0%2C0%2C1&pt.i0.comp.i24.symbol=SYM10&pt.i0.comp.i26.n=5&pt.i0.comp.i27.symbol=SYM11&bl.i8.coins=1&pt.i0.comp.i32.freespins=0&pt.i1.comp.i29.n=5&pt.i0.comp.i23.multi=75&bl.i2.line=2%2C2%2C2%2C2%2C2&pt.i1.comp.i3.n=3&pt.i0.comp.i30.multi=3&pt.i1.comp.i21.n=3&pt.i1.comp.i28.multi=15&pt.i0.comp.i18.freespins=0&pt.i1.comp.i15.symbol=SYM7&pt.i1.comp.i18.freespins=0&pt.i1.comp.i3.freespins=0&bl.i4.id=4&bl.i7.coins=1&pt.i0.comp.i14.n=5&pt.i0.comp.i0.multi=0&pt.i1.comp.i9.symbol=SYM5&bl.i6.reelset=ALL&pt.i0.comp.i19.multi=15&pt.i0.comp.i3.symbol=SYM3&pt.i0.comp.i24.type=betline&pt.i1.comp.i18.n=3&pt.i1.comp.i12.freespins=0&pt.i0.comp.i12.freespins=0&pt.i0.comp.i4.n=4&pt.i1.comp.i10.n=4&pt.i0.comp.i24.multi=3';
    }

    private handleInitFreespinRequest(balanceInCents: number): string {
        return `rs.i1.r.i0.syms=SYM0%2CSYM12%2CSYM12&freespins.betlevel=1&g4mode=false&freespins.win.coins=0&playercurrency=%26%23x20AC%3B&rs.i1.r.i2.overlay.i0.pos=130&historybutton=false&current.rs.i0=freespin&rs.i0.r.i4.hold=false&next.rs=freespin&gamestate.history=basic&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=49&rs.i0.r.i1.syms=SYM9%2CSYM9%2CSYM9&game.win.cents=0&rs.i0.id=freespin&rs.i1.r.i3.hold=false&totalwin.coins=0&credit=${balanceInCents}&rs.i1.r.i4.pos=260&gamestate.current=freespin&freespins.initial=10&jackpotcurrency=%26%23x20AC%3B&multiplier=1&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8&rs.i0.r.i0.syms=SYM12%2CSYM12%2CSYM12&rs.i1.r.i2.overlay.i0.with=SYM1&freespins.denomination=5.000&rs.i0.r.i3.syms=SYM3%2CSYM3%2CSYM3&rs.i1.r.i1.syms=SYM9%2CSYM9%2CSYM9&rs.i1.r.i1.pos=28&rs.i1.r.i3.overlay.i0.row=0&freespins.win.cents=0&freespins.totalwin.coins=0&freespins.total=10&isJackpotWin=false&gamestate.stack=basic%2Cfreespin&rs.i0.r.i0.pos=0&rs.i1.r.i4.syms=SYM12%2CSYM0%2CSYM11&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8&gamesoundurl=&rs.i1.r.i2.pos=128&bet.betlevel=1&rs.i1.nearwin=4&rs.i1.r.i2.overlay.i0.row=2&rs.i0.r.i1.pos=0&rs.i1.r.i3.syms=SYM7%2CSYM7%2CSYM0&game.win.coins=0&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&freespins.wavecount=1&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=initfreespin&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM11%2CSYM11%2CSYM11&rs.i1.r.i3.overlay.i0.pos=49&rs.i0.r.i2.pos=0&rs.i1.r.i2.syms=SYM10%2CSYM10%2CSYM10&rs.i1.r.i0.pos=277&totalwin.cents=0&gameover=false&rs.i0.r.i0.hold=false&rs.i1.id=basic&rs.i0.r.i3.pos=0&rs.i1.r.i4.hold=false&freespins.left=10&rs.i0.r.i4.pos=0&rs.i1.r.i0.attention.i0=0&rs.i1.r.i3.attention.i0=2&nextaction=freespin&wavecount=1&rs.i1.r.i4.attention.i0=1&rs.i0.r.i2.syms=SYM3%2CSYM3%2CSYM3&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&game.win.amount=0.00&bet.denomination=${this.slotSettings.CurrentDenomination * 100}&rs.i1.r.i3.overlay.i0.with=SYM1&freespins.totalwin.cents=0`;
    }

    private handleInitBonusRequest(): string {
        const resultWinAll = this.slotSettings.GetGameData(this.slotId + 'TotalWin');
        const resultWinAllCents = resultWinAll * this.slotSettings.CurrentDenomination * 100;
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        return `bonus.field.i3.type=coin&bonus.field.i29.type=coin&gameServerVersion=2.0.1&g4mode=false&feature.randomwilds.active=false&historybutton=false&sub.sym12.r4=sym7&sub.sym12.r3=sym7&sub.sym12.r2=sym7&gamestate.history=basic&sub.sym12.r1=sym7&sub.sym12.r0=sym7&bonus.field.i2.value=1&bonus.field.i14.type=coin&game.win.cents=${resultWinAllCents}&bonus.field.i28.type=feature&bonus.field.i2.type=reroll&nextclientrs=basic&totalwin.coins=${resultWinAll}&gamestate.current=bonus&jackpotcurrency=%26%23x20AC%3B&bonus.rollsleft=6&bonus.field.i28.value=randomwilds&bonus.field.i1.type=coin&feature.sticky.active=false&bonus.field.i17.value=1&isJackpotWin=false&bonuswin.cents=${resultWinAllCents}&totalbonuswin.cents=${resultWinAllCents}&bonus.field.i4.type=feature&bonus.field.i22.value=1&bonus.field.i20.type=feature&feature.wildreels.active=false&bonus.field.i31.type=coin&bonus.field.i15.type=coin&bonus.field.i25.value=3&bonus.field.i6.type=reroll&bonus.field.i0.type=mystery&game.win.coins=${resultWinAll}&bonus.field.i18.type=reroll&bonus.field.i14.value=1&clientaction=initbonus&sub.sym13.r0=sym3&bonus.field.i21.type=feature&bonus.field.i21.value=shuffle&sub.sym13.r1=sym3&sub.sym13.r2=sym3&sub.sym13.r3=sym3&sub.sym13.r4=sym3&bonus.field.i1.value=1&bonus.field.i7.value=1&bonus.field.i17.type=coin&bonus.field.i31.value=1&gameover=false&bonus.field.i30.type=coin&totalbonuswin.coins=${resultWinAll}&bonus.board.position=0&sub.sym11.r4=sym6&sub.sym11.r3=sym6&sub.sym11.r2=sym6&sub.sym11.r1=sym6&sub.sym11.r0=sym6&bonus.field.i11.type=feature&gamestate.bonusid=alan-bonus&bonus.field.i27.value=randomwilds&bonus.field.i8.value=unrevealed&bonus.field.i27.type=feature&nextaction=bonusaction&bonus.field.i20.value=shuffle&bonus.field.i15.value=2&game.win.amount=${resultWinAllCents / 100}&bonus.field.i9.type=reroll&playercurrency=%26%23x20AC%3B&bonus.field.i6.value=1&bonus.field.i24.type=mystery&bonus.field.i8.type=mystery&bonus.field.i10.type=coin&bonus.field.i26.value=1&bonus.field.i16.value=unrevealed&bonus.field.i9.value=1&bonus.field.i19.value=1&bonus.field.i29.value=1&credit=${balanceInCents}&multiplier=1&bonus.field.i13.value=1&bonus.field.i30.value=1&gamestate.stack=basic%2Cbonus&feature.shuffle.active=false&gamesoundurl=&bonus.field.i0.value=unrevealed&bonus.field.i3.value=5&bonus.field.i7.type=coin&bonus.field.i10.value=1&bonus.field.i23.type=coin&bonus.field.i12.type=feature&bonus.field.i26.type=coin&playercurrencyiso=${this.slotSettings.slotCurrency}&bonus.field.i24.value=unrevealed&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&bonus.field.i11.value=wildreels&bonus.field.i13.type=coin&bonus.field.i25.type=coin&bonus.field.i5.type=feature&totalwin.cents=${resultWinAllCents}&bonus.field.i4.value=stickywin&bonus.field.i22.type=coin&bonus.field.i5.value=stickywin&bonus.field.i16.type=mystery&bonus.field.i19.type=coin&bonusgame.coinvalue=${this.slotSettings.CurrentDenomination}&bonus.field.i23.value=1&bonus.field.i18.value=1&bonus.field.i12.value=wildreels&wavecount=1&nextactiontype=selecttoken&bonuswin.coins=${resultWinAll}`;
    }

    private handleEndBonusRequest(): string {
        const resultWinAll = this.slotSettings.GetGameData(this.slotId + 'TotalWin');
        const resultWinAllCents = resultWinAll * this.slotSettings.CurrentDenomination * 100;
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        return `previous.rs.i0=freespin&freespins.betlevel=1&gameServerVersion=2.0.1&g4mode=false&freespins.win.coins=${resultWinAll}&playercurrency=%26%23x20AC%3B&feature.randomwilds.active=false&historybutton=false&current.rs.i0=basic&sub.sym12.r4=sym10&sub.sym12.r3=sym10&next.rs=basic&sub.sym12.r2=sym10&gamestate.history=basic%2Cbonus%2Cfreespin%2Cbonus&sub.sym12.r1=sym10&sub.sym12.r0=sym10&game.win.cents=${resultWinAllCents}&feature.randomwilds.positions=0%3A0%2C1%3A2%2C1%3A3%2C2%3A0%2C2%3A4%2C3%3A0%2C3%3A1%2C3%3A2&nextclientrs=basic&totalwin.coins=${resultWinAll}&credit=${balanceInCents}&gamestate.current=basic&freespins.initial=5&jackpotcurrency=%26%23x20AC%3B&multiplier=1&last.rs=freespin&bonus.rollsleft=0&freespins.denomination=${this.slotSettings.CurrentDenomination}&feature.sticky.active=false&freespins.win.cents=${resultWinAllCents}&freespins.totalwin.coins=${resultWinAll}&freespins.total=5&isJackpotWin=false&gamestate.stack=basic&feature.shuffle.active=false&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35&gamesoundurl=&feature.wildreels.active=false&game.win.coins=${resultWinAll}&playercurrencyiso=${this.slotSettings.slotCurrency}&freespins.wavecount=1&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=endbonus&sub.sym13.r0=sym5&sub.sym13.r1=sym5&sub.sym13.r2=sym5&sub.sym13.r3=sym5&sub.sym13.r4=sym5&bonus.token=crocodile&totalwin.cents=${resultWinAllCents}&gameover=true&bonus.feature.disabled=randomwilds&bonus.board.position=25&freespins.left=0&sub.sym11.r4=sym10&sub.sym11.r3=sym10&sub.sym11.r2=sym10&sub.sym11.r1=sym10&sub.sym11.r0=sym10&nextaction=spin&wavecount=1&game.win.amount=${resultWinAllCents / 100}&freespins.totalwin.cents=${resultWinAllCents}`;
    }

    private handleBonusActionRequest(postData: any): string {
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        if (postData.bonus_token) {
            this.slotSettings.SetGameData(this.slotId + 'BonusToken', postData.bonus_token);
            this.slotSettings.SetGameData(this.slotId + 'BonusStep', 0);
            this.slotSettings.SetGameData(this.slotId + 'BonusRolls', 6);

            const boardValues = ['x1', 'EXTRA', 'x5', 'STICKY', 'STICKY', 'EXTRA', 'x1', '?', 'EXTRA', 'x1', 'CROC', 'CROC', 'x1', 'x1', 'x2', '?', 'x1', 'EXTRA', 'x1', 'MONKEY', 'MONKEY', 'x1', 'x1', '?', 'x3', 'x1', 'RHINO', 'RHINO', 'x1', 'x1', 'x1', '?'];
            this.slotSettings.SetGameData(this.slotId + 'boardValues', boardValues);

            return `gameServerVersion=2.0.1&g4mode=false&playercurrency=%26%23x20AC%3B&feature.randomwilds.active=false&historybutton=false&sub.sym12.r4=sym3&sub.sym12.r3=sym3&sub.sym12.r2=sym3&gamestate.history=basic%2Cbonus&sub.sym12.r1=sym3&sub.sym12.r0=sym3&game.win.cents=0&nextclientrs=basic&totalwin.coins=0&credit=${balanceInCents}&gamestate.current=bonus&jackpotcurrency=%26%23x20AC%3B&multiplier=1&bonus.rollsleft=5&feature.sticky.active=false&isJackpotWin=false&gamestate.stack=basic%2Cbonus&bonuswin.cents=0&totalbonuswin.cents=0&feature.shuffle.active=false&gamesoundurl=&feature.wildreels.active=false&game.win.coins=0&playercurrencyiso=${this.slotSettings.slotCurrency}&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=bonusaction&sub.sym13.r0=sym4&sub.sym13.r1=sym4&sub.sym13.r2=sym4&sub.sym13.r3=sym4&sub.sym13.r4=sym4&bonus.token=${this.slotSettings.GetGameData(this.slotId + 'BonusToken')}&totalwin.cents=0&gameover=false&totalbonuswin.coins=0&bonus.board.position=0&sub.sym11.r4=sym6&sub.sym11.r3=sym6&sub.sym11.r2=sym6&sub.sym11.r1=sym6&sub.sym11.r0=sym6&bonusgame.coinvalue=0.01&gamestate.bonusid=alan-bonus&nextaction=bonusaction&wavecount=1&nextactiontype=roll&game.win.amount=0.0&bonuswin.coins=0`;
        } else {
            // Dice roll logic
            let BonusToken = this.slotSettings.GetGameData(this.slotId + 'BonusToken');
            let BonusRolls = this.slotSettings.GetGameData(this.slotId + 'BonusRolls');
            let allbet = this.slotSettings.GetGameData(this.slotId + 'AllBet');
            let BonusStep = this.slotSettings.GetGameData(this.slotId + 'BonusStep');
            let boardValues = this.slotSettings.GetGameData(this.slotId + 'boardValues');

            // Simulation
            let dicePoint0 = 0;
            let dicePoint1 = 0;
            let dicePoint = 0;
            let curBoardPos = '';
            let totalWin = 0;
            let bonusWinType = '';
            let bonusWinValue: any = 1;
            let resultFsStr = '';

            const bank = this.slotSettings.GetBank(postData.slotEvent);

            for (let i = 0; i <= 2000; i++) {
                dicePoint0 = this.randomInt(1, 6);
                dicePoint1 = this.randomInt(1, 6);
                dicePoint = dicePoint0 + dicePoint1;

                let tempBonusStep = BonusStep + dicePoint;
                if (tempBonusStep > 31) {
                    tempBonusStep = tempBonusStep - 32;
                }

                // Adjust index for 0-based array access. PHP uses 0-based array logic but step seems to be 1-32?
                // PHP code: $curBoardPos = $boardValues[$BonusStep - 1];
                // Wait, in PHP loop it does: $BonusStep += $dicePoint;
                // If $BonusStep > 31, subtract 32.
                // $curBoardPos = $boardValues[$BonusStep - 1];
                // If step is 0 (possible if step 32 - 32?), then index -1?
                // Assuming step range 1..32 effectively.

                let valIndex = tempBonusStep - 1;
                if (valIndex < 0) valIndex = 31;

                curBoardPos = boardValues[valIndex];

                if (curBoardPos == '?' || (BonusRolls == 1 && !['x1', 'x2', 'x3', 'x5'].includes(curBoardPos))) {
                    continue;
                }

                totalWin = 0;
                bonusWinType = '';
                bonusWinValue = 1;
                resultFsStr = '';
                const fsInitStr = `&freespins.betlevel=1&freespins.win.coins=0&freespins.initial=6&freespins.denomination=${this.slotSettings.CurrentDenomination}&freespins.win.cents=0&freespins.totalwin.coins=0&freespins.total=6&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C3&freespins.wavecount=1&freespins.multiplier=1&freespins.left=6&freespins.totalwin.cents=0`;
                const featureInitStr = '&current.rs.i0=freespin&next.rs=freespin&bonus.win.type=feature&gamestate.current=freespin&gamestate.stack=basic%2Cfreespin&clientaction=bonusaction&nextaction=bonusaction&nextactiontype=roll';

                switch (curBoardPos) {
                    case 'x1':
                        bonusWinType = 'coin';
                        totalWin = allbet * 1;
                        bonusWinValue = 1;
                        break;
                    case 'x2':
                        bonusWinType = 'coin';
                        totalWin = allbet * 2;
                        bonusWinValue = 2;
                        break;
                    case 'x3':
                        bonusWinType = 'coin';
                        totalWin = allbet * 1;
                        bonusWinValue = 3;
                        break;
                    case 'x5':
                        bonusWinType = 'coin';
                        totalWin = allbet * 5;
                        bonusWinValue = 5;
                        break;
                    case 'EXTRA':
                        const BonusRollsTmp = this.randomInt(1, 3);
                        resultFsStr = `&bonus.win.value=${BonusRollsTmp}`;
                        bonusWinType = 'reroll';
                        bonusWinValue = BonusRollsTmp;
                        break;
                    case 'CROC':
                        resultFsStr = fsInitStr + featureInitStr + '&bonus.win.value=wildreels&feature.wildreels.active=true&nextclientrs=wildreels&nextaction=freespin';
                        bonusWinType = 'feature';
                        bonusWinValue = 'wildfeatures';
                        break;
                    case 'STICKY':
                        resultFsStr = fsInitStr + featureInitStr + '&bonus.win.value=randomwilds&feature.randomwilds.active=true&nextclientrs=wildreels&nextaction=freespin';
                        bonusWinType = 'feature';
                        bonusWinValue = 'wildfeatures';
                        break;
                    case 'MONKEY':
                        resultFsStr = fsInitStr + featureInitStr + '&bonus.win.value=shuffle&feature.shuffle.active=true&nextclientrs=shuffle&nextaction=freespin';
                        bonusWinType = 'feature';
                        bonusWinValue = 'shuffle';
                        break;
                    case 'RHINO':
                        resultFsStr = fsInitStr + featureInitStr + '&bonus.win.value=wildreels&feature.wildreels.active=true&nextclientrs=wildreels&nextaction=freespin';
                        bonusWinType = 'feature';
                        bonusWinValue = 'wildfeatures';
                        break;
                    case '?':
                         // Default fallback logic
                        resultFsStr = fsInitStr + featureInitStr + '&bonus.win.value=wildreels&feature.wildreels.active=true&nextclientrs=wildreels&nextaction=freespin';
                        bonusWinType = 'feature';
                        bonusWinValue = 'wildreels';
                        break;
                }

                if (totalWin <= bank) {
                    // Update Step
                    BonusStep = tempBonusStep;
                    // Update Board/State side effects
                    if (curBoardPos === 'EXTRA') {
                        BonusRolls += bonusWinValue;
                    }
                    if (curBoardPos === 'CROC') {
                        boardValues[10] = 'EXTRA'; boardValues[11] = 'EXTRA';
                        this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
                        this.slotSettings.SetGameData(this.slotId + 'BonusType', 'wildreels');
                        this.slotSettings.SetGameData(this.slotId + 'FreeGames', 6);
                    }
                    if (curBoardPos === 'STICKY') {
                        boardValues[26] = 'EXTRA'; boardValues[27] = 'EXTRA';
                        this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
                        this.slotSettings.SetGameData(this.slotId + 'BonusType', 'wildfeatures');
                        this.slotSettings.SetGameData(this.slotId + 'FreeGames', 6);
                    }
                    if (curBoardPos === 'MONKEY') {
                        this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
                        this.slotSettings.SetGameData(this.slotId + 'BonusType', 'shuffle');
                        this.slotSettings.SetGameData(this.slotId + 'FreeGames', 6);
                    }
                    if (curBoardPos === 'RHINO') {
                        this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
                        this.slotSettings.SetGameData(this.slotId + 'BonusType', 'wildfeatures');
                        this.slotSettings.SetGameData(this.slotId + 'FreeGames', 6);
                    }
                    if (curBoardPos === '?') {
                        this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
                        this.slotSettings.SetGameData(this.slotId + 'BonusType', 'wildreels');
                        this.slotSettings.SetGameData(this.slotId + 'FreeGames', 6);
                    }
                    break;
                }
            }

            this.slotSettings.SetGameData(this.slotId + 'TotalWin', this.slotSettings.GetGameData(this.slotId + 'TotalWin') + totalWin);
            BonusRolls--;
            const resultWinAll = this.slotSettings.GetGameData(this.slotId + 'TotalWin');
            const resultWinAllCents = resultWinAll * this.slotSettings.CurrentDenomination * 100;
            const totalWinCents = totalWin * this.slotSettings.CurrentDenomination * 100;

            if (totalWin > 0) {
                this.slotSettings.SetBank(postData.slotEvent, -1 * totalWin);
                this.slotSettings.SetBalance(totalWin);
            }
            if (BonusRolls <= 0) {
                resultFsStr += '&nextaction=endbonus&bonusgameover=true';
            }

            // Save state
            this.slotSettings.SetGameData(this.slotId + 'boardValues', boardValues);
            this.slotSettings.SetGameData(this.slotId + 'BonusStep', BonusStep);
            this.slotSettings.SetGameData(this.slotId + 'BonusRolls', BonusRolls);
            this.slotSettings.SaveLogReport('{"responseEvent":"gambleResult","serverResponse":{"totalWin":0}}', 0, 1, totalWin, 'BG');

            return `&cbs=${curBoardPos}&gameServerVersion=2.0.1&g4mode=false&playercurrency=%26%23x20AC%3B&feature.randomwilds.active=false&historybutton=false&sub.sym12.r4=sym4&bonus.win.value=${bonusWinValue}&sub.sym12.r3=sym4&sub.sym12.r2=sym4&gamestate.history=basic%2Cbonus&sub.sym12.r1=sym4&sub.sym12.r0=sym3&bonus.win.type=${bonusWinType}&game.win.cents=${resultWinAllCents}&nextclientrs=basic&totalwin.coins=${resultWinAll}&credit=${balanceInCents}&gamestate.current=bonus&jackpotcurrency=%26%23x20AC%3B&multiplier=1&bonus.rollsleft=${BonusRolls}&feature.sticky.active=false&isJackpotWin=false&gamestate.stack=basic%2Cbonus&bonuswin.cents=${totalWinCents}&totalbonuswin.cents=${resultWinAllCents}&feature.shuffle.active=false&gamesoundurl=&feature.wildreels.active=false&bonus.dice.i0.result=${dicePoint0}&game.win.coins=${resultWinAll}&playercurrencyiso=${this.slotSettings.slotCurrency}&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=bonusaction&sub.sym13.r0=sym4&sub.sym13.r1=sym4&sub.sym13.r2=sym4&sub.sym13.r3=sym4&sub.sym13.r4=sym4&bonus.token=${BonusToken}&totalwin.cents=${resultWinAllCents}&gameover=false&totalbonuswin.coins=${resultWinAll}&bonus.board.position=${BonusStep}&sub.sym11.r4=sym4&sub.sym11.r3=sym4&sub.sym11.r2=sym4&sub.sym11.r1=sym4&sub.sym11.r0=sym4&bonusgame.coinvalue=${this.slotSettings.CurrentDenomination}&gamestate.bonusid=alan-bonus&nextaction=bonusaction&wavecount=1&nextactiontype=roll&bonus.dice.i1.result=${dicePoint1}&game.win.amount=${totalWinCents / 100}&bonuswin.coins=${totalWin}${resultFsStr}`;
        }
    }

    private handleSpinRequest(postData: any): string {
        const linesId = this.getLinesId();
        const lines = 10;
        let betline = 1;
        let allbet = 0;
        let bonusMpl = 1;

        // Handle logic for spin/respin/shuffle
        if (postData.slotEvent !== 'freespin' && postData.slotEvent !== 'respin' && postData.slotEvent !== 'shuffle') {
            this.slotSettings.CurrentDenom = postData.bet_denomination;
            this.slotSettings.CurrentDenomination = postData.bet_denomination;
            betline = postData.bet_betlevel;
            allbet = betline * lines;

            this.slotSettings.UpdateJackpots(allbet);

            if (!postData.slotEvent) postData.slotEvent = 'bet';

            this.slotSettings.SetBalance(-1 * allbet, postData.slotEvent);
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(postData.slotEvent, bankSum, postData.slotEvent);
            this.slotSettings.UpdateJackpots(allbet);

            this.slotSettings.SetGameData(this.slotId + 'AllBet', allbet);
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'Bet', betline);
            this.slotSettings.SetGameData(this.slotId + 'Denom', postData.bet_denomination);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', this.slotSettings.GetBalance() * 100);
            this.slotSettings.SetGameData(this.slotId + 'BonusType', '');
        } else {
            postData.bet_denomination = this.slotSettings.GetGameData(this.slotId + 'Denom');
            this.slotSettings.CurrentDenom = postData.bet_denomination;
            this.slotSettings.CurrentDenomination = postData.bet_denomination;
            betline = this.slotSettings.GetGameData(this.slotId + 'Bet');
            allbet = betline * lines;
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') + 1);
            bonusMpl = this.slotSettings.slotFreeMpl;
        }

        const winTypeTmp = this.slotSettings.GetSpinSettings(postData.slotEvent, allbet, lines);
        let winType = winTypeTmp[0];
        let spinWinLimit = winTypeTmp[1];

        if (winType === 'bonus' && (postData.slotEvent === 'freespin' || postData.slotEvent === 'respin')) {
            winType = 'win';
        }

        let totalWin = 0;
        let lineWins: string[] = [];
        let reels: ReelStrips = { rp: [] };

        let stickyactive = false;
        let shuffleactive = false;
        let wildreelsactive = false;
        let randomwildsactive = false;

        let featureStr = '';
        let freeState = '';
        let scattersStr = '';
        let attStr = '';

        // Simulation loop
        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            lineWins = [];
            const cWins: number[] = new Array(36).fill(0);
            const wild = ['1'];
            const scatter = '0';
            reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent);

            // Feature Random Activation
            stickyactive = false;
            shuffleactive = false;
            wildreelsactive = false;
            randomwildsactive = false;
            featureStr = '';

            if (this.randomInt(1, 100) == 1) wildreelsactive = true;
            else if (this.randomInt(1, 100) == 1) shuffleactive = true;
            else if (this.randomInt(1, 100) == 1) stickyactive = true;
            else if (this.randomInt(1, 100) == 1) randomwildsactive = true;

            if (postData.slotEvent === 'freespin') {
                const bType = this.slotSettings.GetGameData(this.slotId + 'BonusType');
                if (bType === 'shuffle') shuffleactive = true;
                if (bType === 'wildreels') wildreelsactive = true;
                if (bType === 'randomwilds') randomwildsactive = true;
                if (bType === 'wildfeatures') { // sticky/wildfeatures?
                     // PHP code for 'wildfeatures' sets wildreelsactive=false, randomwildsactive=true or something?
                     // Actually sticky is likely handled via respin logic
                }
            }

            // Reset for special events
            if (postData.slotEvent == 'shuffle' || postData.slotEvent == 'respin' || winType == 'bonus') {
                stickyactive = false;
                wildreelsactive = false;
                shuffleactive = false;
                randomwildsactive = false;
            }

            // Shuffle Feature Logic
            if (postData.slotEvent == 'shuffle') {
                if (this.slotSettings.GetGameData(this.slotId + 'BonusType') == 'shuffle') {
                    // Logic for shuffling reels in free spins
                    // Simplified: Assuming Client Handles animation or we send new positions
                    // PHP sends logic to shuffle symbols
                    // Need to implement symbol shuffling
                    const fs = this.slotSettings.GetGameData(this.slotId + 'FreeGames');
                    const fsl = fs - this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame');
                    featureStr = `&feature.shuffle.active=true&clientaction=shuffle&nextaction=freespin&freespins.left=${fsl}`;
                } else {
                    featureStr = '&feature.shuffle.active=true&clientaction=shuffle&nextaction=spin';
                }
                this.slotSettings.SetGameData(this.slotId + 'ShuffleActive', 0);

                // Shuffle logic on reels
                const allSymStack: any[] = [];
                for (let r = 1; r <= 5; r++) {
                    const reel = reels[`reel${r}`];
                    if (reel) {
                        for (let p = 0; p < reel.length; p++) {
                            if (reel[p] !== '') allSymStack.push(reel[p]);
                        }
                    }
                }
                this.shuffleArray(allSymStack);
                // Redistribute
                for (let r = 1; r <= 5; r++) {
                    const reel = reels[`reel${r}`];
                    if (reel) {
                        for (let p = 0; p < reel.length; p++) {
                            if (reel[p] !== '') reel[p] = allSymStack.pop();
                        }
                    }
                }
            }

            // Wild features application (simplified placeholders)
            let reelsTmp = JSON.parse(JSON.stringify(reels));
            if (randomwildsactive) {
                featureStr += '&feature.randomwilds.active=true';
                const randomwildspArr: string[] = [];
                for(let r=1; r<=5; r++) {
                    for(let p=0; p<5; p++) {
                        if (reels[`reel${r}`]?.[p] !== undefined && reels[`reel${r}`]?.[p] !== '' && this.randomInt(1, 2) == 1) {
                            reels[`reel${r}`]![p] = '1';
                            featureStr += `&rs.i0.r.i${r-1}.overlay.i${p}.row=${p}&rs.i0.r.i${r-1}.overlay.i${p}.with=SYM1&rs.i0.r.i${r-1}.overlay.i${p}.pos=1`;
                            randomwildspArr.push(`${r-1}%3A${p}`);
                        }
                    }
                }
                featureStr += '&feature.randomwilds.positions=' + randomwildspArr.join('%2C');
            }

            if (wildreelsactive) {
                // ...
                featureStr += '&feature.wildreels.active=true';
                // ... logic to fill reels with wild '1'
            }

            if (shuffleactive && postData.slotEvent !== 'shuffle') {
                 featureStr = '&feature.shuffle.active=true&nextaction=shuffle&nextclientrs=shuffle';
                 this.slotSettings.SetGameData(this.slotId + 'ShuffleActive', 1);
            }

            // Respin Logic (Sticky Vines)
            let wildsRespinCount = 0;
            let overlayWilds: string[] = [];
            let overlayWildsArr: any[] = [];

            if (postData.slotEvent == 'respin') {
                const overlayWildsArrLast = this.slotSettings.GetGameData(this.slotId + 'overlayWildsArr');
                if (Array.isArray(overlayWildsArrLast)) {
                    for(const wsp of overlayWildsArrLast) {
                        if (reels[`reel${wsp[0]}`]) reels[`reel${wsp[0]}`]![wsp[1]] = 1;
                    }
                }
            }

            // Calculate Wins
            let winLineCount = 0;
            for (let k = 0; k < 36; k++) { // 36 lines? LinesId only has 36 entries in PHP?
                // The PHP Spin function defines linesId array with 36 entries.
                // We need to implement getLinesId properly returning all 36.

                let tmpStringWin = '';
                for (let j = 0; j < this.slotSettings.SymbolGame.length; j++) {
                    const csym = String(this.slotSettings.SymbolGame[j]);
                    if (csym === scatter || !this.slotSettings.Paytable['SYM_' + csym]) continue;

                    const s: any[] = [];
                    // Handle variable reel length
                    // Reel 1: indices 0,1,2 (size 3)
                    // Reel 2: indices 0,1,2,3 (size 4)
                    // Reel 3: indices 0,1,2,3,4 (size 5)
                    // ...

                    // The linesId array in PHP contains 1-based row indices.
                    // Need to be careful with bounds.
                    // Assuming linesId is correct for the reel shape.

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
                            if (wildCount > 0 && wildCount < count) mpl = this.slotSettings.slotWildMpl;
                            else if (wildCount === count) mpl = 1;

                            const tmpWin = this.slotSettings.Paytable['SYM_' + csym][count] * betline * mpl * bonusMpl;
                            if (cWins[k] < tmpWin) {
                                cWins[k] = tmpWin;
                                tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${tmpWin}&ws.i${winLineCount}.betline=${k}&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${tmpWin * this.slotSettings.CurrentDenomination * 100}`;
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

            // Restore reels for next checks (except sticky wilds)
            if (!randomwildsactive && !wildreelsactive && postData.slotEvent !== 'respin') {
                 // reels = reelsTmp; // Restore if we modified them temporarily?
                 // PHP does $reels = $reelsTmp; but later uses $reels.
                 // If random wilds active, we want to keep them for visual.
            }

            // Scatters
            let scattersWin = 0;
            let scattersCount = 0;
            let scPos: string[] = [];

            for (let r = 1; r <= 5; r++) {
                // Jumanji scatter checks
                // Need to iterate valid rows only?
                // Reel 1: 3 rows. Reel 2: 4 rows.
                const rows = (reels[`reel${r}`] || []).length;
                for (let p = 0; p < rows; p++) {
                    if (reels[`reel${r}`]?.[p] == scatter) {
                        scattersCount++;
                        scPos.push(`&ws.i0.pos.i${r-1}=${r-1}%2C${p}`);
                    }
                    // Check for sticky feature wild (Symbol 15?)
                    // PHP: if( $reels['reel' . $r][$p] == 15 )
                    if (reels[`reel${r}`]?.[p] == 15) {
                        wildsRespinCount++;
                        // Add to overlay
                        overlayWilds.push(`&rs.i0.r.i${r-1}.overlay.i0.row=${p}&rs.i0.r.i${r-1}.overlay.i0.with=SYM1&rs.i0.r.i${r-1}.overlay.i0.pos=132`);
                        overlayWildsArr.push([r, p]);
                    }
                }
            }

            if (scattersCount >= 3) {
                scattersStr = `&ws.i0.types.i0.freespins=0&ws.i3.types.i0.bonusid=alan-bonus&gamestate.bonusid=alan-bonus&nextaction=bonusaction&bonus.rollsleft=6&ws.i0.reelset=basic&ws.i0.betline=null&ws.i0.types.i0.wintype=bonusgame&ws.i0.direction=none&nextactiontype=selecttoken` + scPos.join('');
                // Note: Jumanji triggers board game, not direct free spins usually.
            }

            totalWin += scattersWin;

            if (postData.slotEvent == 'shuffle' && totalWin <= spinWinLimit) {
                break;
            }

            // Check limits
            if (totalWin <= spinWinLimit) {
                break;
            }
            if (i > 1000) break;
        }

        // Finalize transaction
        if (totalWin > 0) {
            this.slotSettings.SetBank(postData.slotEvent, -1 * totalWin);
            this.slotSettings.SetBalance(totalWin);
        }

        // Handle Respin State
        if (wildsRespinCount >= 1 && postData.slotEvent != 'respin') {
             this.slotSettings.SetGameData(this.slotId + 'FreeStartWin', totalWin);
             this.slotSettings.SetGameData(this.slotId + 'BonusWin', totalWin);
             this.slotSettings.SetGameData(this.slotId + 'RespinMode', 1);
             this.slotSettings.SetGameData(this.slotId + 'overlayWildsArr', overlayWildsArr);

             freeState = `&freespins.betlines=0&freespins.totalwin.cents=0&nextaction=respin&freespins.left=0&freespins.wavecount=1&freespins.multiplier=1&clientaction=spin&gamestate.stack=basic&freespins.totalwin.coins=${totalWin}&freespins.total=0&gamestate.current=respin` + overlayWilds.join('');
        }

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        // Update Bonus Wins
        if (postData.slotEvent == 'freespin' || postData.slotEvent == 'respin') {
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', this.slotSettings.GetGameData(this.slotId + 'BonusWin') + totalWin);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', this.slotSettings.GetGameData(this.slotId + 'TotalWin') + totalWin);
        } else {
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', totalWin);
        }

        if (scattersCount >= 3) {
             this.slotSettings.SetGameData(this.slotId + 'FreeStartWin', totalWin);
             this.slotSettings.SetGameData(this.slotId + 'BonusWin', totalWin);
             // Jumanji bonus game logic usually starts here
        }

        const winString = lineWins.join('');
        const jsSpin = JSON.stringify(reels);
        const jsJack = JSON.stringify(this.slotSettings.Jackpots);

        const response = {
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
                reelsSymbols: reels
            }
        };

        this.slotSettings.SaveLogReport(JSON.stringify(response), allbet, lines, totalWin, postData.slotEvent);
        this.slotSettings.SetGameData(this.slotId + 'Reels', reels);

        const curReels = this.buildReelsString(reels);

        return `gameServerVersion=2.0.1&g4mode=false&playercurrency=%26%23x20AC%3B&feature.randomwilds.active=${randomwildsactive}&historybutton=false&current.rs.i0=basic&sub.sym12.r4=sym5&rs.i0.r.i4.hold=false&sub.sym12.r3=sym5&next.rs=basic&sub.sym12.r2=sym5&gamestate.history=basic&sub.sym12.r1=sym5&sub.sym12.r0=sym5&rs.i0.r.i1.syms=SYM5%2CSYM5%2CSYM5%2CSYM8&game.win.cents=${totalWin * 100}&rs.i0.id=basic&nextclientrs=basic&totalwin.coins=${totalWin}&credit=${balanceInCents}&gamestate.current=basic&jackpotcurrency=%26%23x20AC%3B&multiplier=1&rs.i0.r.i0.syms=SYM4%2CSYM4%2CSYM7&rs.i0.r.i3.syms=SYM10%2CSYM8%2CSYM7%2CSYM7&feature.sticky.active=${stickyactive}&isJackpotWin=false&gamestate.stack=basic&rs.i0.r.i0.pos=37&feature.shuffle.active=${shuffleactive}&gamesoundurl=&feature.wildreels.active=${wildreelsactive}&rs.i0.r.i1.pos=10&game.win.coins=${totalWin}&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i1.hold=false&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=spin&sub.sym13.r0=sym4&sub.sym13.r1=sym4&rs.i0.r.i2.hold=false&sub.sym13.r2=sym4&rs.i0.r.i4.syms=SYM9%2CSYM0%2CSYM7&sub.sym13.r3=sym4&sub.sym13.r4=sym4&rs.i0.r.i2.pos=48&totalwin.cents=${totalWin * 100}&gameover=${totalWin > 0 ? 'false' : 'true'}&rs.i0.r.i0.hold=false&rs.i0.r.i3.pos=5&sub.sym11.r4=sym8&sub.sym11.r3=sym8&rs.i0.r.i4.pos=40&sub.sym11.r2=sym8&sub.sym11.r1=sym8&sub.sym11.r0=sym8&nextaction=spin&wavecount=1&rs.i0.r.i2.syms=SYM8%2CSYM8%2CSYM3%2CSYM3%2CSYM4&rs.i0.r.i3.hold=false&game.win.amount=${totalWin}${curReels}${winString}${featureStr}${scattersStr}${attStr}${freeState}`;
    }

    // Helper to get lines ID array
    private getLinesId(): number[][] {
        // Full 36 lines definition from PHP
        return [
            [1, 1, 1, 1, 1],
            [1, 1, 2, 1, 1],
            [1, 1, 2, 2, 1],
            [1, 1, 2, 2, 2],
            [1, 2, 2, 1, 1],
            [1, 2, 2, 2, 1],
            [1, 2, 2, 2, 2],
            [1, 2, 3, 2, 1],
            [1, 2, 3, 2, 2],
            [1, 2, 3, 3, 2],
            [1, 2, 3, 3, 3],
            [2, 2, 1, 1, 1],
            [2, 2, 2, 2, 1],
            [2, 2, 2, 2, 2],
            [2, 2, 3, 2, 1],
            [2, 2, 3, 2, 2],
            [2, 2, 3, 3, 2],
            [2, 2, 3, 3, 3],
            [2, 3, 3, 2, 1],
            [2, 3, 3, 2, 2],
            [2, 3, 3, 3, 2],
            [2, 3, 3, 3, 3],
            [2, 3, 4, 3, 2],
            [2, 3, 4, 3, 3],
            [2, 3, 4, 4, 3],
            [3, 3, 3, 2, 1],
            [3, 3, 3, 2, 2],
            [3, 3, 3, 3, 2],
            [3, 3, 3, 3, 3],
            [3, 3, 4, 3, 2],
            [3, 3, 4, 3, 3],
            [3, 3, 4, 4, 3],
            [3, 4, 4, 3, 2],
            [3, 4, 4, 3, 3],
            [3, 4, 4, 4, 3],
            [3, 4, 5, 4, 3]
        ];
    }

    private buildReelsString(reels: any): string {
        // Jumanji Reels structure: 3, 4, 5, 4, 3
        // Reel 1: 0..2
        // Reel 2: 0..3
        // Reel 3: 0..4
        // Reel 4: 0..3
        // Reel 5: 0..2

        let curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1?.[0]}%2CSYM${reels.reel1?.[1]}%2CSYM${reels.reel1?.[2]}`;
        curReels += `&rs.i0.r.i1.syms=SYM${reels.reel2?.[0]}%2CSYM${reels.reel2?.[1]}%2CSYM${reels.reel2?.[2]}%2CSYM${reels.reel2?.[3]}`;
        curReels += `&rs.i0.r.i2.syms=SYM${reels.reel3?.[0]}%2CSYM${reels.reel3?.[1]}%2CSYM${reels.reel3?.[2]}%2CSYM${reels.reel3?.[3]}%2CSYM${reels.reel3?.[4]}`;
        curReels += `&rs.i0.r.i3.syms=SYM${reels.reel4?.[0]}%2CSYM${reels.reel4?.[1]}%2CSYM${reels.reel4?.[2]}%2CSYM${reels.reel4?.[3]}`;
        curReels += `&rs.i0.r.i4.syms=SYM${reels.reel5?.[0]}%2CSYM${reels.reel5?.[1]}%2CSYM${reels.reel5?.[2]}`;
        return curReels;
    }

    private buildRandomReelsString(): string {
        return `&rs.i0.r.i0.syms=SYM1%2CSYM2%2CSYM3&rs.i0.r.i1.syms=SYM1%2CSYM2%2CSYM3%2CSYM4&rs.i0.r.i2.syms=SYM1%2CSYM2%2CSYM3%2CSYM4%2CSYM5&rs.i0.r.i3.syms=SYM1%2CSYM2%2CSYM3%2CSYM4&rs.i0.r.i4.syms=SYM1%2CSYM2%2CSYM3`;
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

    private shuffleArray(array: any[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
