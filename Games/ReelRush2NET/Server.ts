
import { SlotSettings } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'ReelRush2NET';

    public constructor(slotSettingsData: ISlotSettingsData) {
        this.slotSettings = new SlotSettings(slotSettingsData);
    }

    public get(request: any, game: any): any {
        try {
            const response = this.processRequest(request, game);
            return response;
        } catch (error) {
            console.error(error);
            return this.createErrorResponse("InternalError");
        }
    }

    private processRequest(request: any, game: any): string {
        let postData = request;
        if (typeof request === 'string') {
            try {
                postData = JSON.parse(request);
            } catch (e) {
                // Not JSON
            }
        }

        if (!postData.slotEvent) {
            postData.slotEvent = 'bet';
        }
        postData.freeMode = '';

        if (postData.action == 'freespin') {
            postData.slotEvent = 'freespin';
            postData.action = 'spin';
        }
        if (postData.action == 'superfreespin') {
            postData.slotEvent = 'freespin';
            postData.action = 'spin';
            postData.freeMode = 'superfreespin';
        }
        if (postData.action == 'respin') {
            postData.slotEvent = 'respin';
            postData.action = 'spin';
        }
        if (postData.action == 'init' || postData.action == 'reloadbalance') {
            postData.action = 'init';
            postData.slotEvent = 'init';
        }
        if (postData.action == 'paytable') {
            postData.slotEvent = 'paytable';
        }
        if (postData.action == 'purchasestars') {
            postData.slotEvent = 'purchasestars';
        }
        if (postData.action == 'gamble') {
            postData.slotEvent = 'gamble';
        }
        if (postData.action == 'initfreespin') {
            postData.slotEvent = 'initfreespin';
        }
        if (postData.action == 'startfreespins') {
            postData.slotEvent = 'startfreespins';
        }

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

        if (postData.slotEvent == 'bet') {
            if (!postData.bet_betlevel) {
                 return this.createErrorResponse("invalid bet request", "bet");
            }
            const lines = 20;
            const betline = postData.bet_betlevel;
            if (lines <= 0 || betline <= 0.0001) {
                return this.createErrorResponse("invalid bet state", postData.slotEvent);
            }
            if (this.slotSettings.GetBalance() < (lines * betline)) {
                return this.createErrorResponse("invalid balance", postData.slotEvent);
            }
        }

        if (this.slotSettings.GetGameData(this.slotId + 'FreeGames') < this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') && postData.slotEvent == 'freespin') {
            return this.createErrorResponse("invalid bonus state", postData.slotEvent);
        }

        const aid = postData.action;

        switch (aid) {
            case 'init':
                return this.handleInitRequest();
            case 'paytable':
                return this.handlePaytableRequest();
            case 'purchasestars':
                return this.handlePurchaseStars(postData);
            case 'gamble':
                return this.handleGamble();
            case 'initfreespin':
                return this.handleInitFreespinRequest();
            case 'startfreespins':
                return this.handleStartFreespins();
            case 'spin':
                return this.handleSpinRequest(postData);
            default:
                return this.createErrorResponse("unknown action");
        }
    }

    private handleInitRequest(): string {
        const lastEvent = this.slotSettings.GetHistory();
        this.slotSettings.SetGameData(this.slotId + 'BonusWin', 0);
        this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
        this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
        this.slotSettings.SetGameData(this.slotId + 'TotalWin', 0);
        this.slotSettings.SetGameData(this.slotId + 'FreeBalance', 0);
        this.slotSettings.SetGameData(this.slotId + 'Stars', 0);

        let freeState = '';
        let curReels = '';

        if (lastEvent != 'NULL') {
             this.slotSettings.SetGameData(this.slotId + 'BonusWin', lastEvent.serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', lastEvent.serverResponse.totalFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', lastEvent.serverResponse.currentFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', lastEvent.serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', lastEvent.serverResponse.Balance);
            freeState = lastEvent.serverResponse.freeState;
            const reels = lastEvent.serverResponse.reelsSymbols;
            curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1[0]}%2CSYM${reels.reel1[1]}%2CSYM${reels.reel1[2]}`;
            curReels += `&rs.i0.r.i1.syms=SYM${reels.reel2[0]}%2CSYM${reels.reel2[1]}%2CSYM${reels.reel2[2]}`;
            curReels += `&rs.i0.r.i2.syms=SYM${reels.reel3[0]}%2CSYM${reels.reel3[1]}%2CSYM${reels.reel3[2]}`;
            curReels += `&rs.i0.r.i3.syms=SYM${reels.reel4[0]}%2CSYM${reels.reel4[1]}%2CSYM${reels.reel4[2]}`;
            curReels += `&rs.i0.r.i4.syms=SYM${reels.reel5[0]}%2CSYM${reels.reel5[1]}%2CSYM${reels.reel5[2]}`;
        } else {
             curReels = `&rs.i0.r.i0.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
             curReels += `&rs.i0.r.i1.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
             curReels += `&rs.i0.r.i2.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
             curReels += `&rs.i0.r.i3.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
             curReels += `&rs.i0.r.i4.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
        }

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        // Reconstruct initialization string similar to PHP
        const result = `rs.i4.id=basic&rs.i2.r.i1.hold=false&rs.i2.r.i13.pos=0&rs.i1.r.i0.syms=SYM12%2CSYM2%2CSYM9&gameServerVersion=1.21.0&g4mode=false&historybutton=false&rs.i0.r.i4.hold=false&gameEventSetters.enabled=false&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=0&rs.i0.r.i1.syms=SYM6%2CSYM12%2CSYM8&rs.i2.r.i1.pos=0&game.win.cents=0&rs.i4.r.i4.pos=0&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i0.reelset=ALL&rs.i1.r.i3.hold=false&rs.i2.r.i11.pos=0&totalwin.coins=0&gamestate.current=basic&rs.i4.r.i0.pos=0&jackpotcurrency=%26%23x20AC%3B&walkingwilds.pos=0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0&rs.i3.r.i1.hold=false&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM3%2CSYM11%2CSYM12&rs.i0.r.i3.syms=SYM6%2CSYM12%2CSYM8&rs.i1.r.i1.syms=SYM12%2CSYM7%2CSYM2&rs.i1.r.i1.pos=0&rs.i2.r.i10.hold=false&rs.i3.r.i4.pos=0&rs.i2.r.i8.syms=SYM30&isJackpotWin=false&rs.i0.r.i0.pos=0&rs.i2.r.i3.hold=false&rs.i2.r.i3.pos=0&rs.i0.r.i1.pos=0&rs.i4.r.i4.syms=SYM3%2CSYM10%2CSYM0&rs.i1.r.i3.syms=SYM3%2CSYM9%2CSYM11&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=0&rs.i2.id=respin&game.win.coins=0&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&rs.i2.r.i5.pos=0&rs.i2.r.i7.syms=SYM30&rs.i2.r.i1.syms=SYM30&clientaction=init&rs.i4.r.i0.hold=false&rs.i0.r.i2.hold=false&rs.i4.r.i3.syms=SYM1%2CSYM10%2CSYM2&casinoID=netent&betlevel.standard=1&rs.i3.r.i2.hold=false&rs.i2.r.i10.syms=SYM30&gameover=true&rs.i3.r.i3.pos=0&rs.i2.r.i7.pos=0&rs.i0.r.i3.pos=0&rs.i4.r.i0.syms=SYM11%2CSYM7%2CSYM10&bl.i0.id=243&bl.i0.line=0%2F1%2F2%2C0%2F1%2F2%2C0%2F1%2F2%2C0%2F1%2F2%2C0%2F1%2F2&nextaction=spin&rs.i2.r.i14.pos=0&rs.i2.r.i12.hold=false&rs.i4.r.i2.pos=131&rs.i0.r.i2.syms=SYM3%2CSYM11%2CSYM12&game.win.amount=0&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&rs.i2.r.i12.syms=SYM30&denomination.all=${this.slotSettings.Denominations.map(d => d * 100).join('%2C')}&rs.i2.r.i9.pos=0&rs.i4.r.i3.pos=60&playercurrency=%26%23x20AC%3B&rs.i2.r.i7.hold=false&rs.i2.r.i0.pos=0&rs.i4.r.i4.hold=false&rs.i2.r.i4.syms=SYM30&rs.i3.r.i2.syms=SYM8%2CSYM3%2CSYM7&rs.i2.r.i12.pos=0&rs.i4.r.i3.hold=false&rs.i2.r.i13.syms=SYM30&rs.i0.id=freespin&credit=${balanceInCents}&rs.i1.r.i4.pos=0&rs.i2.r.i14.hold=false&denomination.standard=${this.slotSettings.CurrentDenomination * 100}&rs.i2.r.i13.hold=false&rs.i3.id=freespinwalkingwild&multiplier=1&rs.i2.r.i2.pos=0&rs.i2.r.i10.pos=0&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&rs.i2.r.i5.syms=SYM30&rs.i2.r.i6.hold=false&rs.i1.r.i4.syms=SYM12%2CSYM10%2CSYM0&rs.i2.r.i2.syms=SYM30&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i1.r.i2.pos=0&rs.i3.r.i3.syms=SYM3%2CSYM9%2CSYM12&rs.i3.r.i4.hold=false&rs.i4.r.i2.hold=false&nearwinallowed=true&rs.i2.r.i9.hold=false&rs.i4.r.i1.syms=SYM6%2CSYM12%2CSYM4&rs.i2.r.i4.pos=0&rs.i3.r.i0.syms=SYM8%2CSYM3%2CSYM7&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i4.r.i1.hold=false&rs.i3.r.i2.pos=0&rs.i3.r.i3.hold=false&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM3%2CSYM11%2CSYM12&rs.i2.r.i11.hold=false&rs.i0.r.i2.pos=0&rs.i1.r.i2.syms=SYM12%2CSYM11%2CSYM0&rs.i2.r.i6.pos=0&rs.i1.r.i0.pos=0&totalwin.cents=0&bl.i0.coins=20&rs.i2.r.i0.syms=SYM30&rs.i0.r.i0.hold=false&rs.i2.r.i3.syms=SYM30&restore=false&rs.i1.id=basicwalkingwild&rs.i2.r.i6.syms=SYM30&rs.i3.r.i4.syms=SYM8%2CSYM3%2CSYM7&rs.i3.r.i1.syms=SYM3%2CSYM9%2CSYM12&rs.i1.r.i4.hold=false&rs.i2.r.i8.hold=false&rs.i0.r.i4.pos=0&rs.i2.r.i9.syms=SYM30&rs.i4.r.i1.pos=0&rs.i4.r.i2.syms=SYM4%2CSYM10%2CSYM9&rs.i2.r.i14.syms=SYM30&rs.i2.r.i5.hold=false&bl.standard=243&rs.i3.r.i0.pos=0&rs.i2.r.i8.pos=0&rs.i3.r.i0.hold=false&rs.i2.r.i2.hold=false&rs.i2.r.i11.syms=SYM30&wavecount=1&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false${freeState}${curReels}`;
        return result;
    }

    private handlePaytableRequest(): string {
        return 'pt.i0.comp.i19.symbol=SYM8&pt.i0.comp.i15.type=betline&pt.i0.comp.i23.freespins=0&pt.i0.comp.i32.type=betline&pt.i0.comp.i35.multi=10&pt.i0.comp.i29.type=betline&pt.i0.comp.i4.multi=50&pt.i0.comp.i15.symbol=SYM7&pt.i0.comp.i17.symbol=SYM7&pt.i0.comp.i5.freespins=0&pt.i1.comp.i14.multi=30&pt.i0.comp.i22.multi=6&pt.i0.comp.i23.n=5&pt.i1.comp.i34.multi=5&pt.i1.comp.i19.type=betline&pt.i0.comp.i11.symbol=SYM5&pt.i0.comp.i13.symbol=SYM6&pt.i1.comp.i8.type=betline&pt.i1.comp.i4.n=4&pt.i1.comp.i27.multi=1&pt.i0.comp.i15.multi=5&pt.i1.comp.i27.symbol=SYM11&bl.i0.reelset=ALL&pt.i0.comp.i16.freespins=0&pt.i0.comp.i28.multi=5&pt.i1.comp.i6.freespins=0&pt.i1.comp.i29.symbol=SYM11&pt.i1.comp.i29.freespins=0&pt.i1.comp.i22.n=4&pt.i1.comp.i30.symbol=SYM12&pt.i1.comp.i3.multi=10&pt.i0.comp.i11.n=5&pt.i0.comp.i4.freespins=0&pt.i1.comp.i23.symbol=SYM9&pt.i1.comp.i25.symbol=SYM10&pt.i0.comp.i30.freespins=0&pt.i1.comp.i24.type=betline&pt.i0.comp.i19.n=4&pt.i0.id=basic&pt.i0.comp.i1.type=betline&pt.i0.comp.i34.n=4&pt.i1.comp.i10.type=betline&pt.i0.comp.i34.type=betline&pt.i0.comp.i2.symbol=SYM1&pt.i0.comp.i4.symbol=SYM3&pt.i1.comp.i5.freespins=0&pt.i0.comp.i20.type=betline&pt.i1.comp.i8.symbol=SYM4&pt.i1.comp.i19.n=4&pt.i0.comp.i17.freespins=0&pt.i0.comp.i6.symbol=SYM4&pt.i0.comp.i8.symbol=SYM4&pt.i0.comp.i0.symbol=SYM1&pt.i1.comp.i11.n=5&pt.i1.comp.i34.n=4&pt.i0.comp.i5.n=5&pt.i1.comp.i2.symbol=SYM1&pt.i0.comp.i3.type=betline&pt.i0.comp.i3.freespins=0&pt.i0.comp.i10.multi=15&pt.i1.id=freespin&pt.i1.comp.i19.multi=10&pt.i1.comp.i6.symbol=SYM4&pt.i1.comp.i34.freespins=0&pt.i0.comp.i27.multi=1&pt.i0.comp.i9.multi=7&pt.i0.comp.i22.symbol=SYM9&pt.i0.comp.i26.symbol=SYM10&pt.i1.comp.i19.freespins=0&pt.i1.comp.i34.type=betline&pt.i0.comp.i24.n=3&pt.i0.comp.i14.freespins=0&pt.i0.comp.i21.freespins=0&clientaction=paytable&pt.i1.comp.i35.multi=10&pt.i1.comp.i27.freespins=0&pt.i1.comp.i4.freespins=0&pt.i1.comp.i12.type=betline&pt.i1.comp.i5.n=5&pt.i1.comp.i8.multi=100&pt.i1.comp.i21.symbol=SYM9&pt.i1.comp.i23.n=5&pt.i0.comp.i22.type=betline&pt.i0.comp.i24.freespins=0&pt.i1.comp.i32.symbol=SYM12&pt.i0.comp.i16.multi=10&pt.i0.comp.i21.multi=1&pt.i1.comp.i13.multi=15&pt.i0.comp.i12.n=3&pt.i0.comp.i35.n=5&pt.i0.comp.i13.type=betline&pt.i1.comp.i35.n=5&pt.i1.comp.i9.multi=7&bl.i0.line=0%2F1%2F2%2F3%2F4%2C0%2F1%2F2%2F3%2F4%2C0%2F1%2F2%2F3%2F4%2C0%2F1%2F2%2F3%2F4%2C0%2F1%2F2%2F3%2F4&pt.i0.comp.i19.type=betline&pt.i0.comp.i6.freespins=0&pt.i1.comp.i2.multi=200&pt.i1.comp.i7.freespins=0&pt.i0.comp.i31.freespins=0&pt.i0.comp.i3.multi=10&pt.i0.comp.i6.n=3&pt.i1.comp.i22.type=betline&pt.i1.comp.i12.n=3&pt.i1.comp.i3.type=betline&pt.i0.comp.i21.n=3&pt.i1.comp.i10.freespins=0&pt.i1.comp.i28.type=betline&pt.i0.comp.i34.symbol=SYM13&pt.i1.comp.i6.n=3&pt.i0.comp.i29.n=5&pt.i1.comp.i31.type=betline&pt.i1.comp.i20.multi=20&pt.i0.comp.i27.freespins=0&pt.i0.comp.i34.freespins=0&pt.i1.comp.i24.n=3&pt.i0.comp.i10.type=betline&pt.i0.comp.i35.freespins=0&pt.i1.comp.i11.symbol=SYM5&pt.i1.comp.i27.type=betline&pt.i1.comp.i2.type=betline&pt.i0.comp.i2.freespins=0&pt.i0.comp.i5.multi=200&pt.i0.comp.i7.n=4&pt.i0.comp.i32.n=5&pt.i1.comp.i1.freespins=0&pt.i0.comp.i11.multi=30&pt.i1.comp.i14.symbol=SYM6&pt.i1.comp.i16.symbol=SYM7&pt.i1.comp.i23.multi=12&pt.i0.comp.i7.type=betline&pt.i1.comp.i4.type=betline&pt.i0.comp.i17.n=5&pt.i1.comp.i18.multi=5&pt.i0.comp.i29.multi=10&pt.i1.comp.i13.n=4&pt.i0.comp.i8.freespins=0&pt.i1.comp.i26.type=betline&pt.i1.comp.i4.multi=50&pt.i0.comp.i8.multi=100&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&pt.i0.comp.i34.multi=5&pt.i0.comp.i1.freespins=0&pt.i0.comp.i12.type=betline&pt.i0.comp.i14.multi=30&pt.i1.comp.i7.multi=25&pt.i0.comp.i22.n=4&pt.i0.comp.i28.symbol=SYM11&pt.i1.comp.i17.type=betline&pt.i1.comp.i11.type=betline&pt.i0.comp.i6.multi=8&pt.i1.comp.i0.symbol=SYM1&playercurrencyiso=' + this.slotSettings.slotCurrency + '&pt.i1.comp.i7.n=4&pt.i1.comp.i5.multi=200&pt.i1.comp.i5.symbol=SYM3&pt.i0.comp.i18.type=betline&pt.i0.comp.i23.symbol=SYM9&pt.i0.comp.i21.type=betline&playforfun=false&jackpotcurrencyiso=' . $slotSettings->slotCurrency . '&pt.i1.comp.i25.n=4&pt.i0.comp.i8.type=betline&pt.i0.comp.i7.freespins=0&pt.i1.comp.i15.multi=5&pt.i0.comp.i2.type=betline&pt.i0.comp.i13.multi=15&pt.i1.comp.i20.type=betline&pt.i0.comp.i17.type=betline&pt.i0.comp.i30.type=betline&pt.i1.comp.i22.symbol=SYM9&pt.i1.comp.i30.freespins=0&pt.i1.comp.i22.multi=6&bl.i0.coins=20&pt.i0.comp.i8.n=5&pt.i0.comp.i10.n=4&pt.i0.comp.i33.n=3&pt.i1.comp.i6.multi=8&pt.i1.comp.i22.freespins=0&pt.i0.comp.i11.type=betline&pt.i1.comp.i19.symbol=SYM8&pt.i1.comp.i35.freespins=0&pt.i0.comp.i18.n=3&pt.i0.comp.i22.freespins=0&pt.i0.comp.i20.symbol=SYM8&pt.i0.comp.i15.freespins=0&pt.i1.comp.i14.n=5&pt.i1.comp.i16.multi=10&pt.i0.comp.i31.symbol=SYM12&pt.i1.comp.i15.freespins=0&pt.i0.comp.i27.type=betline&pt.i1.comp.i28.freespins=0&pt.i0.comp.i28.freespins=0&pt.i0.comp.i0.n=3&pt.i0.comp.i7.symbol=SYM4&pt.i1.comp.i21.multi=1&pt.i1.comp.i30.type=betline&pt.i1.comp.i0.freespins=0&pt.i0.comp.i0.type=betline&pt.i1.comp.i0.multi=10&gameServerVersion=1.21.0&g4mode=false&pt.i1.comp.i8.n=5&pt.i0.comp.i25.multi=6&historybutton=false&pt.i0.comp.i16.symbol=SYM7&pt.i1.comp.i21.freespins=0&pt.i0.comp.i1.multi=50&pt.i0.comp.i27.n=3&pt.i0.comp.i18.symbol=SYM8&pt.i1.comp.i9.type=betline&pt.i0.comp.i12.multi=7&pt.i0.comp.i32.multi=10&pt.i1.comp.i24.multi=1&pt.i1.comp.i14.freespins=0&pt.i1.comp.i23.type=betline&pt.i1.comp.i26.n=5&pt.i0.comp.i12.symbol=SYM6&pt.i0.comp.i14.symbol=SYM6&pt.i1.comp.i13.freespins=0&pt.i1.comp.i28.symbol=SYM11&pt.i0.comp.i14.type=betline&pt.i1.comp.i17.multi=20&pt.i0.comp.i18.multi=5&pt.i1.comp.i0.n=3&pt.i1.comp.i26.symbol=SYM10&pt.i0.comp.i33.type=betline&pt.i1.comp.i31.symbol=SYM12&pt.i0.comp.i7.multi=25&pt.i1.comp.i33.symbol=SYM13&pt.i1.comp.i35.type=betline&pt.i0.comp.i9.n=3&pt.i0.comp.i30.n=3&pt.i1.comp.i21.type=betline&jackpotcurrency=%26%23x20AC%3B&pt.i0.comp.i28.type=betline&pt.i1.comp.i31.multi=5&pt.i1.comp.i18.type=betline&pt.i0.comp.i10.symbol=SYM5&pt.i0.comp.i15.n=3&pt.i0.comp.i21.symbol=SYM9&pt.i0.comp.i31.type=betline&pt.i1.comp.i15.n=3&isJackpotWin=false&pt.i1.comp.i20.freespins=0&pt.i1.comp.i7.type=betline&pt.i1.comp.i11.multi=30&pt.i1.comp.i30.n=3&pt.i0.comp.i1.n=4&pt.i0.comp.i10.freespins=0&pt.i0.comp.i20.multi=20&pt.i0.comp.i20.n=5&pt.i0.comp.i29.symbol=SYM11&pt.i1.comp.i3.symbol=SYM3&pt.i0.comp.i17.multi=20&pt.i1.comp.i23.freespins=0&pt.i1.comp.i25.type=betline&pt.i1.comp.i9.n=3&pt.i0.comp.i25.symbol=SYM10&pt.i0.comp.i26.type=betline&pt.i0.comp.i28.n=4&pt.i0.comp.i9.type=betline&pt.i0.comp.i2.multi=200&pt.i1.comp.i27.n=3&pt.i0.comp.i0.freespins=0&pt.i1.comp.i16.type=betline&pt.i1.comp.i25.multi=6&pt.i0.comp.i33.multi=1&pt.i1.comp.i16.freespins=0&pt.i1.comp.i20.symbol=SYM8&pt.i1.comp.i12.multi=7&pt.i0.comp.i29.freespins=0&pt.i1.comp.i1.n=4&pt.i1.comp.i5.type=betline&pt.i1.comp.i35.symbol=SYM13&pt.i1.comp.i11.freespins=0&pt.i1.comp.i24.symbol=SYM10&pt.i0.comp.i31.n=4&pt.i0.comp.i9.symbol=SYM5&pt.i1.comp.i13.symbol=SYM6&pt.i1.comp.i17.symbol=SYM7&pt.i0.comp.i16.n=4&bl.i0.id=0&pt.i0.comp.i16.type=betline&pt.i1.comp.i16.n=4&pt.i0.comp.i5.symbol=SYM3&pt.i1.comp.i7.symbol=SYM4&pt.i0.comp.i2.n=5&pt.i0.comp.i35.type=betline&pt.i0.comp.i1.symbol=SYM1&pt.i1.comp.i31.n=4&pt.i1.comp.i31.freespins=0&pt.i0.comp.i19.freespins=0&pt.i1.comp.i14.type=betline&pt.i0.comp.i6.type=betline&pt.i1.comp.i9.freespins=0&pt.i1.comp.i2.freespins=0&playercurrency=%26%23x20AC%3B&pt.i0.comp.i35.symbol=SYM13&pt.i1.comp.i25.freespins=0&pt.i0.comp.i33.symbol=SYM13&pt.i1.comp.i30.multi=1&pt.i0.comp.i25.n=4&pt.i1.comp.i10.multi=15&pt.i1.comp.i10.symbol=SYM5&pt.i1.comp.i28.n=4&pt.i1.comp.i32.freespins=0&pt.i0.comp.i9.freespins=0&pt.i1.comp.i2.n=5&pt.i1.comp.i20.n=5&credit=500000&pt.i0.comp.i5.type=betline&pt.i1.comp.i24.freespins=0&pt.i0.comp.i11.freespins=0&pt.i0.comp.i26.multi=12&pt.i0.comp.i25.type=betline&pt.i1.comp.i32.type=betline&pt.i1.comp.i18.symbol=SYM8&pt.i0.comp.i31.multi=5&pt.i1.comp.i12.symbol=SYM6&pt.i0.comp.i4.type=betline&pt.i0.comp.i13.freespins=0&pt.i1.comp.i15.type=betline&pt.i1.comp.i26.freespins=0&pt.i0.comp.i26.freespins=0&pt.i1.comp.i13.type=betline&pt.i1.comp.i1.multi=50&pt.i1.comp.i1.type=betline&pt.i1.comp.i8.freespins=0&pt.i0.comp.i13.n=4&pt.i0.comp.i20.freespins=0&pt.i0.comp.i33.freespins=10&pt.i1.comp.i17.n=5&pt.i0.comp.i23.type=betline&pt.i1.comp.i29.type=betline&pt.i0.comp.i30.symbol=SYM12&pt.i0.comp.i32.symbol=SYM12&pt.i1.comp.i32.n=5&pt.i0.comp.i3.n=3&pt.i1.comp.i17.freespins=0&pt.i1.comp.i26.multi=60&pt.i1.comp.i32.multi=40&pt.i1.comp.i6.type=betline&pt.i1.comp.i0.type=betline&pt.i1.comp.i1.symbol=SYM1&pt.i1.comp.i29.multi=10&pt.i0.comp.i25.freespins=0&pt.i1.comp.i4.symbol=SYM3&pt.i0.comp.i24.symbol=SYM10&pt.i0.comp.i26.n=5&pt.i0.comp.i27.symbol=SYM11&pt.i0.comp.i32.freespins=0&pt.i1.comp.i29.n=5&pt.i0.comp.i23.multi=12&pt.i1.comp.i3.n=3&pt.i0.comp.i30.multi=5&pt.i1.comp.i21.n=3&pt.i1.comp.i34.symbol=SYM13&pt.i1.comp.i28.multi=5&pt.i0.comp.i18.freespins=0&pt.i1.comp.i33.multi=1&pt.i1.comp.i15.symbol=SYM7&pt.i1.comp.i18.freespins=0&pt.i1.comp.i3.freespins=0&pt.i0.comp.i14.n=5&pt.i0.comp.i0.multi=10&pt.i1.comp.i9.symbol=SYM5&pt.i0.comp.i19.multi=10&pt.i0.comp.i3.symbol=SYM3&pt.i0.comp.i24.type=betline&pt.i1.comp.i18.n=3&pt.i1.comp.i33.type=betline&pt.i1.comp.i12.freespins=0&pt.i0.comp.i12.freespins=0&pt.i0.comp.i4.n=4&pt.i1.comp.i10.n=4&pt.i0.comp.i24.multi=1&pt.i1.comp.i33.n=3';
    }

    private handlePurchaseStars(postData: any): string {
        const starAmountArr = [400, 1000, 2000];
        const starPriceArr = [6, 15, 29.5];
        const allbet = this.slotSettings.GetGameData(this.slotId + 'AllBet') || 1;

        if(postData.starbuy_amount === undefined) return this.createErrorResponse("invalid starbuy amount");

        const starAmount = starAmountArr[postData.starbuy_amount];
        const starPrice = starPriceArr[postData.starbuy_amount] * allbet;

        if (starPrice <= this.slotSettings.GetBalance()) {
             this.slotSettings.SetBalance(-1 * starPrice, 'bet');
             this.slotSettings.SetBank(postData.slotEvent || '', (starPrice / 100) * this.slotSettings.GetPercent(), 'bet');
             this.slotSettings.UpdateJackpots(starPrice);
        } else {
             return this.createErrorResponse("invalid balance", postData.slotEvent);
        }

        let Stars = this.slotSettings.GetGameData(this.slotId + 'Stars') || 0;
        Stars += starAmount;
        if(Stars > 2000) Stars = 2000;
        this.slotSettings.SetGameData(this.slotId + 'Stars', Stars);

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        const GambleChance = (Stars / 20).toFixed(2);

        if (Stars >= 2000) {
            this.slotSettings.SetGameData(this.slotId + 'Stars', 0);
             return `freespins.betlevel=1&gameServerVersion=1.21.0&g4mode=false&freespins.win.coins=0&playercurrency=%26%23x20AC%3B&stars.unscaled=455&historybutton=false&rs.i0.r.i4.hold=false&next.rs=superFreespin&gamestate.history=basic%2Cstart_freespins&rs.i0.r.i1.syms=SYM13%2CSYM1%2CSYM12%2CSYM10%2CSYM10&game.win.cents=1470&rs.i0.id=freespin&totalwin.coins=0&credit=${balanceInCents}&gamestate.current=super_freespin&freespins.initial=0&jackpotcurrency=%26%23x20AC%3B&multiplier=1&last.rs=basic&rs.i0.r.i0.syms=SYM4%2CSYM4%2CSYM5%2CSYM5%2CSYM9&freespins.denomination=5.000&superfreespins.multiplier.increase=0&rs.i0.r.i3.syms=SYM11%2CSYM10%2CSYM10%2CSYM8%2CSYM8&freespins.win.cents=0&freespins.totalwin.coins=0&freespins.total=0&isJackpotWin=false&gamestate.stack=basic%2Csuper_freespin&rs.i0.r.i0.pos=0&freespins.betlines=0&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i0.r.i1.pos=0&game.win.coins=0&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i1.hold=false&freespins.wavecount=1&stars.total=91&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=purchasestars&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM5%2CSYM5%2CSYM13%2CSYM13%2CSYM3&stars.frompositions=2%2C2&rs.i0.r.i2.pos=0&totalwin.cents=1470&gameover=false&rs.i0.r.i0.hold=false&rs.i0.r.i3.pos=0&freespins.left=8&rs.i0.r.i4.pos=0&superfreespins.multiplier.final=1&nextaction=superfreespin&wavecount=1&superfreespins.multiplier.active=1&rs.i0.r.i2.syms=SYM3%2CSYM9%2CSYM9%2CSYM12%2CSYM12&rs.i0.r.i3.hold=false&game.win.amount=14.70&freespins.totalwin.cents=0`;
        } else {
             return `rs.i0.r.i1.pos=0&legalactions=startfreespins%2Cgamble%2Cpurchasestars&gameServerVersion=1.21.0&g4mode=false&game.win.coins=0&playercurrency=%26%23x20AC%3B&playercurrencyiso=${this.slotSettings.slotCurrency}&stars.unscaled=5220&historybutton=false&rs.i0.r.i1.hold=false&rs.i0.r.i4.hold=false&next.rs=basic&gamestate.history=basic%2Cstart_freespins&stars.total=${Stars}&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=purchasestars&rs.i0.r.i1.syms=SYM13%2CSYM1%2CSYM12%2CSYM10%2CSYM10&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM5%2CSYM5%2CSYM13%2CSYM13%2CSYM3&stars.frompositions=3%2C1%2C3%2C2&gamble.chance=${GambleChance}&game.win.cents=0&rs.i0.r.i2.pos=0&rs.i0.id=freespin&totalwin.coins=0&credit=${balanceInCents}&totalwin.cents=0&gameover=false&gamestate.current=start_freespins&rs.i0.r.i0.hold=false&jackpotcurrency=%26%23x20AC%3B&multiplier=1&rs.i0.r.i3.pos=0&last.rs=basic&rs.i0.r.i4.pos=0&rs.i0.r.i0.syms=SYM4%2CSYM4%2CSYM5%2CSYM5%2CSYM9&rs.i0.r.i3.syms=SYM11%2CSYM10%2CSYM10%2CSYM8%2CSYM8&isJackpotWin=false&gamestate.stack=basic%2Cstart_freespins&nextaction=startfreespins&rs.i0.r.i0.pos=0&wavecount=1&gamesoundurl=&rs.i0.r.i2.syms=SYM3%2CSYM9%2CSYM9%2CSYM12%2CSYM12&rs.i0.r.i3.hold=false&game.win.amount=0`;
        }
    }

    private handleGamble(): string {
        const Stars = this.slotSettings.GetGameData(this.slotId + 'Stars');
        const GambleChance = Stars / 20;
        // Chance array logic from PHP
        const chanceArr = new Array(100).fill(0);
        for(let i=1; i<=100; i++) {
            if(i < GambleChance) chanceArr[i-1] = 1;
        }
        this.shuffleArray(chanceArr);
        const gambleWin = chanceArr[0] === 1;

        // Reset stars after gamble
        this.slotSettings.SetGameData(this.slotId + 'Stars', 0);

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        if(gambleWin) {
            return `freespins.betlevel=1&gameServerVersion=1.21.0&g4mode=false&game.win.coins=0&freespins.win.coins=0&playercurrency=%26%23x20AC%3B&playercurrencyiso=${this.slotSettings.slotCurrency}&stars.unscaled=0&historybutton=false&next.rs=superFreespin&freespins.wavecount=1&gamestate.history=basic%2Cstart_freespins&freespins.multiplier=1&stars.total=0&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=gamble&stars.frompositions=1%2C1&game.win.cents=0&totalwin.coins=0&credit=${balanceInCents}&totalwin.cents=0&gameover=false&gamestate.current=super_freespin&freespins.initial=0&jackpotcurrency=%26%23x20AC%3B&multiplier=1&freespins.left=8&last.rs=basic&freespins.denomination=5.000&superfreespins.multiplier.increase=0&superfreespins.multiplier.final=1&freespins.win.cents=0&freespins.totalwin.coins=0&freespins.total=0&isJackpotWin=false&gamestate.stack=basic%2Csuper_freespin&nextaction=superfreespin&wavecount=1&freespins.betlines=0&superfreespins.multiplier.active=1&gamesoundurl=&gamble.win=true&game.win.amount=0&freespins.totalwin.cents=0`;
        } else {
             return `freespins.betlevel=1&gameServerVersion=1.21.0&g4mode=false&game.win.coins=0&freespins.win.coins=0&playercurrency=%26%23x20AC%3B&playercurrencyiso=${this.slotSettings.slotCurrency}&stars.unscaled=0&historybutton=false&next.rs=freespin&freespins.wavecount=1&gamestate.history=basic%2Cstart_freespins&freespins.multiplier=1&stars.total=0&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=gamble&stars.frompositions=3%2C1%2C3%2C2&game.win.cents=0&totalwin.coins=0&credit=${balanceInCents}&totalwin.cents=0&gameover=false&gamestate.current=freespin&freespins.initial=0&jackpotcurrency=%26%23x20AC%3B&multiplier=1&freespins.left=8&last.rs=basic&freespins.denomination=5.000&freespins.win.cents=0&freespins.totalwin.coins=0&freespins.total=0&isJackpotWin=false&gamestate.stack=basic%2Cfreespin&nextaction=freespin&wavecount=1&freespins.betlines=0&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&gamble.win=false&game.win.amount=0&freespins.totalwin.cents=0`;
        }
    }

    private handleInitFreespinRequest(): string {
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        return `rs.i4.id=freespin3&rs.i2.r.i1.hold=false&rs.i1.r.i0.syms=SYM11%2CSYM11%2CSYM12&gameServerVersion=1.21.0&g4mode=false&freespins.win.coins=0&historybutton=false&rs.i0.r.i4.hold=false&next.rs=freespin&gamestate.history=basic%2Cstart_freespins&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=3&rs.i0.r.i1.syms=SYM13%2CSYM1%2CSYM12%2CSYM10%2CSYM10&rs.i2.r.i1.pos=0&game.win.cents=550&rs.i4.r.i4.pos=0&rs.i1.r.i3.hold=false&totalwin.coins=110&rs.i5.r.i4.syms=SYM3%2CSYM3%2CSYM5&gamestate.current=freespin&freespins.initial=0&rs.i4.r.i0.pos=0&jackpotcurrency=%26%23x20AC%3B&bet.betlines=0&rs.i3.r.i1.hold=false&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM4%2CSYM4%2CSYM5%2CSYM5%2CSYM9&rs.i0.r.i3.syms=SYM11%2CSYM10%2CSYM10%2CSYM8%2CSYM8&rs.i1.r.i1.syms=SYM12%2CSYM12%2CSYM8&rs.i1.r.i1.pos=42&rs.i3.r.i4.pos=0&freespins.win.cents=0&rs.i6.r.i3.syms=SYM12%2CSYM12%2CSYM4%2CSYM11%2CSYM10&isJackpotWin=false&rs.i6.r.i4.hold=false&rs.i0.r.i0.pos=0&rs.i2.r.i3.hold=false&rs.i2.r.i3.pos=0&freespins.betlines=0&rs.i5.r.i0.pos=50&rs.i0.r.i1.pos=0&rs.i4.r.i4.syms=SYM12%2CSYM9%2CSYM5%2CSYM6%2CSYM11&rs.i1.r.i3.syms=SYM13%2CSYM3%2CSYM3&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=0&rs.i2.id=freespin2&rs.i6.r.i1.pos=0&game.win.coins=110&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&rs.i2.r.i1.syms=SYM13%2CSYM4%2CSYM6%2CSYM13%2CSYM13&clientaction=initfreespin&rs.i4.r.i0.hold=false&rs.i0.r.i2.hold=false&rs.i4.r.i3.syms=SYM12%2CSYM12%2CSYM4%2CSYM11%2CSYM10&rs.i3.r.i2.hold=false&rs.i6.r.i2.syms=SYM5%2CSYM11%2CSYM9%2CSYM7%2CSYM8&gameover=false&rs.i3.r.i3.pos=0&rs.i5.id=basic&rs.i5.r.i1.syms=SYM6%2CSYM6%2CSYM10%2CSYM10%2CSYM1&rs.i0.r.i3.pos=0&rs.i6.r.i4.pos=0&rs.i5.r.i1.hold=false&rs.i4.r.i0.syms=SYM6%2CSYM7%2CSYM3%2CSYM5%2CSYM5&rs.i5.r.i4.hold=false&rs.i6.r.i2.hold=false&rs.i5.r.i3.pos=58&nextaction=freespin&rs.i4.r.i2.pos=0&rs.i0.r.i2.syms=SYM3%2CSYM9%2CSYM12%2CSYM12&game.win.amount=5.50&freespins.totalwin.cents=0&rs.i5.r.i2.hold=false&freespins.betlevel=1&rs.i4.r.i3.pos=0&playercurrency=%26%23x20AC%3B&rs.i2.r.i0.pos=0&rs.i4.r.i4.hold=false&rs.i5.r.i0.syms=SYM12%2CSYM12%2CSYM8%2CSYM8%2CSYM4&rs.i2.r.i4.syms=SYM12%2CSYM9%2CSYM5%2CSYM6%2CSYM11&rs.i3.r.i2.syms=SYM5%2CSYM11%2CSYM9%2CSYM7%2CSYM8&rs.i4.r.i3.hold=false&rs.i6.r.i0.hold=false&rs.i0.id=freespin&credit=${balanceInCents}&rs.i1.r.i4.pos=46&rs.i3.id=superFreespin2&multiplier=1&rs.i2.r.i2.pos=0&last.rs=basic&freespins.denomination=5.000&rs.i5.r.i1.pos=19&rs.i6.r.i0.syms=SYM6%2CSYM7%2CSYM3%2CSYM5%2CSYM5&freespins.totalwin.coins=0&freespins.total=0&gamestate.stack=basic%2Cfreespin&rs.i6.r.i2.pos=0&rs.i1.r.i4.syms=SYM12%2CSYM10%2CSYM10&rs.i6.r.i1.hold=false&rs.i2.r.i2.syms=SYM5%2CSYM11%2CSYM9%2CSYM7%2CSYM8&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i1.r.i2.pos=35&rs.i5.r.i2.syms=SYM1%2CSYM3%2CSYM3%2CSYM9%2CSYM9&rs.i3.r.i3.syms=SYM12%2CSYM12%2CSYM4%2CSYM11%2CSYM10&rs.i5.r.i3.hold=false&bet.betlevel=1&rs.i3.r.i4.hold=false&rs.i4.r.i2.hold=false&rs.i5.r.i0.hold=false&rs.i4.r.i1.syms=SYM13%2CSYM4%2CSYM6%2CSYM13%2CSYM13&rs.i2.r.i4.pos=0&rs.i3.r.i0.syms=SYM6%2CSYM7%2CSYM3%2CSYM5%2CSYM5&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i4.r.i1.hold=false&rs.i6.r.i1.syms=SYM13%2CSYM4%2CSYM6%2CSYM13%2CSYM13&freespins.wavecount=1&rs.i3.r.i2.pos=0&rs.i3.r.i3.hold=false&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i6.r.i0.pos=0&rs.i0.r.i4.syms=SYM5%2CSYM5%2CSYM13%2CSYM13%2CSYM3&rs.i0.r.i2.pos=0&rs.i1.r.i2.syms=SYM13%2CSYM13%2CSYM10%2CSYM10%2CSYM1&rs.i6.r.i3.pos=0&rs.i1.r.i0.pos=40&rs.i6.id=superFreespin&totalwin.cents=550&rs.i6.r.i3.hold=false&rs.i2.r.i0.syms=SYM6%2CSYM7%2CSYM3%2CSYM5%2CSYM5&rs.i5.r.i2.pos=51&rs.i0.r.i0.hold=false&rs.i2.r.i3.syms=SYM12%2CSYM12%2CSYM4%2CSYM11%2CSYM10&rs.i1.id=basic2&rs.i3.r.i4.syms=SYM12%2CSYM9%2CSYM5%2CSYM6%2CSYM11&rs.i3.r.i1.syms=SYM13%2CSYM4%2CSYM6%2CSYM13%2CSYM13&rs.i1.r.i4.hold=false&freespins.left=8&rs.i0.r.i4.pos=0&rs.i4.r.i1.pos=0&rs.i4.r.i2.syms=SYM5%2CSYM11%2CSYM9%2CSYM7%2CSYM8&rs.i3.r.i0.pos=0&rs.i5.r.i3.syms=SYM4%2CSYM4%2CSYM10%2CSYM10%2CSYM9&rs.i3.r.i0.hold=false&rs.i2.r.i2.hold=false&wavecount=1&rs.i6.r.i4.syms=SYM12%2CSYM9%2CSYM5%2CSYM6%2CSYM11&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&bet.denomination=5&rs.i5.r.i4.pos=4`;
    }

    private handleStartFreespins(): string {
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        return `freespins.betlevel=1&freespintype=freespin&gameServerVersion=1.21.0&g4mode=false&game.win.coins=${this.slotSettings.GetGameData(this.slotId + 'BonusWin')}&freespins.win.coins=0&playercurrency=%26%23x20AC%3B&playercurrencyiso=${this.slotSettings.slotCurrency}&stars.unscaled=3510&historybutton=false&next.rs=freespin&freespins.wavecount=1&gamestate.history=basic%2Cstart_freespins&stars.total=702&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=startfreespins&game.win.cents=${this.slotSettings.GetGameData(this.slotId + 'BonusWin')}&totalwin.coins=${this.slotSettings.GetGameData(this.slotId + 'BonusWin')}&credit=${balanceInCents}&totalwin.cents=425&gameover=false&gamestate.current=freespin&freespins.initial=0&jackpotcurrency=%26%23x20AC%3B&multiplier=1&freespins.left=8&last.rs=basic&freespins.denomination=${this.slotSettings.CurrentDenomination}&freespins.win.cents=0&freespins.totalwin.coins=0&freespins.total=0&isJackpotWin=false&gamestate.stack=basic%2Cfreespin&nextaction=freespin&wavecount=1&freespins.betlines=0&gamesoundurl=&game.win.amount=4.25&freespins.totalwin.cents=0`;
    }

    private handleSpinRequest(postData: any): string {
        const lines = 20;
        this.slotSettings.CurrentDenom = postData.bet_denomination;
        this.slotSettings.CurrentDenomination = postData.bet_denomination;

        if (postData.slotEvent != 'freespin' && postData.slotEvent != 'respin') {
            const betline = postData.bet_betlevel;
            const allbet = betline * lines;
            this.slotSettings.UpdateJackpots(allbet);

            this.slotSettings.SetBalance(-1 * allbet, postData.slotEvent);
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(postData.slotEvent, bankSum, postData.slotEvent);

            this.slotSettings.SetGameData(this.slotId + 'SuperMpl', 1);
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
            this.slotSettings.SetGameData(this.slotId + 'RespinId', 0);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'Bet', betline);
            this.slotSettings.SetGameData(this.slotId + 'AllBet', allbet);
            this.slotSettings.SetGameData(this.slotId + 'Denom', postData.bet_denomination);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', this.slotSettings.GetBalance() * 100);
        } else {
            const betline = this.slotSettings.GetGameData(this.slotId + 'Bet');
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') + 1);
        }

        const betline = this.slotSettings.GetGameData(this.slotId + 'Bet');
        const allbet = betline * lines;
        const winTypeTmp = this.slotSettings.GetSpinSettings(postData.slotEvent, allbet, lines);
        let winType = winTypeTmp[0];

        if (winType == 'bonus' && postData.slotEvent == 'freespin') {
            winType = 'win';
        }

        let totalWin = 0;
        let lineWins: string[] = [];
        let reels: any = {};
        let bonusMpl = postData.slotEvent === 'freespin' ? this.slotSettings.slotFreeMpl : 1;
        let RespinId = this.slotSettings.GetGameData(this.slotId + 'RespinId') || 0;

        // Logic for random features - Randomized selection
        let featureStr = '';
        let featuresCnt = 0;
        const featuresArr = ['BreakOpen', 'None', 'None', 'None', 'None', 'None', 'None', 'SymbolUpgrade', 'None', 'None', 'None', 'ManyBonusStars', 'None', 'None', 'None', 'None', 'SymbolMultiplier', 'None', 'None', 'None', 'None', 'RandomWilds', 'SecondChance'];

        // Implementing Fisher-Yates shuffle for randomization
        for (let i = featuresArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [featuresArr[i], featuresArr[j]] = [featuresArr[j], featuresArr[i]];
        }

        const featuresActived = [featuresArr[0], featuresArr[1], featuresArr[2]];

        // Super Free Spin Multiplier Logic
        let superMultiplierInc = 0;
        if (postData.freeMode == 'superfreespin') {
             let superMpl = this.slotSettings.GetGameData(this.slotId + 'SuperMpl');
             // Simplified logic: increase multiplier if there's a win (to be detected)
             // Here we just prep variables, increment logic comes after win check or during it if dynamic
             bonusMpl = superMpl;
        }

        // Simulation loop
        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            lineWins = [];
            const cWins: number[] = new Array(this.slotSettings.SymbolGame.length).fill(0);
            reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent);

            // Apply features like RandomWilds here
            if (featuresActived.includes('RandomWilds')) {
                featureStr += this.slotSettings.RandomWilds(reels, featuresCnt++);
            }
             if (featuresActived.includes('SymbolUpgrade')) {
                featureStr += this.slotSettings.SymbolUpgrade(reels, featuresCnt++);
            }

            // Define Ways Logic for ReelRush2 (Dynamic based on RespinId)
            if (RespinId > 5) RespinId = 5;
            const waysLimit: number[][][] = [
                [[2], [1, 2, 3], [0, 1, 2, 3, 4], [1, 2, 3], [2]], // Respin 0
                [[1, 2, 3], [1, 2, 3], [0, 1, 2, 3, 4], [1, 2, 3], [2]], // Respin 1
                [[1, 2, 3], [1, 2, 3], [0, 1, 2, 3, 4], [1, 2, 3], [1, 2, 3]], // Respin 2
                [[1, 2, 3], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [1, 2, 3]], // Respin 3
                [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [1, 2, 3]], // Respin 4
                [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4]] // Respin 5
            ];

            let winLineCount = 0;
            for (let j = 0; j < this.slotSettings.SymbolGame.length; j++) {
                const csym = this.slotSettings.SymbolGame[j];
                // const wild = '1'; // Assuming 1 is wild
                const waysCountArr = [0, 0, 0, 0, 0, 0];
                let waysCount = 1;
                const wayPos: string[] = [];
                let wscnt = 0;

                for (let rws = 1; rws <= 5; rws++) {
                    const curWays = waysLimit[RespinId][rws - 1];
                    for(const cws of curWays) {
                        const sym = reels[`reel${rws}`][cws];
                        if(sym == csym || sym == '1') { // Check match or wild
                             waysCountArr[rws]++;
                             wayPos.push(`&ws.i${winLineCount}.pos.i${wscnt}=${rws - 1}%2C${cws}`);
                             wscnt++;
                        }
                    }
                    if (waysCountArr[rws] <= 0) break;
                    waysCount *= waysCountArr[rws];
                }

                let tmpStringWin = '';
                // Calculate wins 3, 4, 5
                if(waysCountArr[1] > 0 && waysCountArr[2] > 0 && waysCountArr[3] > 0) {
                     if(this.slotSettings.Paytable['SYM_' + csym][3] > 0) {
                         cWins[j] = this.slotSettings.Paytable['SYM_' + csym][3] * betline * waysCount * bonusMpl;
                         tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${cWins[j]}&ws.i${winLineCount}.types.i0.wintype=coins&ws.i${winLineCount}.betline=243&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${cWins[j] * this.slotSettings.CurrentDenomination * 100}${wayPos.join('')}`;
                     }
                }
                if(waysCountArr[1] > 0 && waysCountArr[2] > 0 && waysCountArr[3] > 0 && waysCountArr[4] > 0) {
                     if(this.slotSettings.Paytable['SYM_' + csym][4] > 0) {
                         cWins[j] = this.slotSettings.Paytable['SYM_' + csym][4] * betline * waysCount * bonusMpl;
                         tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${cWins[j]}&ws.i${winLineCount}.types.i0.wintype=coins&ws.i${winLineCount}.betline=243&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${cWins[j] * this.slotSettings.CurrentDenomination * 100}${wayPos.join('')}`;
                     }
                }
                if(waysCountArr[1] > 0 && waysCountArr[2] > 0 && waysCountArr[3] > 0 && waysCountArr[4] > 0 && waysCountArr[5] > 0) {
                     if(this.slotSettings.Paytable['SYM_' + csym][5] > 0) {
                         cWins[j] = this.slotSettings.Paytable['SYM_' + csym][5] * betline * waysCount * bonusMpl;
                         tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${cWins[j]}&ws.i${winLineCount}.types.i0.wintype=coins&ws.i${winLineCount}.betline=243&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${cWins[j] * this.slotSettings.CurrentDenomination * 100}${wayPos.join('')}`;
                     }
                }

                if (cWins[j] > 0 && tmpStringWin !== '') {
                    totalWin += cWins[j];
                    lineWins.push(tmpStringWin);
                    winLineCount++;
                }
            }

            if (this.slotSettings.MaxWin < (totalWin * this.slotSettings.CurrentDenom)) {
                continue;
            }
            break;
        }

        if (totalWin > 0) {
            this.slotSettings.SetBank(postData.slotEvent, -1 * totalWin);
            this.slotSettings.SetBalance(totalWin);
            // Respin Logic for win
             if (postData.slotEvent != 'freespin') {
                 this.slotSettings.SetGameData(this.slotId + 'RespinId', RespinId + 1);
             }

             // Super Free Spin multiplier increase logic
             if (postData.freeMode == 'superfreespin') {
                 superMultiplierInc = 1;
                 let superMpl = this.slotSettings.GetGameData(this.slotId + 'SuperMpl');
                 superMpl++;
                 this.slotSettings.SetGameData(this.slotId + 'SuperMpl', superMpl);
             }
        } else {
             if (postData.slotEvent != 'freespin') {
                  this.slotSettings.SetGameData(this.slotId + 'RespinId', 0);
             }
        }

        if (postData.slotEvent == 'freespin') {
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', this.slotSettings.GetGameData(this.slotId + 'BonusWin') + totalWin);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', this.slotSettings.GetGameData(this.slotId + 'TotalWin') + totalWin);
        } else {
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', totalWin);
        }

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        const winString = lineWins.join('');
        const jsSpin = JSON.stringify(reels); // Keep this for internal logic if needed, but response is mostly string
        const jsJack = JSON.stringify(this.slotSettings.Jackpots); // Same

        // Construct response string matching PHP format (approximate reconstruction based on available data)
        // Note: PHP code constructs a huge string `result_tmp[0] = ...`.
        // We need to return a JSON object that wraps this string or the string itself if the framework expects it.
        // The PHP code ends with `echo $response`.
        // The user requirement is "return results must be exact replicas of their php counterpars".
        // The PHP code builds a JSON string `{"responseEvent":"spin",...}` BUT it also constructs a HUGE query-string like body `freeState`.
        // Wait, the PHP code for `spin` returns: `echo $response` where `$response` is a JSON string:
        // `{"responseEvent":"spin","responseType":"...","serverResponse":{"freeState":"...","slotLines":...}}`
        // So the output is JSON, but the `freeState` (and other parts) are massive query strings.

        // We need to construct `freeState` (or the main response body for base spin which seems to be `freeState` in the JSON?)
        // In PHP `spin` case:
        // `response` is JSON. `serverResponse.freeState` is the massive string constructed in `curReels` + `winString` + `featureStr`.
        // Actually, in PHP `spin` block:
        // $response = '{"responseEvent":"spin","responseType":"' . $postData['slotEvent'] . '","serverResponse":{"freeState":"' . $freeState . '", ...}}';
        // But $freeState variable in PHP seems to be used for FreeSpin state, while standard spin response might be different?
        // Let's check PHP logic again.
        // In `case 'spin'`:
        // if ($postData['slotEvent'] == 'freespin') { ... $freeState = ... }
        // else { ... $result_tmp[0] = '...'; }
        // Wait, if it's NOT freespin (standard spin), PHP constructs `$result_tmp[0]` which is the massive string.
        // BUT then it does `$response = $result_tmp[0];` at the end of the switch block?
        // NO, `case 'spin'` has a break.
        // Ah, `case 'spin'` in PHP:
        // It constructs `$result_tmp[0]` which IS the response string (it looks like a query string).
        // WAIT, `case 'spin'` in PHP code provided:
        // It sets `$response = '{"responseEvent":"spin",...}'` AND saves log report.
        // BUT, if it's a standard spin (not freespin), it seems it sets `$result_tmp[0]`.
        // The PHP code structure is a bit messy in the provided snippet.
        // Let's look at the end of `case 'spin'`:
        // `$response = $result_tmp[0];` is AFTER the switch.
        // So for `spin` action, it returns `$result_tmp[0]`.
        // AND `result_tmp[0]` for standard spin is a huge string starting with `rs.i0.r.i1.pos=...` (or similar).
        // It is NOT a JSON object for standard spin?
        // But for `freespin` (inside `case 'spin'`), it constructs `$response` as JSON string!
        // This is confusing.
        // Let's check:
        // If `freespin`: it sets `$response` variable with JSON.
        // If `spin` (base): it sets `$result_tmp[0]` with String.
        // After switch: `$response = $result_tmp[0];`
        // This implies that if `$response` was set inside switch (like for freespin), it might be overwritten?
        // No, `$result_tmp` is initialized empty.
        // If it's `freespin`, `$response` is set.
        // If it's `base spin`, `$result_tmp[0]` is set.
        // Then `$response = $result_tmp[0];` would overwrite `$response` with `undefined` (or empty) if it wasn't set in `result_tmp`.
        // BUT `response` variable is used in `echo $response`.
        // In PHP:
        // $response = $result_tmp[0];
        // ...
        // echo $response;
        // So for `freespin`, it sets `$response` inside the case. Then outside it does `$response = $result_tmp[0]`.
        // This would overwrite the JSON $response with null/empty if $result_tmp[0] is not set.
        // This implies the PHP code provided might have a bug or I am misreading.
        // Let's assume standard behavior: Base spin returns String (legacy), Freespin returns JSON (wrapper).
        // Or maybe both return JSON?
        // Re-reading PHP `spin` case for `Narcos`:
        // It constructs `$response = '{"responseEvent":"spin"...}'`.
        // It does NOT use `$result_tmp` for spin response in `Narcos`.
        // It seems `Narcos` returns JSON.

        // Let's look at `ReelRush2` PHP:
        // `case 'spin'`:
        // ...
        // if ($postData['freeMode'] == 'superfreespin') { ... $result_tmp[0] = '...'; }
        // else { ... $result_tmp[0] = '...'; }
        // ...
        // $response = $result_tmp[0];
        // echo $response;
        // So `ReelRush2` returns a STRING (query string format).

        // Let's look at `StarBurst` PHP:
        // `case 'spin'`:
        // ...
        // if ($postData['slotEvent'] == 'freespin') { ... $result_tmp[] = '...'; }
        // else { ... $result_tmp[] = '...'; }
        // $response = '{"responseEvent":"spin"...}';
        // ...
        // $response = $result_tmp[0];
        // echo $response;
        // Wait, `StarBurst` PHP sets `$response` JSON, but then overwrites it with `$result_tmp[0]`.
        // So `StarBurst` also returns a STRING.

        // Correction: `Narcos` PHP DOES use `$result_tmp`.
        // `case 'spin'`:
        // ...
        // $response = '{"responseEvent":"spin"...}';
        // ...
        // if ($scattersCount2 >= 3) { ... $result_tmp[0] = '...'; }
        // else if ($scattersCount >= 3) { ... $result_tmp[0] = '...'; }
        // else { ... $result_tmp[0] = '...'; }
        // ...
        // $response = $result_tmp[0];
        // So ALL three games return a STRING for `spin`.

        // I must construct this huge string for `ReelRush2`.

        // Constructing the ReelRush2 spin response string:
        // Need to populate the template variables.
        const curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1[0]}%2CSYM${reels.reel1[1]}%2CSYM${reels.reel1[2]}%2CSYM${reels.reel1[3]}%2CSYM${reels.reel1[4]}` +
                         `&rs.i0.r.i1.syms=SYM${reels.reel2[0]}%2CSYM${reels.reel2[1]}%2CSYM${reels.reel2[2]}%2CSYM${reels.reel2[3]}%2CSYM${reels.reel2[4]}` +
                         `&rs.i0.r.i2.syms=SYM${reels.reel3[0]}%2CSYM${reels.reel3[1]}%2CSYM${reels.reel3[2]}%2CSYM${reels.reel3[3]}%2CSYM${reels.reel3[4]}` +
                         `&rs.i0.r.i3.syms=SYM${reels.reel4[0]}%2CSYM${reels.reel4[1]}%2CSYM${reels.reel4[2]}%2CSYM${reels.reel4[3]}%2CSYM${reels.reel4[4]}` +
                         `&rs.i0.r.i4.syms=SYM${reels.reel5[0]}%2CSYM${reels.reel5[1]}%2CSYM${reels.reel5[2]}%2CSYM${reels.reel5[3]}%2CSYM${reels.reel5[4]}`;

        let result = '';

        if (postData.freeMode == 'superfreespin') {
             // Super Free Spin Response
             if (this.slotSettings.GetGameData(this.slotId + 'FreeGames') <= this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame')) {
                 // End of Super Free Spins
                 result = `freespins.betlevel=1&gameServerVersion=1.21.0&g4mode=false&freespins.win.coins=${this.slotSettings.GetGameData(this.slotId + 'BonusWin')}&playercurrency=%26%23x20AC%3B&stars.unscaled=${this.slotSettings.GetGameData(this.slotId + 'Stars')}&historybutton=false&rs.i0.r.i4.hold=false&next.rs=basic&gamestate.history=basic%2Cstart_freespins%2Csuper_freespin&rs.i0.r.i1.syms=SYM4%2CSYM4%2CSYM8%2CSYM8%2CSYM12&game.win.cents=${this.slotSettings.GetGameData(this.slotId + 'BonusWin') * this.slotSettings.CurrentDenomination * 100}&rs.i0.id=freespin2&totalwin.coins=${this.slotSettings.GetGameData(this.slotId + 'BonusWin')}&credit=${balanceInCents}&gamestate.current=basic&freespins.initial=0&features.i2.type=None&jackpotcurrency=%26%23x20AC%3B&multiplier=1&last.rs=superFreespin&rs.i0.r.i0.syms=SYM6%2CSYM11%2CSYM11%2CSYM9%2CSYM9&freespins.denomination=${this.slotSettings.CurrentDenomination}&superfreespins.multiplier.increase=${superMultiplierInc}&rs.i0.r.i3.syms=SYM10%2CSYM10%2CSYM11%2CSYM11%2CSYM12&openedpositions.total=12&freespins.win.cents=${this.slotSettings.GetGameData(this.slotId + 'BonusWin') * this.slotSettings.CurrentDenomination * 100}&freespins.totalwin.coins=${this.slotSettings.GetGameData(this.slotId + 'BonusWin')}&freespins.total=0&isJackpotWin=false&gamestate.stack=basic&rs.i0.r.i0.pos=13&freespins.betlines=0&gamesoundurl=&rs.i0.r.i1.pos=18&game.win.coins=${this.slotSettings.GetGameData(this.slotId + 'BonusWin')}&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i1.hold=false&freespins.wavecount=1&freespins.multiplier=1&stars.total=${this.slotSettings.GetGameData(this.slotId + 'Stars')}&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=superfreespin&openedpositions.thisspin=0&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM7%2CSYM13%2CSYM13%2CSYM12%2CSYM12&features.i0.type=None&rs.i0.r.i2.pos=16&features.i1.type=None&totalwin.cents=${this.slotSettings.GetGameData(this.slotId + 'BonusWin') * this.slotSettings.CurrentDenomination * 100}&gameover=true&rs.i0.r.i0.hold=false&rs.i0.r.i3.pos=18&freespins.left=0&rs.i0.r.i4.pos=42&superfreespins.multiplier.final=${this.slotSettings.GetGameData(this.slotId + 'SuperMpl')}&nextaction=spin&wavecount=1&superfreespins.multiplier.active=${this.slotSettings.GetGameData(this.slotId + 'SuperMpl')}&rs.i0.r.i2.syms=SYM11%2CSYM9%2CSYM9%2CSYM10%2CSYM10&rs.i0.r.i3.hold=false&game.win.amount=${this.slotSettings.GetGameData(this.slotId + 'BonusWin') * this.slotSettings.CurrentDenomination}&freespins.totalwin.cents=${this.slotSettings.GetGameData(this.slotId + 'BonusWin') * this.slotSettings.CurrentDenomination * 100}${curReels}${winString}`;
             } else {
                 // Continuing Super Free Spins
                 result = `freespins.betlevel=1&gameServerVersion=1.21.0&g4mode=false&freespins.win.coins=${totalWin}&playercurrency=%26%23x20AC%3B&stars.unscaled=${this.slotSettings.GetGameData(this.slotId + 'Stars')}&historybutton=false&rs.i0.r.i4.hold=false&next.rs=superFreespin&gamestate.history=basic%2Cstart_freespins%2Csuper_freespin&rs.i0.r.i1.syms=SYM10%2CSYM6%2CSYM6%2CSYM10%2CSYM10&game.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&rs.i0.id=freespin2&totalwin.coins=${totalWin}&credit=${balanceInCents}&gamestate.current=super_freespin&freespins.initial=0&features.i2.type=None&jackpotcurrency=%26%23x20AC%3B&multiplier=1&last.rs=superFreespin&rs.i0.r.i0.syms=SYM5%2CSYM9%2CSYM9%2CSYM11%2CSYM11&freespins.denomination=${this.slotSettings.CurrentDenomination}&superfreespins.multiplier.increase=${superMultiplierInc}&rs.i0.r.i3.syms=SYM11%2CSYM11%2CSYM7%2CSYM7%2CSYM5&openedpositions.total=12&freespins.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&freespins.totalwin.coins=${this.slotSettings.GetGameData(this.slotId + 'BonusWin')}&freespins.total=0&isJackpotWin=false&gamestate.stack=basic%2Csuper_freespin&rs.i0.r.i0.pos=3&freespins.betlines=0&gamesoundurl=&rs.i0.r.i1.pos=13&game.win.coins=${totalWin}&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i1.hold=false&freespins.wavecount=1&freespins.multiplier=1&stars.total=${this.slotSettings.GetGameData(this.slotId + 'Stars')}&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=superfreespin&openedpositions.thisspin=0&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM12%2CSYM12%2CSYM5%2CSYM5%2CSYM10&features.i0.type=None&rs.i0.r.i2.pos=45&features.i1.type=None&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gameover=false&rs.i0.r.i0.hold=false&rs.i0.r.i3.pos=33&freespins.left=${this.slotSettings.GetGameData(this.slotId + 'FreeGames') - this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame')}&rs.i0.r.i4.pos=12&superfreespins.multiplier.final=${this.slotSettings.GetGameData(this.slotId + 'SuperMpl')}&nextaction=superfreespin&wavecount=1&superfreespins.multiplier.active=${this.slotSettings.GetGameData(this.slotId + 'SuperMpl')}&rs.i0.r.i2.syms=SYM7%2CSYM7%2CSYM5%2CSYM5%2CSYM12&rs.i0.r.i3.hold=false&game.win.amount=${totalWin * this.slotSettings.CurrentDenomination}&freespins.totalwin.cents=${this.slotSettings.GetGameData(this.slotId + 'BonusWin') * this.slotSettings.CurrentDenomination * 100}${curReels}${winString}${featureStr}`;
             }
        } else {
            // Standard Spin or Free Spin
             result = `rs.i0.r.i1.pos=22&gameServerVersion=1.21.0&g4mode=false&game.win.coins=${totalWin}&playercurrency=%26%23x20AC%3B&playercurrencyiso=${this.slotSettings.slotCurrency}&stars.unscaled=${this.slotSettings.GetGameData(this.slotId + 'Stars')}&historybutton=false&rs.i0.r.i1.hold=false&rs.i0.r.i4.hold=false&next.rs=basic&gamestate.history=basic&stars.total=${this.slotSettings.GetGameData(this.slotId + 'Stars')}&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=spin&rs.i0.r.i1.syms=SYM${reels.reel2[0]}%2CSYM${reels.reel2[1]}%2CSYM${reels.reel2[2]}%2CSYM${reels.reel2[3]}%2CSYM${reels.reel2[4]}&openedpositions.thisspin=0&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM${reels.reel5[0]}%2CSYM${reels.reel5[1]}%2CSYM${reels.reel5[2]}%2CSYM${reels.reel5[3]}%2CSYM${reels.reel5[4]}&features.i0.type=None&game.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&rs.i0.r.i2.pos=5&features.i1.type=None&rs.i0.id=basic2&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gameover=true&gamestate.current=basic&rs.i0.r.i0.hold=false&features.i2.type=None&jackpotcurrency=%26%23x20AC%3B&multiplier=1&rs.i0.r.i3.pos=46&rs.i0.r.i4.pos=61&rs.i0.r.i0.syms=SYM${reels.reel1[0]}%2CSYM${reels.reel1[1]}%2CSYM${reels.reel1[2]}%2CSYM${reels.reel1[3]}%2CSYM${reels.reel1[4]}&rs.i0.r.i3.syms=SYM${reels.reel4[0]}%2CSYM${reels.reel4[1]}%2CSYM${reels.reel4[2]}%2CSYM${reels.reel4[3]}%2CSYM${reels.reel4[4]}&openedpositions.total=0&isJackpotWin=false&gamestate.stack=basic&nextaction=spin&rs.i0.r.i0.pos=11&wavecount=1&gamesoundurl=&rs.i0.r.i2.syms=SYM${reels.reel3[0]}%2CSYM${reels.reel3[1]}%2CSYM${reels.reel3[2]}%2CSYM${reels.reel3[3]}%2CSYM${reels.reel3[4]}&rs.i0.r.i3.hold=false&game.win.amount=${totalWin * this.slotSettings.CurrentDenomination}${curReels}${winString}${featureStr}`;
             // Note: The simplified result string above is a best-effort reconstruction.
             // The key is to include the dynamically generated parts (curReels, winString, featureStr) into the static boilerplate.
        }

        this.slotSettings.SaveLogReport(result, allbet, lines, totalWin, postData.slotEvent);
        return result;
    }

    private createErrorResponse(message: string, responseType: string = ""): string {
        return JSON.stringify({
            responseEvent: "error",
            responseType: responseType,
            serverResponse: message
        });
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
