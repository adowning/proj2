// Server.ts - GoldenGrimoireNET game server
// Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines
// Data injection pattern - NO database calls or legacy PHP constructs

import { SlotSettings, ReelStrips } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'GoldenGrimoireNET';
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
            const lines = 20; // Matches PHP lines = 20
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
        this.slotSettings.SetGameData('GoldenGrimoireNETBonusWin', 0);
        this.slotSettings.SetGameData('GoldenGrimoireNETFreeGames', 0);
        this.slotSettings.SetGameData('GoldenGrimoireNETCurrentFreeGame', 0);
        this.slotSettings.SetGameData('GoldenGrimoireNETTotalWin', 0);
        this.slotSettings.SetGameData('GoldenGrimoireNETFreeBalance', 0);

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

                if (reels.rp) {
                    curReels += `&rs.i${i}.r.i0.pos=${reels.rp[0]}`;
                    curReels += `&rs.i${i}.r.i1.pos=${reels.rp[0]}`;
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

            for (let i = 0; i < 5; i++) {
                curReels += `&rs.i0.r.i${i}.pos=${this.randomInt(1, 10)}`;
            }
             for (let i = 0; i < 5; i++) {
                curReels += `&rs.i1.r.i${i}.pos=${this.randomInt(1, 10)}`;
            }
        }

        const denoms = this.slotSettings.Denominations.map(d => d * 100).join('%2C');
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        const standardDenom = this.slotSettings.CurrentDenomination * 100;

        if (this.slotSettings.GetGameData('GoldenGrimoireNETCurrentFreeGame') < this.slotSettings.GetGameData('GoldenGrimoireNETFreeGames') &&
            this.slotSettings.GetGameData('GoldenGrimoireNETFreeGames') > 0) {
             // Logic for restoring free spin state (static string from PHP reference)
             freeState = 'rs.i1.r.i0.syms=SYM2%2CSYM5%2CSYM5&bl.i6.coins=1&bl.i17.reelset=ALL&rs.i0.nearwin=4&bl.i15.id=15&rs.i0.r.i4.hold=false&gamestate.history=basic%2Cfreespin&rs.i1.r.i2.hold=false&game.win.cents=176&rs.i1.r.i1.overlay.i2.pos=61&staticsharedurl=&bl.i10.line=1%2C2%2C1%2C2%2C1&bl.i0.reelset=ALL&bl.i18.coins=1&bl.i10.id=10&freespins.initial=15&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&bl.i13.coins=1&rs.i0.r.i0.syms=SYM5%2CSYM0%2CSYM6&bl.i2.id=2&rs.i1.r.i1.pos=59&rs.i0.r.i0.pos=24&bl.i14.reelset=ALL&game.win.coins=88&rs.i1.r.i0.hold=false&bl.i3.id=3&ws.i1.reelset=freespin&bl.i12.coins=1&bl.i8.reelset=ALL&clientaction=init&rs.i0.r.i2.hold=false&bl.i16.id=16&casinoID=netent&bl.i5.coins=1&rs.i1.r.i1.overlay.i1.row=1&bl.i8.id=8&rs.i0.r.i3.pos=17&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i12.line=2%2C1%2C2%2C1%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&rs.i0.r.i2.syms=SYM7%2CSYM6%2CSYM6&rs.i1.r.i1.overlay.i1.with=SYM1_FS&game.win.amount=1.76&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&denomination.all=' + denoms + '&ws.i0.reelset=freespin&bl.i1.id=1&rs.i0.r.i3.attention.i0=2&rs.i1.r.i1.overlay.i0.with=SYM1_FS&rs.i1.r.i4.pos=39&denomination.standard=' + standardDenom + '&multiplier=1&bl.i14.id=14&bl.i19.line=0%2C2%2C2%2C2%2C0&freespins.denomination=2.000&bl.i12.reelset=ALL&bl.i2.coins=1&bl.i6.id=6&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&freespins.totalwin.coins=80&ws.i0.direction=left_to_right&freespins.total=15&gamestate.stack=basic%2Cfreespin&rs.i1.r.i4.syms=SYM5%2CSYM4%2CSYM4&gamesoundurl=&bet.betlevel=1&bl.i5.reelset=ALL&bl.i19.coins=1&bl.i7.id=7&bl.i18.reelset=ALL&playercurrencyiso=' + this.slotSettings.slotCurrency + '&bl.i1.coins=1&bl.i14.line=1%2C1%2C2%2C1%2C1&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&rs.i0.r.i4.syms=SYM5%2CSYM5%2CSYM0&rs.i0.r.i2.pos=48&bl.i13.line=1%2C1%2C0%2C1%2C1&ws.i1.betline=19&rs.i1.r.i0.pos=20&bl.i0.coins=1&bl.i2.reelset=ALL&rs.i1.r.i1.overlay.i2.row=2&rs.i1.r.i4.hold=false&freespins.left=14&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&bl.i15.reelset=ALL&rs.i0.r.i3.hold=false&bet.denomination=' + standardDenom + '&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&freespins.win.coins=80&historybutton=false&bl.i5.id=5&gameEventSetters.enabled=false&rs.i1.r.i3.pos=27&rs.i0.r.i1.syms=SYM5%2CSYM1%2CSYM3&bl.i3.coins=1&ws.i1.types.i0.coins=40&bl.i10.coins=1&bl.i18.id=18&ws.i0.betline=3&rs.i1.r.i3.hold=false&totalwin.coins=88&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=freespin&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i0.r.i3.syms=SYM4%2CSYM4%2CSYM0&rs.i1.r.i1.syms=SYM7%2CSYM1_FS&bl.i16.coins=1&freespins.win.cents=160&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&rs.i1.r.i1.overlay.i0.pos=59&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i0.r.i1.pos=61&rs.i1.r.i3.syms=SYM3%2CSYM3%2CSYM6&bl.i13.id=13&rs.i0.r.i1.hold=false&ws.i1.types.i0.wintype=coins&bl.i9.line=1%2C0%2C1%2C0%2C1&ws.i1.sym=SYM2&betlevel.standard=1&bl.i10.reelset=ALL&ws.i1.types.i0.cents=80&gameover=false&bl.i11.coins=1&ws.i1.direction=left_to_right&bl.i13.reelset=ALL&bl.i0.id=0&nextaction=freespin&bl.i15.line=0%2C1%2C1%2C1%2C0&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i19.id=19&bl.i4.reelset=ALL&bl.i4.coins=1&bl.i18.line=2%2C0%2C2%2C0%2C2&freespins.totalwin.cents=160&bl.i9.id=9&bl.i17.line=0%2C2%2C0%2C2%2C0&bl.i11.id=11&freespins.betlevel=1&ws.i0.pos.i2=2%2C2&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&bl.i17.coins=1&ws.i1.pos.i0=0%2C0&ws.i1.pos.i1=2%2C2&ws.i1.pos.i2=1%2C2&ws.i0.pos.i1=1%2C1&bl.i19.reelset=ALL&ws.i0.pos.i0=0%2C0&bl.i11.reelset=ALL&bl.i16.line=2%2C1%2C1%2C1%2C2&rs.i0.id=basic&credit=' + balanceInCents + '&ws.i0.types.i0.coins=40&bl.i1.reelset=ALL&rs.i1.r.i1.overlay.i1.pos=60&rs.i1.r.i1.overlay.i2.with=SYM1_FS&bl.i1.line=0%2C0%2C0%2C0%2C0&ws.i0.sym=SYM2&bl.i17.id=17&rs.i1.r.i2.pos=1&bl.i16.reelset=ALL&ws.i0.types.i0.wintype=coins&nearwinallowed=true&bl.i8.line=1%2C0%2C0%2C0%2C1&rs.i1.r.i1.overlay.i0.row=0&freespins.wavecount=1&rs.i0.r.i4.attention.i0=2&bl.i8.coins=1&bl.i15.coins=1&bl.i2.line=2%2C2%2C2%2C2%2C2&rs.i0.r.i0.attention.i0=1&rs.i1.r.i2.syms=SYM3%2CSYM3%2CSYM2&totalwin.cents=176&rs.i0.r.i0.hold=false&restore=true&rs.i1.id=freespin&bl.i12.id=12&bl.i4.id=4&rs.i0.r.i4.pos=10&bl.i7.coins=1&ws.i0.types.i0.cents=80&bl.i6.reelset=ALL&wavecount=1&bl.i14.coins=1&rs.i1.r.i1.hold=false' + freeState;
        }

        const result = `bl.i32.reelset=ALL&rs.i1.r.i0.syms=SYM3%2CSYM3%2CSYM3%2CSYM3&bl.i6.coins=0&bl.i17.reelset=ALL&bl.i15.id=15&rs.i0.r.i4.hold=false&rs.i1.r.i2.hold=false&bl.i21.id=21&game.win.cents=0&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i23.reelset=ALL&bl.i33.coins=0&bl.i10.line=1%2C0%2C1%2C0%2C1&bl.i0.reelset=ALL&bl.i20.coins=0&bl.i18.coins=0&bl.i10.id=10&bl.i3.reelset=ALL&bl.i4.line=3%2C2%2C1%2C2%2C3&bl.i13.coins=0&bl.i26.reelset=ALL&bl.i24.line=0%2C0%2C2%2C0%2C0&bl.i27.id=27&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM3%2CSYM3%2CSYM6%2CSYM6&bl.i2.id=2&rs.i1.r.i1.pos=0&bl.i38.line=3%2C0%2C0%2C0%2C3&rs.i3.r.i4.pos=0&reelsTriggeredFreeSpin=null&rs.i0.r.i0.pos=0&bl.i14.reelset=ALL&rs.i2.r.i3.pos=0&bl.i38.id=38&bl.i39.coins=0&rs.i5.r.i0.pos=0&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=0&rs.i2.id=basic2&game.win.coins=0&bl.i28.line=0%2C2%2C0%2C2%2C0&rs.i1.r.i0.hold=false&bl.i3.id=3&bl.i22.line=2%2C2%2C0%2C2%2C2&bl.i12.coins=0&bl.i8.reelset=ALL&clientaction=init&rs.i4.r.i0.hold=false&rs.i0.r.i2.hold=false&rs.i4.r.i3.syms=SYM3%2CSYM3%2CSYM3%2CSYM3&bl.i16.id=16&bl.i37.reelset=ALL&bl.i39.id=39&casinoID=netent&bl.i5.coins=0&rs.i3.r.i2.hold=false&bl.i8.id=8&rs.i5.r.i1.syms=SYM3%2CSYM3%2CSYM3%2CSYM3&rs.i0.r.i3.pos=0&bl.i33.id=33&rs.i4.r.i0.syms=SYM6%2CSYM6%2CSYM6%2CSYM6&rs.i5.r.i3.pos=0&bl.i6.line=0%2C1%2C2%2C1%2C0&bl.i22.id=22&bl.i12.line=1%2C2%2C1%2C2%2C1&bl.i0.line=1%2C1%2C1%2C1%2C1&bl.i29.reelset=ALL&bl.i34.line=2%2C1%2C1%2C1%2C2&rs.i4.r.i2.pos=0&bl.i31.line=1%2C2%2C2%2C2%2C1&rs.i0.r.i2.syms=SYM13%2CSYM13%2CSYM5%2CSYM5&bl.i34.coins=0&game.win.amount=0&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&rs.i5.r.i2.hold=false&denomination.all=${denoms}&bl.i27.coins=0&bl.i34.reelset=ALL&rs.i2.r.i0.pos=0&bl.i30.reelset=ALL&bl.i1.id=1&rs.i3.r.i2.syms=SYM3%2CSYM3%2CSYM3%2CSYM3&bl.i33.line=3%2C2%2C2%2C2%2C3&bl.i25.id=25&rs.i1.r.i4.pos=0&denomination.standard=${standardDenom}&rs.i3.id=mystery1&bl.i31.id=31&bl.i32.line=2%2C3%2C3%2C3%2C2&multiplier=1&bl.i14.id=14&bl.i19.line=0%2C0%2C1%2C0%2C0&bl.i12.reelset=ALL&bl.i2.coins=0&bl.i6.id=6&bl.i21.reelset=ALL&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&bl.i20.id=20&rs.i1.r.i4.syms=SYM5%2CSYM5%2CSYM5%2CSYM5&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i5.r.i2.syms=SYM6%2CSYM6%2CSYM6%2CSYM6&rs.i5.r.i3.hold=false&rs.i4.r.i2.hold=false&bl.i33.reelset=ALL&bl.i5.reelset=ALL&bl.i24.coins=0&rs.i4.r.i1.syms=SYM7%2CSYM7%2CSYM7%2CSYM7&bl.i19.coins=0&bl.i32.coins=0&bl.i7.id=7&bl.i18.reelset=ALL&rs.i2.r.i4.pos=0&rs.i3.r.i0.syms=SYM6%2CSYM6%2CSYM6%2CSYM6&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=0&bl.i32.id=32&rs.i4.r.i1.hold=false&rs.i3.r.i2.pos=0&bl.i14.line=1%2C1%2C0%2C1%2C1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM8%2CSYM8%2CSYM8%2CSYM8&bl.i25.coins=0&rs.i0.r.i2.pos=0&bl.i39.reelset=ALL&bl.i13.line=2%2C3%2C2%2C3%2C2&bl.i24.reelset=ALL&rs.i1.r.i0.pos=0&bl.i0.coins=20&rs.i2.r.i0.syms=SYM10%2CSYM10%2CSYM10%2CSYM10&bl.i2.reelset=ALL&bl.i31.coins=0&bl.i37.id=37&rs.i3.r.i1.syms=SYM8%2CSYM8%2CSYM8%2CSYM8&rs.i1.r.i4.hold=false&rs.i4.r.i1.pos=0&bl.i26.coins=0&rs.i4.r.i2.syms=SYM9%2CSYM9%2CSYM9%2CSYM9&bl.i27.reelset=ALL&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35%2C36%2C37%2C38%2C39&bl.i29.line=1%2C3%2C1%2C3%2C1&rs.i5.r.i3.syms=SYM6%2CSYM6%2CSYM7%2CSYM7&rs.i3.r.i0.hold=false&bl.i23.line=0%2C0%2C3%2C0%2C0&bl.i26.id=26&bl.i15.reelset=ALL&rs.i0.r.i3.hold=false&rs.i5.r.i4.pos=0&rs.i4.id=basic1&rs.i2.r.i1.hold=false&gameServerVersion=1.0.1&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&bl.i30.id=30&historybutton=false&bl.i25.line=1%2C1%2C3%2C1%2C1&bl.i5.id=5&gameEventSetters.enabled=false&bl.i36.reelset=ALL&rs.i1.r.i3.pos=0&rs.i0.r.i1.syms=SYM8%2CSYM8%2CSYM10%2CSYM10&bl.i3.coins=0&bl.i10.coins=0&bl.i18.id=18&rs.i2.r.i1.pos=0&rs.i4.r.i4.pos=0&bl.i30.coins=0&bl.i39.line=0%2C3%2C3%2C3%2C0&rs.i1.r.i3.hold=false&totalwin.coins=0&rs.i5.r.i4.syms=SYM6%2CSYM6%2CSYM3%2CSYM3&bl.i5.line=2%2C1%2C0%2C1%2C2&gamestate.current=basic&bl.i28.coins=0&rs.i4.r.i0.pos=0&bl.i27.line=2%2C0%2C2%2C0%2C2&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C3%2C2%2C1&bl.i35.id=35&rs.i3.r.i1.hold=false&rs.i0.r.i3.syms=SYM8%2CSYM8%2CSYM8%2CSYM8&rs.i1.r.i1.syms=SYM7%2CSYM7%2CSYM5%2CSYM5&bl.i16.coins=0&bl.i36.coins=0&bl.i9.coins=0&bl.i30.line=0%2C1%2C1%2C1%2C0&bl.i7.reelset=ALL&isJackpotWin=false&rs.i2.r.i3.hold=false&bl.i24.id=24&rs.i0.r.i1.pos=0&rs.i4.r.i4.syms=SYM3%2CSYM3%2CSYM9%2CSYM9&bl.i22.coins=0&rs.i1.r.i3.syms=SYM5%2CSYM5%2CSYM5%2CSYM5&bl.i29.coins=0&bl.i31.reelset=ALL&bl.i13.id=13&bl.i36.id=36&rs.i0.r.i1.hold=false&rs.i2.r.i1.syms=SYM8%2CSYM8%2CSYM8%2CSYM8&bl.i9.line=2%2C1%2C2%2C1%2C2&bl.i35.coins=0&betlevel.standard=1&bl.i10.reelset=ALL&gameover=true&rs.i3.r.i3.pos=0&bl.i25.reelset=ALL&rs.i5.id=freespin2&bl.i23.coins=0&bl.i11.coins=0&rs.i5.r.i1.hold=false&bl.i22.reelset=ALL&rs.i5.r.i4.hold=false&bl.i13.reelset=ALL&bl.i0.id=0&nextaction=spin&bl.i15.line=2%2C2%2C1%2C2%2C2&bl.i3.line=3%2C3%2C3%2C3%2C3&bl.i19.id=19&bl.i4.reelset=ALL&bl.i4.coins=0&bl.i37.line=0%2C3%2C0%2C3%2C0&bl.i18.line=1%2C1%2C2%2C1%2C1&bl.i9.id=9&bl.i34.id=34&bl.i17.line=2%2C2%2C3%2C2%2C2&bl.i11.id=11&bl.i37.coins=0&rs.i4.r.i3.pos=0&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&rs.i4.r.i4.hold=false&bl.i17.coins=0&bl.i28.id=28&rs.i5.r.i0.syms=SYM9%2CSYM9%2CSYM9%2CSYM9&bl.i19.reelset=ALL&rs.i2.r.i4.syms=SYM9%2CSYM9%2CSYM9%2CSYM9&rs.i4.r.i3.hold=false&bl.i11.reelset=ALL&bl.i16.line=3%2C3%2C2%2C3%2C3&rs.i0.id=freespin1&bl.i38.reelset=ALL&credit=${balanceInCents}&bl.i21.line=3%2C3%2C1%2C3%2C3&bl.i35.line=1%2C0%2C0%2C0%2C1&bl.i1.reelset=ALL&rs.i2.r.i2.pos=0&bl.i21.coins=0&bl.i28.reelset=ALL&rs.i5.r.i1.pos=0&bl.i1.line=2%2C2%2C2%2C2%2C2&bl.i17.id=17&rs.i2.r.i2.syms=SYM10%2CSYM10%2CSYM10%2CSYM10&rs.i1.r.i2.pos=0&bl.i16.reelset=ALL&rs.i3.r.i3.syms=SYM3%2CSYM3%2CSYM6%2CSYM6&rs.i3.r.i4.hold=false&rs.i5.r.i0.hold=false&nearwinallowed=true&bl.i8.line=3%2C2%2C3%2C2%2C3&bl.i35.reelset=ALL&rs.i3.r.i3.hold=false&bl.i8.coins=0&bl.i23.id=23&bl.i15.coins=0&bl.i36.line=3%2C0%2C3%2C0%2C3&bl.i2.line=0%2C0%2C0%2C0%2C0&rs.i1.r.i2.syms=SYM6%2CSYM6%2CSYM6%2CSYM6&totalwin.cents=0&bl.i38.coins=0&rs.i5.r.i2.pos=0&rs.i0.r.i0.hold=false&rs.i2.r.i3.syms=SYM6%2CSYM6%2CSYM10%2CSYM10&restore=false&rs.i1.id=mystery2&rs.i3.r.i4.syms=SYM10%2CSYM10%2CSYM10%2CSYM10&bl.i12.id=12&bl.i29.id=29&bl.i4.id=4&rs.i0.r.i4.pos=0&bl.i7.coins=0&bl.i6.reelset=ALL&rs.i3.r.i0.pos=0&bl.i20.line=3%2C3%2C0%2C3%2C3&rs.i2.r.i2.hold=false&bl.i20.reelset=ALL&wavecount=1&bl.i14.coins=0&rs.i1.r.i1.hold=false&bl.i26.line=3%2C1%2C3%2C1%2C3${curReels}${freeState}`;

        return result;
    }

    private handlePaytableRequest(): string {
        // Just return the paytable response string as provided in PHP
        // This is a static string for this game version
        // Copied from PHP source
        return `bl.i32.reelset=ALL&bl.i17.reelset=ALL&bl.i15.id=15&pt.i0.comp.i17.symbol=SYM7&pt.i0.comp.i5.freespins=0&pt.i0.comp.i23.n=5&pt.i0.comp.i13.symbol=SYM6&pt.i1.comp.i8.type=betline&pt.i1.comp.i4.n=4&pt.i0.comp.i15.multi=4&bl.i10.line=1%2C0%2C1%2C0%2C1&bl.i18.coins=0&pt.i1.comp.i3.multi=10&pt.i0.comp.i11.n=5&pt.i1.comp.i23.symbol=SYM9&bl.i4.line=3%2C2%2C1%2C2%2C3&bl.i13.coins=0&bl.i27.id=27&pt.i0.id=basic&pt.i0.comp.i1.type=betline&bl.i2.id=2&bl.i38.line=3%2C0%2C0%2C0%2C3&pt.i1.comp.i10.type=betline&pt.i0.comp.i4.symbol=SYM3&pt.i1.comp.i5.freespins=0&pt.i1.comp.i8.symbol=SYM4&bl.i14.reelset=ALL&pt.i1.comp.i19.n=4&pt.i0.comp.i17.freespins=0&bl.i38.id=38&bl.i39.coins=0&pt.i0.comp.i8.symbol=SYM4&pt.i0.comp.i0.symbol=SYM1&pt.i0.comp.i3.freespins=0&pt.i0.comp.i10.multi=20&pt.i1.id=freespin&bl.i3.id=3&bl.i22.line=2%2C2%2C0%2C2%2C2&pt.i0.comp.i24.n=3&bl.i8.reelset=ALL&clientaction=paytable&bl.i16.id=16&bl.i39.id=39&pt.i1.comp.i5.n=5&bl.i5.coins=0&pt.i1.comp.i8.multi=75&pt.i0.comp.i22.type=betline&pt.i0.comp.i24.freespins=0&pt.i0.comp.i21.multi=3&pt.i1.comp.i13.multi=15&pt.i0.comp.i12.n=3&pt.i0.comp.i13.type=betline&bl.i0.line=1%2C1%2C1%2C1%2C1&pt.i1.comp.i7.freespins=0&bl.i34.line=2%2C1%2C1%2C1%2C2&bl.i31.line=1%2C2%2C2%2C2%2C1&pt.i0.comp.i3.multi=10&bl.i34.coins=0&pt.i1.comp.i22.type=betline&pt.i0.comp.i21.n=3&pt.i1.comp.i6.n=3&bl.i1.id=1&pt.i0.comp.i10.type=betline&pt.i1.comp.i11.symbol=SYM5&bl.i25.id=25&pt.i0.comp.i5.multi=100&pt.i1.comp.i1.freespins=0&bl.i14.id=14&pt.i1.comp.i16.symbol=SYM7&pt.i1.comp.i23.multi=15&pt.i1.comp.i4.type=betline&pt.i1.comp.i18.multi=4&bl.i2.coins=0&bl.i21.reelset=ALL&pt.i1.comp.i26.type=betline&pt.i0.comp.i8.multi=75&pt.i0.comp.i1.freespins=0&bl.i5.reelset=ALL&bl.i24.coins=0&pt.i0.comp.i22.n=4&bl.i32.coins=0&pt.i1.comp.i17.type=betline&pt.i1.comp.i0.symbol=SYM1&pt.i1.comp.i7.n=4&pt.i1.comp.i5.multi=100&bl.i14.line=1%2C1%2C0%2C1%2C1&pt.i0.comp.i21.type=betline&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&pt.i0.comp.i8.type=betline&pt.i0.comp.i7.freespins=0&pt.i1.comp.i15.multi=4&pt.i0.comp.i13.multi=15&bl.i39.reelset=ALL&pt.i0.comp.i17.type=betline&bl.i13.line=2%2C3%2C2%2C3%2C2&pt.i1.comp.i22.symbol=SYM9&bl.i24.reelset=ALL&bl.i0.coins=20&bl.i2.reelset=ALL&pt.i0.comp.i10.n=4&pt.i1.comp.i6.multi=8&bl.i37.id=37&pt.i1.comp.i19.symbol=SYM8&pt.i0.comp.i22.freespins=0&bl.i26.coins=0&bl.i27.reelset=ALL&pt.i0.comp.i20.symbol=SYM8&bl.i29.line=1%2C3%2C1%2C3%2C1&pt.i0.comp.i15.freespins=0&bl.i23.line=0%2C0%2C3%2C0%2C0&bl.i26.id=26&pt.i0.comp.i0.n=3&pt.i1.comp.i21.multi=3&pt.i0.comp.i0.type=betline&pt.i1.comp.i0.multi=0&g4mode=false&pt.i1.comp.i8.n=5&bl.i30.id=30&pt.i0.comp.i25.multi=8&bl.i25.line=1%2C1%2C3%2C1%2C1&pt.i0.comp.i16.symbol=SYM7&pt.i1.comp.i21.freespins=0&pt.i0.comp.i1.multi=0&pt.i0.comp.i27.n=3&pt.i1.comp.i9.type=betline&pt.i1.comp.i24.multi=3&pt.i1.comp.i23.type=betline&pt.i1.comp.i26.n=5&bl.i18.id=18&pt.i1.comp.i17.multi=20&pt.i0.comp.i18.multi=4&bl.i5.line=2%2C1%2C0%2C1%2C2&bl.i28.coins=0&pt.i0.comp.i9.n=3&bl.i27.line=2%2C0%2C2%2C0%2C2&pt.i1.comp.i21.type=betline&bl.i7.line=1%2C2%2C3%2C2%2C1&pt.i1.comp.i18.type=betline&pt.i0.comp.i10.symbol=SYM5&pt.i0.comp.i15.n=3&bl.i36.coins=0&bl.i30.line=0%2C1%2C1%2C1%2C0&pt.i0.comp.i21.symbol=SYM9&bl.i7.reelset=ALL&pt.i1.comp.i15.n=3&isJackpotWin=false&pt.i1.comp.i20.freespins=0&pt.i1.comp.i7.type=betline&pt.i0.comp.i10.freespins=0&pt.i0.comp.i20.multi=20&pt.i0.comp.i17.multi=20&bl.i29.coins=0&bl.i31.reelset=ALL&pt.i1.comp.i25.type=betline&pt.i1.comp.i9.n=3&bl.i9.line=2%2C1%2C2%2C1%2C2&pt.i0.comp.i2.multi=0&pt.i0.comp.i0.freespins=0&pt.i1.comp.i25.multi=8&bl.i35.coins=0&pt.i1.comp.i16.freespins=0&pt.i1.comp.i5.type=betline&bl.i25.reelset=ALL&pt.i1.comp.i24.symbol=SYM10&pt.i1.comp.i13.symbol=SYM6&pt.i1.comp.i17.symbol=SYM7&pt.i0.comp.i16.n=4&bl.i13.reelset=ALL&bl.i0.id=0&pt.i1.comp.i16.n=4&pt.i0.comp.i5.symbol=SYM3&bl.i15.line=2%2C2%2C1%2C2%2C2&pt.i1.comp.i7.symbol=SYM4&bl.i19.id=19&bl.i37.line=0%2C3%2C0%2C3%2C0&pt.i0.comp.i1.symbol=SYM1&bl.i9.id=9&bl.i17.line=2%2C2%2C3%2C2%2C2&pt.i1.comp.i9.freespins=0&bl.i37.coins=0&playercurrency=%26%23x20AC%3B&bl.i28.id=28&bl.i19.reelset=ALL&pt.i0.comp.i25.n=4&pt.i0.comp.i9.freespins=0&bl.i38.reelset=ALL&credit=${Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100)}&pt.i0.comp.i5.type=betline&pt.i0.comp.i11.freespins=0&pt.i0.comp.i26.multi=15&pt.i0.comp.i25.type=betline&bl.i35.line=1%2C0%2C0%2C0%2C1&bl.i1.reelset=ALL&pt.i1.comp.i18.symbol=SYM8&pt.i1.comp.i12.symbol=SYM6&pt.i0.comp.i13.freespins=0&pt.i1.comp.i15.type=betline&pt.i0.comp.i26.freespins=0&pt.i1.comp.i13.type=betline&pt.i1.comp.i1.multi=0&pt.i1.comp.i8.freespins=0&pt.i0.comp.i13.n=4&pt.i1.comp.i17.n=5&pt.i0.comp.i23.type=betline&bl.i17.id=17&pt.i1.comp.i17.freespins=0&pt.i1.comp.i26.multi=15&pt.i1.comp.i0.type=betline&pt.i1.comp.i1.symbol=SYM1&pt.i0.comp.i25.freespins=0&pt.i0.comp.i26.n=5&pt.i0.comp.i27.symbol=SYM0&pt.i0.comp.i23.multi=15&bl.i2.line=0%2C0%2C0%2C0%2C0&bl.i38.coins=0&bl.i29.id=29&pt.i1.comp.i18.freespins=0&pt.i0.comp.i14.n=5&pt.i0.comp.i0.multi=0&bl.i6.reelset=ALL&pt.i0.comp.i19.multi=10&bl.i20.line=3%2C3%2C0%2C3%2C3&pt.i1.comp.i18.n=3&bl.i20.reelset=ALL&pt.i0.comp.i12.freespins=0&pt.i0.comp.i24.multi=3&pt.i0.comp.i19.symbol=SYM8&bl.i6.coins=0&pt.i0.comp.i15.type=betline&pt.i0.comp.i23.freespins=0&pt.i0.comp.i4.multi=30&pt.i0.comp.i15.symbol=SYM7&pt.i1.comp.i14.multi=30&pt.i0.comp.i22.multi=8&bl.i21.id=21&pt.i1.comp.i19.type=betline&pt.i0.comp.i11.symbol=SYM5&bl.i23.reelset=ALL&bl.i33.coins=0&bl.i0.reelset=ALL&bl.i20.coins=0&pt.i0.comp.i16.freespins=0&pt.i1.comp.i6.freespins=0&pt.i1.comp.i22.n=4&bl.i10.id=10&pt.i0.comp.i4.freespins=0&pt.i1.comp.i25.symbol=SYM10&bl.i3.reelset=ALL&bl.i26.reelset=ALL&bl.i24.line=0%2C0%2C2%2C0%2C0&pt.i1.comp.i24.type=betline&pt.i0.comp.i19.n=4&pt.i0.comp.i2.symbol=SYM1&pt.i0.comp.i20.type=betline&pt.i0.comp.i6.symbol=SYM4&pt.i1.comp.i11.n=5&pt.i0.comp.i5.n=5&pt.i1.comp.i2.symbol=SYM1&pt.i0.comp.i3.type=betline&pt.i1.comp.i19.multi=10&bl.i28.line=0%2C2%2C0%2C2%2C0&pt.i1.comp.i6.symbol=SYM4&pt.i0.comp.i27.multi=0&pt.i0.comp.i9.multi=5&bl.i12.coins=0&pt.i0.comp.i22.symbol=SYM9&pt.i0.comp.i26.symbol=SYM10&pt.i1.comp.i19.freespins=0&pt.i0.comp.i14.freespins=0&pt.i0.comp.i21.freespins=0&pt.i1.comp.i4.freespins=0&bl.i37.reelset=ALL&pt.i1.comp.i12.type=betline&pt.i1.comp.i21.symbol=SYM9&pt.i1.comp.i23.n=5&bl.i8.id=8&pt.i0.comp.i16.multi=10&bl.i33.id=33&bl.i6.line=0%2C1%2C2%2C1%2C0&bl.i22.id=22&bl.i12.line=1%2C2%2C1%2C2%2C1&pt.i1.comp.i9.multi=5&bl.i29.reelset=ALL&pt.i0.comp.i19.type=betline&pt.i0.comp.i6.freespins=0&pt.i1.comp.i2.multi=0&pt.i0.comp.i6.n=3&pt.i1.comp.i12.n=3&pt.i1.comp.i3.type=betline&pt.i1.comp.i10.freespins=0&bl.i27.coins=0&bl.i34.reelset=ALL&bl.i30.reelset=ALL&pt.i1.comp.i20.multi=20&pt.i0.comp.i27.freespins=8&pt.i1.comp.i24.n=3&bl.i33.line=3%2C2%2C2%2C2%2C3&pt.i1.comp.i2.type=betline&pt.i0.comp.i2.freespins=0&pt.i0.comp.i7.n=4&bl.i31.id=31&bl.i32.line=2%2C3%2C3%2C3%2C2&pt.i0.comp.i11.multi=40&pt.i1.comp.i14.symbol=SYM6&pt.i0.comp.i7.type=betline&bl.i19.line=0%2C0%2C1%2C0%2C0&bl.i12.reelset=ALL&pt.i0.comp.i17.n=5&bl.i6.id=6&pt.i1.comp.i13.n=4&pt.i0.comp.i8.freespins=0&bl.i20.id=20&pt.i1.comp.i4.multi=30&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&pt.i0.comp.i12.type=betline&pt.i0.comp.i14.multi=30&pt.i1.comp.i7.multi=25&bl.i33.reelset=ALL&bl.i19.coins=0&bl.i7.id=7&bl.i18.reelset=ALL&pt.i1.comp.i11.type=betline&pt.i0.comp.i6.multi=8&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=0&bl.i32.id=32&pt.i1.comp.i5.symbol=SYM3&pt.i0.comp.i18.type=betline&pt.i0.comp.i23.symbol=SYM9&playforfun=false&pt.i1.comp.i25.n=4&pt.i0.comp.i2.type=betline&pt.i1.comp.i20.type=betline&bl.i25.coins=0&pt.i1.comp.i22.multi=8&pt.i0.comp.i8.n=5&bl.i31.coins=0&pt.i1.comp.i22.freespins=0&pt.i0.comp.i11.type=betline&pt.i0.comp.i18.n=3&pt.i1.comp.i14.n=5&pt.i1.comp.i16.multi=10&pt.i1.comp.i15.freespins=0&pt.i0.comp.i27.type=scatter&pt.i0.comp.i7.symbol=SYM4&bl.i15.reelset=ALL&pt.i1.comp.i0.freespins=0&gameServerVersion=1.0.1&bl.i11.line=0%2C1%2C0%2C1%2C0&historybutton=false&bl.i5.id=5&pt.i0.comp.i18.symbol=SYM8&bl.i36.reelset=ALL&pt.i0.comp.i12.multi=5&pt.i1.comp.i14.freespins=0&bl.i3.coins=0&bl.i10.coins=0&pt.i0.comp.i12.symbol=SYM6&pt.i0.comp.i14.symbol=SYM6&pt.i1.comp.i13.freespins=0&pt.i0.comp.i14.type=betline&bl.i30.coins=0&bl.i39.line=0%2C3%2C3%2C3%2C0&pt.i1.comp.i0.n=3&pt.i1.comp.i26.symbol=SYM10&pt.i0.comp.i7.multi=25&jackpotcurrency=%26%23x20AC%3B&bl.i35.id=35&bl.i16.coins=0&bl.i9.coins=0&bl.i24.id=24&pt.i1.comp.i11.multi=40&pt.i0.comp.i1.n=4&bl.i22.coins=0&pt.i0.comp.i20.n=5&pt.i1.comp.i3.symbol=SYM3&pt.i1.comp.i23.freespins=0&bl.i13.id=13&bl.i36.id=36&pt.i0.comp.i25.symbol=SYM10&pt.i0.comp.i26.type=betline&pt.i0.comp.i9.type=betline&pt.i1.comp.i16.type=betline&pt.i1.comp.i20.symbol=SYM8&bl.i10.reelset=ALL&pt.i1.comp.i12.multi=5&pt.i1.comp.i1.n=4&pt.i1.comp.i11.freespins=0&pt.i0.comp.i9.symbol=SYM5&bl.i23.coins=0&bl.i11.coins=0&bl.i22.reelset=ALL&pt.i0.comp.i16.type=betline&bl.i3.line=3%2C3%2C3%2C3%2C3&bl.i4.reelset=ALL&bl.i4.coins=0&pt.i0.comp.i2.n=5&bl.i18.line=1%2C1%2C2%2C1%2C1&bl.i34.id=34&pt.i0.comp.i19.freespins=0&pt.i1.comp.i14.type=betline&bl.i11.id=11&pt.i0.comp.i6.type=betline&pt.i1.comp.i2.freespins=0&pt.i1.comp.i25.freespins=0&bl.i9.reelset=ALL&bl.i17.coins=0&pt.i1.comp.i10.multi=20&pt.i1.comp.i10.symbol=SYM5&bl.i11.reelset=ALL&bl.i16.line=3%2C3%2C2%2C3%2C3&pt.i1.comp.i2.n=5&pt.i1.comp.i20.n=5&pt.i1.comp.i24.freespins=0&bl.i21.line=3%2C3%2C1%2C3%2C3&pt.i0.comp.i4.type=betline&bl.i21.coins=0&bl.i28.reelset=ALL&pt.i1.comp.i26.freespins=0&pt.i1.comp.i1.type=betline&bl.i1.line=2%2C2%2C2%2C2%2C2&pt.i0.comp.i20.freespins=0&bl.i16.reelset=ALL&pt.i0.comp.i3.n=3&pt.i1.comp.i6.type=betline&pt.i1.comp.i4.symbol=SYM3&bl.i8.line=3%2C2%2C3%2C2%2C3&pt.i0.comp.i24.symbol=SYM10&bl.i35.reelset=ALL&bl.i8.coins=0&bl.i23.id=23&bl.i15.coins=0&bl.i36.line=3%2C0%2C3%2C0%2C3&pt.i1.comp.i3.n=3&pt.i1.comp.i21.n=3&pt.i0.comp.i18.freespins=0&bl.i12.id=12&pt.i1.comp.i15.symbol=SYM7&pt.i1.comp.i3.freespins=0&bl.i4.id=4&bl.i7.coins=0&pt.i1.comp.i9.symbol=SYM5&pt.i0.comp.i3.symbol=SYM3&pt.i0.comp.i24.type=betline&bl.i14.coins=0&pt.i1.comp.i12.freespins=0&pt.i0.comp.i4.n=4&pt.i1.comp.i10.n=4&bl.i26.line=3%2C1%2C3%2C1%2C3`;
    }

    private handleInitFreespinRequest(): string {
        return `rs.i4.id=basic1&rs.i2.r.i1.hold=false&rs.i1.r.i0.syms=SYM3%2CSYM3%2CSYM3%2CSYM3&gameServerVersion=1.0.1&g4mode=false&freespins.win.coins=0&historybutton=false&rs.i0.r.i4.hold=false&next.rs=freespin&gamestate.history=basic&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=0&rs.i0.r.i1.syms=SYM8%2CSYM8%2CSYM10%2CSYM10&rs.i2.r.i1.pos=0&game.win.cents=0&rs.i4.r.i4.pos=85&rs.i1.r.i3.hold=false&totalwin.coins=0&rs.i5.r.i4.syms=SYM6%2CSYM6%2CSYM3%2CSYM3&gamestate.current=freespin&freespins.initial=8&rs.i4.r.i0.pos=152&jackpotcurrency=%26%23x20AC%3B&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35%2C36%2C37%2C38%2C39&rs.i3.r.i1.hold=false&lastFSReels=null&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM3%2CSYM3%2CSYM6%2CSYM6&rs.i0.r.i3.syms=SYM8%2CSYM8%2CSYM8%2CSYM8&rs.i1.r.i1.syms=SYM7%2CSYM7%2CSYM5%2CSYM5&rs.i1.r.i1.pos=0&rs.i3.r.i4.pos=0&freespins.win.cents=0&isJackpotWin=false&rs.i0.r.i0.pos=0&rs.i2.r.i3.hold=false&rs.i2.r.i3.pos=0&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35%2C36%2C37%2C38%2C39&rs.i5.r.i0.pos=0&cjpUrl=https%3A%2F%2Fcjp-dev.casinomodule.com&rs.i0.r.i1.pos=0&rs.i4.r.i4.syms=SYM10%2CSYM10%2CSYM0%2CSYM3&rs.i1.r.i3.syms=SYM5%2CSYM5%2CSYM5%2CSYM5&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=0&rs.i2.id=basic2&game.win.coins=0&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&rs.i2.r.i1.syms=SYM8%2CSYM8%2CSYM8%2CSYM8&clientaction=initfreespin&rs.i4.r.i0.hold=false&rs.i0.r.i2.hold=false&rs.i4.r.i3.syms=SYM7%2CSYM7%2CSYM3%2CSYM3&rs.i3.r.i2.hold=false&gameover=false&rs.i3.r.i3.pos=0&rs.i5.id=freespin2&rs.i5.r.i1.syms=SYM3%2CSYM3%2CSYM3%2CSYM3&rs.i0.r.i3.pos=0&rs.i5.r.i1.hold=false&rs.i4.r.i0.syms=SYM0%2CSYM7%2CSYM7%2CSYM7&rs.i5.r.i4.hold=false&rs.i5.r.i3.pos=0&nextaction=freespin&rs.i4.r.i2.pos=108&rs.i0.r.i2.syms=SYM13%2CSYM13%2CSYM5%2CSYM5&game.win.amount=0.00&freespins.totalwin.cents=0&rs.i5.r.i2.hold=false&freespins.betlevel=1&rs.i4.r.i3.pos=72&playercurrency=%26%23x20AC%3B&rs.i2.r.i0.pos=0&rs.i4.r.i4.hold=false&current.rs.i0=freespin&rs.i5.r.i0.syms=SYM9%2CSYM9%2CSYM9%2CSYM9&rs.i2.r.i4.syms=SYM9%2CSYM9%2CSYM9%2CSYM9&rs.i3.r.i2.syms=SYM3%2CSYM3%2CSYM3%2CSYM3&rs.i4.r.i3.hold=false&rs.i0.id=freespin1&credit=${Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100)}&rs.i1.r.i4.pos=0&rs.i3.id=mystery1&multiplier=1&rs.i2.r.i2.pos=0&freespins.denomination=5.000&rs.i5.r.i1.pos=0&freespins.totalwin.coins=0&freespins.total=8&gamestate.stack=basic%2Cfreespin&rs.i1.r.i4.syms=SYM5%2CSYM5%2CSYM5%2CSYM5&rs.i2.r.i2.syms=SYM10%2CSYM10%2CSYM10%2CSYM10&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i1.r.i2.pos=0&rs.i5.r.i2.syms=SYM6%2CSYM6%2CSYM6%2CSYM6&rs.i3.r.i3.syms=SYM3%2CSYM3%2CSYM6%2CSYM6&rs.i5.r.i3.hold=false&bet.betlevel=1&rs.i3.r.i4.hold=false&rs.i4.r.i2.hold=false&rs.i5.r.i0.hold=false&rs.i4.r.i1.syms=SYM7%2CSYM7%2CSYM7%2CSYM7&rs.i2.r.i4.pos=0&rs.i3.r.i0.syms=SYM6%2CSYM6%2CSYM6%2CSYM6&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i4.r.i1.hold=false&freespins.wavecount=1&rs.i3.r.i2.pos=0&rs.i3.r.i3.hold=false&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM8%2CSYM8%2CSYM8%2CSYM8&rs.i0.r.i2.pos=0&rs.i1.r.i2.syms=SYM6%2CSYM6%2CSYM6%2CSYM6&rs.i1.r.i0.pos=0&totalwin.cents=0&rs.i2.r.i0.syms=SYM10%2CSYM10%2CSYM10%2CSYM10&rs.i5.r.i2.pos=0&rs.i0.r.i0.hold=false&rs.i2.r.i3.syms=SYM6%2CSYM6%2CSYM10%2CSYM10&rs.i1.id=mystery2&rs.i3.r.i4.syms=SYM10%2CSYM10%2CSYM10%2CSYM10&rs.i3.r.i1.syms=SYM8%2CSYM8%2CSYM8%2CSYM8&rs.i1.r.i4.hold=false&freespins.left=8&rs.i0.r.i4.pos=0&rs.i4.r.i1.pos=32&rs.i4.r.i2.syms=SYM6%2CSYM0%2CSYM9%2CSYM9&rs.i3.r.i0.pos=0&rs.i5.r.i3.syms=SYM6%2CSYM6%2CSYM7%2CSYM7&rs.i3.r.i0.hold=false&rs.i4.nearwin=4&rs.i2.r.i2.hold=false&wavecount=1&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&bet.denomination=5&rs.i5.r.i4.pos=0`;
    }

    private handleSpinRequest(postData: any): string {
        const linesId = this.getLinesId();
        const lines = 20; // PHP: $lines = 20;
        const betline = postData.bet_betlevel;
        let allbet = betline * lines;
        let bonusMpl = 1;

        if (postData.slotEvent !== 'freespin') {
            this.slotSettings.SetBalance(-1 * allbet, postData.slotEvent);
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(postData.slotEvent, bankSum, postData.slotEvent);
            this.slotSettings.UpdateJackpots(allbet);

            this.slotSettings.SetGameData('GoldenGrimoireNETBonusWin', 0);
            this.slotSettings.SetGameData('GoldenGrimoireNETFreeGames', 0);
            this.slotSettings.SetGameData('GoldenGrimoireNETCurrentFreeGame', 0);
            this.slotSettings.SetGameData('GoldenGrimoireNETTotalWin', 0);
            this.slotSettings.SetGameData('GoldenGrimoireNETBet', betline);
            this.slotSettings.SetGameData('GoldenGrimoireNETDenom', this.slotSettings.CurrentDenom);
            this.slotSettings.SetGameData('GoldenGrimoireNETFreeBalance', this.slotSettings.GetBalance() * 100);
        } else {
            this.slotSettings.CurrentDenom = this.slotSettings.GetGameData('GoldenGrimoireNETDenom');
            this.slotSettings.CurrentDenomination = this.slotSettings.CurrentDenom;
            const storedBet = this.slotSettings.GetGameData('GoldenGrimoireNETBet');
            allbet = storedBet * lines;
            this.slotSettings.SetGameData('GoldenGrimoireNETCurrentFreeGame',
                this.slotSettings.GetGameData('GoldenGrimoireNETCurrentFreeGame') + 1);
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
        let overlaySym = '';
        let scattersCount = 0;

        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            lineWins = [];
            const cWins: number[] = new Array(lines).fill(0);
            const wild = ['1'];
            const scatter = '0';
            reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent);

            // Overlay/mystery symbol logic from PHP
            overlaySym = '';
            let overlayCnt = 0;
            const overlayRandomSymArr = [1, 6, 7, 8, 9, 10];
            this.shuffleArray(overlayRandomSymArr);
            const overlayRandomSym = overlayRandomSymArr[0];

            for (let r = 1; r <= 5; r++) {
                const reelKey = `reel${r}`;
                const reelData = reels[reelKey];
                if (reelData) {
                    for (let p = 0; p <= 3; p++) {
                        if (reelData[p] == 13) { // 13 is mystery symbol?
                            overlaySym += `&rs.i0.r.i${r - 1}.overlay.i${overlayCnt}.pos=59&rs.i0.r.i${r - 1}.overlay.i${overlayCnt}.row=${p}&rs.i0.r.i${r - 1}.overlay.i${overlayCnt}.with=SYM${overlayRandomSym}`;
                            reelData[p] = overlayRandomSym;
                            // Check if first reel has matching mystery symbol (which is impossible as reel 1 never has 13?)
                            // Wait, PHP code:
                            // if( $reels['reel1'][$p] == $overlayRandomSym )
                            // Since we just set reelData[p] to overlayRandomSym, if r=1, it is true.
                            // If r > 1, we check if reel1 has overlayRandomSym at same position?
                            // No, PHP logic: if ($reels['reel1'][$p] == $overlayRandomSym) then update reels r down to 1?
                            // Wait, $rr = $r; $rr >= 1.

                            // Re-reading PHP:
                            // $reels['reel' . $r][$p] = $overlayRandomSym;
                            // if( $reels['reel1'][$p] == $overlayRandomSym )
                            // { for( $rr = $r; $rr >= 1; $rr-- ) { $reels['reel' . $rr][$p] = $overlayRandomSym; } }

                            // So if Reel 1 has the mystery reveal symbol at the same position P,
                            // then ALL reels from current R down to 1 get transformed to the mystery symbol at position P.
                            // This means Mystery Symbol expansion to the left if Reel 1 matches.

                            if (reels['reel1'] && reels['reel1'][p] == overlayRandomSym) {
                                for (let rr = r; rr >= 1; rr--) {
                                    if (reels[`reel${rr}`]) {
                                        reels[`reel${rr}`]![p] = overlayRandomSym;
                                    }
                                }
                            }
                            overlayCnt++;
                        }
                    }
                }
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

                    const matchCounts = [3, 4, 5];
                    for (const count of matchCounts) {
                        let match = true;
                        let wildCount = 0;
                        for (let m = 0; m < count; m++) {
                            const symbol = String(s[m]);
                            if (symbol !== csym && !wild.includes(symbol)) {
                                match = false;
                                break;
                            }
                            if (wild.includes(symbol)) {
                                wildCount++;
                            }
                        }

                        if (match) {
                            let mpl = 1;
                            if (wildCount === count) {
                                mpl = 1;
                            } else if (wildCount > 0) {
                                mpl = this.slotSettings.slotWildMpl;
                            }

                            const tmpWin = this.slotSettings.Paytable['SYM_' + csym][count] * betline * mpl * bonusMpl;
                            if (cWins[k] < tmpWin) {
                                cWins[k] = tmpWin;
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
            scattersCount = 0;
            let scPos: string[] = [];
            for (let r = 1; r <= 5; r++) {
                for (let p = 0; p <= 3; p++) {
                    if (reels[`reel${r}`]?.[p] === scatter) {
                        scattersCount++;
                        scPos.push(`&ws.i0.pos.i${r - 1}=${r - 1}%2C${p}`);
                    }
                }
            }

            // Scatters don't pay direct win, they trigger freespin
            if (scattersCount >= 3) {
                // Free spin trigger
            }

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
            } else if (scattersCount >= 3 && winType !== 'bonus') {
                continue;
            } else if (totalWin <= spinWinLimit && winType === 'bonus') {
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

        if (totalWin > 0) {
            this.slotSettings.SetBank(postData.slotEvent, -1 * totalWin);
            this.slotSettings.SetBalance(totalWin);
        }

        const reportWin = totalWin;
        let curReels = '';
        for (let i = 0; i < 5; i++) {
             curReels += `&rs.i0.r.i${i}.syms=SYM${reels[`reel${i + 1}`]?.[0]}%2CSYM${reels[`reel${i + 1}`]?.[1]}%2CSYM${reels[`reel${i + 1}`]?.[2]}%2CSYM${reels[`reel${i + 1}`]?.[3]}`;
        }

        if (postData.slotEvent === 'freespin') {
            this.slotSettings.SetGameData('GoldenGrimoireNETBonusWin', this.slotSettings.GetGameData('GoldenGrimoireNETBonusWin') + totalWin);
            this.slotSettings.SetGameData('GoldenGrimoireNETTotalWin', this.slotSettings.GetGameData('GoldenGrimoireNETTotalWin') + totalWin);
        } else {
            this.slotSettings.SetGameData('GoldenGrimoireNETTotalWin', totalWin);
        }

        let fs = 0;
        let result_tmp = '';
        if (scattersCount >= 3) {
            this.slotSettings.SetGameData('GoldenGrimoireNETFreeStartWin', totalWin);
            this.slotSettings.SetGameData('GoldenGrimoireNETBonusWin', totalWin);
            this.slotSettings.SetGameData('GoldenGrimoireNETFreeGames', this.slotSettings.slotFreeCount[scattersCount]);
            fs = this.slotSettings.GetGameData('GoldenGrimoireNETFreeGames');
        }

        const winString = lineWins.join('');
        this.slotSettings.SetGameData('GoldenGrimoireNETGambleStep', 5);

        let freeState = '';
        let nextaction = 'spin';
        let stack = 'basic';
        let gamestate = 'basic';

        if (totalWin > 0) {
            // ...
        }

        if (postData.slotEvent === 'freespin') {
            totalWin = this.slotSettings.GetGameData('GoldenGrimoireNETBonusWin');
            if (this.slotSettings.GetGameData(this.slotId + 'FreeGames') <= this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') &&
                this.slotSettings.GetGameData('GoldenGrimoireNETBonusWin') > 0) {
                    nextaction = 'spin';
                    stack = 'basic';
                    gamestate = 'basic';
            } else {
                gamestate = 'freespin';
                nextaction = 'freespin';
                stack = 'basic%2Cfreespin';
            }

            const fs = this.slotSettings.GetGameData('GoldenGrimoireNETFreeGames');
            const fsl = this.slotSettings.GetGameData('GoldenGrimoireNETFreeGames') - this.slotSettings.GetGameData('GoldenGrimoireNETCurrentFreeGame');
            const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

            freeState = `&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&freespins.totalwin.cents=0&nextaction=${nextaction}&freespins.left=${fsl}&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=${stack}&freespins.totalwin.coins=${totalWin}&freespins.total=${fs}&freespins.win.cents=${totalWin / this.slotSettings.CurrentDenomination * 100}&gamestate.current=${gamestate}&freespins.initial=${fs}&freespins.win.coins=${totalWin}&freespins.betlevel=${this.slotSettings.GetGameData('GoldenGrimoireNETBet')}&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}`;
            curReels += freeState;
        }

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        const logResponse = {
            responseEvent: 'spin',
            responseType: postData.slotEvent,
            serverResponse: {
                freeState: freeState,
                slotLines: lines,
                slotBet: betline,
                totalFreeGames: this.slotSettings.GetGameData('GoldenGrimoireNETFreeGames'),
                currentFreeGames: this.slotSettings.GetGameData('GoldenGrimoireNETCurrentFreeGame'),
                Balance: balanceInCents,
                afterBalance: balanceInCents,
                bonusWin: this.slotSettings.GetGameData('GoldenGrimoireNETBonusWin'),
                totalWin: totalWin,
                winLines: [],
                Jackpots: this.slotSettings.Jackpots,
                reelsSymbols: reels
            }
        };
        this.slotSettings.SaveLogReport(JSON.stringify(logResponse), allbet, lines, reportWin, postData.slotEvent);

        if (scattersCount >= 3) {
            // Simplified return for triggered free spins
             result_tmp = `freespins.betlevel=1&ws.i0.pos.i2=2%2C1&gameServerVersion=1.0.1&g4mode=false&freespins.win.coins=0&playercurrency=%26%23x20AC%3B&rs.i0.nearwin=4&historybutton=false&current.rs.i0=freespin&rs.i0.r.i4.hold=false&ws.i0.types.i0.freespins=8&ws.i0.reelset=basic1&next.rs=freespin&gamestate.history=basic&ws.i0.pos.i1=4%2C2&ws.i0.pos.i0=0%2C0&rs.i0.r.i1.syms=SYM7%2CSYM7%2CSYM7%2CSYM7&game.win.cents=0&ws.i0.betline=null&rs.i0.id=basic1&totalwin.coins=0&credit=${balanceInCents}&gamestate.current=freespin&freespins.initial=8&jackpotcurrency=%26%23x20AC%3B&multiplier=1&freespins.denomination=5.000&rs.i0.r.i0.syms=SYM0%2CSYM7%2CSYM7%2CSYM7&rs.i0.r.i3.syms=SYM7%2CSYM7%2CSYM3%2CSYM3&freespins.win.cents=0&ws.i0.sym=SYM0&freespins.totalwin.coins=0&freespins.total=8&ws.i0.direction=none&isJackpotWin=false&gamestate.stack=basic%2Cfreespin&rs.i0.r.i0.pos=152&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35%2C36%2C37%2C38%2C39&gamesoundurl=&ws.i0.types.i0.wintype=freespins&cjpUrl=&rs.i0.r.i1.pos=32&game.win.coins=0&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i1.hold=false&freespins.wavecount=1&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=spin&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM10%2CSYM10%2CSYM0%2CSYM3&rs.i0.r.i2.pos=108&totalwin.cents=0&gameover=false&rs.i0.r.i0.hold=false&rs.i0.r.i3.pos=72&freespins.left=8&rs.i0.r.i4.pos=85&nextaction=freespin&wavecount=1&ws.i0.types.i0.multipliers=1&rs.i0.r.i2.syms=SYM6%2CSYM0%2CSYM9%2CSYM9&rs.i0.r.i3.hold=false&game.win.amount=0.00&freespins.totalwin.cents=0${curReels}${winString}${overlaySym}`;
        } else {
             result_tmp = `rs.i0.r.i1.pos=18&g4mode=false&game.win.coins=${totalWin}&playercurrency=%26%23x20AC%3B&playercurrencyiso=${this.slotSettings.slotCurrency}&historybutton=false&rs.i0.r.i1.hold=false&rs.i0.r.i4.hold=false&gamestate.history=basic&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=spin&rs.i0.r.i2.hold=false&game.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&rs.i0.r.i2.pos=47&rs.i0.id=basic&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gamestate.current=basic&gameover=true&rs.i0.r.i0.hold=false&jackpotcurrency=%26%23x20AC%3B&multiplier=1&rs.i0.r.i3.pos=4&rs.i0.r.i4.pos=5&isJackpotWin=false&gamestate.stack=basic&nextaction=spin&rs.i0.r.i0.pos=7&wavecount=1&gamesoundurl=&rs.i0.r.i3.hold=false&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}${curReels}${winString}${overlaySym}`;
        }

        return result_tmp;
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

    private generateSessionId(): string {
        return 'a40e5dc15a83a70f288e421fbcfc6de8';
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private shuffleArray(array: any[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
