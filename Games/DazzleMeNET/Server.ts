// Server.ts - DazzleMeNET game server
// Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines
// Data injection pattern - NO database calls or legacy PHP constructs

import { SlotSettings, ReelStrips } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'DazzleMeNET';
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

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        // Basic validation
        if (postData.slotEvent === 'bet') {
            const lines = 20; // DazzleMeNET uses 20 paylines
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
        this.slotSettings.SetGameData('DazzleMeNETBonusWin', 0);
        this.slotSettings.SetGameData('DazzleMeNETFreeGames', 0);
        this.slotSettings.SetGameData('DazzleMeNETCurrentFreeGame', 0);
        this.slotSettings.SetGameData('DazzleMeNETTotalWin', 0);
        this.slotSettings.SetGameData('DazzleMeNETFreeBalance', 0);

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

        // Format denominations
        const denoms = this.slotSettings.Denominations.map(d => d * 100).join('%2C');
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        const standardDenom = this.slotSettings.CurrentDenomination * 100;

        // Check if in free spin state
        if (this.slotSettings.GetGameData('DazzleMeNETCurrentFreeGame') < this.slotSettings.GetGameData('DazzleMeNETFreeGames') && 
            this.slotSettings.GetGameData('DazzleMeNETFreeGames') > 0) {
            freeState = this.buildFreeSpinState();
        }

        // Construct the massive query string response for DazzleMeNET
        let result = `bl.i32.reelset=ALL&bl.i49.reelset=ALL&bl.i60.coins=0&bl.i6.coins=0&bl.i17.reelset=ALL&bl.i15.id=15&bl.i73.id=73&bl.i53.coins=0&bl.i44.id=44&bl.i50.id=50&bl.i55.line=2%2C1%2C1%2C0%2C1&bl.i10.line=0%2C1%2C1%2C0%2C0&bl.i0.reelset=ALL&bl.i20.coins=0&bl.i18.coins=0&bl.i40.coins=0&bl.i74.line=2%2C2%2C3%2C3%2C3&bl.i41.reelset=ALL&bl.i10.id=10&bl.i60.line=2%2C1%2C2%2C1%2C1&bl.i56.id=56&bl.i3.reelset=ALL&bl.i4.line=0%2C0%2C1%2C0%2C0&bl.i13.coins=0&bl.i26.reelset=ALL&bl.i24.line=1%2C0%2C0%2C1%2C1&bl.i27.id=27&bl.i41.line=1%2C1%2C2%2C2%2C3&bl.i2.id=2&bl.i38.line=1%2C1%2C2%2C1%2C1&bl.i50.reelset=ALL&bl.i57.line=2%2C1%2C1%2C1%2C2&bl.i59.coins=0&bl.i53.line=1%2C2%2C3%2C3%2C4&bl.i55.id=55&bl.i61.id=61&bl.i28.line=1%2C0%2C1%2C1%2C1&bl.i3.id=3&bl.i22.line=1%2C0%2C0%2C0%2C0&bl.i52.coins=0&bl.i62.line=2%2C1%2C2%2C2%2C2&bl.i12.coins=0&bl.i8.reelset=ALL&clientaction=init&bl.i67.reelset=ALL&bl.i45.coins=0&bl.i16.id=16&bl.i37.reelset=ALL&bl.i39.id=39&casinoID=netent&bl.i5.coins=0&bl.i58.coins=0&bl.i55.reelset=ALL&bl.i8.id=8&bl.i69.line=2%2C2%2C2%2C2%2C2&bl.i33.id=33&bl.i58.reelset=ALL&bl.i46.coins=0&bl.i6.line=0%2C0%2C1%2C1%2C1&bl.i22.id=22&bl.i72.line=2%2C2%2C3%2C2%2C2&bl.i12.line=0%2C1%2C1%2C1%2C1&bl.i0.line=0%2C0%2C0%2C0%2C0&bl.i29.reelset=ALL&bl.i34.line=1%2C1%2C1%2C1%2C1&bl.i46.reelset=ALL&bl.i31.line=1%2C0%2C1%2C2%2C3&bl.i7.id=7&bl.i68.line=2%2C2%2C2%2C2%2C2&isJackpotWin=false&bl.i59.reelset=ALL&bl.i45.reelset=ALL&bl.i24.id=24&bl.i41.id=41&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&bl.i50.line=1%2C2%2C3%2C2%2C2&bl.i57.coins=0&denomination.all=${denoms}&bl.i48.line=1%2C2%2C2%2C3%2C3&bl.i27.coins=0&bl.i47.coins=0&bl.i34.reelset=ALL&bl.i30.reelset=ALL&bl.i1.id=1&bl.i75.reelset=ALL&bl.i33.line=1%2C1%2C1%2C0%2C1&bl.i43.reelset=ALL&bl.i47.line=1%2C2%2C2%2C2%2C3&bl.i48.id=48&bl.i51.line=1%2C2%2C3%2C2%2C3&bl.i25.id=25&denomination.standard=${standardDenom}&bl.i61.coins=0&bl.i31.id=31&bl.i32.line=1%2C1%2C1%2C0%2C0&bl.i40.reelset=ALL&multiplier=1&bl.i14.id=14&bl.i52.line=1%2C2%2C3%2C3%2C3&bl.i57.reelset=ALL&bl.i19.line=0%2C1%2C2%2C2%2C3&bl.i49.line=1%2C2%2C2%2C3%2C4&bl.i12.reelset=ALL&bl.i66.id=66&bl.i2.coins=0&bl.i6.id=6&bl.i52.reelset=ALL&bl.i21.reelset=ALL&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&bl.i20.id=20&bl.i72.id=72&bl.i66.reelset=ALL&bl.i33.reelset=ALL&bl.i48.reelset=ALL&bl.i19.coins=0&bl.i32.coins=0&bl.i59.id=59&bl.i18.reelset=ALL&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=0&bl.i32.id=32&bl.i67.line=2%2C2%2C2%2C1%2C2&bl.i49.id=49&bl.i65.id=65&bl.i61.reelset=ALL&bl.i14.line=0%2C1%2C1%2C2%2C2&bl.i70.line=2%2C2%2C2%2C3%2C3&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&bl.i71.id=71&bl.i55.coins=0&bl.i25.coins=0&bl.i39.reelset=ALL&bl.i13.line=0%2C1%2C1%2C1%2C2&bl.i24.reelset=ALL&bl.i58.line=2%2C1%2C1%2C2%2C2&bl.i0.coins=20&bl.i2.reelset=ALL&bl.i70.reelset=ALL&bl.i31.coins=0&bl.i37.id=37&bl.i60.id=60&bl.i26.coins=0&bl.i27.reelset=ALL&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35%2C36%2C37%2C38%2C39&bl.i29.line=1%2C0%2C1%2C1%2C2&bl.i54.id=54&bl.i54.coins=0&bl.i43.id=43&bl.i23.line=1%2C0%2C0%2C0%2C1&bl.i26.id=26&bl.i49.coins=0&bl.i61.line=2%2C1%2C2%2C1%2C2&bl.i15.reelset=ALL&bl.i42.line=1%2C1%2C2%2C3%2C3&bl.i70.coins=0&g4mode=false&bl.i11.line=0%2C1%2C1%2C0%2C1&bl.i50.coins=0&bl.i30.id=30&bl.i56.line=2%2C1%2C1%2C1%2C1&historybutton=false&bl.i25.line=1%2C0%2C0%2C1%2C2&bl.i60.reelset=ALL&bl.i73.line=2%2C2%2C3%2C2%2C3&bl.i5.id=5&gameEventSetters.enabled=false&bl.i36.reelset=ALL&bl.i28.coins=0&bl.i27.line=1%2C0%2C1%2C0%2C1&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=0%2C0%2C1%2C1%2C2&bl.i35.id=35&bl.i54.reelset=ALL&bl.i16.coins=0&bl.i36.coins=0&bl.i56.coins=0&bl.i9.coins=0&bl.i30.line=1%2C0%2C1%2C2%2C2&bl.i7.reelset=ALL&bl.i68.id=68&bl.i54.line=2%2C1%2C1%2C0%2C0&bl.i63.reelset=ALL&bl.i29.coins=0&bl.i31.reelset=ALL&bl.i13.id=13&bl.i36.id=36&bl.i75.coins=0&bl.i62.coins=0&bl.i75.line=2%2C2%2C3%2C3%2C4&bl.i9.line=0%2C0%2C1%2C2%2C3&bl.i69.id=69&bl.i40.line=1%2C1%2C2%2C2%2C2&bl.i35.coins=0&bl.i42.id=42&bl.i44.line=1%2C2%2C2%2C1%2C1&bl.i68.coins=0&bl.i72.reelset=ALL&bl.i42.reelset=ALL&bl.i75.id=75&betlevel.standard=1&bl.i10.reelset=ALL&bl.i66.line=2%2C2%2C2%2C1%2C1&gameover=true&bl.i25.reelset=ALL&bl.i58.id=58&bl.i51.coins=0&bl.i23.coins=0&bl.i11.coins=0&bl.i64.id=64&bl.i22.reelset=ALL&bl.i13.reelset=ALL&bl.i0.id=0&bl.i70.id=70&bl.i47.id=47&nextaction=spin&bl.i15.line=0%2C1%2C1%2C2%2C3&bl.i3.line=0%2C0%2C0%2C1%2C2&bl.i19.id=19&bl.i51.reelset=ALL&bl.i4.reelset=ALL&bl.i53.id=53&bl.i4.coins=0&bl.i37.line=1%2C1%2C1%2C2%2C3&bl.i18.line=0%2C1%2C2%2C2%2C2&bl.i9.id=9&bl.i34.id=34&bl.i17.line=0%2C1%2C2%2C1%2C2&bl.i11.id=11&bl.i57.id=57&bl.i37.coins=0&playercurrency=%26%23x20AC%3B&bl.i67.coins=0&bl.i9.reelset=ALL&bl.i17.coins=0&bl.i28.id=28&bl.i64.line=2%2C1%2C2%2C3%2C3&bl.i63.id=63&bl.i19.reelset=ALL&bl.i40.id=40&bl.i11.reelset=ALL&bl.i16.line=0%2C1%2C2%2C1%2C1&bl.i38.reelset=ALL&credit=${balanceInCents}&bl.i21.line=0%2C1%2C2%2C3%2C4&bl.i35.line=1%2C1%2C1%2C1%2C2&bl.i63.line=2%2C1%2C2%2C2%2C2&bl.i41.coins=0&bl.i1.reelset=ALL&bl.i71.reelset=ALL&bl.i21.coins=0&bl.i28.reelset=ALL&bl.i1.line=0%2C0%2C0%2C0%2C0&bl.i46.line=1%2C2%2C2%2C2%2C2&bl.i45.id=45&bl.i65.line=2%2C1%2C2%2C3%2C4&bl.i51.id=51&bl.i17.id=17&nearwinallowed=true&bl.i44.coins=0&bl.i47.reelset=ALL&bl.i45.line=1%2C2%2C2%2C1%2C2&bl.i8.line=0%2C0%2C1%2C2%2C2&bl.i65.coins=0&bl.i35.reelset=ALL&bl.i72.coins=0&bl.i42.coins=0&bl.i44.reelset=ALL&bl.i46.id=46&bl.i74.reelset=ALL&bl.i8.coins=0&bl.i23.id=23&bl.i15.coins=0&bl.i36.line=1%2C1%2C1%2C2%2C2&bl.i2.line=0%2C0%2C0%2C1%2C1&bl.i52.id=52&totalwin.cents=0&bl.i38.coins=0&bl.i56.reelset=ALL&bl.i0.coins=20&bl.i12.id=12&bl.i29.id=29&bl.i53.reelset=ALL&bl.i4.id=4&bl.i7.coins=0&bl.i71.coins=0&bl.i66.coins=0&bl.i6.reelset=ALL&bl.i68.id=68&bl.i20.line=0%2C1%2C2%2C3%2C3&bl.i20.reelset=ALL&wavecount=1&bl.i14.coins=0&bl.i65.reelset=ALL&bl.i74.id=74&bl.i26.line=1%2C0%2C1%2C0%2C0${curReels}${freeState}`;

        return result;
    }

    private handlePaytableRequest(): string {
        // DazzleMeNET paytable response
        return 'bl.i32.reelset=ALL&bl.i49.reelset=ALL&bl.i17.reelset=ALL&bl.i15.id=15&pt.i0.comp.i17.symbol=SYM8&bl.i73.id=73&pt.i0.comp.i13.symbol=SYM6&bl.i53.coins=0&bl.i50.id=50&bl.i55.line=2%2C1%2C1%2C0%2C1&bl.i10.line=0%2C1%2C1%2C0%2C0&bl.i40.coins=0&bl.i18.coins=0&pt.i0.comp.i15.multi=5&bl.i60.line=2%2C1%2C2%2C1%2C1&bl.i4.line=0%2C0%2C1%2C0%2C0&bl.i13.coins=0&bl.i62.id=62&bl.i27.id=27&bl.i43.line=1%2C1%2C2%2C3%2C4&pt.i0.id=basic&pt.i0.comp.i1.type=betline&bl.i2.id=2&bl.i38.line=1%2C1%2C2%2C1%2C1&pt.i1.comp.i10.type=betline&bl.i50.reelset=ALL&pt.i0.comp.i4.symbol=SYM4&bl.i14.reelset=ALL&bl.i38.id=38&bl.i39.coins=0&bl.i64.reelset=ALL&bl.i59.line=2%2C1%2C1%2C2%2C3&bl.i61.id=61&bl.i3.id=3&bl.i22.line=1%2C0%2C0%2C0%2C0&bl.i8.reelset=ALL&clientaction=paytable&bl.i67.reelset=ALL&bl.i45.coins=0&bl.i16.id=16&bl.i39.id=39&bl.i5.coins=0&bl.i58.coins=0&bl.i55.reelset=ALL&bl.i8.id=8&bl.i69.line=2%2C2%2C2%2C2%2C2&bl.i33.id=33&bl.i58.reelset=ALL&bl.i46.coins=0&bl.i6.line=0%2C0%2C1%2C1%2C1&bl.i22.id=22&bl.i72.line=2%2C2%2C3%2C2%2C2&bl.i12.line=0%2C1%2C1%2C1%2C1&bl.i0.line=0%2C0%2C0%2C0%2C0&bl.i34.line=1%2C1%2C1%2C1%2C1&bl.i46.reelset=ALL&bl.i31.line=1%2C0%2C1%2C2%2C3&pt.i0.comp.i3.multi=200&bl.i34.coins=0&bl.i74.coins=0&pt.i0.comp.i1.multi=12&bl.i47.coins=0&bl.i1.id=1&bl.i75.reelset=ALL&bl.i43.reelset=ALL&bl.i47.line=1%2C2%2C2%2C2%2C3&bl.i48.id=48&bl.i51.line=1%2C2%2C3%2C2%2C3&pt.i0.comp.i10.type=betline&bl.i25.id=25&pt.i0.comp.i5.multi=8&bl.i61.coins=0&bl.i40.reelset=ALL&bl.i14.id=14&bl.i52.line=1%2C2%2C3%2C3%2C3&bl.i57.reelset=ALL&pt.i1.comp.i4.type=betline&bl.i2.coins=0&bl.i21.reelset=ALL&bl.i72.id=72&pt.i0.comp.i8.multi=4&bl.i5.reelset=ALL&bl.i24.coins=0&bl.i32.coins=0&bl.i59.id=59&pt.i1.comp.i17.type=betline&pt.i1.comp.i0.symbol=SYM3&pt.i1.comp.i7.n=5&bl.i67.line=2%2C2%2C2%2C1%2C2&pt.i1.comp.i5.multi=8&bl.i49.id=49&bl.i61.reelset=ALL&bl.i14.line=0%2C1%2C1%2C2%2C2&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&bl.i71.id=71&pt.i0.comp.i8.type=betline&pt.i0.comp.i7.freespins=0&pt.i1.comp.i15.multi=5&bl.i55.coins=0&bl.i39.reelset=ALL&bl.i13.line=0%2C1%2C1%2C1%2C2&bl.i24.reelset=ALL&bl.i58.line=2%2C1%2C1%2C2%2C2&bl.i0.coins=20&bl.i2.reelset=ALL&pt.i0.comp.i10.n=5&bl.i37.id=37&bl.i60.id=60&bl.i26.coins=0&bl.i27.reelset=ALL&pt.i0.comp.i15.freespins=0&bl.i23.line=1%2C0%2C0%2C0%2C1&bl.i26.id=26&bl.i42.line=1%2C1%2C2%2C3%2C3&bl.i0.type=betline&g4mode=false&bl.i50.coins=0&bl.i30.id=30&bl.i25.line=1%2C0%2C0%2C1%2C2&pt.i0.comp.i16.symbol=SYM7&bl.i73.line=2%2C2%2C3%2C2%2C3&pt.i0.comp.i1.multi=12&bl.i18.id=18&bl.i68.reelset=ALL&bl.i43.coins=0&pt.i1.comp.i17.multi=3&bl.i5.line=0%2C0%2C1%2C0%2C1&bl.i28.coins=0&bl.i27.line=1%2C0%2C1%2C0%2C1&bl.i7.line=0%2C0%2C1%2C1%2C2&pt.i1.comp.i18.type=betline&pt.i0.comp.i10.symbol=SYM5&bl.i36.coins=0&bl.i30.line=1%2C0%2C1%2C2%2C2&bl.i7.reelset=ALL&bl.i68.line=2%2C2%2C2%2C2%2C2&pt.i1.comp.i15.n=4&isJackpotWin=false&bl.i45.reelset=ALL&bl.i41.id=41&pt.i1.comp.i7.type=betline&bl.i63.reelset=ALL&bl.i29.coins=0&bl.i31.reelset=ALL&bl.i75.line=2%2C2%2C3%2C3%2C4&bl.i9.line=0%2C0%2C1%2C2%2C3&pt.i0.comp.i2.multi=30&bl.i40.line=1%2C1%2C2%2C2%2C2&bl.i35.coins=0&bl.i42.id=42&pt.i1.comp.i16.freespins=0&bl.i75.id=75&pt.i1.comp.i5.type=betline&bl.i25.reelset=ALL&bl.i51.coins=0&bl.i64.id=64&pt.i0.comp.i16.n=5&bl.i13.reelset=ALL&bl.i0.id=0&pt.i1.comp.i16.n=5&pt.i0.comp.i5.symbol=SYM4&bl.i15.line=0%2C1%2C1%2C2%2C3&pt.i1.comp.i7.symbol=SYM4&bl.i19.id=19&bl.i51.reelset=ALL&bl.i53.id=53&bl.i37.line=1%2C1%2C1%2C2%2C3&pt.i0.comp.i1.symbol=SYM3&bl.i9.id=9&bl.i17.line=0%2C1%2C2%2C1%2C2&bl.i62.reelset=ALL&bl.i37.coins=0&playercurrency=%26%23x20AC%3B&bl.i28.id=28&bl.i63.id=63&bl.i19.reelset=ALL&bl.i40.id=40&bl.i38.reelset=ALL&credit=500000&bl.i35.line=1%2C1%2C1%2C1%2C2&bl.i63.line=2%2C1%2C2%2C2%2C2&bl.i41.coins=0&bl.i1.reelset=ALL&pt.i1.comp.i18.symbol=SYM8&pt.i1.comp.i12.symbol=SYM6&pt.i1.comp.i13.type=betline&pt.i1.comp.i1.multi=12&pt.i1.comp.i8.freespins=0&pt.i0.comp.i13.n=5&pt.i1.comp.i17.n=3&bl.i65.line=2%2C1%2C2%2C3%2C4&bl.i51.id=51&bl.i17.id=17&pt.i1.comp.i17.freespins=0&bl.i44.coins=0&pt.i1.comp.i0.type=betline&bl.i45.line=1%2C2%2C2%2C1%2C2&bl.i42.coins=0&bl.i44.reelset=ALL&bl.i74.reelset=ALL&bl.i2.line=0%2C0%2C0%2C1%2C1&bl.i52.id=52&bl.i38.coins=0&bl.i56.reelset=ALL&bl.i29.id=29&pt.i1.comp.i18.freespins=0&pt.i0.comp.i14.n=3&pt.i0.comp.i0.multi=1&bl.i6.reelset=ALL&bl.i20.line=0%2C1%2C2%2C3%2C3&bl.i1.comp.i18.n=4&bl.i20.reelset=ALL&pt.i0.comp.i12.freespins=0&bl.i74.id=74&bl.i60.coins=0&pt.i0.comp.i19.symbol=SYM8&bl.i6.coins=0&pt.i0.comp.i15.type=betline&pt.i0.comp.i4.multi=1&pt.i0.comp.i15.symbol=SYM7&bl.i67.id=67&pt.i1.comp.i14.multi=3&pt.i0.comp.i22.multi=0&bl.i73.coins=0&bl.i21.id=21&pt.i1.comp.i19.type=betline&bl.i73.reelset=ALL&pt.i0.comp.i11.symbol=SYM6&bl.i44.id=44&bl.i23.reelset=ALL&bl.i33.coins=0&bl.i0.reelset=ALL&bl.i20.coins=0&pt.i0.comp.i16.freespins=0&bl.i74.line=2%2C2%2C3%2C3%2C3&bl.i41.reelset=ALL&bl.i10.id=10&bl.i56.id=56&pt.i0.comp.i4.freespins=0&bl.i3.reelset=ALL&bl.i26.reelset=ALL&bl.i24.line=1%2C0%2C0%2C1%2C1&pt.i0.comp.i19.n=5&bl.i41.line=1%2C1%2C2%2C2%2C3&pt.i0.comp.i2.symbol=SYM3&bl.i57.line=2%2C1%2C1%2C1%2C2&pt.i0.comp.i6.freespins=0&pt.i1.comp.i11.n=3&pt.i0.comp.i5.n=3&pt.i1.comp.i2.symbol=SYM3&pt.i0.comp.i3.type=betline&bl.i53.line=1%2C2%2C3%2C3%2C4&bl.i55.id=55&bl.i28.line=1%2C0%2C1%2C1%2C1&pt.i1.comp.i6.symbol=SYM4&bl.i52.coins=0&bl.i62.line=2%2C1%2C2%2C2%2C2&pt.i0.comp.i9.multi=8&bl.i12.coins=0&pt.i0.comp.i22.symbol=SYM0&pt.i1.comp.i19.freespins=0&pt.i0.comp.i14.freespins=0&pt.i1.comp.i4.freespins=0&bl.i37.reelset=ALL&pt.i1.comp.i12.type=betline&bl.i8.id=8&pt.i0.comp.i18.symbol=SYM8&pt.i1.comp.i14.multi=3&pt.i0.comp.i7.multi=100&bl.i33.reelset=ALL&bl.i48.reelset=ALL&bl.i19.coins=0&bl.i7.id=7&bl.i18.reelset=ALL&pt.i1.comp.i11.type=betline&pt.i0.comp.i6.multi=15&playercurrencyiso=' + this.slotSettings.slotCurrency + '&bl.i1.coins=0&bl.i32.id=32&pt.i1.comp.i5.symbol=SYM4&bl.i65.id=65&bl.i70.line=2%2C2%2C2%2C3%2C3&pt.i0.comp.i18.type=betline&playforfun=false&pt.i0.comp.i2.type=betline&bl.i25.coins=0&bl.i69.reelset=ALL&bl.i48.coins=0&bl.i71.line=2%2C2%2C2%2C3%2C4&bl.i70.reelset=ALL&bl.i31.coins=0&bl.i54.id=54&pt.i0.comp.i11.type=betline&pt.i0.comp.i18.n=4&bl.i54.coins=0&pt.i1.comp.i14.n=3&pt.i1.comp.i16.multi=20&bl.i43.id=43&pt.i1.comp.i15.freespins=0&bl.i49.coins=0&pt.i0.comp.i7.symbol=SYM4&bl.i61.line=2%2C1%2C2%2C1%2C2&bl.i15.reelset=ALL&pt.i1.comp.i0.freespins=0&bl.i70.coins=0&bl.i11.line=0%2C1%2C1%2C0%2C1&bl.i56.line=2%2C1%2C1%2C1%2C1&historybutton=false&bl.i60.reelset=ALL&bl.i5.id=5&bl.i36.reelset=ALL&pt.i1.comp.i14.type=betline&bl.i3.coins=0&bl.i10.coins=0&pt.i0.comp.i12.symbol=SYM6&pt.i0.comp.i14.symbol=SYM7&pt.i1.comp.i13.freespins=0&bl.i63.coins=0&pt.i0.comp.i14.type=betline&bl.i30.coins=0&bl.i39.line=1%2C1%2C2%2C1%2C2&pt.i1.comp.i0.n=2&pt.i0.comp.i7.multi=100&jackpotcurrency=%26%23x20AC%3B&bl.i35.id=35&bl.i54.reelset=ALL&bl.i16.coins=0&bl.i54.line=2%2C1%2C1%2C0%2C0&bl.i56.coins=0&bl.i9.coins=0&bl.i59.reelset=ALL&bl.i24.id=24&pt.i1.comp.i11.multi=4&pt.i0.comp.i1.n=3&bl.i22.coins=0&pt.i0.comp.i20.n=3&pt.i1.comp.i3.symbol=SYM3&bl.i13.id=13&bl.i36.id=36&bl.i75.coins=0&bl.i62.coins=0&pt.i0.comp.i9.type=betline&bl.i69.id=69&pt.i1.comp.i16.type=betline&bl.i44.line=1%2C2%2C2%2C1%2C1&bl.i68.coins=0&bl.i72.reelset=ALL&bl.i42.reelset=ALL&bl.i10.reelset=ALL&pt.i1.comp.i12.multi=8&bl.i66.line=2%2C2%2C2%2C1%2C1&pt.i1.comp.i1.n=3&pt.i1.comp.i11.freespins=0&bl.i58.id=58&pt.i0.comp.i9.symbol=SYM5&bl.i23.coins=0&bl.i11.coins=0&bl.i22.reelset=ALL&bl.i70.id=70&bl.i47.id=47&pt.i0.comp.i16.type=betline&bl.i69.coins=0&bl.i3.line=0%2C0%2C0%2C1%2C2&bl.i4.reelset=ALL&bl.i4.coins=0&pt.i0.comp.i2.n=4&bl.i18.line=0%2C1%2C2%2C2%2C2&bl.i34.id=34&bl.i11.id=11&bl.i57.id=57&pt.i1.comp.i10.multi=30&bl.i1.comp.i2.n=4&pt.i1.comp.i2.freespins=0&bl.i67.coins=0&bl.i9.reelset=ALL&bl.i17.coins=0&bl.i64.line=2%2C1%2C2%2C3%2C3&pt.i1.comp.i10.symbol=SYM5&bl.i11.reelset=ALL&bl.i16.line=0%2C1%2C2%2C1%2C1&bl.i21.line=0%2C1%2C2%2C3%2C4&bl.i71.reelset=ALL&pt.i0.comp.i4.type=betline&bl.i21.coins=0&bl.i28.reelset=ALL&pt.i1.comp.i1.type=betline&bl.i1.line=0%2C0%2C0%2C0%2C1&bl.i46.line=1%2C2%2C2%2C2%2C2&bl.i45.id=45&pt.i0.comp.i20.freespins=8&bl.i16.reelset=ALL&bl.i64.coins=0&bl.i0.comp.i3.n=5&bl.i47.reelset=ALL&pt.i1.comp.i6.type=betline&pt.i1.comp.i4.symbol=SYM4&bl.i8.line=0%2C0%2C1%2C2%2C2&bl.i65.coins=0&bl.i35.reelset=ALL&bl.i72.coins=0&bl.i46.id=46&bl.i8.coins=0&bl.i23.id=23&bl.i15.coins=0&bl.i36.line=1%2C1%2C1%2C2%2C2&pt.i1.comp.i3.n=5&pt.i0.comp.i18.freespins=0&bl.i12.id=12&pt.i1.comp.i15.symbol=SYM7&bl.i53.reelset=ALL&bl.i4.id=4&bl.i7.coins=0&bl.i71.coins=0&bl.i66.coins=0&pt.i1.comp.i9.symbol=SYM5&bl.i68.id=68&pt.i0.comp.i3.symbol=SYM3&bl.i14.coins=0&bl.i65.reelset=ALL&pt.i1.comp.i12.freespins=0&pt.i0.comp.i4.n=2&pt.i1.comp.i10.n=5&bl.i26.line=1%2C0%2C1%2C0%2C0';
    }

    private handleSpinRequest(postData: any): string {
        const linesId = this.getLinesId(); // DazzleMeNET uses 20 lines
        const lines = 20; // DazzleMeNET specific
        const betline = postData.bet_betlevel;
        let allbet = betline * lines;

        // Handle transaction logic
        if (postData.slotEvent !== 'freespin') {
            this.slotSettings.SetBalance(-1 * allbet, postData.slotEvent);
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(postData.slotEvent, bankSum, postData.slotEvent);
            this.slotSettings.UpdateJackpots(allbet);

            this.slotSettings.SetGameData('DazzleMeNETBonusWin', 0);
            this.slotSettings.SetGameData('DazzleMeNETFreeGames', 0);
            this.slotSettings.SetGameData('DazzleMeNETCurrentFreeGame', 0);
            this.slotSettings.SetGameData('DazzleMeNETTotalWin', 0);
            this.slotSettings.SetGameData('DazzleMeNETBet', betline);
            this.slotSettings.SetGameData('DazzleMeNETDenom', postData.bet_denomination);
            this.slotSettings.SetGameData('DazzleMeNETFreeBalance', this.slotSettings.GetBalance() * 100);
        } else {
            // Logic for free spin
            postData.bet_denomination = this.slotSettings.GetGameData('DazzleMeNETDenom');
            this.slotSettings.CurrentDenom = postData.bet_denomination;
            this.slotSettings.CurrentDenomination = postData.bet_denomination;
            const storedBet = this.slotSettings.GetGameData('DazzleMeNETBet');
            allbet = storedBet * lines;
            this.slotSettings.SetGameData('DazzleMeNETCurrentFreeGame', 
                this.slotSettings.GetGameData('DazzleMeNETCurrentFreeGame') + 1);
        }

        const winTypeTmp = this.slotSettings.GetSpinSettings(postData.slotEvent, allbet, lines);
        let winType = winTypeTmp[0];
        let spinWinLimit = winTypeTmp[1];

        // Don't allow bonus wins during freespin
        if (winType == 'bonus' && postData.slotEvent == 'freespin') {
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
            const scatter = '0'; // Symbol 0 is scatter in DazzleMeNET
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

            // Scatter logic for DazzleMeNET
            let scattersWin = 0;
            let scattersCount = 0;
            let scPos: string[] = [];

            for (let r = 1; r <= 5; r++) {
                for (let p = 0; p <= 4; p++) {
                    if (reels[`reel${r}`]?.[p] == scatter) {
                        scattersCount++;
                        scPos.push(`&ws.i0.pos.i${r - 1}=${r - 1}%2C${p}`);
                    }
                }
            }

            if (scattersCount >= 3) {
                scattersWin = 0; // Free spins don't pay in coins
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
        
        // Handle free spins logic
        if (postData.slotEvent === 'freespin') {
            this.slotSettings.SetGameData('DazzleMeNETBonusWin', this.slotSettings.GetGameData('DazzleMeNETBonusWin') + totalWin);
            this.slotSettings.SetGameData('DazzleMeNETTotalWin', this.slotSettings.GetGameData('DazzleMeNETTotalWin') + totalWin);
        } else {
            this.slotSettings.SetGameData('DazzleMeNETTotalWin', totalWin);
        }

        // Check for scatter-based free spins (DazzleMeNET specific)
        let scattersCount = 0;
        for (let r = 1; r <= 5; r++) {
            for (let p = 0; p <= 4; p++) {
                if (reels[`reel${r}`]?.[p] == '0') {
                    scattersCount++;
                }
            }
        }

        let freeState = '';
        if (scattersCount >= 3 && winType != 'bonus') {
            this.slotSettings.SetGameData('DazzleMeNETFreeStartWin', totalWin);
            this.slotSettings.SetGameData('DazzleMeNETBonusWin', totalWin);
            this.slotSettings.SetGameData('DazzleMeNETFreeGames', this.slotSettings.slotFreeCount[scattersCount]);
            
            const fs = this.slotSettings.GetGameData('DazzleMeNETFreeGames');
            freeState = `&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&freespins.totalwin.cents=0&nextaction=freespin&freespins.left=${fs}&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=basic%2Cfreespin&freespins.totalwin.coins=0&freespins.total=${fs}&freespins.win.cents=0&gamestate.current=freespin&freespins.initial=${fs}&freespins.win.coins=0&freespins.betlevel=${this.slotSettings.GetGameData('DazzleMeNETBet')}&totalwin.coins=${totalWin}&credit=${Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100)}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}`;
        }

        // Log report
        const logResponse = {
            responseEvent: 'spin',
            responseType: postData.slotEvent,
            serverResponse: {
                slotLines: lines,
                slotBet: betline,
                totalFreeGames: this.slotSettings.GetGameData('DazzleMeNETFreeGames'),
                currentFreeGames: this.slotSettings.GetGameData('DazzleMeNETCurrentFreeGame'),
                Balance: Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100),
                afterBalance: Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100),
                bonusWin: this.slotSettings.GetGameData('DazzleMeNETBonusWin'),
                totalWin: totalWin,
                winLines: [],
                Jackpots: this.slotSettings.Jackpots,
                reelsSymbols: reels
            }
        };
        this.slotSettings.SaveLogReport(JSON.stringify(logResponse), allbet, lines, reportWin, postData.slotEvent);

        this.slotSettings.SetGameData('DazzleMeNETGambleStep', 5);

        // Build response string
        const winString = lineWins.join('');
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        // Build current reels string
        let curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1?.[0]}%2CSYM${reels.reel1?.[1]}%2CSYM${reels.reel1?.[2]}`;
        curReels += `&rs.i0.r.i1.syms=SYM${reels.reel2?.[0]}%2CSYM${reels.reel2?.[1]}%2CSYM${reels.reel2?.[2]}`;
        curReels += `&rs.i0.r.i2.syms=SYM${reels.reel3?.[0]}%2CSYM${reels.reel3?.[1]}%2CSYM${reels.reel3?.[2]}%2CSYM${reels.reel3?.[3]}`;
        curReels += `&rs.i0.r.i3.syms=SYM${reels.reel4?.[0]}%2CSYM${reels.reel4?.[1]}%2CSYM${reels.reel4?.[2]}%2CSYM${reels.reel4?.[3]}`;
        curReels += `&rs.i0.r.i4.syms=SYM${reels.reel5?.[0]}%2CSYM${reels.reel5?.[1]}%2CSYM${reels.reel5?.[2]}%2CSYM${reels.reel5?.[3]}%2CSYM${reels.reel5?.[4]}`;

        let gameover = 'true';
        let nextaction = 'spin';

        if (postData.slotEvent === 'freespin') {
            totalWin = this.slotSettings.GetGameData('DazzleMeNETBonusWin');
            if (this.slotSettings.GetGameData(this.slotId + 'FreeGames') <= this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') && 
                this.slotSettings.GetGameData('DazzleMeNETBonusWin') > 0) {
                nextaction = 'spin';
                freeState = '';
            } else {
                nextaction = 'freespin';
            }
        }

        const result = `g4mode=false&game.win.coins=${totalWin}&playercurrency=%26%23x20AC%3B&playercurrencyiso=${this.slotSettings.slotCurrency}&historybutton=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=spin&game.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gamestate.current=basic&gameover=true&jackpotcurrency=%26%23x20AC%3B&multiplier=1&isJackpotWin=false&gamestate.stack=basic&nextaction=${nextaction}&wavecount=1&gamesoundurl=${curReels}${winString}${freeState}`;

        return result;
    }

    private buildReelsString(reels: any): string {
        let curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1[0]}%2CSYM${reels.reel1[1]}%2CSYM${reels.reel1[2]}`;
        curReels += `&rs.i0.r.i1.syms=SYM${reels.reel2[0]}%2CSYM${reels.reel2[1]}%2CSYM${reels.reel2[2]}`;
        curReels += `&rs.i0.r.i2.syms=SYM${reels.reel3[0]}%2CSYM${reels.reel3[1]}%2CSYM${reels.reel3[2]}%2CSYM${reels.reel3[3]}`;
        curReels += `&rs.i0.r.i3.syms=SYM${reels.reel4[0]}%2CSYM${reels.reel4[1]}%2CSYM${reels.reel4[2]}%2CSYM${reels.reel4[3]}`;
        curReels += `&rs.i0.r.i4.syms=SYM${reels.reel5[0]}%2CSYM${reels.reel5[1]}%2CSYM${reels.reel5[2]}%2CSYM${reels.reel5[3]}%2CSYM${reels.reel5[4]}`;
        return curReels;
    }

    private buildRandomReelsString(): string {
        let curReels = `&rs.i0.r.i0.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
        curReels += `&rs.i0.r.i1.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
        curReels += `&rs.i0.r.i2.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
        curReels += `&rs.i0.r.i3.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
        curReels += `&rs.i0.r.i4.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
        return curReels;
    }

    private buildFreeSpinState(): string {
        const fs = this.slotSettings.GetGameData('DazzleMeNETFreeGames');
        const fsl = this.slotSettings.GetGameData('DazzleMeNETFreeGames') - this.slotSettings.GetGameData('DazzleMeNETCurrentFreeGame');
        const totalWin = this.slotSettings.GetGameData('DazzleMeNETBonusWin');
        
        return `&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&freespins.totalwin.cents=0&nextaction=freespin&freespins.left=${fsl}&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=basic%2Cfreespin&freespins.totalwin.coins=${totalWin}&freespins.total=${fs}&freespins.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gamestate.current=freespin&freespins.initial=${fs}&freespins.win.coins=${totalWin}&freespins.betlevel=${this.slotSettings.GetGameData('DazzleMeNETBet')}&totalwin.coins=${totalWin}&credit=${Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100)}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}`;
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
        // DazzleMeNET uses 20 paylines configuration
        return [
            [1, 1, 1, 1, 1],
            [1, 1, 1, 1, 2],
            [1, 1, 1, 2, 2],
            [1, 1, 1, 2, 3],
            [1, 1, 2, 1, 1],
            [1, 1, 2, 1, 2],
            [1, 1, 2, 2, 2],
            [1, 1, 2, 2, 3],
            [1, 1, 2, 3, 3],
            [1, 1, 2, 3, 4],
            [1, 2, 2, 1, 1],
            [1, 2, 2, 1, 2],
            [1, 2, 2, 2, 2],
            [1, 2, 2, 2, 3],
            [1, 2, 2, 3, 3],
            [1, 2, 2, 3, 4],
            [1, 2, 3, 2, 2],
            [1, 2, 3, 2, 3],
            [1, 2, 3, 3, 3],
            [1, 2, 3, 3, 4]
        ];
    }

    private generateSessionId(): string {
        return 'a40e5dc15a83a70f288e421fbcfc6de8';
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}