// Server.ts - FlowersNET game server
// Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines
// Data injection pattern - NO database calls or legacy PHP constructs

import { SlotSettings, ReelStrips } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'FlowersNET';

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
            const lines = 30;
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
        this.slotSettings.SetGameData('FlowersNETBonusWin', 0);
        this.slotSettings.SetGameData('FlowersNETFreeGames', 0);
        this.slotSettings.SetGameData('FlowersNETCurrentFreeGame', 0);
        this.slotSettings.SetGameData('FlowersNETTotalWin', 0);
        this.slotSettings.SetGameData('FlowersNETFreeBalance', 0);

        let freeState = '';
        let curReels = '';

        if (lastEvent && lastEvent !== 'NULL') {
            const serverResponse = lastEvent.serverResponse;
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', serverResponse.totalFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', serverResponse.currentFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', serverResponse.Balance);
            freeState = serverResponse.freeState;
            const reels = serverResponse.reelsSymbols;

            curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1[0]}%2CSYM${reels.reel1[1]}%2CSYM${reels.reel1[2]}`;
            curReels += `&rs.i0.r.i1.syms=SYM${reels.reel2[0]}%2CSYM${reels.reel2[1]}%2CSYM${reels.reel2[2]}`;
            curReels += `&rs.i0.r.i2.syms=SYM${reels.reel3[0]}%2CSYM${reels.reel3[1]}%2CSYM${reels.reel3[2]}`;
            curReels += `&rs.i0.r.i3.syms=SYM${reels.reel4[0]}%2CSYM${reels.reel4[1]}%2CSYM${reels.reel4[2]}`;
            curReels += `&rs.i0.r.i4.syms=SYM${reels.reel5[0]}%2CSYM${reels.reel5[1]}%2CSYM${reels.reel5[2]}`;
            curReels += `&rs.i1.r.i0.syms=SYM${reels.reel1[0]}%2CSYM${reels.reel1[1]}%2CSYM${reels.reel1[2]}`;
            curReels += `&rs.i1.r.i1.syms=SYM${reels.reel2[0]}%2CSYM${reels.reel2[1]}%2CSYM${reels.reel2[2]}`;
            curReels += `&rs.i1.r.i2.syms=SYM${reels.reel3[0]}%2CSYM${reels.reel3[1]}%2CSYM${reels.reel3[2]}`;
            curReels += `&rs.i1.r.i3.syms=SYM${reels.reel4[0]}%2CSYM${reels.reel4[1]}%2CSYM${reels.reel4[2]}`;
            curReels += `&rs.i1.r.i4.syms=SYM${reels.reel5[0]}%2CSYM${reels.reel5[1]}%2CSYM${reels.reel5[2]}`;
            curReels += `&rs.i0.r.i0.pos=${reels.rp[0]}`;
            curReels += `&rs.i0.r.i1.pos=${reels.rp[0]}`;
            curReels += `&rs.i0.r.i2.pos=${reels.rp[0]}`;
            curReels += `&rs.i0.r.i3.pos=${reels.rp[0]}`;
            curReels += `&rs.i0.r.i4.pos=${reels.rp[0]}`;
            curReels += `&rs.i1.r.i0.pos=${reels.rp[0]}`;
            curReels += `&rs.i1.r.i1.pos=${reels.rp[0]}`;
            curReels += `&rs.i1.r.i2.pos=${reels.rp[0]}`;
            curReels += `&rs.i1.r.i3.pos=${reels.rp[0]}`;
            curReels += `&rs.i1.r.i4.pos=${reels.rp[0]}`;
        } else {
            curReels = `&rs.i0.r.i0.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            curReels += `&rs.i0.r.i1.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            curReels += `&rs.i0.r.i2.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            curReels += `&rs.i0.r.i3.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            curReels += `&rs.i0.r.i4.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            curReels += `&rs.i0.r.i0.pos=${this.randomInt(1, 10)}`;
            curReels += `&rs.i0.r.i1.pos=${this.randomInt(1, 10)}`;
            curReels += `&rs.i0.r.i2.pos=${this.randomInt(1, 10)}`;
            curReels += `&rs.i0.r.i3.pos=${this.randomInt(1, 10)}`;
            curReels += `&rs.i0.r.i4.pos=${this.randomInt(1, 10)}`;
            curReels += `&rs.i1.r.i0.pos=${this.randomInt(1, 10)}`;
            curReels += `&rs.i1.r.i1.pos=${this.randomInt(1, 10)}`;
            curReels += `&rs.i1.r.i2.pos=${this.randomInt(1, 10)}`;
            curReels += `&rs.i1.r.i3.pos=${this.randomInt(1, 10)}`;
            curReels += `&rs.i1.r.i4.pos=${this.randomInt(1, 10)}`;
        }

        // Check if there are active free games
        if (this.slotSettings.GetGameData('FlowersNETCurrentFreeGame') < this.slotSettings.GetGameData('FlowersNETFreeGames') && this.slotSettings.GetGameData('FlowersNETFreeGames') > 0) {
             freeState = 'previous.rs.i0=freespin&rs.i1.r.i0.syms=SYM8%2CSYM9%2CSYM11&bl.i6.coins=1&bl.i17.reelset=ALL&rs.i0.nearwin=4%2C2%2C3&bl.i15.id=15&rs.i0.r.i1.attention.i0=1&rs.i0.r.i4.hold=false&gamestate.history=basic%2Cfreespin&rs.i1.r.i2.hold=false&bl.i21.id=21&game.win.cents=300&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i23.reelset=ALL&bl.i10.line=1%2C2%2C1%2C2%2C1&bl.i0.reelset=ALL&bl.i20.coins=1&bl.i18.coins=1&bl.i10.id=10&freespins.initial=10&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&bl.i13.coins=1&bl.i26.reelset=ALL&bl.i24.line=2%2C0%2C1%2C2%2C0&bl.i27.id=27&rs.i0.r.i0.syms=SYM8%2CSYM9%2CSYM11&bl.i2.id=2&rs.i1.r.i1.pos=68&rs.i0.r.i0.pos=66&bl.i14.reelset=ALL&game.win.coins=60&bl.i28.line=2%2C1%2C0%2C0%2C0&rs.i1.r.i0.hold=false&bl.i3.id=3&bl.i22.line=2%2C2%2C0%2C2%2C2&bl.i12.coins=1&bl.i8.reelset=ALL&clientaction=init&rs.i0.r.i2.hold=false&bl.i16.id=16&casinoID=netent&bl.i5.coins=1&bl.i8.id=8&rs.i0.r.i3.pos=77&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i22.id=22&rs.i1.r.i2.attention.i0=1&bl.i12.line=2%2C1%2C2%2C1%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&bl.i29.reelset=ALL&rs.i0.r.i2.syms=SYM15%2CSYM10%2CSYM12&game.win.amount=3.00&betlevel.all=1%2C2%2C3%2C4%2C5&denomination.all=' . implode('%2C', $slotSettings->Denominations) . '&bl.i27.coins=1&current.rs.i0=freespin&bl.i1.id=1&bl.i25.id=25&rs.i1.r.i4.pos=11&denomination.standard=' . ($slotSettings->CurrentDenomination * 100) . '&multiplier=3&bl.i14.id=14&bl.i19.line=0%2C2%2C2%2C2%2C0&freespins.denomination=5.000&bl.i12.reelset=ALL&bl.i2.coins=1&bl.i6.id=6&bl.i21.reelset=ALL&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&freespins.totalwin.coins=0&freespins.total=10&bl.i20.id=20&gamestate.stack=basic%2Cfreespin&rs.i1.r.i4.syms=SYM1%2CSYM1%2CSYM1&gamesoundurl=&bet.betlevel=1&bl.i5.reelset=ALL&bl.i24.coins=1&bl.i19.coins=1&bl.i7.id=7&bl.i18.reelset=ALL&playercurrencyiso=' . $slotSettings->slotCurrency . '&bl.i1.coins=1&rs.i0.r.i2.attention.i0=2&bl.i14.line=1%2C1%2C2%2C1%2C1&freespins.multiplier=3&playforfun=false&jackpotcurrencyiso=' . $slotSettings->slotCurrency . '&rs.i0.r.i4.syms=SYM14%2CSYM1%2CSYM16&bl.i25.coins=1&rs.i0.r.i2.pos=10&bl.i13.line=1%2C1%2C0%2C1%2C1&bl.i24.reelset=ALL&rs.i1.r.i0.pos=45&bl.i0.coins=1&bl.i2.reelset=ALL&rs.i1.r.i4.hold=false&freespins.left=8&bl.i26.coins=1&bl.i27.reelset=ALL&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29&bl.i29.line=1%2C0%2C1%2C2%2C1&bl.i23.line=0%2C2%2C1%2C0%2C2&bl.i26.id=26&bl.i15.reelset=ALL&rs.i0.r.i3.hold=false&bet.denomination=' . ($slotSettings->CurrentDenomination * 100) . '&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&freespins.win.coins=0&historybutton=false&bl.i25.line=1%2C0%2C2%2C0%2C1&bl.i5.id=5&gameEventSetters.enabled=false&next.rs=freespin&rs.i1.r.i3.pos=26&rs.i0.r.i1.syms=SYM11%2CSYM12%2CSYM9&bl.i3.coins=1&bl.i10.coins=1&bl.i18.id=18&rs.i1.r.i3.hold=false&totalwin.coins=60&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=freespin&bl.i28.coins=1&bl.i27.line=0%2C1%2C2%2C2%2C2&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29&rs.i0.r.i3.syms=SYM1%2CSYM3%2CSYM13&rs.i1.r.i1.syms=SYM8%2CSYM9%2CSYM3&bl.i16.coins=1&freespins.win.cents=0&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&bl.i24.id=24&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29&rs.i0.r.i1.pos=9&bl.i22.coins=1&rs.i1.r.i3.syms=SYM3%2CSYM10%2CSYM9&bl.i29.coins=1&bl.i13.id=13&rs.i0.r.i1.hold=false&bl.i9.line=1%2C0%2C1%2C0%2C1&betlevel.standard=1&bl.i10.reelset=ALL&gameover=false&bl.i25.reelset=ALL&bl.i23.coins=1&bl.i11.coins=1&bl.i22.reelset=ALL&bl.i13.reelset=ALL&bl.i0.id=0&nextaction=freespin&bl.i15.line=0%2C1%2C1%2C1%2C0&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i19.id=19&bl.i4.reelset=ALL&bl.i4.coins=1&bl.i18.line=2%2C0%2C2%2C0%2C2&freespins.totalwin.cents=0&bl.i9.id=9&bl.i17.line=0%2C2%2C0%2C2%2C0&bl.i11.id=11&freespins.betlevel=1&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&bl.i17.coins=1&bl.i28.id=28&bl.i19.reelset=ALL&bl.i11.reelset=ALL&bl.i16.line=2%2C1%2C1%2C1%2C2&rs.i0.id=basic&credit=' . $balanceInCents . '&bl.i21.line=0%2C0%2C2%2C0%2C0&bl.i1.reelset=ALL&last.rs=freespin&bl.i21.coins=1&bl.i28.reelset=ALL&bl.i1.line=0%2C0%2C0%2C0%2C0&bl.i17.id=17&rs.i1.r.i2.pos=27&bl.i16.reelset=ALL&nearwinallowed=true&bl.i8.line=1%2C0%2C0%2C0%2C1&freespins.wavecount=1&bl.i8.coins=1&bl.i23.id=23&bl.i15.coins=1&bl.i2.line=2%2C2%2C2%2C2%2C2&rs.i1.r.i2.syms=SYM16%2CSYM0%2CSYM15&totalwin.cents=300&rs.i0.r.i0.hold=false&restore=true&rs.i1.id=freespin&bl.i12.id=12&bl.i29.id=29&bl.i4.id=4&rs.i0.r.i4.pos=39&bl.i7.coins=1&bl.i6.reelset=ALL&bl.i20.line=2%2C0%2C0%2C0%2C2&bl.i20.reelset=ALL&wavecount=1&bl.i14.coins=1&rs.i1.r.i1.hold=false&bl.i26.line=1%2C2%2C0%2C2%2C1' . $curReels . $freeState;
             // Emulate big string construction from PHP logic
             freeState = `previous.rs.i0=freespin&rs.i1.r.i0.syms=SYM8%2CSYM9%2CSYM11&bl.i6.coins=1&bl.i17.reelset=ALL&rs.i0.nearwin=4%2C2%2C3&bl.i15.id=15&rs.i0.r.i1.attention.i0=1&rs.i0.r.i4.hold=false&gamestate.history=basic%2Cfreespin&rs.i1.r.i2.hold=false&bl.i21.id=21&game.win.cents=300&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i23.reelset=ALL&bl.i10.line=1%2C2%2C1%2C2%2C1&bl.i0.reelset=ALL&bl.i20.coins=1&bl.i18.coins=1&bl.i10.id=10&freespins.initial=10&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&bl.i13.coins=1&bl.i26.reelset=ALL&bl.i24.line=2%2C0%2C1%2C2%2C0&bl.i27.id=27&rs.i0.r.i0.syms=SYM8%2CSYM9%2CSYM11&bl.i2.id=2&rs.i1.r.i1.pos=68&rs.i0.r.i0.pos=66&bl.i14.reelset=ALL&game.win.coins=60&bl.i28.line=2%2C1%2C0%2C0%2C0&rs.i1.r.i0.hold=false&bl.i3.id=3&bl.i22.line=2%2C2%2C0%2C2%2C2&bl.i12.coins=1&bl.i8.reelset=ALL&clientaction=init&rs.i0.r.i2.hold=false&bl.i16.id=16&casinoID=netent&bl.i5.coins=1&bl.i8.id=8&rs.i0.r.i3.pos=77&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i22.id=22&rs.i1.r.i2.attention.i0=1&bl.i12.line=2%2C1%2C2%2C1%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&bl.i29.reelset=ALL&rs.i0.r.i2.syms=SYM15%2CSYM10%2CSYM12&game.win.amount=3.00&betlevel.all=1%2C2%2C3%2C4%2C5&denomination.all=${this.slotSettings.Denominations.map(d => d * 100).join('%2C')}&bl.i27.coins=1&current.rs.i0=freespin&bl.i1.id=1&bl.i25.id=25&rs.i1.r.i4.pos=11&denomination.standard=${this.slotSettings.CurrentDenomination * 100}&multiplier=3&bl.i14.id=14&bl.i19.line=0%2C2%2C2%2C2%2C0&freespins.denomination=5.000&bl.i12.reelset=ALL&bl.i2.coins=1&bl.i6.id=6&bl.i21.reelset=ALL&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&freespins.totalwin.coins=0&freespins.total=10&bl.i20.id=20&gamestate.stack=basic%2Cfreespin&rs.i1.r.i4.syms=SYM1%2CSYM1%2CSYM1&gamesoundurl=&bet.betlevel=1&bl.i5.reelset=ALL&bl.i24.coins=1&bl.i19.coins=1&bl.i7.id=7&bl.i18.reelset=ALL&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=1&rs.i0.r.i2.attention.i0=2&bl.i14.line=1%2C1%2C2%2C1%2C1&freespins.multiplier=3&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM14%2CSYM1%2CSYM16&bl.i25.coins=1&rs.i0.r.i2.pos=10&bl.i13.line=1%2C1%2C0%2C1%2C1&bl.i24.reelset=ALL&rs.i1.r.i0.pos=45&bl.i0.coins=1&bl.i2.reelset=ALL&rs.i1.r.i4.hold=false&freespins.left=8&bl.i26.coins=1&bl.i27.reelset=ALL&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29&bl.i29.line=1%2C0%2C1%2C2%2C1&bl.i23.line=0%2C2%2C1%2C0%2C2&bl.i26.id=26&bl.i15.reelset=ALL&rs.i0.r.i3.hold=false&bet.denomination=${this.slotSettings.CurrentDenomination * 100}&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&freespins.win.coins=0&historybutton=false&bl.i25.line=1%2C0%2C2%2C0%2C1&bl.i5.id=5&gameEventSetters.enabled=false&next.rs=freespin&rs.i1.r.i3.pos=26&rs.i0.r.i1.syms=SYM11%2CSYM12%2CSYM9&bl.i3.coins=1&bl.i10.coins=1&bl.i18.id=18&rs.i1.r.i3.hold=false&totalwin.coins=60&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=freespin&bl.i28.coins=1&bl.i27.line=0%2C1%2C2%2C2%2C2&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29&rs.i0.r.i3.syms=SYM1%2CSYM3%2CSYM13&rs.i1.r.i1.syms=SYM8%2CSYM9%2CSYM3&bl.i16.coins=1&freespins.win.cents=0&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&bl.i24.id=24&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29&rs.i0.r.i1.pos=9&bl.i22.coins=1&rs.i1.r.i3.syms=SYM3%2CSYM10%2CSYM9&bl.i29.coins=1&bl.i13.id=13&rs.i0.r.i1.hold=false&bl.i9.line=1%2C0%2C1%2C0%2C1&betlevel.standard=1&bl.i10.reelset=ALL&gameover=false&bl.i25.reelset=ALL&bl.i23.coins=1&bl.i11.coins=1&bl.i22.reelset=ALL&bl.i13.reelset=ALL&bl.i0.id=0&nextaction=freespin&bl.i15.line=0%2C1%2C1%2C1%2C0&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i19.id=19&bl.i4.reelset=ALL&bl.i4.coins=1&bl.i18.line=2%2C0%2C2%2C0%2C2&freespins.totalwin.cents=0&bl.i9.id=9&bl.i17.line=0%2C2%2C0%2C2%2C0&bl.i11.id=11&freespins.betlevel=1&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&bl.i17.coins=1&bl.i28.id=28&bl.i19.reelset=ALL&bl.i11.reelset=ALL&bl.i16.line=2%2C1%2C1%2C1%2C2&rs.i0.id=basic&credit=${this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100}&bl.i21.line=0%2C0%2C2%2C0%2C0&bl.i1.reelset=ALL&last.rs=freespin&bl.i21.coins=1&bl.i28.reelset=ALL&bl.i1.line=0%2C0%2C0%2C0%2C0&bl.i17.id=17&rs.i1.r.i2.pos=27&bl.i16.reelset=ALL&nearwinallowed=true&bl.i8.line=1%2C0%2C0%2C0%2C1&freespins.wavecount=1&bl.i8.coins=1&bl.i23.id=23&bl.i15.coins=1&bl.i2.line=2%2C2%2C2%2C2%2C2&rs.i1.r.i2.syms=SYM16%2CSYM0%2CSYM15&totalwin.cents=300&rs.i0.r.i0.hold=false&restore=true&rs.i1.id=freespin&bl.i12.id=12&bl.i29.id=29&bl.i4.id=4&rs.i0.r.i4.pos=39&bl.i7.coins=1&bl.i6.reelset=ALL&bl.i20.line=2%2C0%2C0%2C0%2C2&bl.i20.reelset=ALL&wavecount=1&bl.i14.coins=1&rs.i1.r.i1.hold=false&bl.i26.line=1%2C2%2C0%2C2%2C1${curReels}${freeState}`;
        }

        const result = `rs.i1.r.i0.syms=SYM6%2CSYM9%2CSYM11&bl.i6.coins=1&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&bl.i17.reelset=ALL&historybutton=false&bl.i15.id=15&bl.i25.line=1%2C0%2C2%2C0%2C1&rs.i0.r.i4.hold=false&bl.i5.id=5&gameEventSetters.enabled=false&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=0&rs.i0.r.i1.syms=SYM9%2CSYM17%2CSYM10&bl.i3.coins=1&bl.i21.id=21&bl.i10.coins=1&bl.i18.id=18&game.win.cents=0&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i23.reelset=ALL&bl.i10.line=1%2C2%2C1%2C2%2C1&bl.i0.reelset=ALL&bl.i20.coins=1&rs.i1.r.i3.hold=false&totalwin.coins=0&bl.i18.coins=1&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=basic&bl.i10.id=10&bl.i28.coins=1&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&bl.i27.line=0%2C1%2C2%2C2%2C2&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&bl.i13.coins=1&bl.i26.reelset=ALL&bl.i24.line=2%2C0%2C1%2C2%2C0&bl.i27.id=27&rs.i0.r.i0.syms=SYM6%2CSYM8%2CSYM10&rs.i0.r.i3.syms=SYM8%2CSYM6%2CSYM5&rs.i1.r.i1.syms=SYM9%2CSYM17%2CSYM10&bl.i2.id=2&bl.i16.coins=1&rs.i1.r.i1.pos=0&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&rs.i0.r.i0.pos=0&bl.i14.reelset=ALL&bl.i24.id=24&rs.i0.r.i1.pos=0&bl.i22.coins=1&rs.i1.r.i3.syms=SYM8%2CSYM6%2CSYM5&game.win.coins=0&bl.i29.coins=1&bl.i13.id=13&bl.i28.line=2%2C1%2C0%2C0%2C0&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&bl.i3.id=3&bl.i22.line=2%2C2%2C0%2C2%2C2&bl.i12.coins=1&bl.i8.reelset=ALL&clientaction=init&bl.i9.line=1%2C0%2C1%2C0%2C1&rs.i0.r.i2.hold=false&bl.i16.id=16&casinoID=netent&betlevel.standard=1&bl.i5.coins=1&bl.i10.reelset=ALL&gameover=true&bl.i25.reelset=ALL&bl.i8.id=8&bl.i23.coins=1&rs.i0.r.i3.pos=0&bl.i11.coins=1&bl.i22.reelset=ALL&bl.i13.reelset=ALL&bl.i0.id=0&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i22.id=22&bl.i12.line=2%2C1%2C2%2C1%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&nextaction=spin&bl.i15.line=0%2C1%2C1%2C1%2C0&bl.i29.reelset=ALL&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i19.id=19&bl.i4.reelset=ALL&bl.i4.coins=1&rs.i0.r.i2.syms=SYM8%2CSYM13%2CSYM11&bl.i18.line=2%2C0%2C2%2C0%2C2&game.win.amount=0&betlevel.all=1%2C2%2C3%2C4%2C5&bl.i9.id=9&bl.i17.line=0%2C2%2C0%2C2%2C0&denomination.all=${this.slotSettings.Denominations.map(d => d * 100).join('%2C')}&bl.i11.id=11&playercurrency=%26%23x20AC%3B&bl.i27.coins=1&bl.i9.reelset=ALL&bl.i17.coins=1&bl.i28.id=28&bl.i1.id=1&bl.i19.reelset=ALL&bl.i25.id=25&bl.i11.reelset=ALL&bl.i16.line=2%2C1%2C1%2C1%2C2&rs.i0.id=freespin&credit=${Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100)}&rs.i1.r.i4.pos=0&denomination.standard=${this.slotSettings.CurrentDenomination * 100}&bl.i21.line=0%2C0%2C2%2C0%2C0&bl.i1.reelset=ALL&multiplier=1&bl.i14.id=14&bl.i19.line=0%2C2%2C2%2C2%2C0&bl.i21.coins=1&bl.i28.reelset=ALL&bl.i12.reelset=ALL&bl.i2.coins=1&bl.i6.id=6&bl.i1.line=0%2C0%2C0%2C0%2C0&bl.i21.reelset=ALL&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&bl.i20.id=20&rs.i1.r.i4.syms=SYM1%2CSYM3%2CSYM14&bl.i17.id=17&gamesoundurl=&rs.i1.r.i2.pos=0&bl.i16.reelset=ALL&nearwinallowed=true&bl.i5.reelset=ALL&bl.i24.coins=1&bl.i19.coins=1&bl.i7.id=7&bl.i18.reelset=ALL&bl.i8.line=1%2C0%2C0%2C0%2C1&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=1&bl.i14.line=1%2C1%2C2%2C1%2C1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM1%2CSYM1%2CSYM1&bl.i8.coins=1&bl.i23.id=23&bl.i15.coins=1&bl.i25.coins=1&rs.i0.r.i2.pos=0&bl.i2.line=2%2C2%2C2%2C2%2C2&bl.i13.line=1%2C1%2C0%2C1%2C1&rs.i1.r.i2.syms=SYM8%2CSYM13%2CSYM10&bl.i24.reelset=ALL&rs.i1.r.i0.pos=0&totalwin.cents=0&bl.i0.coins=1&bl.i2.reelset=ALL&rs.i0.r.i0.hold=false&restore=false&rs.i1.id=basic&bl.i12.id=12&bl.i29.id=29&rs.i1.r.i4.hold=false&bl.i4.id=4&rs.i0.r.i4.pos=0&bl.i7.coins=1&bl.i26.coins=1&bl.i27.reelset=ALL&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29&bl.i29.line=1%2C0%2C1%2C2%2C1&bl.i6.reelset=ALL&bl.i20.line=2%2C0%2C0%2C0%2C2&bl.i23.line=0%2C2%2C1%2C0%2C2&bl.i20.reelset=ALL&bl.i26.id=26&wavecount=1&bl.i14.coins=1&bl.i15.reelset=ALL&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&bl.i26.line=1%2C2%2C0%2C2%2C1${curReels}${freeState}`;

        return result;
    }

    private handlePaytableRequest(): string {
        return 'pt.i0.comp.i46.n=3&pt.i0.comp.i54.symbol=SYM11&bl.i17.reelset=ALL&pt.i1.comp.i47.multi=20&pt.i0.comp.i55.multi=2&bl.i15.id=15&pt.i0.comp.i29.type=betline&pt.i0.comp.i17.symbol=SYM4&pt.i0.comp.i5.freespins=0&pt.i0.comp.i23.n=7&pt.i1.comp.i34.multi=1400&pt.i0.comp.i13.symbol=SYM4&pt.i1.comp.i8.type=betline&pt.i1.comp.i4.n=4&pt.i0.comp.i15.multi=350&bl.i10.line=1%2C2%2C1%2C2%2C1&pt.i1.comp.i27.symbol=SYM6&pt.i1.comp.i60.n=8&pt.i0.comp.i28.multi=25&pt.i1.comp.i43.freespins=0&bl.i18.coins=1&pt.i1.comp.i29.freespins=0&pt.i1.comp.i30.symbol=SYM6&pt.i1.comp.i3.multi=20&pt.i0.comp.i11.n=3&pt.i0.comp.i57.n=5&pt.i1.comp.i23.symbol=SYM5&bl.i4.line=2%2C1%2C0%2C1%2C2&bl.i13.coins=1&bl.i27.id=27&pt.i0.id=basic&pt.i0.comp.i1.type=betline&pt.i1.comp.i60.symbol=SYM0&bl.i2.id=2&pt.i0.comp.i58.type=scatter&pt.i0.comp.i34.n=10&pt.i1.comp.i10.type=betline&pt.i0.comp.i42.multi=1200&pt.i0.comp.i34.type=betline&pt.i0.comp.i4.symbol=SYM3&pt.i1.comp.i5.freespins=0&pt.i1.comp.i8.symbol=SYM3&bl.i14.reelset=ALL&pt.i1.comp.i19.n=3&pt.i1.comp.i52.freespins=0&pt.i0.comp.i17.freespins=0&pt.i0.comp.i50.symbol=SYM10&pt.i0.comp.i8.symbol=SYM3&pt.i0.comp.i58.symbol=SYM0&pt.i0.comp.i0.symbol=SYM1&pt.i0.comp.i47.symbol=SYM9&pt.i1.comp.i36.freespins=0&pt.i0.comp.i3.freespins=0&pt.i0.comp.i10.multi=2000&pt.i0.comp.i47.n=4&pt.i1.id=freespin&bl.i3.id=3&bl.i22.line=2%2C2%2C0%2C2%2C2&pt.i1.comp.i34.freespins=0&pt.i1.comp.i34.type=betline&pt.i0.comp.i24.n=8&bl.i8.reelset=ALL&clientaction=paytable&pt.i1.comp.i57.symbol=SYM0&pt.i1.comp.i27.freespins=0&bl.i16.id=16&pt.i0.comp.i50.multi=15&pt.i1.comp.i5.n=5&bl.i5.coins=1&pt.i1.comp.i8.multi=600&pt.i1.comp.i51.type=betline&pt.i1.comp.i42.multi=1200&pt.i0.comp.i22.type=betline&pt.i0.comp.i24.freespins=0&pt.i0.comp.i58.n=6&pt.i1.comp.i38.type=betline&pt.i1.comp.i60.type=scatter&pt.i0.comp.i21.multi=120&pt.i1.comp.i13.multi=140&pt.i1.comp.i54.freespins=0&pt.i1.comp.i41.freespins=0&pt.i0.comp.i12.n=4&pt.i0.comp.i35.n=3&pt.i0.comp.i13.type=betline&bl.i0.line=1%2C1%2C1%2C1%2C1&pt.i1.comp.i47.freespins=0&pt.i1.comp.i53.multi=15&pt.i1.comp.i7.freespins=0&pt.i0.comp.i31.freespins=0&pt.i0.comp.i3.multi=20&pt.i0.comp.i51.type=betline&pt.i1.comp.i50.n=4&pt.i1.comp.i22.type=betline&pt.i0.comp.i21.n=5&pt.i0.comp.i42.freespins=0&pt.i1.comp.i6.n=6&pt.i0.comp.i36.symbol=SYM7&pt.i0.comp.i39.symbol=SYM7&pt.i1.comp.i31.type=betline&pt.i1.comp.i50.multi=15&bl.i1.id=1&pt.i0.comp.i44.n=4&pt.i0.comp.i37.type=betline&pt.i0.comp.i10.type=betline&pt.i0.comp.i55.type=scatter&pt.i0.comp.i35.freespins=0&pt.i1.comp.i11.symbol=SYM4&pt.i1.comp.i49.symbol=SYM10&bl.i25.id=25&pt.i1.comp.i46.symbol=SYM9&pt.i1.comp.i46.type=betline&pt.i0.comp.i5.multi=160&pt.i0.comp.i32.n=8&pt.i0.comp.i56.freespins=10&pt.i1.comp.i1.freespins=0&bl.i14.id=14&pt.i1.comp.i16.symbol=SYM4&pt.i1.comp.i23.multi=300&pt.i1.comp.i4.type=betline&pt.i1.comp.i18.multi=1800&bl.i2.coins=1&bl.i21.reelset=ALL&pt.i0.comp.i55.n=3&pt.i1.comp.i26.type=betline&pt.i0.comp.i57.multi=2&pt.i0.comp.i8.multi=600&pt.i0.comp.i34.multi=1400&pt.i0.comp.i49.freespins=0&pt.i1.comp.i51.n=5&pt.i0.comp.i1.freespins=0&bl.i5.reelset=ALL&bl.i24.coins=1&pt.i1.comp.i49.freespins=0&pt.i0.comp.i22.n=6&pt.i0.comp.i28.symbol=SYM6&pt.i0.comp.i45.n=5&pt.i1.comp.i17.type=betline&pt.i1.comp.i0.symbol=SYM1&pt.i1.comp.i7.n=7&pt.i1.comp.i5.multi=160&pt.i1.comp.i39.multi=200&bl.i14.line=1%2C1%2C2%2C1%2C1&pt.i0.comp.i21.type=betline&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&pt.i0.comp.i8.type=betline&pt.i0.comp.i7.freespins=0&pt.i1.comp.i15.multi=350&pt.i0.comp.i13.multi=140&pt.i1.comp.i45.multi=200&pt.i0.comp.i17.type=betline&bl.i13.line=1%2C1%2C0%2C1%2C1&pt.i0.comp.i30.type=betline&pt.i1.comp.i22.symbol=SYM5&pt.i1.comp.i30.freespins=0&pt.i1.comp.i40.n=8&bl.i24.reelset=ALL&pt.i1.comp.i38.symbol=SYM7&pt.i0.comp.i40.multi=400&pt.i1.comp.i56.freespins=10&bl.i0.coins=1&bl.i2.reelset=ALL&pt.i0.comp.i10.n=10&pt.i0.comp.i33.n=9&pt.i0.comp.i56.n=4&pt.i1.comp.i41.symbol=SYM7&pt.i1.comp.i6.multi=250&pt.i0.comp.i36.multi=20&pt.i1.comp.i19.symbol=SYM5&pt.i0.comp.i22.freespins=0&pt.i1.comp.i52.symbol=SYM11&bl.i26.coins=1&bl.i27.reelset=ALL&pt.i0.comp.i20.symbol=SYM5&pt.i1.comp.i55.type=scatter&bl.i29.line=1%2C0%2C1%2C2%2C1&pt.i0.comp.i15.freespins=0&pt.i0.comp.i31.symbol=SYM6&bl.i23.line=0%2C2%2C1%2C0%2C2&bl.i26.id=26&pt.i0.comp.i28.freespins=0&pt.i0.comp.i0.n=3&pt.i1.comp.i21.multi=120&pt.i1.comp.i52.n=3&pt.i0.comp.i42.symbol=SYM7&pt.i1.comp.i30.type=betline&pt.i1.comp.i50.freespins=0&pt.i0.comp.i46.type=betline&pt.i0.comp.i0.type=betline&pt.i0.comp.i53.symbol=SYM11&pt.i1.comp.i0.multi=250&g4mode=false&pt.i1.comp.i8.n=8&pt.i0.comp.i25.multi=800&pt.i1.comp.i37.multi=80&pt.i0.comp.i38.freespins=0&bl.i25.line=1%2C0%2C2%2C0%2C1&pt.i0.comp.i16.symbol=SYM4&pt.i1.comp.i21.freespins=0&pt.i0.comp.i1.multi=1000&pt.i0.comp.i27.n=3&pt.i0.comp.i53.freespins=0&pt.i1.comp.i9.type=betline&pt.i0.comp.i32.multi=450&pt.i1.comp.i24.multi=500&pt.i1.comp.i44.multi=20&pt.i1.comp.i59.freespins=25&pt.i1.comp.i23.type=betline&pt.i1.comp.i26.n=10&pt.i1.comp.i49.n=3&bl.i18.id=18&pt.i1.comp.i28.symbol=SYM6&pt.i1.comp.i17.multi=900&pt.i0.comp.i18.multi=1800&pt.i0.comp.i33.type=betline&bl.i5.line=0%2C0%2C1%2C0%2C0&bl.i28.coins=1&pt.i1.comp.i33.symbol=SYM6&pt.i1.comp.i35.type=betline&pt.i0.comp.i9.n=9&bl.i27.line=0%2C1%2C2%2C2%2C2&pt.i1.comp.i21.type=betline&bl.i7.line=1%2C2%2C2%2C2%2C1&pt.i0.comp.i28.type=betline&pt.i1.comp.i31.multi=250&pt.i1.comp.i18.type=betline&pt.i1.comp.i58.freespins=20&pt.i0.comp.i10.symbol=SYM3&pt.i0.comp.i38.n=6&pt.i0.comp.i45.type=betline&pt.i0.comp.i15.n=7&pt.i0.comp.i39.freespins=0&pt.i0.comp.i21.symbol=SYM5&bl.i7.reelset=ALL&pt.i0.comp.i31.type=betline&pt.i1.comp.i15.n=7&pt.i1.comp.i38.n=6&isJackpotWin=false&pt.i1.comp.i20.freespins=0&pt.i0.comp.i52.freespins=0&pt.i1.comp.i7.type=betline&pt.i0.comp.i10.freespins=0&pt.i0.comp.i20.multi=30&pt.i0.comp.i44.symbol=SYM8&pt.i0.comp.i17.multi=900&pt.i1.comp.i56.type=scatter&bl.i29.coins=1&pt.i1.comp.i25.type=betline&pt.i1.comp.i9.n=9&pt.i0.comp.i28.n=4&bl.i9.line=1%2C0%2C1%2C0%2C1&pt.i1.comp.i39.symbol=SYM7&pt.i0.comp.i2.multi=5000&pt.i1.comp.i27.n=3&pt.i0.comp.i0.freespins=0&pt.i1.comp.i25.multi=800&pt.i0.comp.i33.multi=700&pt.i1.comp.i16.freespins=0&pt.i0.comp.i51.freespins=0&pt.i1.comp.i5.type=betline&pt.i1.comp.i35.symbol=SYM7&bl.i25.reelset=ALL&pt.i1.comp.i24.symbol=SYM5&pt.i0.comp.i37.freespins=0&pt.i1.comp.i50.symbol=SYM10&pt.i1.comp.i13.symbol=SYM4&pt.i1.comp.i17.symbol=SYM4&pt.i0.comp.i54.freespins=0&pt.i0.comp.i16.n=8&pt.i0.comp.i39.n=7&bl.i13.reelset=ALL&bl.i0.id=0&pt.i1.comp.i16.n=8&pt.i0.comp.i5.symbol=SYM3&bl.i15.line=0%2C1%2C1%2C1%2C0&pt.i1.comp.i7.symbol=SYM3&pt.i1.comp.i39.n=7&bl.i19.id=19&pt.i0.comp.i38.type=betline&pt.i0.comp.i35.type=betline&pt.i0.comp.i48.symbol=SYM9&pt.i1.comp.i57.freespins=15&pt.i0.comp.i1.symbol=SYM1&pt.i0.comp.i59.symbol=SYM0&pt.i0.comp.i55.symbol=SYM0&pt.i1.comp.i36.multi=20&pt.i1.comp.i31.freespins=0&bl.i9.id=9&bl.i17.line=0%2C2%2C0%2C2%2C0&pt.i1.comp.i9.freespins=0&pt.i0.comp.i48.n=5&playercurrency=%26%23x20AC%3B&pt.i0.comp.i38.symbol=SYM7&pt.i0.comp.i33.symbol=SYM6&pt.i1.comp.i40.multi=400&bl.i28.id=28&pt.i1.comp.i30.multi=175&bl.i19.reelset=ALL&pt.i0.comp.i25.n=9&pt.i1.comp.i58.type=scatter&pt.i1.comp.i28.n=4&pt.i1.comp.i32.freespins=0&pt.i0.comp.i9.freespins=0&pt.i1.comp.i45.symbol=SYM8&credit=500000&pt.i0.comp.i5.type=betline&pt.i0.comp.i11.freespins=0&pt.i0.comp.i26.multi=1600&pt.i0.comp.i25.type=betline&pt.i0.comp.i59.n=7&bl.i1.reelset=ALL&pt.i1.comp.i40.symbol=SYM7&pt.i1.comp.i18.symbol=SYM4&pt.i0.comp.i31.multi=250&pt.i1.comp.i12.symbol=SYM4&pt.i0.comp.i13.freespins=0&pt.i1.comp.i15.type=betline&pt.i0.comp.i26.freespins=0&pt.i0.comp.i53.type=betline&pt.i1.comp.i13.type=betline&pt.i1.comp.i1.multi=1000&pt.i1.comp.i51.symbol=SYM10&pt.i0.comp.i36.n=4&pt.i1.comp.i8.freespins=0&pt.i0.comp.i13.n=5&pt.i1.comp.i46.freespins=0&pt.i1.comp.i33.freespins=0&pt.i1.comp.i17.n=9&pt.i0.comp.i23.type=betline&pt.i0.comp.i32.symbol=SYM6&bl.i17.id=17&pt.i0.comp.i43.symbol=SYM8&pt.i1.comp.i17.freespins=0&pt.i1.comp.i26.multi=1600&pt.i0.comp.i43.type=betline&pt.i1.comp.i32.multi=450&pt.i1.comp.i0.type=betline&pt.i1.comp.i1.symbol=SYM1&pt.i1.comp.i29.multi=100&pt.i0.comp.i25.freespins=0&pt.i0.comp.i49.n=3&pt.i0.comp.i60.symbol=SYM0&pt.i0.comp.i40.freespins=0&pt.i0.comp.i26.n=10&pt.i0.comp.i27.symbol=SYM6&pt.i1.comp.i56.symbol=SYM0&pt.i1.comp.i45.freespins=0&pt.i1.comp.i29.n=5&pt.i0.comp.i23.multi=300&bl.i2.line=2%2C2%2C2%2C2%2C2&pt.i0.comp.i30.multi=175&pt.i1.comp.i34.symbol=SYM6&pt.i1.comp.i43.type=betline&pt.i1.comp.i60.freespins=30&pt.i1.comp.i28.multi=25&bl.i29.id=29&pt.i1.comp.i33.multi=700&pt.i1.comp.i18.freespins=0&pt.i0.comp.i14.n=6&pt.i0.comp.i37.n=5&pt.i0.comp.i0.multi=250&bl.i6.reelset=ALL&pt.i0.comp.i19.multi=15&bl.i20.line=2%2C0%2C0%2C0%2C2&pt.i1.comp.i18.n=10&pt.i1.comp.i33.type=betline&bl.i20.reelset=ALL&pt.i0.comp.i12.freespins=0&pt.i0.comp.i24.multi=500&pt.i1.comp.i53.type=betline&pt.i0.comp.i19.symbol=SYM5&bl.i6.coins=1&pt.i0.comp.i15.type=betline&pt.i0.comp.i23.freespins=0&pt.i0.comp.i32.type=betline&pt.i0.comp.i35.multi=10&pt.i1.comp.i36.type=betline&pt.i0.comp.i4.multi=40&pt.i0.comp.i15.symbol=SYM4&pt.i1.comp.i14.multi=225&pt.i0.comp.i22.multi=200&pt.i1.comp.i54.multi=100&pt.i1.comp.i51.freespins=0&bl.i21.id=21&pt.i1.comp.i19.type=betline&pt.i0.comp.i11.symbol=SYM4&pt.i0.comp.i48.multi=150&pt.i1.comp.i27.multi=10&bl.i23.reelset=ALL&bl.i0.reelset=ALL&bl.i20.coins=1&pt.i0.comp.i16.freespins=0&pt.i1.comp.i6.freespins=0&pt.i1.comp.i29.symbol=SYM6&pt.i1.comp.i22.n=6&pt.i1.comp.i45.n=5&bl.i10.id=10&pt.i0.comp.i4.freespins=0&pt.i1.comp.i25.symbol=SYM5&bl.i3.reelset=ALL&pt.i0.comp.i30.freespins=0&bl.i26.reelset=ALL&bl.i24.line=2%2C0%2C1%2C2%2C0&pt.i1.comp.i24.type=betline&pt.i0.comp.i19.n=3&pt.i1.comp.i57.n=5&pt.i0.comp.i2.symbol=SYM1&pt.i0.comp.i20.type=betline&pt.i1.comp.i48.type=betline&pt.i0.comp.i49.symbol=SYM10&pt.i0.comp.i6.symbol=SYM3&pt.i0.comp.i56.symbol=SYM0&pt.i0.comp.i52.symbol=SYM11&pt.i1.comp.i11.n=3&pt.i1.comp.i34.n=10&pt.i0.comp.i5.n=5&pt.i1.comp.i2.symbol=SYM1&pt.i0.comp.i3.type=betline&pt.i1.comp.i19.multi=15&bl.i28.line=2%2C1%2C0%2C0%2C0&pt.i1.comp.i6.symbol=SYM3&pt.i0.comp.i27.multi=10&pt.i1.comp.i59.multi=4&pt.i0.comp.i9.multi=1000&bl.i12.coins=1&pt.i0.comp.i22.symbol=SYM5&pt.i0.comp.i26.symbol=SYM5&pt.i1.comp.i19.freespins=0&pt.i0.comp.i14.freespins=0&pt.i0.comp.i21.freespins=0&pt.i1.comp.i35.multi=10&pt.i1.comp.i46.n=3&pt.i1.comp.i4.freespins=0&pt.i0.comp.i44.type=betline&pt.i0.comp.i43.multi=5&pt.i0.comp.i48.type=betline&pt.i1.comp.i12.type=betline&pt.i1.comp.i57.type=scatter&pt.i1.comp.i36.symbol=SYM7&pt.i1.comp.i21.symbol=SYM5&pt.i1.comp.i23.n=7&pt.i1.comp.i32.symbol=SYM6&bl.i8.id=8&pt.i0.comp.i16.multi=550&pt.i1.comp.i48.multi=150&pt.i1.comp.i37.freespins=0&pt.i1.comp.i43.symbol=SYM8&pt.i1.comp.i41.multi=600&pt.i0.comp.i56.multi=2&pt.i0.comp.i50.n=4&pt.i0.comp.i41.freespins=0&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i22.id=22&pt.i1.comp.i35.n=3&pt.i1.comp.i41.type=betline&bl.i12.line=2%2C1%2C2%2C1%2C2&pt.i1.comp.i9.multi=1000&pt.i1.comp.i58.n=6&bl.i29.reelset=ALL&pt.i0.comp.i19.type=betline&pt.i0.comp.i6.freespins=0&pt.i1.comp.i2.multi=5000&pt.i1.comp.i44.freespins=0&pt.i0.comp.i6.n=6&pt.i1.comp.i12.n=4&pt.i1.comp.i3.type=betline&pt.i1.comp.i10.freespins=0&pt.i1.comp.i55.freespins=0&pt.i0.comp.i57.freespins=15&pt.i1.comp.i28.type=betline&bl.i27.coins=1&pt.i0.comp.i34.symbol=SYM6&pt.i0.comp.i40.type=betline&pt.i1.comp.i45.type=betline&pt.i0.comp.i37.symbol=SYM7&pt.i0.comp.i29.n=5&pt.i1.comp.i20.multi=30&pt.i0.comp.i27.freespins=0&pt.i0.comp.i34.freespins=0&pt.i1.comp.i24.n=8&pt.i1.comp.i47.n=4&pt.i1.comp.i47.symbol=SYM9&pt.i1.comp.i27.type=betline&pt.i1.comp.i48.freespins=0&pt.i1.comp.i2.type=betline&pt.i0.comp.i41.type=betline&pt.i0.comp.i2.freespins=0&pt.i1.comp.i38.multi=150&pt.i0.comp.i7.n=7&pt.i0.comp.i43.freespins=0&pt.i0.comp.i11.multi=15&pt.i0.comp.i36.type=betline&pt.i1.comp.i14.symbol=SYM4&pt.i0.comp.i56.type=scatter&pt.i1.comp.i44.symbol=SYM8&pt.i0.comp.i7.type=betline&pt.i1.comp.i43.multi=5&bl.i19.line=0%2C2%2C2%2C2%2C0&bl.i12.reelset=ALL&pt.i0.comp.i17.n=9&bl.i6.id=6&pt.i1.comp.i55.symbol=SYM0&pt.i0.comp.i29.multi=100&pt.i1.comp.i13.n=5&pt.i1.comp.i36.n=4&pt.i1.comp.i59.n=7&pt.i0.comp.i8.freespins=0&bl.i20.id=20&pt.i1.comp.i4.multi=40&gamesoundurl=&pt.i1.comp.i46.multi=5&pt.i0.comp.i12.type=betline&pt.i0.comp.i36.freespins=0&pt.i0.comp.i14.multi=225&pt.i1.comp.i7.multi=400&pt.i0.comp.i45.symbol=SYM8&bl.i19.coins=1&bl.i7.id=7&bl.i18.reelset=ALL&pt.i1.comp.i11.type=betline&pt.i0.comp.i6.multi=250&pt.i0.comp.i55.freespins=0&playercurrencyiso=' + this.slotSettings.slotCurrency + '&bl.i1.coins=1&pt.i1.comp.i42.freespins=0&pt.i0.comp.i37.multi=80&pt.i0.comp.i60.n=8&pt.i1.comp.i5.symbol=SYM3&pt.i0.comp.i18.type=betline&pt.i0.comp.i23.symbol=SYM5&playforfun=false&pt.i1.comp.i25.n=9&pt.i1.comp.i48.n=5&pt.i0.comp.i48.freespins=0&pt.i0.comp.i2.type=betline&pt.i1.comp.i20.type=betline&bl.i25.coins=1&pt.i1.comp.i22.multi=200&pt.i0.comp.i8.n=8&pt.i1.comp.i22.freespins=0&pt.i0.comp.i11.type=betline&pt.i1.comp.i35.freespins=0&pt.i0.comp.i18.n=10&pt.i1.comp.i14.n=6&pt.i1.comp.i16.multi=550&pt.i1.comp.i37.n=5&pt.i1.comp.i15.freespins=0&pt.i0.comp.i27.type=betline&pt.i0.comp.i41.multi=600&pt.i1.comp.i28.freespins=0&pt.i0.comp.i7.symbol=SYM3&pt.i0.comp.i59.multi=4&bl.i15.reelset=ALL&pt.i0.comp.i50.freespins=0&pt.i1.comp.i0.freespins=0&pt.i0.comp.i45.multi=200&pt.i1.comp.i57.multi=2&bl.i11.line=0%2C1%2C0%2C1%2C0&historybutton=false&bl.i5.id=5&pt.i0.comp.i18.symbol=SYM4&pt.i0.comp.i42.n=10&pt.i0.comp.i46.freespins=0&pt.i0.comp.i12.multi=35&pt.i1.comp.i14.freespins=0&bl.i3.coins=1&bl.i10.coins=1&pt.i0.comp.i12.symbol=SYM4&pt.i0.comp.i14.symbol=SYM4&pt.i0.comp.i38.multi=150&pt.i0.comp.i58.multi=2&pt.i1.comp.i13.freespins=0&pt.i0.comp.i45.freespins=0&pt.i0.comp.i59.type=scatter&pt.i1.comp.i40.type=betline&pt.i0.comp.i14.type=betline&pt.i1.comp.i41.n=9&pt.i1.comp.i54.type=betline&pt.i1.comp.i0.n=3&pt.i1.comp.i26.symbol=SYM5&pt.i1.comp.i31.symbol=SYM6&pt.i0.comp.i7.multi=400&pt.i1.comp.i51.multi=125&pt.i0.comp.i30.n=6&jackpotcurrency=%26%23x20AC%3B&pt.i0.comp.i47.type=betline&pt.i0.comp.i50.type=betline&pt.i0.comp.i53.n=4&bl.i16.coins=1&bl.i9.coins=1&pt.i1.comp.i37.type=betline&bl.i24.id=24&pt.i1.comp.i11.multi=15&pt.i1.comp.i30.n=6&pt.i0.comp.i1.n=4&pt.i1.comp.i53.n=4&bl.i22.coins=1&pt.i0.comp.i20.n=4&pt.i0.comp.i29.symbol=SYM6&pt.i1.comp.i3.symbol=SYM3&pt.i1.comp.i50.type=betline&pt.i0.comp.i57.type=scatter&pt.i1.comp.i23.freespins=0&bl.i13.id=13&pt.i0.comp.i25.symbol=SYM5&pt.i0.comp.i26.type=betline&pt.i1.comp.i49.multi=5&pt.i0.comp.i9.type=betline&pt.i1.comp.i58.symbol=SYM0&pt.i0.comp.i43.n=3&pt.i1.comp.i47.type=betline&pt.i1.comp.i16.type=betline&pt.i0.comp.i60.type=scatter&pt.i0.comp.i60.multi=10&pt.i1.comp.i20.symbol=SYM5&bl.i10.reelset=ALL&pt.i1.comp.i12.multi=35&pt.i0.comp.i29.freespins=0&pt.i1.comp.i1.n=4&pt.i1.comp.i42.n=10&pt.i1.comp.i52.multi=5&pt.i1.comp.i11.freespins=0&pt.i0.comp.i31.n=7&pt.i0.comp.i9.symbol=SYM3&bl.i23.coins=1&bl.i11.coins=1&pt.i1.comp.i54.symbol=SYM11&bl.i22.reelset=ALL&pt.i0.comp.i54.n=5&pt.i0.comp.i47.freespins=0&pt.i1.comp.i44.type=betline&pt.i0.comp.i16.type=betline&pt.i0.comp.i39.multi=200&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i4.reelset=ALL&bl.i4.coins=1&pt.i0.comp.i2.n=5&pt.i0.comp.i40.symbol=SYM7&bl.i18.line=2%2C0%2C2%2C0%2C2&pt.i0.comp.i44.freespins=0&pt.i0.comp.i51.symbol=SYM10&pt.i1.comp.i31.n=7&pt.i0.comp.i44.multi=20&pt.i0.comp.i54.type=betline&pt.i1.comp.i54.n=5&pt.i0.comp.i19.freespins=0&pt.i1.comp.i14.type=betline&bl.i11.id=11&pt.i0.comp.i6.type=betline&pt.i1.comp.i2.freespins=0&pt.i0.comp.i35.symbol=SYM7&pt.i1.comp.i25.freespins=0&bl.i9.reelset=ALL&bl.i17.coins=1&pt.i0.comp.i40.n=8&pt.i1.comp.i40.freespins=0&pt.i1.comp.i60.multi=10&pt.i1.comp.i10.multi=2000&pt.i1.comp.i10.symbol=SYM3&pt.i1.comp.i48.symbol=SYM9&bl.i11.reelset=ALL&bl.i16.line=2%2C1%2C1%2C1%2C2&pt.i1.comp.i2.n=5&pt.i1.comp.i20.n=4&pt.i1.comp.i43.n=3&pt.i1.comp.i24.freespins=0&bl.i21.line=0%2C0%2C2%2C0%2C0&pt.i1.comp.i32.type=betline&pt.i0.comp.i39.type=betline&pt.i1.comp.i42.symbol=SYM7&pt.i1.comp.i39.freespins=0&pt.i1.comp.i53.symbol=SYM11&pt.i0.comp.i4.type=betline&pt.i0.comp.i58.freespins=20&bl.i21.coins=1&bl.i28.reelset=ALL&pt.i1.comp.i26.freespins=0&pt.i0.comp.i51.n=5&pt.i1.comp.i1.type=betline&pt.i1.comp.i58.multi=2&pt.i0.comp.i46.multi=5&bl.i1.line=0%2C0%2C0%2C0%2C0&pt.i0.comp.i42.type=betline&pt.i0.comp.i20.freespins=0&pt.i0.comp.i33.freespins=0&pt.i0.comp.i51.multi=125&pt.i1.comp.i29.type=betline&pt.i0.comp.i30.symbol=SYM6&bl.i16.reelset=ALL&pt.i0.comp.i41.symbol=SYM7&pt.i0.comp.i49.multi=5&pt.i0.comp.i54.multi=100&pt.i1.comp.i32.n=8&pt.i1.comp.i55.n=3&pt.i0.comp.i3.n=3&pt.i1.comp.i59.type=scatter&pt.i1.comp.i6.type=betline&pt.i0.comp.i46.symbol=SYM9&pt.i0.comp.i49.type=betline&pt.i1.comp.i4.symbol=SYM3&pt.i1.comp.i38.freespins=0&bl.i8.line=1%2C0%2C0%2C0%2C1&pt.i1.comp.i39.type=betline&pt.i0.comp.i24.symbol=SYM5&pt.i1.comp.i53.freespins=0&pt.i0.comp.i47.multi=20&pt.i0.comp.i41.n=9&pt.i1.comp.i42.type=betline&pt.i1.comp.i59.symbol=SYM0&pt.i0.comp.i59.freespins=25&pt.i1.comp.i55.multi=2&bl.i8.coins=1&pt.i0.comp.i32.freespins=0&bl.i23.id=23&bl.i15.coins=1&pt.i0.comp.i52.type=betline&pt.i0.comp.i53.multi=15&pt.i1.comp.i37.symbol=SYM7&pt.i1.comp.i3.n=3&pt.i1.comp.i21.n=5&pt.i1.comp.i44.n=4&pt.i0.comp.i18.freespins=0&bl.i12.id=12&pt.i1.comp.i15.symbol=SYM4&pt.i1.comp.i49.type=betline&pt.i1.comp.i3.freespins=0&bl.i4.id=4&bl.i7.coins=1&pt.i1.comp.i52.type=betline&pt.i0.comp.i52.n=3&pt.i0.comp.i60.freespins=30&pt.i0.comp.i52.multi=5&pt.i1.comp.i9.symbol=SYM3&pt.i0.comp.i3.symbol=SYM3&pt.i0.comp.i24.type=betline&bl.i14.coins=1&pt.i0.comp.i57.symbol=SYM0&pt.i1.comp.i12.freespins=0&pt.i0.comp.i4.n=4&pt.i1.comp.i10.n=10&pt.i1.comp.i56.n=4&bl.i26.line=1%2C2%2C0%2C2%2C1&pt.i1.comp.i56.multi=2&pt.i1.comp.i33.n=9';
    }

    private handleInitFreespinRequest(): string {
        return `rs.i1.r.i0.syms=SYM5%2CSYM0%2CSYM6&freespins.betlevel=1&g4mode=false&freespins.win.coins=0&playercurrency=%26%23x20AC%3B&historybutton=false&rs.i0.r.i4.hold=false&gamestate.history=basic&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=18&rs.i0.r.i1.syms=SYM5%2CSYM5%2CSYM7&game.win.cents=0&rs.i0.id=freespin&rs.i1.r.i3.hold=false&totalwin.coins=0&credit=${Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100)}&rs.i1.r.i4.pos=30&gamestate.current=freespin&freespins.initial=15&jackpotcurrency=%26%23x20AC%3B&multiplier=1&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i0.r.i0.syms=SYM2%2CSYM7%2CSYM7&freespins.denomination=2.000&rs.i0.r.i3.syms=SYM4%2CSYM4%2CSYM4&rs.i1.r.i1.syms=SYM2%2CSYM3%2CSYM3&rs.i1.r.i1.pos=3&freespins.win.cents=0&freespins.totalwin.coins=0&freespins.total=15&isJackpotWin=false&gamestate.stack=basic%2Cfreespin&rs.i0.r.i0.pos=3&rs.i1.r.i4.syms=SYM1%2CSYM7%2CSYM7&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&gamesoundurl=&rs.i1.r.i2.pos=15&bet.betlevel=1&rs.i1.nearwin=4%2C3&rs.i0.r.i1.pos=18&rs.i1.r.i3.syms=SYM4%2CSYM0%2CSYM6&game.win.coins=0&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&freespins.wavecount=1&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=initfreespin&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM6%2CSYM5%2CSYM5&rs.i0.r.i2.pos=0&rs.i1.r.i2.syms=SYM6%2CSYM6%2CSYM0&rs.i1.r.i0.pos=24&totalwin.cents=0&gameover=false&rs.i0.r.i0.hold=false&rs.i1.id=basic&rs.i0.r.i3.pos=3&rs.i1.r.i4.hold=false&freespins.left=15&rs.i0.r.i4.pos=20&rs.i1.r.i2.attention.i0=2&rs.i1.r.i0.attention.i0=1&rs.i1.r.i3.attention.i0=1&nextaction=freespin&wavecount=1&rs.i0.r.i2.syms=SYM3%2CSYM3%2CSYM3&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&game.win.amount=0.00&bet.denomination=2&freespins.totalwin.cents=0`;
    }

    private handleSpinRequest(postData: any): string {
        const linesId = this.getLinesId();
        const lines = 30;
        const betline = postData.bet_betlevel;
        let allbet = betline * lines;

        // Handle transaction logic
        if (postData.slotEvent !== 'freespin') {
            this.slotSettings.SetBalance(-1 * allbet, postData.slotEvent);
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(postData.slotEvent, bankSum, postData.slotEvent);
            this.slotSettings.UpdateJackpots(allbet);

            this.slotSettings.SetGameData('FlowersNETBonusWin', 0);
            this.slotSettings.SetGameData('FlowersNETFreeGames', 0);
            this.slotSettings.SetGameData('FlowersNETCurrentFreeGame', 0);
            this.slotSettings.SetGameData('FlowersNETTotalWin', 0);
            this.slotSettings.SetGameData('FlowersNETBet', betline);
            this.slotSettings.SetGameData('FlowersNETDenom', this.slotSettings.CurrentDenom);
            this.slotSettings.SetGameData('FlowersNETFreeBalance', this.slotSettings.GetBalance() * 100);
        } else {
            // Logic for free spin
            this.slotSettings.CurrentDenom = this.slotSettings.GetGameData('FlowersNETDenom');
            this.slotSettings.CurrentDenomination = this.slotSettings.CurrentDenom;
            const storedBet = this.slotSettings.GetGameData('FlowersNETBet');
            allbet = storedBet * lines;
            this.slotSettings.SetGameData('FlowersNETCurrentFreeGame',
                this.slotSettings.GetGameData('FlowersNETCurrentFreeGame') + 1);
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
        let bonusMpl = postData.slotEvent === 'freespin' ? this.slotSettings.slotFreeMpl : 1;
        let wild = ['1'];
        let scatter = '0'; // Scatter symbol ID is 0 in FlowersNET? Paytable says 'SYM_0'. Wait, Paytable has SYM_0 ... SYM_12.
        // In PHP GetRandomScatterPos looks for '0'.
        // Let's assume '0' is scatter.
        // Actually, PHP logic check $csym == $scatter (0).
        // Let's check symbols.
        // Flowers Symbols:
        // 1: Wild
        // 0: Free Spin (Scatter)
        // 2: ?
        // 3-7: Flowers (can be double)
        // 8-11: Letters
        // 12: Double Cloud?
        // 13-17: Double Flowers corresponding to 3-7

        // PHP logic for double symbols:
        // if( $csym >= 3 && $csym <= 7 ) { $dbsym = $csym + 10; ... }
        // So 3->13, 4->14, etc.

        // Simulation loop
        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            lineWins = [];
            const cWins: number[] = new Array(lines).fill(0);

            reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent);

            let winLineCount = 0;

            for (let k = 0; k < lines; k++) {
                let tmpStringWin = '';
                for (let j = 0; j < this.slotSettings.SymbolGame.length; j++) {
                    const csym = parseInt(this.slotSettings.SymbolGame[j]); // Convert to number for logic checks

                    if (csym === parseInt(scatter) || !this.slotSettings.Paytable['SYM_' + csym]) {
                        continue;
                    }

                    const s: any[] = [];
                    s[0] = reels.reel1?.[linesId[k][0] - 1];
                    s[1] = reels.reel2?.[linesId[k][1] - 1];
                    s[2] = reels.reel3?.[linesId[k][2] - 1];
                    s[3] = reels.reel4?.[linesId[k][3] - 1];
                    s[4] = reels.reel5?.[linesId[k][4] - 1];

                    // Determine matches and double symbols logic
                    const checkWin = (count: number) => {
                        let scnt = count;
                        // For Flowers, double symbols count as 2.
                        // Logic in PHP:
                        // First it checks match existence: ($s[0] == $csym || in_array($s[0], $wild)) ...
                        // Then calculates `scnt` based on presence of double symbols.
                        // Wait, the PHP logic iterates 2, 3, 4, 5 consecutive reels.
                        // Inside each block, it counts how many symbols are effectively present.

                        // Let's reproduce PHP logic structure for 3, 4, 5 matches (and 2?)
                        // PHP has blocks for 2 (only for high value?), 3, 4, 5.

                        // We need to implement the check for 3, 4, 5 reels match first, then calculate count.
                        // Actually PHP checks match on reels, THEN calculates score count (scnt).
                        // e.g. match on 3 reels could yield score of 3, 4, 5 or 6 depending on doubles.
                    };

                    // We will iterate reel counts 3, 4, 5 (and 2 if paytable supports it).
                    // Flowers paytable has entries for index 3 to 10?
                    // SYM_0 (Scatter?): [0,0,0,0,2,2,2,2,4,10] indices 0-9. keys 4-9 are counts?
                    // No, usually paytable array index corresponds to count.
                    // SYM_3: [0,0,0,20,40,160,250,400,600,1000,2000]. Indices 3 to 10.
                    // This means we can have up to 10 matches on a line (5 double symbols).

                    // Implementing loop for reel counts 2 to 5
                    for (let reelCount = 2; reelCount <= 5; reelCount++) {
                        // Check if symbols match on first 'reelCount' reels
                        let match = true;
                        let wildCount = 0;
                        let currentSCnt = 0;

                        for (let m = 0; m < reelCount; m++) {
                            const val = parseInt(String(s[m]));
                            const isWild = wild.includes(String(val));
                            if (val !== csym && !isWild) {
                                match = false;
                                break;
                            }
                            if (isWild) wildCount++;
                        }

                        if (match) {
                            // Calculate score count (scnt)
                            // Start with reelCount
                            currentSCnt = reelCount;

                            // Add extras for double symbols
                            // Check if current symbol supports doubles (3-7)
                            if (csym >= 3 && csym <= 7) {
                                const dbsym = csym + 10;
                                for (let m = 0; m < reelCount; m++) {
                                    if (parseInt(String(s[m])) === dbsym) {
                                        currentSCnt++;
                                    }
                                }
                            }

                            // If only wilds, scnt is just reelCount (wilds are single? Or do they substitute double?)
                            // PHP: if( in_array($s[0], $wild) && ... ) $mpl = 1;
                            // Logic seems to treat wilds as single unless they substitute a double which counts as 2?
                            // Wait, PHP logic:
                            // scnt = 3;
                            // if( $csym >= 3 && $csym <= 7 ) { $dbsym = $csym + 10; for( $cs = 0; $cs < 3; $cs++ ) { if( $s[$cs] == $dbsym ) $scnt++; } }
                            // This means if we matched "Flower" or "Double Flower" or "Wild", base count is 3.
                            // If specific symbol on reel is "Double Flower", increment count.
                            // Wilds don't increment count here, so Wilds act as single symbols.

                            let mpl = 1;
                            if (wildCount === reelCount) {
                                mpl = 1;
                            } else if (wildCount > 0) {
                                mpl = this.slotSettings.slotWildMpl;
                            }

                            if (this.slotSettings.Paytable['SYM_' + csym][currentSCnt] > 0) {
                                const tmpWin = this.slotSettings.Paytable['SYM_' + csym][currentSCnt] * betline * mpl * bonusMpl;
                                if (cWins[k] < tmpWin) {
                                    cWins[k] = tmpWin;
                                    // Construct legacy win string
                                    let posStr = '';
                                    for (let p = 0; p < reelCount; p++) {
                                        posStr += `&ws.i${winLineCount}.pos.i${p}=${p}%2C${linesId[k][p] - 1}`;
                                    }
                                    tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${tmpWin}${posStr}&ws.i${winLineCount}.types.i0.wintype=coins&ws.i${winLineCount}.betline=${k}&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${tmpWin * this.slotSettings.CurrentDenomination * 100}`;
                                }
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
            let scPos: string[] = [];

            for (let r = 1; r <= 5; r++) {
                for (let p = 0; p <= 2; p++) {
                    const rKey = `reel${r}`;
                    const val = (reels[rKey] as any[])?.[p];
                    if (String(val) === scatter) {
                        scattersCount++;
                        scPos.push(`&ws.i0.pos.i${r - 1}=${r - 1}%2C${p}`);
                    }
                    // Double Scatter logic?
                    // SYM_0 is scatter. SYM_12 is double scatter?
                    // PHP code for scatter counting:
                    // if( $reels['reel'.$r][$p] == $scatter ) { ... }
                    // Does it check for double scatter?
                    // PHP code provided seems simpler: `if( $reels['reel'.$r][$p] == $scatter )`
                    // But Paytable has SYM_12.
                    // Let's assume simple scatter for now as per provided PHP snippet.
                    // Wait, looking closer at PHP snippet:
                    // It only checks `$scatter`.
                    // But maybe `$reels` generation puts '0' or '12'?
                    // If '12' is double scatter, it should count as 2?
                    // The PHP snippet provided only checks `$scatter` (which defaults to '0' likely).
                    // If the game has double scatters, the PHP snippet might be incomplete or I missed where it handles it.
                    // I will stick to the provided PHP logic.
                }
            }

            // Calculate scatter count for free spins
            // PHP logic: if( $scattersCount >= 4 ) ...
            // Wait, standard is 3? Flowers might be 4 because of double symbols?
            // "Double symbols count as 2 symbols". Scatters can be double too (Cloud symbols).
            // If the PHP snippet only counts occurrences of symbol '0', maybe '0' represents both or only single?
            // If '12' is double scatter, we should count it as 2.
            // Let's add check for '12' (assuming it's double scatter from Paytable structure).

            for (let r = 1; r <= 5; r++) {
                for (let p = 0; p <= 2; p++) {
                    const rKey = `reel${r}`;
                    const val = (reels[rKey] as any[])?.[p];
                    if (String(val) === '12') {
                        scattersCount += 2;
                        scPos.push(`&ws.i0.pos.i${r - 1}=${r - 1}%2C${p}`);
                    }
                }
            }

            if (scattersCount >= 4) {
                // Free spins trigger
                const freeSpinCount = this.slotSettings.slotFreeCount[scattersCount] || 0;
                // Scatter win amount? Paytable SYM_0 has values.
                // SYM_0: [0,0,0,0,2,2,2,2,4,10].
                // If scattersCount >= 4, we have a win multiplier?
                // The provided PHP does:
                // if( $scattersCount >= 4 ) { ... $scattersStr ... }
                // It doesn't seem to add to `totalWin` in the provided PHP snippet loop for scatter wins except maybe `$scattersWin = 0; $totalWin += $scattersWin;`
                // But it sets `freespins`.
                // Actually, usual NetEnt logic adds scatter win to total win.
                // Let's check paytable SYM_0 values.
                // SYM_0 index is count.
                if (this.slotSettings.Paytable['SYM_0'][scattersCount] > 0) {
                    scattersWin = this.slotSettings.Paytable['SYM_0'][scattersCount] * allbet; // Multiplied by total bet usually
                }

                // Add scatters string
                // Note: The PHP snippet constructs `$scattersStr` but doesn't seem to append it to `curReels` or `winString` in the `spin` case response construction.
                // It creates a `freeState` variable later.
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

            if (this.slotSettings.increaseRTP && winType === 'win' && totalWin < (minWin * allbet)) {
                continue;
            }

            if (scattersCount >= 4 && winType !== 'bonus') {
                // pass
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

        // Update balance and bank
        if (totalWin > 0) {
            this.slotSettings.SetBank(postData.slotEvent, -1 * totalWin);
            this.slotSettings.SetBalance(totalWin);
        }

        const reportWin = totalWin;
        if (postData.slotEvent === 'freespin') {
            this.slotSettings.SetGameData('FlowersNETBonusWin', this.slotSettings.GetGameData('FlowersNETBonusWin') + totalWin);
            this.slotSettings.SetGameData('FlowersNETTotalWin', this.slotSettings.GetGameData('FlowersNETTotalWin') + totalWin);
        } else {
            this.slotSettings.SetGameData('FlowersNETTotalWin', totalWin);
        }

        let curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1?.[0]}%2CSYM${reels.reel1?.[1]}%2CSYM${reels.reel1?.[2]}`;
        curReels += `&rs.i0.r.i1.syms=SYM${reels.reel2?.[0]}%2CSYM${reels.reel2?.[1]}%2CSYM${reels.reel2?.[2]}`;
        curReels += `&rs.i0.r.i2.syms=SYM${reels.reel3?.[0]}%2CSYM${reels.reel3?.[1]}%2CSYM${reels.reel3?.[2]}`;
        curReels += `&rs.i0.r.i3.syms=SYM${reels.reel4?.[0]}%2CSYM${reels.reel4?.[1]}%2CSYM${reels.reel4?.[2]}`;
        curReels += `&rs.i0.r.i4.syms=SYM${reels.reel5?.[0]}%2CSYM${reels.reel5?.[1]}%2CSYM${reels.reel5?.[2]}`;

        let freeState = '';
        if (scattersCount >= 4) {
            this.slotSettings.SetGameData('FlowersNETFreeStartWin', totalWin);
            this.slotSettings.SetGameData('FlowersNETBonusWin', totalWin);
            this.slotSettings.SetGameData('FlowersNETFreeGames', this.slotSettings.slotFreeCount[scattersCount]);
            const fs = this.slotSettings.GetGameData('FlowersNETFreeGames');
            freeState = `&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&freespins.totalwin.cents=0&nextaction=freespin&freespins.left=${fs}&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=basic%2Cfreespin&freespins.totalwin.coins=0&freespins.total=${fs}&freespins.win.cents=0&gamestate.current=freespin&freespins.initial=${fs}&freespins.win.coins=0&freespins.betlevel=${this.slotSettings.GetGameData('FlowersNETBet')}&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}`;
            curReels += freeState;
        }

        const winString = lineWins.join('');

        // Gamble logic and next action
        let nextaction = 'spin';
        let gameover = 'true';
        let gamestate = 'basic';
        let stack = 'basic';

        if (totalWin > 0) {
             // In PHP: if( $totalWin > 0 ) { $state = 'gamble'; $gameover = 'false'; $nextaction = 'spin'; $gameover = 'true'; }
             // It sets gameover=true immediately after false?
             // Defaulting to standard behavior.
        }

        if (postData.slotEvent === 'freespin') {
            totalWin = this.slotSettings.GetGameData('FlowersNETBonusWin');
            if (this.slotSettings.GetGameData(this.slotId + 'FreeGames') <= this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame')) {
                nextaction = 'spin';
                stack = 'basic';
                gamestate = 'basic';
            } else {
                gamestate = 'freespin';
                nextaction = 'freespin';
                stack = 'basic%2Cfreespin';
                gameover = 'false';
            }
            const fs = this.slotSettings.GetGameData('FlowersNETFreeGames');
            const fsl = this.slotSettings.GetGameData('FlowersNETFreeGames') - this.slotSettings.GetGameData('FlowersNETCurrentFreeGame');

            freeState = `&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&freespins.totalwin.cents=0&nextaction=${nextaction}&freespins.left=${fsl}&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=${stack}&freespins.totalwin.coins=${totalWin}&freespins.total=${fs}&freespins.win.cents=${totalWin / this.slotSettings.CurrentDenomination * 100}&gamestate.current=${gamestate}&freespins.initial=${fs}&freespins.win.coins=${totalWin}&freespins.betlevel=${this.slotSettings.GetGameData('FlowersNETBet')}&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}`;
            curReels += freeState;
        }

        // Log report
        const logResponse = {
            responseEvent: 'spin',
            responseType: postData.slotEvent,
            serverResponse: {
                freeState: freeState,
                slotLines: lines,
                slotBet: betline,
                totalFreeGames: this.slotSettings.GetGameData('FlowersNETFreeGames'),
                currentFreeGames: this.slotSettings.GetGameData('FlowersNETCurrentFreeGame'),
                Balance: balanceInCents,
                afterBalance: balanceInCents,
                bonusWin: this.slotSettings.GetGameData('FlowersNETBonusWin'),
                totalWin: totalWin,
                winLines: [],
                Jackpots: this.slotSettings.Jackpots,
                reelsSymbols: reels
            }
        };
        this.slotSettings.SaveLogReport(JSON.stringify(logResponse), allbet, lines, reportWin, postData.slotEvent);

        // Result String
        let result = `rs.i0.r.i1.pos=18&g4mode=false&game.win.coins=${totalWin}&playercurrencyiso=${this.slotSettings.slotCurrency}&historybutton=false&rs.i0.r.i1.hold=false&rs.i0.r.i4.hold=false&gamestate.history=basic&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=spin&rs.i0.r.i2.hold=false&game.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&rs.i0.r.i2.pos=47&rs.i0.id=basic&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gamestate.current=${gamestate}&gameover=${gameover}&rs.i0.r.i0.hold=false&jackpotcurrency=%26%23x20AC%3B&multiplier=1&rs.i0.r.i3.pos=4&rs.i0.r.i4.pos=5&isJackpotWin=false&gamestate.stack=${stack}&nextaction=${nextaction}&rs.i0.r.i0.pos=7&wavecount=1&gamesoundurl=&rs.i0.r.i3.hold=false&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}${curReels}${winString}`;

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
            [1, 3, 1, 3, 1],
            [3, 1, 3, 1, 3],
            [1, 3, 3, 3, 1],
            [3, 1, 1, 1, 3],
            [1, 1, 3, 1, 1],
            [3, 3, 1, 3, 3],
            [1, 3, 2, 1, 3],
            [3, 1, 2, 3, 1],
            [2, 1, 3, 1, 2],
            [2, 3, 1, 3, 2],
            [1, 2, 3, 3, 3],
            [3, 2, 1, 1, 1],
            [2, 1, 2, 3, 2]
        ];
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
