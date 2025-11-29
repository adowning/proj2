// Server.ts - SpaceWarsNET game server
// Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines
// Data injection pattern - NO database calls or legacy PHP constructs

import { SlotSettings, ReelStrips } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'SpaceWarsNET';
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
        if (postData.action === 'respin') {
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
            const lines = 40;
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
            default:
                return this.createErrorResponse("unknown action");
        }
    }

    private handleInitRequest(): string {
        const lastEvent = this.slotSettings.GetHistory();

        // Reset game state
        this.slotSettings.SetGameData('SpaceWarsNETBonusWin', 0);
        this.slotSettings.SetGameData('SpaceWarsNETFreeGames', 0);
        this.slotSettings.SetGameData('SpaceWarsNETCurrentFreeGame', 0);
        this.slotSettings.SetGameData('SpaceWarsNETTotalWin', 0);
        this.slotSettings.SetGameData('SpaceWarsNETFreeBalance', 0);

        let curReels = '';
        if (lastEvent && lastEvent !== 'NULL') {
            const serverResponse = lastEvent.serverResponse;
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', serverResponse.totalFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', serverResponse.currentFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', serverResponse.Balance);

            const reels = serverResponse.reelsSymbols;
            curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1[0]}%2CSYM${reels.reel1[1]}%2CSYM${reels.reel1[2]}%2CSYM${reels.reel1[3]}`;
            curReels += `&rs.i0.r.i1.syms=SYM${reels.reel2[0]}%2CSYM${reels.reel2[1]}%2CSYM${reels.reel2[2]}%2CSYM${reels.reel2[3]}`;
            curReels += `&rs.i0.r.i2.syms=SYM${reels.reel3[0]}%2CSYM${reels.reel3[1]}%2CSYM${reels.reel3[2]}%2CSYM${reels.reel3[3]}`;
            curReels += `&rs.i0.r.i3.syms=SYM${reels.reel4[0]}%2CSYM${reels.reel4[1]}%2CSYM${reels.reel4[2]}%2CSYM${reels.reel4[3]}`;
            curReels += `&rs.i0.r.i4.syms=SYM${reels.reel5[0]}%2CSYM${reels.reel5[1]}%2CSYM${reels.reel5[2]}%2CSYM${reels.reel5[3]}`;
        } else {
            curReels = `&rs.i0.r.i0.syms=SYM${this.randomInt(1, 12)}%2CSYM${this.randomInt(1, 12)}%2CSYM${this.randomInt(1, 12)}%2CSYM${this.randomInt(1, 12)}`;
            curReels += `&rs.i0.r.i1.syms=SYM${this.randomInt(1, 12)}%2CSYM${this.randomInt(1, 12)}%2CSYM${this.randomInt(1, 12)}%2CSYM${this.randomInt(1, 12)}`;
            curReels += `&rs.i0.r.i2.syms=SYM${this.randomInt(1, 12)}%2CSYM${this.randomInt(1, 12)}%2CSYM${this.randomInt(1, 12)}%2CSYM${this.randomInt(1, 12)}`;
            curReels += `&rs.i0.r.i3.syms=SYM${this.randomInt(1, 12)}%2CSYM${this.randomInt(1, 12)}%2CSYM${this.randomInt(1, 12)}%2CSYM${this.randomInt(1, 12)}`;
            curReels += `&rs.i0.r.i4.syms=SYM${this.randomInt(1, 12)}%2CSYM${this.randomInt(1, 12)}%2CSYM${this.randomInt(1, 12)}%2CSYM${this.randomInt(1, 12)}`;
        }

        // Format denominations
        const denoms = this.slotSettings.Denominations.map(d => d * 100).join('%2C');
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        const standardDenom = this.slotSettings.CurrentDenomination * 100;

        // Construct the massive query string response
        let result = `bl.i32.reelset=ALL&bl.i6.coins=1&bl.i17.reelset=ALL&bl.i15.id=15&rs.i0.r.i4.hold=false&bl.i21.id=21&game.win.cents=0&staticsharedurl=&bl.i23.reelset=ALL&bl.i33.coins=1&bl.i10.line=1%2C0%2C1%2C0%2C1&bl.i0.reelset=ALL&bl.i20.coins=1&bl.i18.coins=1&bl.i10.id=10&bl.i3.reelset=ALL&bl.i4.line=3%2C2%2C1%2C2%2C3&bl.i13.coins=1&bl.i26.reelset=ALL&bl.i24.line=0%2C0%2C2%2C0%2C0&bl.i27.id=27&rs.i0.r.i0.syms=SYM8%2CSYM8%2CSYM8%2CSYM2&bl.i2.id=2&bl.i38.line=3%2C0%2C0%2C0%2C3&rs.i0.r.i0.pos=0&bl.i14.reelset=ALL&bl.i38.id=38&bl.i39.coins=1&game.win.coins=0&bl.i28.line=0%2C2%2C0%2C2%2C0&bl.i3.id=3&bl.i22.line=2%2C2%2C0%2C2%2C2&bl.i12.coins=1&bl.i8.reelset=ALL&clientaction=init&rs.i0.r.i2.hold=false&bl.i16.id=16&bl.i37.reelset=ALL&bl.i39.id=39&casinoID=netent&bl.i5.coins=1&bl.i8.id=8&rs.i0.r.i3.pos=0&bl.i33.id=33&bl.i6.line=0%2C1%2C2%2C1%2C0&bl.i22.id=22&bl.i12.line=1%2C2%2C1%2C2%2C1&bl.i0.line=1%2C1%2C1%2C1%2C1&bl.i29.reelset=ALL&bl.i34.line=2%2C1%2C1%2C1%2C2&bl.i31.line=1%2C2%2C2%2C2%2C1&rs.i0.r.i2.syms=SYM12%2CSYM12%2CSYM12%2CSYM5&bl.i34.coins=1&game.win.amount=null&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&denomination.all=${denoms}&bl.i27.coins=1&bl.i34.reelset=ALL&current.rs.i0=basic&bl.i30.reelset=ALL&bl.i1.id=1&bl.i33.line=3%2C2%2C2%2C2%2C3&bl.i25.id=25&denomination.standard=${standardDenom}&bl.i31.id=31&bl.i32.line=2%2C3%2C3%2C3%2C2&multiplier=1&bl.i14.id=14&bl.i19.line=0%2C0%2C1%2C0%2C0&bl.i12.reelset=ALL&bl.i2.coins=1&bl.i6.id=6&bl.i21.reelset=ALL&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&bl.i20.id=20&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&bl.i33.reelset=ALL&bl.i5.reelset=ALL&bl.i24.coins=1&bl.i19.coins=1&bl.i32.coins=1&bl.i7.id=7&bl.i18.reelset=ALL&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=1&bl.i32.id=32&bl.i14.line=1%2C1%2C0%2C1%2C1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM12%2CSYM12%2CSYM12%2CSYM5&bl.i25.coins=1&rs.i0.r.i2.pos=0&bl.i39.reelset=ALL&bl.i13.line=2%2C3%2C2%2C3%2C2&bl.i24.reelset=ALL&bl.i0.coins=1&bl.i2.reelset=ALL&bl.i31.coins=1&bl.i37.id=37&bl.i26.coins=1&bl.i27.reelset=ALL&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35%2C36%2C37%2C38%2C39&bl.i29.line=1%2C3%2C1%2C3%2C1&bl.i23.line=0%2C0%2C3%2C0%2C0&bl.i26.id=26&bl.i15.reelset=ALL&rs.i0.r.i3.hold=false&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&bl.i30.id=30&historybutton=false&bl.i25.line=1%2C1%2C3%2C1%2C1&bl.i5.id=5&gameEventSetters.enabled=false&next.rs=basic&bl.i36.reelset=ALL&rs.i0.r.i1.syms=SYM12%2CSYM12%2CSYM12%2CSYM5&bl.i3.coins=1&bl.i10.coins=1&bl.i18.id=18&bl.i30.coins=1&bl.i39.line=0%2C3%2C3%2C3%2C0&totalwin.coins=0&bl.i5.line=2%2C1%2C0%2C1%2C2&gamestate.current=basic&bl.i28.coins=1&bl.i27.line=2%2C0%2C2%2C0%2C2&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C3%2C2%2C1&bl.i35.id=35&rs.i0.r.i3.syms=SYM1%2CSYM1%2CSYM1%2CSYM1&bl.i16.coins=1&bl.i36.coins=1&bl.i9.coins=1&bl.i30.line=0%2C1%2C1%2C1%2C0&bl.i7.reelset=ALL&isJackpotWin=false&bl.i24.id=24&rs.i0.r.i1.pos=0&bl.i22.coins=1&bl.i29.coins=1&bl.i31.reelset=ALL&bl.i13.id=13&bl.i36.id=36&rs.i0.r.i1.hold=false&bl.i9.line=2%2C1%2C2%2C1%2C2&bl.i35.coins=1&betlevel.standard=1&bl.i10.reelset=ALL&gameover=true&bl.i25.reelset=ALL&bl.i23.coins=1&bl.i11.coins=1&bl.i22.reelset=ALL&bl.i13.reelset=ALL&bl.i0.id=0&nextaction=spin&bl.i15.line=2%2C2%2C1%2C2%2C2&bl.i3.line=3%2C3%2C3%2C3%2C3&bl.i19.id=19&bl.i4.reelset=ALL&bl.i4.coins=1&bl.i37.line=0%2C3%2C0%2C3%2C0&bl.i18.line=1%2C1%2C2%2C1%2C1&bl.i9.id=9&bl.i34.id=34&bl.i17.line=2%2C2%2C3%2C2%2C2&bl.i11.id=11&bl.i37.coins=1&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&bl.i17.coins=1&bl.i28.id=28&bl.i19.reelset=ALL&bl.i11.reelset=ALL&bl.i16.line=3%2C3%2C2%2C3%2C3&rs.i0.id=basic&bl.i38.reelset=ALL&credit=${balanceInCents}&bl.i21.line=3%2C3%2C1%2C3%2C3&bl.i35.line=1%2C0%2C0%2C0%2C1&bl.i1.reelset=ALL&bl.i21.coins=1&bl.i28.reelset=ALL&bl.i1.line=0%2C0%2C0%2C0%2C0&bl.i17.id=17&bl.i16.reelset=ALL&nearwinallowed=true&bl.i8.line=3%2C2%2C3%2C2%2C3&bl.i35.reelset=ALL&bl.i8.coins=1&bl.i23.id=23&bl.i15.coins=1&bl.i36.line=3%2C0%2C3%2C0%2C3&bl.i2.line=2%2C2%2C2%2C2%2C2&totalwin.cents=0&bl.i38.coins=1&rs.i0.r.i0.hold=false&restore=false&bl.i12.id=12&bl.i29.id=29&bl.i4.id=4&rs.i0.r.i4.pos=0&bl.i7.coins=1&bl.i6.reelset=ALL&bl.i20.line=3%2C3%2C0%2C3%2C3&bl.i20.reelset=ALL&wavecount=1&bl.i14.coins=1&bl.i26.line=3%2C1%2C3%2C1%2C3${curReels}`;

        return result;
    }

    private handlePaytableRequest(): string {
        // Just return the paytable response string as provided in PHP
        // This is a static string for this game version
        return 'bl.i32.reelset=ALL&pt.i0.comp.i19.symbol=SYM8&bl.i6.coins=1&bl.i17.reelset=ALL&pt.i0.comp.i15.type=betline&pt.i0.comp.i23.freespins=0&pt.i0.comp.i32.type=betline&bl.i15.id=15&pt.i0.comp.i29.type=betline&pt.i0.comp.i4.multi=125&pt.i0.comp.i15.symbol=SYM7&pt.i0.comp.i17.symbol=SYM7&pt.i0.comp.i5.freespins=0&pt.i0.comp.i22.multi=20&pt.i0.comp.i23.n=5&bl.i21.id=21&pt.i0.comp.i11.symbol=SYM5&pt.i0.comp.i13.symbol=SYM6&bl.i23.reelset=ALL&bl.i33.coins=1&pt.i0.comp.i15.multi=10&bl.i10.line=1%2C0%2C1%2C0%2C1&bl.i0.reelset=ALL&bl.i20.coins=1&pt.i0.comp.i16.freespins=0&pt.i0.comp.i28.multi=15&bl.i18.coins=1&bl.i10.id=10&pt.i0.comp.i11.n=5&pt.i0.comp.i4.freespins=0&bl.i3.reelset=ALL&bl.i4.line=3%2C2%2C1%2C2%2C3&pt.i0.comp.i30.freespins=0&bl.i13.coins=1&bl.i26.reelset=ALL&bl.i24.line=0%2C0%2C2%2C0%2C0&bl.i27.id=27&pt.i0.comp.i19.n=4&pt.i0.id=basic&pt.i0.comp.i1.type=betline&bl.i2.id=2&bl.i38.line=3%2C0%2C0%2C0%2C3&pt.i0.comp.i2.symbol=SYM2&pt.i0.comp.i4.symbol=SYM3&pt.i0.comp.i20.type=betline&bl.i14.reelset=ALL&pt.i0.comp.i17.freespins=0&bl.i38.id=38&bl.i39.coins=1&pt.i0.comp.i6.symbol=SYM4&pt.i0.comp.i8.symbol=SYM4&pt.i0.comp.i0.symbol=SYM2&pt.i0.comp.i5.n=5&pt.i0.comp.i3.type=betline&pt.i0.comp.i3.freespins=0&pt.i0.comp.i10.multi=60&bl.i28.line=0%2C2%2C0%2C2%2C0&bl.i3.id=3&bl.i22.line=2%2C2%2C0%2C2%2C2&pt.i0.comp.i27.multi=2&pt.i0.comp.i9.multi=10&bl.i12.coins=1&pt.i0.comp.i22.symbol=SYM9&pt.i0.comp.i26.symbol=SYM10&pt.i0.comp.i24.n=3&bl.i8.reelset=ALL&pt.i0.comp.i14.freespins=0&pt.i0.comp.i21.freespins=0&clientaction=paytable&bl.i16.id=16&bl.i37.reelset=ALL&bl.i39.id=39&bl.i5.coins=1&pt.i0.comp.i22.type=betline&pt.i0.comp.i24.freespins=0&bl.i8.id=8&pt.i0.comp.i16.multi=40&pt.i0.comp.i21.multi=4&bl.i33.id=33&pt.i0.comp.i12.n=3&bl.i6.line=0%2C1%2C2%2C1%2C0&bl.i22.id=22&pt.i0.comp.i13.type=betline&bl.i12.line=1%2C2%2C1%2C2%2C1&bl.i0.line=1%2C1%2C1%2C1%2C1&bl.i29.reelset=ALL&pt.i0.comp.i19.type=betline&pt.i0.comp.i6.freespins=0&bl.i34.line=2%2C1%2C1%2C1%2C2&pt.i0.comp.i31.freespins=0&bl.i31.line=1%2C2%2C2%2C2%2C1&pt.i0.comp.i3.multi=20&bl.i34.coins=1&pt.i0.comp.i6.n=3&pt.i0.comp.i21.n=3&bl.i27.coins=1&bl.i34.reelset=ALL&bl.i30.reelset=ALL&pt.i0.comp.i29.n=5&bl.i1.id=1&pt.i0.comp.i27.freespins=0&bl.i33.line=3%2C2%2C2%2C2%2C3&pt.i0.comp.i10.type=betline&bl.i25.id=25&pt.i0.comp.i2.freespins=0&pt.i0.comp.i5.multi=400&pt.i0.comp.i7.n=4&pt.i0.comp.i32.n=5&bl.i31.id=31&bl.i32.line=2%2C3%2C3%2C3%2C2&pt.i0.comp.i11.multi=175&bl.i14.id=14&pt.i0.comp.i7.type=betline&bl.i19.line=0%2C0%2C1%2C0%2C0&bl.i12.reelset=ALL&pt.i0.comp.i17.n=5&bl.i2.coins=1&bl.i6.id=6&bl.i21.reelset=ALL&pt.i0.comp.i29.multi=40&pt.i0.comp.i8.freespins=0&bl.i20.id=20&pt.i0.comp.i8.multi=200&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&pt.i0.comp.i1.freespins=0&pt.i0.comp.i12.type=betline&pt.i0.comp.i14.multi=150&bl.i33.reelset=ALL&bl.i5.reelset=ALL&bl.i24.coins=1&pt.i0.comp.i22.n=4&pt.i0.comp.i28.symbol=SYM11&bl.i19.coins=1&bl.i32.coins=1&bl.i7.id=7&bl.i18.reelset=ALL&pt.i0.comp.i6.multi=15&playercurrencyiso=' + this.slotSettings.slotCurrency + '&bl.i1.coins=1&bl.i32.id=32&bl.i14.line=1%2C1%2C0%2C1%2C1&pt.i0.comp.i18.type=betline&pt.i0.comp.i23.symbol=SYM9&pt.i0.comp.i21.type=betline&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&pt.i0.comp.i8.type=betline&pt.i0.comp.i7.freespins=0&pt.i0.comp.i2.type=betline&pt.i0.comp.i13.multi=50&bl.i25.coins=1&bl.i39.reelset=ALL&pt.i0.comp.i17.type=betline&bl.i13.line=2%2C3%2C2%2C3%2C2&pt.i0.comp.i30.type=betline&bl.i24.reelset=ALL&bl.i0.coins=1&bl.i2.reelset=ALL&pt.i0.comp.i8.n=5&pt.i0.comp.i10.n=4&bl.i31.coins=1&bl.i37.id=37&pt.i0.comp.i11.type=betline&pt.i0.comp.i18.n=3&pt.i0.comp.i22.freespins=0&bl.i26.coins=1&bl.i27.reelset=ALL&pt.i0.comp.i20.symbol=SYM8&bl.i29.line=1%2C3%2C1%2C3%2C1&pt.i0.comp.i15.freespins=0&pt.i0.comp.i31.symbol=SYM12&bl.i23.line=0%2C0%2C3%2C0%2C0&pt.i0.comp.i27.type=betline&bl.i26.id=26&pt.i0.comp.i28.freespins=0&pt.i0.comp.i0.n=3&pt.i0.comp.i7.symbol=SYM4&bl.i15.reelset=ALL&pt.i0.comp.i0.type=betline&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&bl.i30.id=30&pt.i0.comp.i25.multi=15&historybutton=false&bl.i25.line=1%2C1%2C3%2C1%2C1&pt.i0.comp.i16.symbol=SYM7&bl.i5.id=5&pt.i0.comp.i1.multi=250&pt.i0.comp.i27.n=3&pt.i0.comp.i18.symbol=SYM8&bl.i36.reelset=ALL&pt.i0.comp.i12.multi=10&pt.i0.comp.i32.multi=40&bl.i3.coins=1&bl.i10.coins=1&pt.i0.comp.i12.symbol=SYM6&pt.i0.comp.i14.symbol=SYM6&bl.i18.id=18&pt.i0.comp.i14.type=betline&bl.i30.coins=1&bl.i39.line=0%2C3%2C3%2C3%2C0&pt.i0.comp.i18.multi=4&bl.i5.line=2%2C1%2C0%2C1%2C2&pt.i0.comp.i7.multi=75&bl.i28.coins=1&pt.i0.comp.i9.n=3&pt.i0.comp.i30.n=3&bl.i27.line=2%2C0%2C2%2C0%2C2&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C3%2C2%2C1&pt.i0.comp.i28.type=betline&bl.i35.id=35&pt.i0.comp.i10.symbol=SYM5&pt.i0.comp.i15.n=3&bl.i16.coins=1&bl.i36.coins=1&bl.i9.coins=1&bl.i30.line=0%2C1%2C1%2C1%2C0&pt.i0.comp.i21.symbol=SYM9&bl.i7.reelset=ALL&pt.i0.comp.i31.type=betline&isJackpotWin=false&bl.i24.id=24&pt.i0.comp.i1.n=4&bl.i22.coins=1&pt.i0.comp.i10.freespins=0&pt.i0.comp.i20.multi=60&pt.i0.comp.i20.n=5&pt.i0.comp.i29.symbol=SYM11&pt.i0.comp.i17.multi=125&bl.i29.coins=1&bl.i31.reelset=ALL&bl.i13.id=13&bl.i36.id=36&pt.i0.comp.i25.symbol=SYM10&pt.i0.comp.i26.type=betline&pt.i0.comp.i28.n=4&pt.i0.comp.i9.type=betline&bl.i9.line=2%2C1%2C2%2C1%2C2&pt.i0.comp.i2.multi=1000&pt.i0.comp.i0.freespins=0&bl.i35.coins=1&bl.i10.reelset=ALL&pt.i0.comp.i29.freespins=0&bl.i25.reelset=ALL&pt.i0.comp.i31.n=4&pt.i0.comp.i9.symbol=SYM5&bl.i23.coins=1&bl.i11.coins=1&pt.i0.comp.i16.n=4&bl.i22.reelset=ALL&bl.i13.reelset=ALL&bl.i0.id=0&pt.i0.comp.i16.type=betline&pt.i0.comp.i5.symbol=SYM3&bl.i15.line=2%2C2%2C1%2C2%2C2&bl.i3.line=3%2C3%2C3%2C3%2C3&bl.i19.id=19&bl.i4.reelset=ALL&bl.i4.coins=1&pt.i0.comp.i2.n=5&bl.i37.line=0%2C3%2C0%2C3%2C0&pt.i0.comp.i1.symbol=SYM2&bl.i18.line=1%2C1%2C2%2C1%2C1&bl.i9.id=9&bl.i34.id=34&pt.i0.comp.i19.freespins=0&bl.i17.line=2%2C2%2C3%2C2%2C2&bl.i11.id=11&pt.i0.comp.i6.type=betline&bl.i37.coins=1&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&bl.i17.coins=1&bl.i28.id=28&bl.i19.reelset=ALL&pt.i0.comp.i25.n=4&pt.i0.comp.i9.freespins=0&bl.i11.reelset=ALL&bl.i16.line=3%2C3%2C2%2C3%2C3&bl.i38.reelset=ALL&credit=500000&pt.i0.comp.i5.type=betline&pt.i0.comp.i11.freespins=0&pt.i0.comp.i26.multi=40&bl.i21.line=3%2C3%2C1%2C3%2C3&pt.i0.comp.i25.type=betline&bl.i35.line=1%2C0%2C0%2C0%2C1&bl.i1.reelset=ALL&pt.i0.comp.i31.multi=15&pt.i0.comp.i4.type=betline&bl.i21.coins=1&bl.i28.reelset=ALL&pt.i0.comp.i13.freespins=0&pt.i0.comp.i26.freespins=0&bl.i1.line=0%2C0%2C0%2C0%2C0&pt.i0.comp.i13.n=4&pt.i0.comp.i20.freespins=0&pt.i0.comp.i23.type=betline&pt.i0.comp.i30.symbol=SYM12&pt.i0.comp.i32.symbol=SYM12&bl.i17.id=17&bl.i16.reelset=ALL&pt.i0.comp.i3.n=3&pt.i0.comp.i25.freespins=0&bl.i8.line=3%2C2%2C3%2C2%2C3&pt.i0.comp.i24.symbol=SYM10&bl.i35.reelset=ALL&pt.i0.comp.i26.n=5&pt.i0.comp.i27.symbol=SYM11&bl.i8.coins=1&pt.i0.comp.i32.freespins=0&bl.i23.id=23&bl.i15.coins=1&bl.i36.line=3%2C0%2C3%2C0%2C3&pt.i0.comp.i23.multi=50&bl.i2.line=2%2C2%2C2%2C2%2C2&pt.i0.comp.i30.multi=2&bl.i38.coins=1&pt.i0.comp.i18.freespins=0&bl.i12.id=12&bl.i29.id=29&bl.i4.id=4&bl.i7.coins=1&pt.i0.comp.i14.n=5&pt.i0.comp.i0.multi=30&bl.i6.reelset=ALL&pt.i0.comp.i19.multi=20&pt.i0.comp.i3.symbol=SYM3&bl.i20.line=3%2C3%2C0%2C3%2C3&pt.i0.comp.i24.type=betline&bl.i20.reelset=ALL&bl.i14.coins=1&pt.i0.comp.i12.freespins=0&pt.i0.comp.i4.n=4&bl.i26.line=3%2C1%2C3%2C1%2C3&pt.i0.comp.i24.multi=3';
    }

    private handleSpinRequest(postData: any): string {
        const linesId = this.getLinesId();
        const lines = 40;
        const betline = postData.bet_betlevel;
        let allbet = betline * lines;

        // Handle transaction logic
        if (postData.slotEvent !== 'freespin') {
            this.slotSettings.SetBalance(-1 * allbet, postData.slotEvent);
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(postData.slotEvent, bankSum, postData.slotEvent);
            this.slotSettings.UpdateJackpots(allbet);

            this.slotSettings.SetGameData('SpaceWarsNETBonusWin', 0);
            this.slotSettings.SetGameData('SpaceWarsNETFreeGames', 0);
            this.slotSettings.SetGameData('SpaceWarsNETCurrentFreeGame', 0);
            this.slotSettings.SetGameData('SpaceWarsNETTotalWin', 0);
            this.slotSettings.SetGameData('SpaceWarsNETBet', betline);
            this.slotSettings.SetGameData('SpaceWarsNETFreeBalance', this.slotSettings.GetBalance() * 100);
        } else {
            // Logic for free spin / respin
            const storedBet = this.slotSettings.GetGameData('SpaceWarsNETBet');
            allbet = storedBet * lines;
            this.slotSettings.SetGameData('SpaceWarsNETCurrentFreeGame',
                this.slotSettings.GetGameData('SpaceWarsNETCurrentFreeGame') + 1);
        }

        const winTypeTmp = this.slotSettings.GetSpinSettings(postData.slotEvent, allbet, lines);
        let winType = winTypeTmp[0];
        let spinWinLimit = winTypeTmp[1];

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
            const scatter = ''; // Scatter is empty string in this game logic
            reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent);
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
                            if (wildCount > 0 && wildCount < count) {
                                mpl = this.slotSettings.slotWildMpl;
                            } else if (wildCount === count) {
                                mpl = 1; // All wilds
                            }

                            const tmpWin = this.slotSettings.Paytable['SYM_' + csym][count] * betline * mpl * bonusMpl;
                            if (cWins[k] < tmpWin) {
                                cWins[k] = tmpWin;
                                // Construct legacy win string
                                let posStr = '';
                                for (let p = 0; p < count; p++) {
                                    posStr += `&ws.i${winLineCount}.pos.i${p}=${p}%2C${linesId[k][p] - 1}`;
                                }
                                tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${tmpWin}${posStr}&ws.i${winLineCount}.types.i0.wintype=coins&ws.i${winLineCount}.betline=${k}&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${tmpWin}`;
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
        if (postData.slotEvent === 'freespin') {
            this.slotSettings.SetGameData('SpaceWarsNETBonusWin', this.slotSettings.GetGameData('SpaceWarsNETBonusWin') + totalWin);
            this.slotSettings.SetGameData('SpaceWarsNETTotalWin', this.slotSettings.GetGameData('SpaceWarsNETTotalWin') + totalWin);
        } else {
            this.slotSettings.SetGameData('SpaceWarsNETTotalWin', totalWin);
        }

        if (totalWin > 0) {
            this.slotSettings.SetGameData('SpaceWarsNETFreeStartWin', totalWin);
            this.slotSettings.SetGameData('SpaceWarsNETBonusWin', totalWin);
            this.slotSettings.SetGameData('SpaceWarsNETFreeGames', this.slotSettings.slotFreeCount);
        }

        // Construct response
        const winString = lineWins.join('');
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        // Log report (JSON for internal log)
        const logResponse = {
            responseEvent: 'spin',
            responseType: postData.slotEvent,
            serverResponse: {
                slotLines: lines,
                slotBet: betline,
                totalFreeGames: this.slotSettings.GetGameData('SpaceWarsNETFreeGames'),
                currentFreeGames: this.slotSettings.GetGameData('SpaceWarsNETCurrentFreeGame'),
                Balance: balanceInCents,
                afterBalance: balanceInCents,
                bonusWin: this.slotSettings.GetGameData('SpaceWarsNETBonusWin'),
                totalWin: totalWin,
                winLines: [],
                Jackpots: this.slotSettings.Jackpots,
                reelsSymbols: reels
            }
        };
        this.slotSettings.SaveLogReport(JSON.stringify(logResponse), allbet, lines, reportWin, postData.slotEvent);

        this.slotSettings.SetGameData('SpaceWarsNETGambleStep', 5);

        // Build current reels string
        let curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1?.[0]}%2CSYM${reels.reel1?.[1]}%2CSYM${reels.reel1?.[2]}%2CSYM${reels.reel1?.[3]}`;
        curReels += `&rs.i0.r.i1.syms=SYM${reels.reel2?.[0]}%2CSYM${reels.reel2?.[1]}%2CSYM${reels.reel2?.[2]}%2CSYM${reels.reel2?.[3]}`;
        curReels += `&rs.i0.r.i2.syms=SYM${reels.reel3?.[0]}%2CSYM${reels.reel3?.[1]}%2CSYM${reels.reel3?.[2]}%2CSYM${reels.reel3?.[3]}`;
        curReels += `&rs.i0.r.i3.syms=SYM${reels.reel4?.[0]}%2CSYM${reels.reel4?.[1]}%2CSYM${reels.reel4?.[2]}%2CSYM${reels.reel4?.[3]}`;
        curReels += `&rs.i0.r.i4.syms=SYM${reels.reel5?.[0]}%2CSYM${reels.reel5?.[1]}%2CSYM${reels.reel5?.[2]}%2CSYM${reels.reel5?.[3]}`;

        // Secondary reels (cloning/respin reels visualization)
        let curReels0 = `&rs.i10.r.i0.syms=SYM${reels.reel1?.[0]}%2CSYM${reels.reel1?.[1]}%2CSYM${reels.reel1?.[2]}%2CSYM${reels.reel1?.[3]}`;
        curReels0 += `&rs.i10.r.i1.syms=SYM${reels.reel2?.[0]}%2CSYM${reels.reel2?.[1]}%2CSYM${reels.reel2?.[2]}%2CSYM${reels.reel2?.[3]}`;
        curReels0 += `&rs.i10.r.i2.syms=SYM${reels.reel3?.[0]}%2CSYM${reels.reel3?.[1]}%2CSYM${reels.reel3?.[2]}%2CSYM${reels.reel3?.[3]}`;
        curReels0 += `&rs.i10.r.i3.syms=SYM${reels.reel4?.[0]}%2CSYM${reels.reel4?.[1]}%2CSYM${reels.reel4?.[2]}%2CSYM${reels.reel4?.[3]}`;
        curReels0 += `&rs.i10.r.i4.syms=SYM${reels.reel5?.[0]}%2CSYM${reels.reel5?.[1]}%2CSYM${reels.reel5?.[2]}%2CSYM${reels.reel5?.[3]}`;

        let gameover = 'true';
        let nextaction = 'spin';

        if (totalWin > 0) {
            gameover = 'false';
            curReels += curReels0;
            if (postData.slotEvent !== 'freespin') {
                nextaction = 'respin';
                curReels += `&next.rs=respin-SYM${mainSymAnim}&rs.i10.id=respin-SYM${mainSymAnim}&symbolwon=SYM${mainSymAnim}`;
            } else {
                nextaction = 'spin';
                gameover = 'true';
            }
        } else {
            gameover = 'true';
            nextaction = 'spin';
        }

        if (postData.slotEvent === 'freespin') {
            totalWin = this.slotSettings.GetGameData('SpaceWarsNETBonusWin');
        }

        const result = `previous.rs.i0=basic&rs.i10.r.i2.pos=0&g4mode=false&playercurrency=%26%23x20AC%3B&historybutton=false&rs.i0.r.i4.hold=false&gamestate.history=basic&rs.i10.r.i1.pos=0&rs.i10.r.i2.hold=false&rs.i10.r.i1.hold=false&game.win.cents=${totalWin * 100}&rs.i0.id=basic&rs.i10.r.i4.pos=0&totalwin.coins=${this.slotSettings.GetGameData('SpaceWarsNETTotalWin')}&credit=${balanceInCents}&rs.i10.r.i0.pos=0&gamestate.current=basic&jackpotcurrency=%26%23x20AC%3B&multiplier=1&last.rs=basic&isJackpotWin=false&gamestate.stack=basic&rs.i0.r.i0.pos=24&gamesoundurl=&rs.i10.id=respin-SYM12&rs.i0.r.i1.pos=52&game.win.coins=${totalWin * 100}&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i1.hold=false&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=spin&rs.i0.r.i2.hold=false&rs.i0.r.i2.pos=131&rs.i10.r.i4.hold=false&totalwin.cents=${this.slotSettings.GetGameData('SpaceWarsNETTotalWin') * 100}&gameover=${gameover}&rs.i0.r.i0.hold=false&rs.i10.r.i3.hold=false&rs.i0.r.i3.pos=82&rs.i10.r.i0.hold=false&rs.i0.r.i4.pos=20&rs.i10.r.i3.pos=0&nextaction=${nextaction}&wavecount=1&rs.i0.r.i3.hold=false&game.win.amount=${totalWin}${curReels}${winString}`;

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
            [1, 1, 2, 1, 1],
            [4, 4, 1, 4, 4],
            [4, 4, 2, 4, 4],
            [3, 3, 1, 3, 3],
            [1, 1, 4, 1, 1],
            [1, 1, 3, 1, 1],
            [2, 2, 3, 2, 2],
            [4, 2, 4, 2, 4],
            [3, 1, 3, 1, 3],
            [1, 3, 1, 3, 1],
            [2, 4, 2, 4, 2],
            [1, 2, 2, 2, 1],
            [2, 3, 3, 3, 2],
            [3, 4, 4, 4, 3],
            [4, 3, 3, 3, 4],
            [3, 2, 2, 2, 3],
            [2, 1, 1, 1, 2],
            [4, 1, 4, 1, 4],
            [1, 4, 1, 4, 1],
            [4, 1, 1, 1, 4],
            [1, 4, 4, 4, 1]
        ];
    }

    private generateSessionId(): string {
        return 'a40e5dc15a83a70f288e421fbcfc6de8';
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}