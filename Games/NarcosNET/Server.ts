
import { SlotSettings } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'NarcosNET';

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
        if (postData.action == 'freespin') {
            postData.slotEvent = 'freespin';
            postData.action = 'spin';
        }
        if (postData.action == 'init' || postData.action == 'reloadbalance') {
            postData.action = 'init';
            postData.slotEvent = 'init';
        }
        if (postData.action == 'paytable') {
            postData.slotEvent = 'paytable';
        }
        if (postData.action == 'initfreespin') {
            postData.slotEvent = 'initfreespin';
        }
        if (postData.action == 'respin') {
            postData.slotEvent = 'respin';
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
            case 'initfreespin':
                return this.handleInitFreespinRequest();
            case 'respin':
                return this.handleRespinRequest(postData);
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
        this.slotSettings.SetGameData(this.slotId + 'WalkingWild', []);

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
             curReels = `&rs.i0.r.i0.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
             curReels += `&rs.i0.r.i1.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
             curReels += `&rs.i0.r.i2.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
             curReels += `&rs.i0.r.i3.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
             curReels += `&rs.i0.r.i4.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
        }

        if (this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') < this.slotSettings.GetGameData(this.slotId + 'FreeGames') && this.slotSettings.GetGameData(this.slotId + 'FreeGames') > 0) {
            freeState = 'rs.i4.id=basicwalkingwild&rs.i2.r.i1.hold=false&rs.i1.r.i0.syms=SYM8%2CSYM3%2CSYM7&rs.i2.r.i1.pos=53&gameServerVersion=1.21.0&g4mode=false&freespins.win.coins=0&historybutton=false&rs.i0.r.i4.hold=false&gameEventSetters.enabled=false&next.rs=freespin&gamestate.history=basic%2Cfreespin&rs.i0.r.i14.syms=SYM30&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=0&rs.i0.r.i1.syms=SYM30&rs.i0.r.i5.hold=false&rs.i0.r.i7.pos=0&game.win.cents=300&rs.i4.r.i4.pos=65&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i0.reelset=ALL&rs.i1.r.i3.hold=false&totalwin.coins=60&gamestate.current=freespin&freespins.initial=10&rs.i4.r.i0.pos=2&rs.i0.r.i12.syms=SYM30&jackpotcurrency=%26%23x20AC%3B&rs.i4.r.i0.overlay.i0.row=1&bet.betlines=243&walkingwilds.pos=0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0&rs.i3.r.i1.hold=false&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM30&rs.i0.r.i3.syms=SYM30&rs.i1.r.i1.syms=SYM3%2CSYM9%2CSYM12&rs.i1.r.i1.pos=0&rs.i3.r.i4.pos=0&freespins.win.cents=0&isJackpotWin=false&rs.i0.r.i0.pos=0&rs.i2.r.i3.hold=false&rs.i2.r.i3.pos=49&freespins.betlines=243&rs.i0.r.i9.pos=0&rs.i4.r.i2.attention.i0=1&rs.i0.r.i1.pos=0&rs.i4.r.i4.syms=SYM5%2CSYM0%2CSYM7&rs.i1.r.i3.syms=SYM3%2CSYM9%2CSYM12&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=0&rs.i2.id=freespin&game.win.coins=60&rs.i1.r.i0.hold=false&denomination.last=0.05&rs.i0.r.i5.syms=SYM30&rs.i0.r.i1.hold=false&rs.i0.r.i13.pos=0&rs.i0.r.i13.hold=false&rs.i2.r.i1.syms=SYM12%2CSYM8%2CSYM7&rs.i0.r.i7.hold=false&clientaction=init&rs.i0.r.i8.hold=false&rs.i4.r.i0.hold=false&rs.i0.r.i2.hold=false&rs.i4.r.i3.syms=SYM4%2CSYM10%2CSYM9&casinoID=netent&betlevel.standard=1&rs.i3.r.i2.hold=false&gameover=false&rs.i3.r.i3.pos=60&rs.i0.r.i3.pos=0&rs.i4.r.i0.syms=SYM0%2CSYM7%2CSYM11&rs.i0.r.i11.pos=0&bl.i0.id=243&rs.i0.r.i10.syms=SYM30&rs.i0.r.i13.syms=SYM30&bl.i0.line=0%2F1%2F2%2C0%2F1%2F2%2C0%2F1%2F2%2C0%2F1%2F2%2C0%2F1%2F2&nextaction=freespin&rs.i0.r.i5.pos=0&rs.i4.r.i2.pos=32&rs.i0.r.i2.syms=SYM30&game.win.amount=3.00&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&freespins.totalwin.cents=300&denomination.all=1%2C2%2C5%2C10%2C20%2C50%2C100%2C200&freespins.betlevel=1&rs.i0.r.i6.pos=0&rs.i4.r.i3.pos=51&playercurrency=%26%23x20AC%3B&rs.i0.r.i10.hold=false&rs.i2.r.i0.pos=51&rs.i4.r.i4.hold=false&rs.i4.r.i0.overlay.i0.with=SYM1&rs.i0.r.i8.syms=SYM30&rs.i2.r.i4.syms=SYM6%2CSYM10%2CSYM9&betlevel.last=1&rs.i3.r.i2.syms=SYM4%2CSYM10%2CSYM9&rs.i4.r.i3.hold=false&rs.i0.id=respin&credit=' . $balanceInCents . '&rs.i1.r.i4.pos=0&rs.i0.r.i7.syms=SYM30&denomination.standard=5&rs.i0.r.i6.syms=SYM30&rs.i3.id=basic&rs.i4.r.i0.overlay.i0.pos=3&rs.i0.r.i12.hold=false&multiplier=1&rs.i2.r.i2.pos=25&rs.i0.r.i9.syms=SYM30&last.rs=freespin&freespins.denomination=5.000&rs.i0.r.i8.pos=0&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&freespins.totalwin.coins=60&freespins.total=10&gamestate.stack=basic%2Cfreespin&rs.i1.r.i4.syms=SYM8%2CSYM3%2CSYM7&rs.i4.r.i0.attention.i0=0&rs.i2.r.i2.syms=SYM10%2CSYM11%2CSYM12&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i1.r.i2.pos=0&rs.i2.r.i4.overlay.i0.row=0&rs.i3.r.i3.syms=SYM1%2CSYM10%2CSYM2&rs.i4.r.i4.attention.i0=1&bet.betlevel=1&rs.i3.r.i4.hold=false&rs.i4.r.i2.hold=false&rs.i0.r.i14.pos=0&rs.i4.r.i1.syms=SYM12%2CSYM5%2CSYM9&rs.i2.r.i4.pos=42&rs.i3.r.i0.syms=SYM11%2CSYM7%2CSYM10&playercurrencyiso=' + this.slotSettings.slotCurrency + '&rs.i0.r.i11.syms=SYM30&rs.i4.r.i1.hold=false&freespins.wavecount=1&rs.i3.r.i2.pos=131&rs.i3.r.i3.hold=false&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&rs.i0.r.i4.syms=SYM30&rs.i0.r.i2.pos=0&rs.i1.r.i2.syms=SYM8%2CSYM3%2CSYM7&rs.i1.r.i0.pos=0&totalwin.cents=300&bl.i0.coins=20&rs.i0.r.i12.pos=0&rs.i2.r.i0.syms=SYM5%2CSYM8%2CSYM11&rs.i0.r.i0.hold=false&rs.i2.r.i3.syms=SYM10%2CSYM8%2CSYM4&restore=true&rs.i1.id=freespinwalkingwild&rs.i3.r.i4.syms=SYM3%2CSYM10%2CSYM0&rs.i0.r.i6.hold=false&rs.i3.r.i1.syms=SYM6%2CSYM12%2CSYM4&rs.i1.r.i4.hold=false&freespins.left=7&rs.i0.r.i4.pos=0&rs.i0.r.i9.hold=false&rs.i4.r.i1.pos=17&rs.i4.r.i2.syms=SYM11%2CSYM0%2CSYM6&bl.standard=243&rs.i0.r.i10.pos=0&rs.i0.r.i14.hold=false&rs.i0.r.i11.hold=false&rs.i3.r.i0.pos=0&rs.i3.r.i0.hold=false&rs.i4.nearwin=4&rs.i2.r.i2.hold=false&wavecount=1&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&bet.denomination=5';
        }

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        const result = `rs.i4.id=basic&rs.i2.r.i1.hold=false&rs.i2.r.i13.pos=0&rs.i1.r.i0.syms=SYM12%2CSYM2%2CSYM9&gameServerVersion=1.21.0&g4mode=false&historybutton=false&rs.i0.r.i4.hold=false&gameEventSetters.enabled=false&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=0&rs.i0.r.i1.syms=SYM6%2CSYM12%2CSYM8&rs.i2.r.i1.pos=0&game.win.cents=0&rs.i4.r.i4.pos=0&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i0.reelset=ALL&rs.i1.r.i3.hold=false&rs.i2.r.i11.pos=0&totalwin.coins=0&gamestate.current=basic&rs.i4.r.i0.pos=0&jackpotcurrency=%26%23x20AC%3B&walkingwilds.pos=0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0&rs.i3.r.i1.hold=false&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM3%2CSYM11%2CSYM12&rs.i0.r.i3.syms=SYM6%2CSYM12%2CSYM8&rs.i1.r.i1.syms=SYM12%2CSYM7%2CSYM2&rs.i1.r.i1.pos=0&rs.i2.r.i10.hold=false&rs.i3.r.i4.pos=0&rs.i2.r.i8.syms=SYM30&isJackpotWin=false&rs.i0.r.i0.pos=0&rs.i2.r.i3.hold=false&rs.i2.r.i3.pos=0&rs.i0.r.i1.pos=0&rs.i4.r.i4.syms=SYM3%2CSYM10%2CSYM0&rs.i1.r.i3.syms=SYM3%2CSYM9%2CSYM11&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=0&rs.i2.id=respin&game.win.coins=0&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&rs.i2.r.i5.pos=0&rs.i2.r.i7.syms=SYM30&rs.i2.r.i1.syms=SYM30&clientaction=init&rs.i4.r.i0.hold=false&rs.i0.r.i2.hold=false&rs.i4.r.i3.syms=SYM1%2CSYM10%2CSYM2&casinoID=netent&betlevel.standard=1&rs.i3.r.i2.hold=false&rs.i2.r.i10.syms=SYM30&gameover=true&rs.i3.r.i3.pos=0&rs.i2.r.i7.pos=0&rs.i0.r.i3.pos=0&rs.i4.r.i0.syms=SYM11%2CSYM7%2CSYM10&bl.i0.id=243&bl.i0.line=0%2F1%2F2%2C0%2F1%2F2%2C0%2F1%2F2%2C0%2F1%2F2%2C0%2F1%2F2&nextaction=spin&rs.i2.r.i14.pos=0&rs.i2.r.i12.hold=false&rs.i4.r.i2.pos=131&rs.i0.r.i2.syms=SYM3%2CSYM11%2CSYM12&game.win.amount=0&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&rs.i2.r.i12.syms=SYM30&denomination.all=${this.slotSettings.Denominations.map(d => d * 100).join('%2C')}&rs.i2.r.i9.pos=0&rs.i4.r.i3.pos=60&playercurrency=%26%23x20AC%3B&rs.i2.r.i7.hold=false&rs.i2.r.i0.pos=0&rs.i4.r.i4.hold=false&rs.i2.r.i4.syms=SYM30&rs.i3.r.i2.syms=SYM8%2CSYM3%2CSYM7&rs.i2.r.i12.pos=0&rs.i4.r.i3.hold=false&rs.i2.r.i13.syms=SYM30&rs.i0.id=freespin&credit=${balanceInCents}&rs.i1.r.i4.pos=0&rs.i2.r.i14.hold=false&denomination.standard=${this.slotSettings.CurrentDenomination * 100}&rs.i2.r.i13.hold=false&rs.i3.id=freespinwalkingwild&multiplier=1&rs.i2.r.i2.pos=0&rs.i2.r.i10.pos=0&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&rs.i2.r.i5.syms=SYM30&rs.i2.r.i6.hold=false&rs.i1.r.i4.syms=SYM12%2CSYM10%2CSYM0&rs.i2.r.i2.syms=SYM30&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i1.r.i2.pos=0&rs.i3.r.i3.syms=SYM3%2CSYM9%2CSYM12&rs.i3.r.i4.hold=false&rs.i4.r.i2.hold=false&nearwinallowed=true&rs.i2.r.i9.hold=false&rs.i4.r.i1.syms=SYM6%2CSYM12%2CSYM4&rs.i2.r.i4.pos=0&rs.i3.r.i0.syms=SYM8%2CSYM3%2CSYM7&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i4.r.i1.hold=false&rs.i3.r.i2.pos=0&rs.i3.r.i3.hold=false&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM3%2CSYM11%2CSYM12&rs.i2.r.i11.hold=false&rs.i0.r.i2.pos=0&rs.i1.r.i2.syms=SYM12%2CSYM11%2CSYM0&rs.i2.r.i6.pos=0&rs.i1.r.i0.pos=0&totalwin.cents=0&bl.i0.coins=20&rs.i2.r.i0.syms=SYM30&rs.i0.r.i0.hold=false&rs.i2.r.i3.syms=SYM30&restore=false&rs.i1.id=basicwalkingwild&rs.i2.r.i6.syms=SYM30&rs.i3.r.i4.syms=SYM8%2CSYM3%2CSYM7&rs.i3.r.i1.syms=SYM3%2CSYM9%2CSYM12&rs.i1.r.i4.hold=false&rs.i2.r.i8.hold=false&rs.i0.r.i4.pos=0&rs.i2.r.i9.syms=SYM30&rs.i4.r.i1.pos=0&rs.i4.r.i2.syms=SYM4%2CSYM10%2CSYM9&rs.i2.r.i14.syms=SYM30&rs.i2.r.i5.hold=false&bl.standard=243&rs.i3.r.i0.pos=0&rs.i2.r.i8.pos=0&rs.i3.r.i0.hold=false&rs.i2.r.i2.hold=false&rs.i2.r.i11.syms=SYM30&wavecount=1&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false${freeState}${curReels}`;
        return result;
    }

    private handlePaytableRequest(): string {
        return 'pt.i0.comp.i19.symbol=SYM8&pt.i0.comp.i15.type=betline&pt.i0.comp.i23.freespins=0&pt.i0.comp.i32.type=betline&pt.i0.comp.i35.multi=0&pt.i0.comp.i29.type=betline&pt.i0.comp.i4.multi=80&pt.i0.comp.i15.symbol=SYM7&pt.i0.comp.i17.symbol=SYM7&pt.i0.comp.i5.freespins=0&pt.i1.comp.i14.multi=250&pt.i0.comp.i22.multi=15&pt.i0.comp.i23.n=5&pt.i1.comp.i19.type=betline&pt.i0.comp.i11.symbol=SYM5&pt.i0.comp.i13.symbol=SYM6&pt.i1.comp.i8.type=betline&pt.i1.comp.i4.n=4&pt.i1.comp.i27.multi=5&pt.i0.comp.i15.multi=10&pt.i1.comp.i27.symbol=SYM11&bl.i0.reelset=ALL&pt.i0.comp.i16.freespins=0&pt.i0.comp.i28.multi=10&pt.i1.comp.i6.freespins=0&pt.i1.comp.i29.symbol=SYM11&pt.i1.comp.i29.freespins=0&pt.i1.comp.i22.n=4&pt.i1.comp.i30.symbol=SYM12&pt.i1.comp.i3.multi=20&pt.i0.comp.i11.n=5&pt.i0.comp.i4.freespins=0&pt.i1.comp.i23.symbol=SYM9&pt.i1.comp.i25.symbol=SYM10&pt.i0.comp.i30.freespins=0&pt.i1.comp.i24.type=betline&pt.i0.comp.i19.n=4&pt.i0.id=basic&pt.i0.comp.i1.type=betline&pt.i0.comp.i34.n=4&pt.i1.comp.i10.type=betline&pt.i0.comp.i34.type=scatter&pt.i0.comp.i2.symbol=SYM1&pt.i0.comp.i4.symbol=SYM3&pt.i1.comp.i5.freespins=0&pt.i0.comp.i20.type=betline&pt.i1.comp.i8.symbol=SYM4&pt.i1.comp.i19.n=4&pt.i0.comp.i17.freespins=0&pt.i0.comp.i6.symbol=SYM4&pt.i0.comp.i8.symbol=SYM4&pt.i0.comp.i0.symbol=SYM1&pt.i1.comp.i11.n=5&pt.i0.comp.i5.n=5&pt.i1.comp.i2.symbol=SYM1&pt.i0.comp.i3.type=betline&pt.i0.comp.i3.freespins=0&pt.i0.comp.i10.multi=60&pt.i1.id=freespin&pt.i1.comp.i19.multi=30&pt.i1.comp.i6.symbol=SYM4&pt.i0.comp.i27.multi=5&pt.i0.comp.i9.multi=15&pt.i0.comp.i22.symbol=SYM9&pt.i0.comp.i26.symbol=SYM10&pt.i1.comp.i19.freespins=0&pt.i0.comp.i24.n=3&pt.i0.comp.i14.freespins=0&pt.i0.comp.i21.freespins=0&clientaction=paytable&pt.i1.comp.i27.freespins=0&pt.i1.comp.i4.freespins=0&pt.i1.comp.i12.type=betline&pt.i1.comp.i5.n=5&pt.i1.comp.i8.multi=300&pt.i1.comp.i21.symbol=SYM9&pt.i1.comp.i23.n=5&pt.i0.comp.i22.type=betline&pt.i0.comp.i24.freespins=0&pt.i1.comp.i32.symbol=SYM12&pt.i0.comp.i16.multi=30&pt.i0.comp.i21.multi=5&pt.i1.comp.i13.multi=60&pt.i0.comp.i12.n=3&pt.i0.comp.i35.n=5&pt.i0.comp.i13.type=betline&pt.i1.comp.i9.multi=15&bl.i0.line=0%2F1%2F2%2C0%2F1%2F2%2C0%2F1%2F2%2C0%2F1%2F2%2C0%2F1%2F2&pt.i0.comp.i19.type=betline&pt.i0.comp.i6.freespins=0&pt.i1.comp.i2.multi=300&pt.i1.comp.i7.freespins=0&pt.i0.comp.i31.freespins=0&pt.i0.comp.i3.multi=20&pt.i0.comp.i6.n=3&pt.i1.comp.i22.type=betline&pt.i1.comp.i12.n=3&pt.i1.comp.i3.type=betline&pt.i0.comp.i21.n=3&pt.i1.comp.i10.freespins=0&pt.i1.comp.i28.type=betline&pt.i0.comp.i34.symbol=SYM0&pt.i1.comp.i6.n=3&pt.i0.comp.i29.n=5&pt.i1.comp.i31.type=betline&pt.i1.comp.i20.multi=120&pt.i0.comp.i27.freespins=0&pt.i0.comp.i34.freespins=10&pt.i1.comp.i24.n=3&pt.i0.comp.i10.type=betline&pt.i0.comp.i35.freespins=10&pt.i1.comp.i11.symbol=SYM5&pt.i1.comp.i27.type=betline&pt.i1.comp.i2.type=betline&pt.i0.comp.i2.freespins=0&pt.i0.comp.i5.multi=300&pt.i0.comp.i7.n=4&pt.i0.comp.i32.n=5&pt.i1.comp.i1.freespins=0&pt.i0.comp.i11.multi=250&pt.i1.comp.i14.symbol=SYM6&pt.i1.comp.i16.symbol=SYM7&pt.i1.comp.i23.multi=60&pt.i0.comp.i7.type=betline&pt.i1.comp.i4.type=betline&pt.i0.comp.i17.n=5&pt.i1.comp.i18.multi=10&pt.i0.comp.i29.multi=40&pt.i1.comp.i13.n=4&pt.i0.comp.i8.freespins=0&pt.i1.comp.i26.type=betline&pt.i1.comp.i4.multi=80&pt.i0.comp.i8.multi=300&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&pt.i0.comp.i34.multi=0&pt.i0.comp.i1.freespins=0&pt.i0.comp.i12.type=betline&pt.i0.comp.i14.multi=250&pt.i1.comp.i7.multi=80&pt.i0.comp.i22.n=4&pt.i0.comp.i28.symbol=SYM11&pt.i1.comp.i17.type=betline&pt.i1.comp.i11.type=betline&pt.i0.comp.i6.multi=20&pt.i1.comp.i0.symbol=SYM1&playercurrencyiso=' + this.slotSettings.slotCurrency + '&pt.i1.comp.i7.n=4&pt.i1.comp.i5.multi=300&pt.i1.comp.i5.symbol=SYM3&pt.i0.comp.i18.type=betline&pt.i0.comp.i23.symbol=SYM9&pt.i0.comp.i21.type=betline&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&pt.i1.comp.i25.n=4&pt.i0.comp.i8.type=betline&pt.i0.comp.i7.freespins=0&pt.i1.comp.i15.multi=10&pt.i0.comp.i2.type=betline&pt.i0.comp.i13.multi=60&pt.i1.comp.i20.type=betline&pt.i0.comp.i17.type=betline&pt.i0.comp.i30.type=betline&pt.i1.comp.i22.symbol=SYM9&pt.i1.comp.i30.freespins=0&pt.i1.comp.i22.multi=15&bl.i0.coins=20&pt.i0.comp.i8.n=5&pt.i0.comp.i10.n=4&pt.i0.comp.i33.n=3&pt.i1.comp.i6.multi=20&pt.i1.comp.i22.freespins=0&pt.i0.comp.i11.type=betline&pt.i1.comp.i19.symbol=SYM8&pt.i0.comp.i18.n=3&pt.i0.comp.i22.freespins=0&pt.i0.comp.i20.symbol=SYM8&pt.i0.comp.i15.freespins=0&pt.i1.comp.i14.n=5&pt.i1.comp.i16.multi=30&pt.i0.comp.i31.symbol=SYM12&pt.i1.comp.i15.freespins=0&pt.i0.comp.i27.type=betline&pt.i1.comp.i28.freespins=0&pt.i0.comp.i28.freespins=0&pt.i0.comp.i0.n=3&pt.i0.comp.i7.symbol=SYM4&pt.i1.comp.i21.multi=5&pt.i1.comp.i30.type=betline&pt.i1.comp.i0.freespins=0&pt.i0.comp.i0.type=betline&pt.i1.comp.i0.multi=20&gameServerVersion=1.21.0&g4mode=false&pt.i1.comp.i8.n=5&pt.i0.comp.i25.multi=15&historybutton=false&pt.i0.comp.i16.symbol=SYM7&pt.i1.comp.i21.freespins=0&pt.i0.comp.i1.multi=80&pt.i0.comp.i27.n=3&pt.i0.comp.i18.symbol=SYM8&pt.i1.comp.i9.type=betline&pt.i0.comp.i12.multi=15&pt.i0.comp.i32.multi=40&pt.i1.comp.i24.multi=5&pt.i1.comp.i14.freespins=0&pt.i1.comp.i23.type=betline&pt.i1.comp.i26.n=5&pt.i0.comp.i12.symbol=SYM6&pt.i0.comp.i14.symbol=SYM6&pt.i1.comp.i13.freespins=0&pt.i1.comp.i28.symbol=SYM11&pt.i0.comp.i14.type=betline&pt.i1.comp.i17.multi=120&pt.i0.comp.i18.multi=10&pt.i1.comp.i0.n=3&pt.i1.comp.i26.symbol=SYM10&pt.i0.comp.i33.type=scatter&pt.i1.comp.i31.symbol=SYM12&pt.i0.comp.i7.multi=80&pt.i0.comp.i9.n=3&pt.i0.comp.i30.n=3&pt.i1.comp.i21.type=betline&jackpotcurrency=%26%23x20AC%3B&pt.i0.comp.i28.type=betline&pt.i1.comp.i31.multi=10&pt.i1.comp.i18.type=betline&pt.i0.comp.i10.symbol=SYM5&pt.i0.comp.i15.n=3&pt.i0.comp.i21.symbol=SYM9&pt.i0.comp.i31.type=betline&pt.i1.comp.i15.n=3&isJackpotWin=false&pt.i1.comp.i20.freespins=0&pt.i1.comp.i7.type=betline&pt.i1.comp.i11.multi=250&pt.i1.comp.i30.n=3&pt.i0.comp.i1.n=4&pt.i0.comp.i10.freespins=0&pt.i0.comp.i20.multi=120&pt.i0.comp.i20.n=5&pt.i0.comp.i29.symbol=SYM11&pt.i1.comp.i3.symbol=SYM3&pt.i0.comp.i17.multi=120&pt.i1.comp.i23.freespins=0&pt.i1.comp.i25.type=betline&pt.i1.comp.i9.n=3&pt.i0.comp.i25.symbol=SYM10&pt.i0.comp.i26.type=betline&pt.i0.comp.i28.n=4&pt.i0.comp.i9.type=betline&pt.i0.comp.i2.multi=300&pt.i1.comp.i27.n=3&pt.i0.comp.i0.freespins=0&pt.i1.comp.i16.type=betline&pt.i1.comp.i25.multi=15&pt.i0.comp.i33.multi=0&pt.i1.comp.i16.freespins=0&pt.i1.comp.i20.symbol=SYM8&pt.i1.comp.i12.multi=15&pt.i0.comp.i29.freespins=0&pt.i1.comp.i1.n=4&pt.i1.comp.i5.type=betline&pt.i1.comp.i11.freespins=0&pt.i1.comp.i24.symbol=SYM10&pt.i0.comp.i31.n=4&pt.i0.comp.i9.symbol=SYM5&pt.i1.comp.i13.symbol=SYM6&pt.i1.comp.i17.symbol=SYM7&pt.i0.comp.i16.n=4&bl.i0.id=243&pt.i0.comp.i16.type=betline&pt.i1.comp.i16.n=4&pt.i0.comp.i5.symbol=SYM3&pt.i1.comp.i7.symbol=SYM4&pt.i0.comp.i2.n=5&pt.i0.comp.i35.type=scatter&pt.i0.comp.i1.symbol=SYM1&pt.i1.comp.i31.n=4&pt.i1.comp.i31.freespins=0&pt.i0.comp.i19.freespins=0&pt.i1.comp.i14.type=betline&pt.i0.comp.i6.type=betline&pt.i1.comp.i9.freespins=0&pt.i1.comp.i2.freespins=0&playercurrency=%26%23x20AC%3B&pt.i0.comp.i35.symbol=SYM0&pt.i1.comp.i25.freespins=0&pt.i0.comp.i33.symbol=SYM0&pt.i1.comp.i30.multi=5&pt.i0.comp.i25.n=4&pt.i1.comp.i10.multi=60&pt.i1.comp.i10.symbol=SYM5&pt.i1.comp.i28.n=4&pt.i1.comp.i32.freespins=0&pt.i0.comp.i9.freespins=0&pt.i1.comp.i2.n=5&pt.i1.comp.i20.n=5&credit=500000&pt.i0.comp.i5.type=betline&pt.i1.comp.i24.freespins=0&pt.i0.comp.i11.freespins=0&pt.i0.comp.i26.multi=60&pt.i0.comp.i25.type=betline&pt.i1.comp.i32.type=betline&pt.i1.comp.i18.symbol=SYM8&pt.i0.comp.i31.multi=10&pt.i1.comp.i12.symbol=SYM6&pt.i0.comp.i4.type=betline&pt.i0.comp.i13.freespins=0&pt.i1.comp.i15.type=betline&pt.i1.comp.i26.freespins=0&pt.i0.comp.i26.freespins=0&pt.i1.comp.i13.type=betline&pt.i1.comp.i1.multi=80&pt.i1.comp.i1.type=betline&pt.i1.comp.i8.freespins=0&pt.i0.comp.i13.n=4&pt.i0.comp.i20.freespins=0&pt.i0.comp.i33.freespins=10&pt.i1.comp.i17.n=5&pt.i0.comp.i23.type=betline&pt.i1.comp.i29.type=betline&pt.i0.comp.i30.symbol=SYM12&pt.i0.comp.i32.symbol=SYM12&pt.i1.comp.i32.n=5&pt.i0.comp.i3.n=3&pt.i1.comp.i17.freespins=0&pt.i1.comp.i26.multi=60&pt.i1.comp.i32.multi=40&pt.i1.comp.i6.type=betline&pt.i1.comp.i0.type=betline&pt.i1.comp.i1.symbol=SYM1&pt.i1.comp.i29.multi=40&pt.i0.comp.i25.freespins=0&pt.i1.comp.i4.symbol=SYM3&pt.i0.comp.i24.symbol=SYM10&pt.i0.comp.i26.n=5&pt.i0.comp.i27.symbol=SYM11&pt.i0.comp.i32.freespins=0&pt.i1.comp.i29.n=5&pt.i0.comp.i23.multi=60&pt.i1.comp.i3.n=3&pt.i0.comp.i30.multi=5&pt.i1.comp.i21.n=3&pt.i1.comp.i28.multi=10&pt.i0.comp.i18.freespins=0&pt.i1.comp.i15.symbol=SYM7&pt.i1.comp.i18.freespins=0&pt.i1.comp.i3.freespins=0&pt.i0.comp.i14.n=5&pt.i0.comp.i0.multi=20&pt.i1.comp.i9.symbol=SYM5&pt.i0.comp.i19.multi=30&pt.i0.comp.i3.symbol=SYM3&pt.i0.comp.i24.type=betline&pt.i1.comp.i18.n=3&pt.i1.comp.i12.freespins=0&pt.i0.comp.i12.freespins=0&pt.i0.comp.i4.n=4&pt.i1.comp.i10.n=4&pt.i0.comp.i24.multi=5';
    }

    private handleInitFreespinRequest(): string {
         const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
         return `rs.i4.id=basicwalkingwild&rs.i2.r.i1.hold=false&rs.i1.r.i0.syms=SYM8%2CSYM3%2CSYM7&gameServerVersion=1.21.0&g4mode=false&freespins.win.coins=0&historybutton=false&rs.i0.r.i4.hold=false&next.rs=freespin&gamestate.history=basic&rs.i0.r.i14.syms=SYM30&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=0&rs.i0.r.i1.syms=SYM30&rs.i0.r.i5.hold=false&rs.i0.r.i7.pos=0&rs.i2.r.i1.pos=0&game.win.cents=0&rs.i4.r.i4.pos=65&rs.i1.r.i3.hold=false&totalwin.coins=0&gamestate.current=freespin&freespins.initial=10&rs.i4.r.i0.pos=2&rs.i0.r.i12.syms=SYM30&jackpotcurrency=%26%23x20AC%3B&rs.i4.r.i0.overlay.i0.row=1&bet.betlines=243&rs.i3.r.i1.hold=false&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM30&rs.i0.r.i3.syms=SYM30&rs.i1.r.i1.syms=SYM3%2CSYM9%2CSYM12&rs.i1.r.i1.pos=0&rs.i3.r.i4.pos=0&freespins.win.cents=0&isJackpotWin=false&rs.i0.r.i0.pos=0&rs.i2.r.i3.hold=false&rs.i2.r.i3.pos=0&freespins.betlines=243&rs.i0.r.i9.pos=0&rs.i4.r.i2.attention.i0=1&rs.i0.r.i1.pos=0&rs.i4.r.i4.syms=SYM5%2CSYM0%2CSYM7&rs.i1.r.i3.syms=SYM3%2CSYM9%2CSYM12&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=0&rs.i2.id=freespin&game.win.coins=0&rs.i1.r.i0.hold=false&rs.i0.r.i5.syms=SYM30&rs.i0.r.i1.hold=false&rs.i0.r.i13.pos=0&rs.i0.r.i13.hold=false&rs.i2.r.i1.syms=SYM6%2CSYM12%2CSYM8&rs.i0.r.i7.hold=false&clientaction=initfreespin&rs.i0.r.i8.hold=false&rs.i4.r.i0.hold=false&rs.i0.r.i2.hold=false&rs.i4.r.i3.syms=SYM4%2CSYM10%2CSYM9&rs.i3.r.i2.hold=false&gameover=false&rs.i3.r.i3.pos=60&rs.i0.r.i3.pos=0&rs.i4.r.i0.syms=SYM0%2CSYM7%2CSYM11&rs.i0.r.i11.pos=0&rs.i0.r.i10.syms=SYM30&rs.i0.r.i13.syms=SYM30&nextaction=freespin&rs.i0.r.i5.pos=0&rs.i4.r.i2.pos=32&rs.i0.r.i2.syms=SYM30&game.win.amount=0.00&freespins.totalwin.cents=0&freespins.betlevel=1&rs.i0.r.i6.pos=0&rs.i4.r.i3.pos=51&playercurrency=%26%23x20AC%3B&rs.i0.r.i10.hold=false&rs.i2.r.i0.pos=0&rs.i4.r.i4.hold=false&rs.i4.r.i0.overlay.i0.with=SYM1&rs.i0.r.i8.syms=SYM30&rs.i2.r.i4.syms=SYM3%2CSYM11%2CSYM12&rs.i3.r.i2.syms=SYM4%2CSYM10%2CSYM9&rs.i4.r.i3.hold=false&rs.i0.id=respin&credit=${balanceInCents}&rs.i1.r.i4.pos=0&rs.i0.r.i7.syms=SYM30&rs.i0.r.i6.syms=SYM30&rs.i3.id=basic&rs.i4.r.i0.overlay.i0.pos=3&rs.i0.r.i12.hold=false&multiplier=1&rs.i2.r.i2.pos=0&rs.i0.r.i9.syms=SYM30&freespins.denomination=5.000&rs.i0.r.i8.pos=0&freespins.totalwin.coins=0&freespins.total=10&gamestate.stack=basic%2Cfreespin&rs.i1.r.i4.syms=SYM8%2CSYM3%2CSYM7&rs.i4.r.i0.attention.i0=0&rs.i2.r.i2.syms=SYM3%2CSYM11%2CSYM12&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i1.r.i2.pos=0&rs.i3.r.i3.syms=SYM1%2CSYM10%2CSYM2&rs.i4.r.i4.attention.i0=1&bet.betlevel=1&rs.i3.r.i4.hold=false&rs.i4.r.i2.hold=false&rs.i0.r.i14.pos=0&rs.i4.r.i1.syms=SYM12%2CSYM5%2CSYM9&rs.i2.r.i4.pos=0&rs.i3.r.i0.syms=SYM11%2CSYM7%2CSYM10&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i11.syms=SYM30&rs.i4.r.i1.hold=false&freespins.wavecount=1&rs.i3.r.i2.pos=131&rs.i3.r.i3.hold=false&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM30&rs.i0.r.i2.pos=0&rs.i1.r.i2.syms=SYM8%2CSYM3%2CSYM7&rs.i1.r.i0.pos=0&totalwin.cents=0&rs.i0.r.i12.pos=0&rs.i2.r.i0.syms=SYM3%2CSYM11%2CSYM12&rs.i0.r.i0.hold=false&rs.i2.r.i3.syms=SYM6%2CSYM12%2CSYM8&rs.i1.id=freespinwalkingwild&rs.i3.r.i4.syms=SYM3%2CSYM10%2CSYM0&rs.i0.r.i6.hold=false&rs.i3.r.i1.syms=SYM6%2CSYM12%2CSYM4&rs.i1.r.i4.hold=false&freespins.left=10&rs.i0.r.i4.pos=0&rs.i0.r.i9.hold=false&rs.i4.r.i1.pos=17&rs.i4.r.i2.syms=SYM11%2CSYM0%2CSYM6&rs.i0.r.i10.pos=0&rs.i0.r.i14.hold=false&rs.i0.r.i11.hold=false&rs.i3.r.i0.pos=0&rs.i3.r.i0.hold=false&rs.i4.nearwin=4&rs.i2.r.i2.hold=false&wavecount=1&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&bet.denomination=5`;
    }

    private handleRespinRequest(postData: any): string {
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        let ClusterSpinCount = this.slotSettings.GetGameData(this.slotId + 'ClusterSpinCount');
        const clusterAllWinOld = this.slotSettings.GetGameData(this.slotId + 'clusterAllWin') || 0;
        let clusterAllWin = clusterAllWinOld;
        let clusterSymAllWins = this.slotSettings.GetGameData(this.slotId + 'clusterSymAllWins') || [];
        const allbet = this.slotSettings.GetGameData(this.slotId + 'AllBet') || 20;
        let clusterSymWinsArr = this.slotSettings.GetGameData(this.slotId + 'clusterSymWinsArr');

        if (clusterSymWinsArr === undefined) {
            // Initialize random multipliers for cluster positions if not present
            clusterSymWinsArr = [];
            for (let r = 0; r <= 6; r++) { // 1-based index 1-5 used generally, safely allocate 6
                clusterSymWinsArr[r] = [];
            }
        }

        // Default or reset spin count
        if (ClusterSpinCount === undefined || ClusterSpinCount <= 0) ClusterSpinCount = 3;

        this.slotSettings.SetBank(postData.slotEvent, clusterAllWin);
        this.slotSettings.SetBalance(-1 * clusterAllWin);
        const bank = this.slotSettings.GetBank(postData.slotEvent);

        let curReels = '';
        let clusterSymStr = '';
        let reels_c: any;
        let holds = '';

        // Respin Simulation Loop (500 attempts)
        for (let bLoop = 0; bLoop <= 500; bLoop++) {
            reels_c = this.slotSettings.GetGameData(this.slotId + 'clusterReels');
            // If reels_c is not initialized, create a blank one or use existing structure?
            // Assuming it was initialized when Respin started.
            // If undefined, initialize it with blanks or starting state?
            if (!reels_c) {
                reels_c = {};
                for (let r = 1; r <= 5; r++) {
                    reels_c['reel' + r] = ['30', '30', '30']; // 30 is blank
                }
            }

            clusterSymStr = '';
            clusterAllWin = 0;
            curReels = '';

            // Generate new symbols for this step
            // In PHP: foreach reel, if position != '2c' and != '2', generate new random symbol
            // '2' = Locked Up, '2c' = Golden/Cluster Locked Up
            // Symbols: 30=Blank, 2=LockedUp, 2c=Golden
            // PHP uses a specific $reelStrips array for respin.
            // Simplified here: Random chance for '2' (LockedUp) or '30' (Blank)
            // 2c is evolved from 2 in GetCluster

            // Temporary reels for this iteration
            const tempReels: any = {};
            for(let r=1; r<=5; r++) {
                tempReels['reel'+r] = [...reels_c['reel'+r]]; // Copy
                for(let p=0; p<=2; p++) {
                    if (tempReels['reel' + r][p] != '2c' && tempReels['reel' + r][p] != '2') {
                        // Generate new symbol: predominantly 30, small chance of 2
                        const rnd = this.randomInt(0, 100);
                        if (rnd < 15) { // 15% chance of Locked Up symbol
                            tempReels['reel' + r][p] = '2';
                        } else {
                            tempReels['reel' + r][p] = '30';
                        }
                    }
                }
            }

            // Check Clusters (evolve 2 -> 2c)
            // Run GetCluster multiple times to propagate connections
            let processedReels = JSON.parse(JSON.stringify(tempReels)); // Deep copy
            processedReels = this.slotSettings.GetCluster(processedReels);
            processedReels = this.slotSettings.GetCluster(processedReels);
            processedReels = this.slotSettings.GetCluster(processedReels);
            processedReels = this.slotSettings.GetCluster(processedReels);

            let symcnt = 0;
            let symcnt0 = 0;
            holds = '';

            // Calculate Wins and Strings
            for (let r = 1; r <= 5; r++) {
                for (let p = 0; p <= 2; p++) {
                    const sym = processedReels['reel' + r][p];

                    if (sym == '2c' || sym == '2') {
                        holds += `&rs.i0.r.i${symcnt0}.hold=true`;
                    } else {
                        holds += `&rs.i0.r.i${symcnt0}.hold=false`;
                    }

                    if (sym == '2c') {
                        // Golden Locked Up / Cluster Match
                        // Calculate Win Value
                        let cwin = 0;
                        if (clusterSymWinsArr[r][p] === undefined) {
                            // Assign random multiplier if new
                            const mults = [1, 2, 3, 4, 5, 1, 2, 3, 1, 2];
                            const m = mults[this.randomInt(0, mults.length - 1)];
                            clusterSymWinsArr[r][p] = m;
                        }

                        if (clusterSymAllWins[symcnt] === undefined) {
                            cwin = clusterSymWinsArr[r][p] * allbet;
                            clusterAllWin += cwin;
                            clusterSymAllWins[symcnt] = cwin; // Use push? No, strict index might matter
                        } else {
                            // Existing win
                            cwin = clusterSymWinsArr[r][p] * allbet;
                            clusterAllWin += cwin;
                        }

                        clusterSymStr += `&lockup.cluster.i0.sym.i${symcnt}.value=${cwin}`;
                        clusterSymStr += `&lockup.cluster.i0.sym.i${symcnt}.pos=${r - 1}%2C${p}`;
                        symcnt++;
                        curReels += `&rs.i0.r.i${symcnt0}.syms=SYM2`;
                    } else if (sym == '2') {
                         // Just Locked Up symbol, no cluster yet?
                         // PHP: if (reels_c == '2c') ... else curReels .= SYM...
                         // Wait, PHP logic: if (reels_c == '2c') -> add win, syms=SYM2.
                         // else -> syms=SYM{val}.
                         curReels += `&rs.i0.r.i${symcnt0}.syms=SYM2`;
                    } else {
                         curReels += `&rs.i0.r.i${symcnt0}.syms=SYM${sym}`;
                    }
                    symcnt0++;
                }
            }

            // Check Bank
            if (clusterAllWin <= bank) {
                this.slotSettings.SetBank(postData.slotEvent, -1 * clusterAllWin);
                this.slotSettings.SetBalance(clusterAllWin);
                reels_c = processedReels; // Accept this state
                break;
            } else {
                // Retry loop
                if (bLoop == 500) {
                    // Force fail or accept?
                    // Usually we break and accept, or revert to safe state.
                    // For now, accept last.
                    reels_c = processedReels;
                }
            }
        }

        // Update Spin Count
        if (clusterAllWinOld < clusterAllWin) {
            ClusterSpinCount = 3; // Reset if new win
        } else {
            ClusterSpinCount--;
        }

        // Save State
        this.slotSettings.SetGameData(this.slotId + 'clusterAllWin', clusterAllWin);
        this.slotSettings.SetGameData(this.slotId + 'clusterSymAllWins', clusterSymAllWins);
        this.slotSettings.SetGameData(this.slotId + 'clusterReels', reels_c);
        this.slotSettings.SetGameData(this.slotId + 'ClusterSpinCount', ClusterSpinCount);
        this.slotSettings.SetGameData(this.slotId + 'clusterSymWinsArr', clusterSymWinsArr);

        let nextAction = 'respin';
        if (ClusterSpinCount <= 0) {
            nextAction = 'spin';
            this.slotSettings.SetBalance(clusterAllWin);

            // Construct End Response
            clusterSymStr += `&lockup.deltawin.cents=${clusterAllWin * this.slotSettings.CurrentDenomination * 100}`;
            clusterSymStr += `&lockup.win.cents=${clusterAllWin * this.slotSettings.CurrentDenomination * 100}`;
            clusterSymStr += `&lockup.deltawin.coins=${clusterAllWin}`;
            clusterSymStr += `&lockup.win.coins=${clusterAllWin}`;
            clusterSymStr += `&totalwin.coins=${clusterAllWin}`;
            clusterSymStr += `&game.win.coins=${clusterAllWin}`;

            let symcnt0 = 0;
            let finalHolds = '';
            for (let r = 1; r <= 5; r++) {
                for (let p = 0; p <= 2; p++) {
                    finalHolds += `&rs.i0.r.i${symcnt0}.hold=false`;
                    symcnt0++;
                }
            }

            // Build Final String similar to PHP stub but dynamic
             return `rs.i0.r.i6.pos=0&gameServerVersion=1.21.0&g4mode=false&playercurrency=%26%23x20AC%3B&historybutton=false&rs.i0.r.i10.hold=false&rs.i0.r.i4.hold=false&ws.i0.reelset=respin&next.rs=basic&rs.i0.r.i8.syms=SYM2&gamestate.history=basic%2Crespin&lockup.cluster.i0.sym.i1.value=60&rs.i0.r.i14.syms=SYM30&lockup.deltawin.cents=0&rs.i0.r.i1.syms=SYM30&rs.i0.r.i5.hold=false&rs.i0.r.i7.pos=8&lockup.respins.left=0&game.win.cents=${clusterAllWin * this.slotSettings.CurrentDenomination * 100}&ws.i0.betline=null&rs.i0.id=respin&totalwin.coins=${clusterAllWin}&credit=${balanceInCents}&gamestate.current=basic&rs.i0.r.i7.syms=SYM30&ws.i0.types.i0.coins=${clusterAllWin}&rs.i0.r.i6.syms=SYM30&rs.i0.r.i12.syms=SYM30&rs.i0.r.i12.hold=false&jackpotcurrency=%26%23x20AC%3B&multiplier=1&walkingwilds.pos=0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0&rs.i0.r.i9.syms=SYM30&last.rs=respin&rs.i0.r.i0.syms=SYM2&rs.i0.r.i3.syms=SYM30&rs.i0.r.i8.pos=0&ws.i0.sym=SYM2&ws.i0.direction=left_to_right&lockup.win.cents=${clusterAllWin * this.slotSettings.CurrentDenomination * 100}&isJackpotWin=false&gamestate.stack=basic&rs.i0.r.i0.pos=10&lockup.cluster.i0.sym.i0.value=100&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i0.r.i9.pos=1&ws.i0.types.i0.wintype=coins&rs.i0.r.i14.pos=2&rs.i0.r.i1.pos=6&game.win.coins=${clusterAllWin}&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i5.syms=SYM2&rs.i0.r.i1.hold=false&rs.i0.r.i13.pos=9&rs.i0.r.i13.hold=false&lockup.cluster.i0.sym.i2.pos=3%2C2&rs.i0.r.i11.syms=SYM2&lockup.deltawin.coins=0&rs.i0.r.i7.hold=false&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=respin&rs.i0.r.i8.hold=false&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM30&lockup.cluster.i0.sym.i0.pos=1%2C2&rs.i0.r.i2.pos=4&totalwin.cents=${clusterAllWin * this.slotSettings.CurrentDenomination * 100}&gameover=true&rs.i0.r.i12.pos=8&rs.i0.r.i0.hold=false&rs.i0.r.i6.hold=false&rs.i0.r.i3.pos=5&rs.i0.r.i4.pos=13&lockup.cluster.i0.sym.i2.value=20&rs.i0.r.i9.hold=false&lockup.win.coins=${clusterAllWin}&rs.i0.r.i11.pos=0&ws.i0.types.i0.cents=${clusterAllWin * this.slotSettings.CurrentDenomination * 100}&rs.i0.r.i10.syms=SYM30&rs.i0.r.i10.pos=11&rs.i0.r.i14.hold=false&rs.i0.r.i11.hold=false&rs.i0.r.i13.syms=SYM30&nextaction=spin&rs.i0.r.i5.pos=0&wavecount=1&rs.i0.r.i2.syms=SYM30&lockup.cluster.i0.sym.i1.pos=2%2C2&rs.i0.r.i3.hold=false&game.win.amount=${clusterAllWin * this.slotSettings.CurrentDenomination}${curReels}${clusterSymStr}${finalHolds}`;
        }

        // Continuing Respin Response
        clusterSymStr += `&lockup.deltawin.cents=${clusterAllWin * this.slotSettings.CurrentDenomination * 100}`;
        clusterSymStr += `&lockup.win.cents=${clusterAllWin * this.slotSettings.CurrentDenomination * 100}`;
        clusterSymStr += `&lockup.deltawin.coins=${clusterAllWin}`;
        clusterSymStr += `&lockup.win.coins=${clusterAllWin}`;
        clusterSymStr += `&totalwin.coins=${clusterAllWin}`;
        clusterSymStr += `&game.win.coins=${clusterAllWin}`;

        return `gameServerVersion=1.21.0&g4mode=false&playercurrency=%26%23x20AC%3B&historybutton=false&rs.i0.r.i4.hold=false&next.rs=respin&gamestate.history=basic%2Crespin&rs.i0.r.i14.syms=&lockup.deltawin.cents=${clusterAllWin * this.slotSettings.CurrentDenomination * 100}&rs.i0.r.i1.syms=SYM30&rs.i0.r.i5.hold=false&rs.i0.r.i7.pos=0&game.win.cents=${clusterAllWin * this.slotSettings.CurrentDenomination * 100}&totalwin.coins=${clusterAllWin}&gamestate.current=respin&rs.i0.r.i12.syms=SYM30&jackpotcurrency=%26%23x20AC%3B&walkingwilds.pos=0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0&rs.i0.r.i0.syms=SYM30&rs.i0.r.i3.syms=SYM30&isJackpotWin=false&rs.i0.r.i0.pos=0&rs.i0.r.i9.pos=0&rs.i0.r.i1.pos=5&game.win.coins=${clusterAllWin}&rs.i0.r.i5.syms=SYM30&rs.i0.r.i1.hold=false&rs.i0.r.i13.pos=0&rs.i0.r.i13.hold=false&rs.i0.r.i7.hold=false&clientaction=respin&rs.i0.r.i8.hold=false&rs.i0.r.i2.hold=false&gameover=false&rs.i0.r.i3.pos=13&lockup.win.coins=${clusterAllWin}&rs.i0.r.i11.pos=11&rs.i0.r.i10.syms=SYM2&rs.i0.r.i13.syms=SYM2&nextaction=respin&rs.i0.r.i5.pos=10&rs.i0.r.i2.syms=SYM30&game.win.amount=${clusterAllWin * this.slotSettings.CurrentDenomination}&rs.i0.r.i6.pos=2&playercurrency=%26%23x20AC%3B&rs.i0.r.i10.hold=false&rs.i0.r.i8.syms=SYM30&lockup.respins.left=${ClusterSpinCount}&rs.i0.id=respin&credit=${balanceInCents}&rs.i0.r.i7.syms=SYM2&rs.i0.r.i6.syms=SYM30&rs.i0.r.i12.hold=false&multiplier=1&rs.i0.r.i9.syms=SYM30&last.rs=respin&rs.i0.r.i8.pos=2&lockup.win.cents=${clusterAllWin * this.slotSettings.CurrentDenomination * 100}&gamestate.stack=basic%2Crespin&gamesoundurl=&rs.i0.r.i14.pos=10&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i11.syms=SYM30&lockup.deltawin.coins=300&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM30&rs.i0.r.i2.pos=5&totalwin.cents=0&rs.i0.r.i12.pos=2&rs.i0.r.i0.hold=false&rs.i0.r.i6.hold=false&rs.i0.r.i4.pos=10&rs.i0.r.i9.hold=false&rs.i0.r.i10.pos=0&rs.i0.r.i14.hold=false&rs.i0.r.i11.hold=false&wavecount=1${curReels}${clusterSymStr}${holds}`;
    }

    private handleSpinRequest(postData: any): string {
        const lines = 20;
        this.slotSettings.CurrentDenom = postData.bet_denomination;
        this.slotSettings.CurrentDenomination = postData.bet_denomination;

        if (postData.slotEvent != 'freespin') {
            const betline = postData.bet_betlevel;
            const allbet = betline * lines;
            this.slotSettings.UpdateJackpots(allbet);

            this.slotSettings.SetBalance(-1 * allbet, postData.slotEvent);
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(postData.slotEvent, bankSum, postData.slotEvent);

            this.slotSettings.SetGameData(this.slotId + 'BonusWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'Bet', betline);
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

        // Walking Wilds Logic
        let WalkingWild = this.slotSettings.GetGameData(this.slotId + 'WalkingWild') || [];
        let nextWalkingWild: number[][] = [];
        let WalkingWildStr: string[] = [];

        // Simulation loop
        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            lineWins = [];
            const cWins: number[] = new Array(this.slotSettings.SymbolGame.length).fill(0);
            reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent);

            // Apply existing Walking Wilds
            if(Array.isArray(WalkingWild)) {
                for(const ww of WalkingWild) {
                    if (reels[`reel${ww[0]}`]) {
                        reels[`reel${ww[0]}`][ww[1]] = '1';
                    }
                }
            }

            // Random Wilds (Drive-by) logic
            const randomwildsactive = (this.randomInt(1, 15) == 1 && postData.slotEvent != 'freespin' && winType != 'bonus') || (this.randomInt(1, 2) == 1 && postData.slotEvent == 'freespin');
            if (randomwildsactive) {
                 for(let r=1; r<=5; r++) {
                     for(let p=0; p<=2; p++) {
                         if(reels[`reel${r}`][p] >= 3 && reels[`reel${r}`][p] <= 6 && this.randomInt(1, 2) == 1) {
                             reels[`reel${r}`][p] = '1';
                         }
                     }
                 }
            }

            // Implement 243 ways win logic
            const wild = '1';
            const scatter = '0';
            const waysLimit: number[][][] = [];
            waysLimit[20] = [
                [0, 1, 2, 3],
                [0, 1, 2, 3],
                [0, 1, 2, 3],
                [0, 1, 2, 3],
                [0, 1, 2, 3]
            ];

            let winLineCount = 0;

            for (let j = 0; j < this.slotSettings.SymbolGame.length; j++) {
                const csym = this.slotSettings.SymbolGame[j];
                if (csym === scatter) continue;

                const waysCountArr = [0, 0, 0, 0, 0, 0];
                let waysCount = 1;
                const wayPos: string[] = [];
                let wscnt = 0;

                // Check 243 ways
                for (let rws = 1; rws <= 5; rws++) {
                    const curWays = waysLimit[20][rws - 1];

                    for (const cws of curWays) {
                        const reelSym = reels[`reel${rws}`]?.[cws];
                        if (reelSym == csym || reelSym == wild) {
                            waysCountArr[rws]++;
                             wayPos.push(`&ws.i${winLineCount}.pos.i${wscnt}=${rws - 1}%2C${cws}`);
                             wscnt++;
                        }
                    }

                    if (waysCountArr[rws] <= 0) break;
                    waysCount *= waysCountArr[rws];
                }

                let tmpStringWin = '';
                // Calculate wins for 3, 4, 5 matches
                if (waysCountArr[1] > 0 && waysCountArr[2] > 0 && waysCountArr[3] > 0) {
                    const count = 3;
                    const payout = this.slotSettings.Paytable['SYM_' + csym][count];
                    if (payout > 0) {
                        cWins[j] = payout * betline * waysCount * bonusMpl;
                         tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${cWins[j]}&ws.i${winLineCount}.types.i0.wintype=coins&ws.i${winLineCount}.betline=243&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${cWins[j] * this.slotSettings.CurrentDenomination * 100}${wayPos.join('')}`;
                    }
                }
                if (waysCountArr[1] > 0 && waysCountArr[2] > 0 && waysCountArr[3] > 0 && waysCountArr[4] > 0) {
                    const count = 4;
                    const payout = this.slotSettings.Paytable['SYM_' + csym][count];
                    if (payout > 0) {
                         cWins[j] = payout * betline * waysCount * bonusMpl;
                         tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${cWins[j]}&ws.i${winLineCount}.types.i0.wintype=coins&ws.i${winLineCount}.betline=243&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${cWins[j] * this.slotSettings.CurrentDenomination * 100}${wayPos.join('')}`;
                    }
                }
                if (waysCountArr[1] > 0 && waysCountArr[2] > 0 && waysCountArr[3] > 0 && waysCountArr[4] > 0 && waysCountArr[5] > 0) {
                    const count = 5;
                    const payout = this.slotSettings.Paytable['SYM_' + csym][count];
                    if (payout > 0) {
                         cWins[j] = payout * betline * waysCount * bonusMpl;
                         tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${cWins[j]}&ws.i${winLineCount}.types.i0.wintype=coins&ws.i${winLineCount}.betline=243&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${cWins[j] * this.slotSettings.CurrentDenomination * 100}${wayPos.join('')}`;
                    }
                }

                if (cWins[j] > 0 && tmpStringWin !== '') {
                    totalWin += cWins[j];
                    lineWins.push(tmpStringWin);
                     winLineCount++;
                }
            }

             // Check total win limits...
             if (this.slotSettings.MaxWin < (totalWin * this.slotSettings.CurrentDenom)) {
                 continue;
             }

             // Calculate next Walking Wilds positions if spin is valid
             nextWalkingWild = [];
             WalkingWildStr = [];
             for(let r=1; r<=5; r++) {
                 for(let p=0; p<=2; p++) {
                     if(reels[`reel${r}`][p] == '1') {
                         WalkingWildStr.push('1');
                         if (r > 1) { // Shift left
                             nextWalkingWild.push([r - 1, p]);
                         }
                     } else {
                         WalkingWildStr.push('0');
                     }
                 }
             }

             break;
        }

        // Update balance
        if (totalWin > 0) {
            this.slotSettings.SetBank(postData.slotEvent, -1 * totalWin);
            this.slotSettings.SetBalance(totalWin);
        }

        let freeState = '';
        if (postData.slotEvent == 'freespin') {
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', this.slotSettings.GetGameData(this.slotId + 'BonusWin') + totalWin);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', this.slotSettings.GetGameData(this.slotId + 'TotalWin') + totalWin);

             const fs = this.slotSettings.GetGameData(this.slotId + 'FreeGames');
             const fsl = fs - this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame');
             freeState = `&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&freespins.totalwin.cents=0&nextaction=freespin&freespins.left=${fsl}&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=basic%2Cfreespin&freespins.totalwin.coins=${this.slotSettings.GetGameData(this.slotId + 'BonusWin')}&freespins.total=${fs}&freespins.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gamestate.current=freespin&freespins.initial=${fs}&freespins.win.coins=${totalWin}&freespins.betlevel=${betline}&totalwin.coins=${totalWin}&credit=${Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100)}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}`;
        } else {
             this.slotSettings.SetGameData(this.slotId + 'TotalWin', totalWin);
        }

        // Update Walking Wilds for next spin
        this.slotSettings.SetGameData(this.slotId + 'WalkingWild', nextWalkingWild);

        // Construct response
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        const jsSpin = JSON.stringify(reels);
        const jsJack = JSON.stringify(this.slotSettings.Jackpots);
        const winString = lineWins.join('');

        // Reconstruct query string part of response
        const curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1[0]}%2CSYM${reels.reel1[1]}%2CSYM${reels.reel1[2]}` +
                         `&rs.i0.r.i1.syms=SYM${reels.reel2[0]}%2CSYM${reels.reel2[1]}%2CSYM${reels.reel2[2]}` +
                         `&rs.i0.r.i2.syms=SYM${reels.reel3[0]}%2CSYM${reels.reel3[1]}%2CSYM${reels.reel3[2]}` +
                         `&rs.i0.r.i3.syms=SYM${reels.reel4[0]}%2CSYM${reels.reel4[1]}%2CSYM${reels.reel4[2]}` +
                         `&rs.i0.r.i4.syms=SYM${reels.reel5[0]}%2CSYM${reels.reel5[1]}%2CSYM${reels.reel5[2]}`;

        // Narcos response is a JSON object wrapping the massive string in `freeState` for Freespins, or a direct String for basic spin?
        // Based on PHP:
        // $response = '{"responseEvent":"spin",...}';
        // But for standard spin it sets $result_tmp[0] and then echoes it?
        // Let's assume JSON format for now because that's what the PHP code explicitly builds in `case 'spin'`.
        // WAIT, I saw in PHP: `$response = '{"responseEvent":"spin"...}'`.
        // AND THEN `echo $response`.
        // So Narcos IS returning JSON, unlike ReelRush2/StarBurst which return the query string directly (or wrapped in a way that looks like query string).

        // Re-reading PHP trace I got:
        // $response = '{"responseEvent":"spin","responseType":"' . $postData['slotEvent'] . '","serverResponse":{"freeState":"' . $freeState . '", ...}}';

        // So for Narcos, I MUST return JSON.
        // BUT the `freeState` field inside `serverResponse` MUST contain the massive query string if it's a freespin.
        // What about normal spin?
        // In normal spin, `freeState` is empty string.
        // BUT wait, looking at the PHP log again:
        // `case 'respin'`: sets `$result_tmp[0]` and echoes it. Returns STRING.
        // `case 'spin'`: sets `$response` JSON. Echoes it. Returns JSON.

        // This is inconsistent.
        // `respin` (Locked Up) returns String.
        // `spin` returns JSON.

        // Let's stick to what I found:
        // Spin: JSON with `reelsSymbols` object.
        // Respin: String.

        // However, the `handleRespinRequest` I wrote above returns String. That matches PHP.
        // The `handleSpinRequest` here returns JSON. That matches PHP for `spin`.

        const response = JSON.stringify({
            responseEvent: 'spin',
            responseType: postData.slotEvent,
            serverResponse: {
                freeState: freeState, // This will be populated if freespin
                slotLines: lines,
                slotBet: betline,
                totalFreeGames: this.slotSettings.GetGameData(this.slotId + 'FreeGames'),
                currentFreeGames: this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame'),
                Balance: balanceInCents,
                afterBalance: balanceInCents,
                bonusWin: this.slotSettings.GetGameData(this.slotId + 'BonusWin'),
                totalWin: totalWin,
                winLines: [], // PHP sends empty array here, logic handled in client via `reelsSymbols` or other params?
                // Actually, PHP doesn't put `winString` into the JSON for `spin`?
                // `winLines` is empty array in PHP response construction: `"winLines":[]`.
                // But `jsSpin` (reels) is passed.
                // It seems Narcos client might calculate wins itself or use `reelsSymbols`.
                // Or I am missing something.
                // Wait, in PHP: `$winString = implode('', $lineWins);`
                // But `$winString` is NOT used in the JSON response for `spin`.
                // It IS used if it was a String response (like Starburst).
                // So Narcos might rely on client-side win calculation or `reelsSymbols` containing win info?
                // No, `reelsSymbols` is just `reels`.

                // Let's check `StarBurst` again. It uses `$winString` in the response string.
                // Narcos `spin` returns JSON.
                // Is `winLines` really empty?
                // Yes: `"winLines":[]`.

                Jackpots: this.slotSettings.Jackpots,
                reelsSymbols: reels
            }
        });

        this.slotSettings.SaveLogReport(response, allbet, lines, totalWin, postData.slotEvent);
        return response;
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
}
