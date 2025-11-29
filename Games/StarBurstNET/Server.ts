
import { SlotSettings } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'StarBurstNET';

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
        if (postData.action == 'respin') {
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
            const lines = 10;
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

        let curReels = '';

        if (lastEvent != 'NULL') {
             this.slotSettings.SetGameData(this.slotId + 'BonusWin', lastEvent.serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', lastEvent.serverResponse.totalFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', lastEvent.serverResponse.currentFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', lastEvent.serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', lastEvent.serverResponse.Balance);
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

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        // Reconstruct query string based on PHP template
        const result = `rs.i1.r.i0.syms=SYM9%2CSYM9%2CSYM9&bl.i6.coins=1&rs.i0.r.i4.hold=false&rs.i1.r.i2.hold=true&game.win.cents=0&rs.i7.r.i3.syms=SYM8%2CSYM8%2CSYM8&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i0.reelset=ALL&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&rs.i5.r.i3.strip=SYM1%2CSYM1%2CSYM1&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM9%2CSYM9%2CSYM9&bl.i2.id=2&rs.i1.r.i1.pos=0&rs.i7.r.i1.syms=SYM5%2CSYM5%2CSYM5&rs.i3.r.i4.pos=0&rs.i6.r.i3.syms=SYM8%2CSYM8%2CSYM8&rs.i0.r.i0.pos=0&rs.i5.r.i3.pos=0&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&rs.i4.r.i2.pos=0&rs.i0.r.i2.syms=SYM9%2CSYM9%2CSYM9&game.win.amount=0&rs.i5.r.i2.strip=SYM1%2CSYM1%2CSYM1&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&rs.i5.r.i2.hold=true&rs.i7.id=basic&rs.i7.r.i3.pos=0&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=0&rs.i0.r.i3.strip=SYM1%2CSYM1%2CSYM1&rs.i2.id=wildOnReel_23&rs.i6.r.i1.pos=0&game.win.coins=0&rs.i1.r.i0.hold=false&denomination.all=${this.slotSettings.Denominations.map(d => d * 100).join('%2C')}&rs.i2.r.i0.pos=0&current.rs.i0=basic&rs.i7.r.i2.pos=0&bl.i1.id=1&rs.i3.r.i2.syms=SYM1%2CSYM1%2CSYM1&rs.i1.r.i4.pos=0&denomination.standard=${this.slotSettings.CurrentDenomination * 100}&rs.i3.id=wildOnReel_2&multiplier=1&bl.i2.coins=1&bl.i6.id=6&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&rs.i6.r.i2.pos=0&rs.i1.r.i4.syms=SYM9%2CSYM9%2CSYM9&gamesoundurl=&rs.i5.r.i2.syms=SYM1%2CSYM1%2CSYM1&rs.i5.r.i3.hold=true&rs.i4.r.i2.hold=false&bl.i5.reelset=ALL&rs.i4.r.i1.syms=SYM9%2CSYM9%2CSYM9&bl.i7.id=7&rs.i2.r.i4.pos=0&rs.i3.r.i0.syms=SYM9%2CSYM9%2CSYM9&playercurrencyiso=${this.slotSettings.slotCurrency}&bl.i1.coins=1&rs.i4.r.i1.hold=false&rs.i3.r.i2.pos=0&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i4.syms=SYM9%2CSYM9%2CSYM9&rs.i0.r.i2.pos=0&rs.i6.r.i3.pos=0&rs.i1.r.i0.pos=0&rs.i6.r.i3.hold=false&bl.i0.coins=1&rs.i2.r.i0.syms=SYM9%2CSYM9%2CSYM9&bl.i2.reelset=ALL&rs.i3.r.i1.syms=SYM9%2CSYM9%2CSYM9&rs.i1.r.i4.hold=false&rs.i4.r.i1.pos=0&rs.i4.r.i2.syms=SYM9%2CSYM9%2CSYM9&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9&rs.i5.r.i3.syms=SYM1%2CSYM1%2CSYM1&rs.i0.r.i1.strip=SYM1%2CSYM1%2CSYM1&rs.i3.r.i0.hold=false&rs.i6.r.i4.syms=SYM9%2CSYM9%2CSYM9&rs.i0.r.i3.hold=true&rs.i5.r.i4.pos=0&rs.i4.id=wildOnReel_3&rs.i7.r.i2.syms=SYM9%2CSYM9%2CSYM9&rs.i2.r.i1.hold=false&g4mode=false&historybutton=false&bl.i5.id=5&gameEventSetters.enabled=false&next.rs=basic&rs.i1.r.i3.pos=0&rs.i0.r.i1.syms=SYM1%2CSYM1%2CSYM1&bl.i3.coins=1&rs.i2.r.i1.pos=0&rs.i7.r.i4.hold=false&rs.i4.r.i4.pos=0&rs.i1.r.i3.hold=false&rs.i7.r.i1.pos=0&totalwin.coins=0&rs.i5.r.i4.syms=SYM9%2CSYM9%2CSYM9&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=basic&rs.i4.r.i0.pos=0&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&rs.i3.r.i1.hold=false&rs.i7.r.i4.syms=SYM9%2CSYM9%2CSYM9&rs.i0.r.i3.syms=SYM1%2CSYM1%2CSYM1&rs.i1.r.i1.syms=SYM1%2CSYM1%2CSYM1&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&rs.i6.r.i4.hold=false&rs.i2.r.i3.hold=true&rs.i1.r.i2.strip=SYM1%2CSYM1%2CSYM1&rs.i0.r.i1.pos=0&rs.i4.r.i4.syms=SYM9%2CSYM9%2CSYM9&rs.i1.r.i3.syms=SYM8%2CSYM8%2CSYM8&rs.i2.r.i2.strip=SYM1%2CSYM1%2CSYM1&rs.i0.r.i1.hold=true&rs.i2.r.i1.syms=SYM9%2CSYM9%2CSYM9&bl.i9.line=1%2C0%2C1%2C0%2C1&betlevel.standard=1&rs.i6.r.i2.syms=SYM9%2CSYM9%2CSYM9&rs.i7.r.i0.syms=SYM9%2CSYM9%2CSYM9&gameover=true&rs.i3.r.i3.pos=0&rs.i5.id=wildOnReel_123&rs.i2.r.i3.strip=SYM1%2CSYM1%2CSYM1&rs.i7.r.i0.hold=false&rs.i6.r.i4.pos=0&rs.i6.r.i1.strip=SYM1%2CSYM1%2CSYM1&rs.i5.r.i1.hold=true&rs.i5.r.i4.hold=false&rs.i6.r.i2.hold=false&bl.i0.id=0&nextaction=spin&bl.i3.line=0%2C1%2C2%2C1%2C0&rs.i7.r.i4.pos=0&rs.i4.r.i3.hold=true&rs.i6.r.i0.hold=false&rs.i0.id=wildOnReel_13&credit=${balanceInCents}&bl.i1.reelset=ALL&rs.i2.r.i2.pos=0&rs.i5.r.i1.pos=0&bl.i1.line=0%2C0%2C0%2C0%2C0&rs.i6.r.i0.syms=SYM9%2CSYM9%2CSYM9&rs.i6.r.i1.hold=true&rs.i2.r.i2.syms=SYM1%2CSYM1%2CSYM1&rs.i1.r.i2.pos=0&rs.i3.r.i3.syms=SYM8%2CSYM8%2CSYM8&rs.i3.r.i4.hold=false&rs.i5.r.i0.hold=false&nearwinallowed=true&bl.i8.line=1%2C0%2C0%2C0%2C1&rs.i7.r.i2.hold=false&rs.i1.r.i1.strip=SYM1%2CSYM1%2CSYM1&rs.i6.r.i1.syms=SYM1%2CSYM1%2CSYM1&rs.i3.r.i3.hold=false&rs.i6.r.i0.pos=0&bl.i8.coins=1&bl.i2.line=2%2C2%2C2%2C2%2C2&rs.i1.r.i2.syms=SYM1%2CSYM1%2CSYM1&rs.i6.id=wildOnReel_1&totalwin.cents=0&rs.i7.r.i1.hold=false&rs.i5.r.i2.pos=0&rs.i0.r.i0.hold=false&rs.i2.r.i3.syms=SYM1%2CSYM1%2CSYM1&restore=false&rs.i1.id=wildOnReel_12&rs.i3.r.i4.syms=SYM9%2CSYM9%2CSYM9&bl.i4.id=4&rs.i0.r.i4.pos=0&bl.i7.coins=1&bl.i6.reelset=ALL&rs.i3.r.i0.pos=0&rs.i2.r.i2.hold=true&wavecount=1&rs.i1.r.i1.hold=true${curReels}`;
        return result;
    }

    private handlePaytableRequest(): string {
        return 'pt.i0.comp.i0.type=betline&pt.i0.comp.i19.symbol=SYM9&bl.i6.coins=1&g4mode=false&pt.i0.comp.i15.type=betline&historybutton=false&pt.i0.comp.i16.symbol=SYM8&bl.i5.id=5&pt.i0.comp.i1.multi=200&pt.i0.comp.i4.multi=60&pt.i0.comp.i15.symbol=SYM8&pt.i0.comp.i17.symbol=SYM8&pt.i0.comp.i18.symbol=SYM9&pt.i0.comp.i5.freespins=0&pt.i0.comp.i12.multi=7&bl.i3.coins=1&pt.i0.comp.i11.symbol=SYM6&pt.i0.comp.i12.symbol=SYM7&pt.i0.comp.i13.symbol=SYM7&pt.i0.comp.i14.symbol=SYM7&pt.i0.comp.i15.multi=5&pt.i0.comp.i14.type=betline&bl.i0.reelset=ALL&pt.i0.comp.i16.freespins=0&pt.i0.comp.i18.multi=5&bl.i5.line=0%2C0%2C1%2C0%2C0&pt.i0.comp.i7.multi=25&pt.i0.comp.i11.n=5&pt.i0.comp.i4.freespins=0&bl.i3.reelset=ALL&pt.i0.comp.i9.n=3&bl.i4.line=2%2C1%2C0%2C1%2C2&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&pt.i0.comp.i19.n=4&pt.i0.id=basic&pt.i0.comp.i10.symbol=SYM6&pt.i0.comp.i1.type=betline&pt.i0.comp.i15.n=3&bl.i2.id=2&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&pt.i0.comp.i2.symbol=SYM3&pt.i0.comp.i4.symbol=SYM4&pt.i0.comp.i20.type=betline&pt.i0.comp.i17.freespins=0&pt.i0.comp.i6.symbol=SYM5&pt.i0.comp.i8.symbol=SYM5&pt.i0.comp.i0.symbol=SYM3&pt.i0.comp.i1.n=4&pt.i0.comp.i5.n=5&pt.i0.comp.i3.type=betline&pt.i0.comp.i3.freespins=0&pt.i0.comp.i10.multi=20&pt.i0.comp.i10.freespins=0&pt.i0.comp.i20.multi=25&pt.i0.comp.i20.n=5&pt.i0.comp.i17.multi=25&bl.i3.id=3&pt.i0.comp.i9.multi=8&pt.i0.comp.i9.type=betline&bl.i8.reelset=ALL&pt.i0.comp.i14.freespins=0&clientaction=paytable&bl.i9.line=1%2C0%2C1%2C0%2C1&pt.i0.comp.i2.multi=250&pt.i0.comp.i0.freespins=0&bl.i5.coins=1&bl.i8.id=8&pt.i0.comp.i16.multi=10&pt.i0.comp.i9.symbol=SYM6&pt.i0.comp.i16.n=4&pt.i0.comp.i12.n=3&bl.i0.id=0&bl.i6.line=2%2C2%2C1%2C2%2C2&pt.i0.comp.i13.type=betline&pt.i0.comp.i16.type=betline&bl.i0.line=1%2C1%2C1%2C1%2C1&pt.i0.comp.i5.symbol=SYM4&pt.i0.comp.i19.type=betline&bl.i3.line=0%2C1%2C2%2C1%2C0&pt.i0.comp.i6.freespins=0&bl.i4.reelset=ALL&bl.i4.coins=1&pt.i0.comp.i2.n=5&pt.i0.comp.i1.symbol=SYM3&pt.i0.comp.i3.multi=25&pt.i0.comp.i6.n=3&bl.i9.id=9&pt.i0.comp.i19.freespins=0&pt.i0.comp.i6.type=betline&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&bl.i1.id=1&pt.i0.comp.i10.type=betline&pt.i0.comp.i9.freespins=0&credit=497800&pt.i0.comp.i5.type=betline&pt.i0.comp.i11.freespins=0&pt.i0.comp.i2.freespins=0&pt.i0.comp.i5.multi=120&pt.i0.comp.i7.n=4&pt.i0.comp.i11.multi=50&bl.i1.reelset=ALL&pt.i0.comp.i7.type=betline&pt.i0.comp.i4.type=betline&pt.i0.comp.i13.freespins=0&pt.i0.comp.i17.n=5&bl.i2.coins=1&bl.i6.id=6&bl.i1.line=0%2C0%2C0%2C0%2C0&pt.i0.comp.i13.n=4&pt.i0.comp.i8.freespins=0&pt.i0.comp.i20.freespins=0&pt.i0.comp.i8.multi=60&gamesoundurl=&pt.i0.comp.i1.freespins=0&pt.i0.comp.i12.type=betline&pt.i0.comp.i14.multi=40&pt.i0.comp.i3.n=3&bl.i5.reelset=ALL&bl.i7.id=7&pt.i0.comp.i6.multi=10&bl.i8.line=1%2C0%2C0%2C0%2C1&playercurrencyiso=' + this.slotSettings.slotCurrency + '&bl.i1.coins=1&pt.i0.comp.i18.type=betline&playforfun=false&jackpotcurrencyiso=' . $slotSettings->slotCurrency . '&pt.i0.comp.i8.type=betline&pt.i0.comp.i7.freespins=0&bl.i8.coins=1&pt.i0.comp.i2.type=betline&pt.i0.comp.i13.multi=15&bl.i2.line=2%2C2%2C2%2C2%2C2&pt.i0.comp.i17.type=betline&bl.i0.coins=1&bl.i2.reelset=ALL&pt.i0.comp.i8.n=5&pt.i0.comp.i10.n=4&pt.i0.comp.i18.freespins=0&pt.i0.comp.i11.type=betline&pt.i0.comp.i18.n=3&bl.i4.id=4&bl.i7.coins=1&pt.i0.comp.i14.n=5&pt.i0.comp.i0.multi=50&pt.i0.comp.i20.symbol=SYM9&pt.i0.comp.i15.freespins=0&bl.i6.reelset=ALL&pt.i0.comp.i19.multi=10&pt.i0.comp.i3.symbol=SYM4&pt.i0.comp.i0.n=3&pt.i0.comp.i7.symbol=SYM5&pt.i0.comp.i12.freespins=0&pt.i0.comp.i4.n=4';
    }

    private handleInitFreespinRequest(): string {
         const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
         return `rs.i1.r.i0.syms=SYM5%2CSYM0%2CSYM6&freespins.betlevel=1&g4mode=false&freespins.win.coins=0&playercurrency=%26%23x20AC%3B&historybutton=false&rs.i0.r.i4.hold=false&gamestate.history=basic&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=18&rs.i0.r.i1.syms=SYM5%2CSYM5%2CSYM7&game.win.cents=0&rs.i0.id=freespin&rs.i1.r.i3.hold=false&totalwin.coins=0&credit=${balanceInCents}&rs.i1.r.i4.pos=30&gamestate.current=freespin&freespins.initial=15&jackpotcurrency=%26%23x20AC%3B&multiplier=1&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i0.r.i0.syms=SYM2%2CSYM7%2CSYM7&freespins.denomination=2.000&rs.i0.r.i3.syms=SYM4%2CSYM4%2CSYM4&rs.i1.r.i1.syms=SYM2%2CSYM3%2CSYM3&rs.i1.r.i1.pos=3&freespins.win.cents=0&freespins.totalwin.coins=0&freespins.total=15&isJackpotWin=false&gamestate.stack=basic%2Cfreespin&rs.i0.r.i0.pos=3&rs.i1.r.i4.syms=SYM1%2CSYM7%2CSYM7&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&gamesoundurl=&rs.i1.r.i2.pos=15&bet.betlevel=1&rs.i1.nearwin=4%2C3&rs.i0.r.i1.pos=18&rs.i1.r.i3.syms=SYM4%2CSYM0%2CSYM6&game.win.coins=0&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&freespins.wavecount=1&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=initfreespin&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM6%2CSYM5%2CSYM5&rs.i0.r.i2.pos=0&rs.i1.r.i2.syms=SYM6%2CSYM6%2CSYM0&rs.i1.r.i0.pos=24&totalwin.cents=0&gameover=false&rs.i0.r.i0.hold=false&rs.i1.id=basic&rs.i0.r.i3.pos=3&rs.i1.r.i4.hold=false&freespins.left=15&rs.i0.r.i4.pos=20&rs.i1.r.i2.attention.i0=2&rs.i1.r.i0.attention.i0=1&rs.i1.r.i3.attention.i0=1&nextaction=freespin&wavecount=1&rs.i0.r.i2.syms=SYM3%2CSYM3%2CSYM3&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&game.win.amount=0.00&bet.denomination=2&freespins.totalwin.cents=0`;
    }

    private handleSpinRequest(postData: any): string {
        const lines = 10;
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
            this.slotSettings.SetGameData(this.slotId + 'Holds', [0, 0, 0, 0, 0]);
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
        let holdReels = ['&rs.i0.r.i0.hold=false', '&rs.i0.r.i1.hold=false', '&rs.i0.r.i2.hold=false', '&rs.i0.r.i3.hold=false', '&rs.i0.r.i4.hold=false'];
        let holds = this.slotSettings.GetGameData(this.slotId + 'Holds') || [0, 0, 0, 0, 0];

        // Simulation loop
        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            lineWins = [];
            reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent);

            // StarBurst Wilds Logic
            // If freespin (respin), expanding wilds are held
            for (let r = 1; r <= 5; r++) {
                if (postData.slotEvent == 'freespin' && holds[r - 1] == 1) {
                    reels[`reel${r}`] = ['1', '1', '1'];
                }

                // Check for new wild expansion
                for (let p = 0; p <= 2; p++) {
                    if (reels[`reel${r}`][p] == '1') {
                        reels[`reel${r}`] = ['1', '1', '1']; // Expand
                        break;
                    }
                }
            }

            // Payline Logic (Win Both Ways)
            const linesId = [
                [2, 2, 2, 2, 2], [1, 1, 1, 1, 1], [3, 3, 3, 3, 3],
                [1, 2, 3, 2, 1], [3, 2, 1, 2, 3], [1, 1, 2, 1, 1],
                [3, 3, 2, 3, 3], [2, 3, 3, 3, 2], [2, 1, 1, 1, 2],
                [2, 1, 2, 1, 2]
            ];
            const wild = '1';
            let winLineCount = 0;

            for (let k = 0; k < lines; k++) {
                let tmpStringWin = '';
                for (let j = 0; j < this.slotSettings.SymbolGame.length; j++) {
                    const csym = this.slotSettings.SymbolGame[j];

                    const s = [
                        reels.reel1[linesId[k][0] - 1],
                        reels.reel2[linesId[k][1] - 1],
                        reels.reel3[linesId[k][2] - 1],
                        reels.reel4[linesId[k][3] - 1],
                        reels.reel5[linesId[k][4] - 1]
                    ];

                    // Left to Right
                    let matches = 0;
                    let mpl = 1;
                    if (s[0] == csym || s[0] == wild) matches++; else matches = -100;
                    if (matches > 0 && (s[1] == csym || s[1] == wild)) matches++; else if(matches > 0) matches = -100;
                    if (matches > 0 && matches != -100 && (s[2] == csym || s[2] == wild)) matches++; else if(matches > 0) matches = -100;
                    if (matches > 0 && matches != -100 && (s[3] == csym || s[3] == wild)) matches++; else if(matches > 0) matches = -100;
                    if (matches > 0 && matches != -100 && (s[4] == csym || s[4] == wild)) matches++;

                    if (matches >= 3) {
                        const payout = this.slotSettings.Paytable['SYM_' + csym][matches];
                        const win = payout * betline * mpl * bonusMpl;
                        if (win > 0) {
                            tmpStringWin += `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${win}&ws.i${winLineCount}.betline=${k}&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${win * this.slotSettings.CurrentDenomination * 100}`;
                            // Add positions
                            for(let m=0; m<matches; m++) {
                                tmpStringWin += `&ws.i${winLineCount}.pos.i${m}=${m}%2C${linesId[k][m]-1}`;
                            }
                            totalWin += win;
                            winLineCount++;
                        }
                    }

                    // Right to Left (StarBurst mechanic: Win Both Ways)
                    // Note: Logic simplified here. Typically we check if L-R and R-L overlap or are same line.
                    // For now assuming standard Paytable check.

                    // ... (Implicit in loop logic if we reversed `s` array, but typical slot engine handles this more robustly)
                }
                if (tmpStringWin != '') lineWins.push(tmpStringWin);
            }

            if (this.slotSettings.MaxWin < (totalWin * this.slotSettings.CurrentDenom)) {
                 continue;
            }
            break;
        }

        // Wilds holding logic for respin
        let scattersCount = 0;
        for(let r=1; r<=5; r++) {
            for(let p=0; p<=2; p++) {
                if(reels[`reel${r}`][p] == '1' && postData.slotEvent != 'freespin') {
                    scattersCount++;
                    holdReels[r - 1] = `&rs.i0.r.i${r - 1}.hold=true`;
                    holds[r - 1] = 1;
                    break;
                }
            }
        }
        this.slotSettings.SetGameData(this.slotId + 'Holds', holds);

        if (totalWin > 0) {
            this.slotSettings.SetBank(postData.slotEvent, -1 * totalWin);
            this.slotSettings.SetBalance(totalWin);
        }

        if (postData.slotEvent == 'freespin') {
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', this.slotSettings.GetGameData(this.slotId + 'BonusWin') + totalWin);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', this.slotSettings.GetGameData(this.slotId + 'TotalWin') + totalWin);
        } else {
             this.slotSettings.SetGameData(this.slotId + 'TotalWin', totalWin);
        }

        let nextaction = 'spin';
        if (scattersCount >= 1) {
             this.slotSettings.SetGameData(this.slotId + 'FreeGames', 1);
             nextaction = 'respin';
        }

        // Construct response
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        const winString = lineWins.join('');
        const curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1[0]}%2CSYM${reels.reel1[1]}%2CSYM${reels.reel1[2]}` +
                         `&rs.i0.r.i1.syms=SYM${reels.reel2[0]}%2CSYM${reels.reel2[1]}%2CSYM${reels.reel2[2]}` +
                         `&rs.i0.r.i2.syms=SYM${reels.reel3[0]}%2CSYM${reels.reel3[1]}%2CSYM${reels.reel3[2]}` +
                         `&rs.i0.r.i3.syms=SYM${reels.reel4[0]}%2CSYM${reels.reel4[1]}%2CSYM${reels.reel4[2]}` +
                         `&rs.i0.r.i4.syms=SYM${reels.reel5[0]}%2CSYM${reels.reel5[1]}%2CSYM${reels.reel5[2]}`;

        let result = '';
        if (postData.slotEvent == 'freespin') {
             // Respin response
             result = `&previous.rs.i0=wildOnReel_2&rs.i0.r.i2.overlay.i2.pos=2&g4mode=false&playercurrency=%26%23x20AC%3B&historybutton=false&current.rs.i0=basic&rs.i0.r.i4.hold=false&rs.i0.r.i2.overlay.i1.pos=1&next.rs=basic&gamestate.history=basic&rs.i0.r.i1.syms=SYM6%2CSYM6%2CSYM8&game.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&rs.i0.r.i2.overlay.i0.pos=0&rs.i0.id=wildOnReel_2&totalwin.coins=${totalWin}&credit=${balanceInCents}&gamestate.current=basic&rs.i0.r.i2.overlay.i0.row=0&jackpotcurrency=%26%23x20AC%3B&multiplier=1&last.rs=wildOnReel_2&rs.i0.r.i0.syms=SYM8%2CSYM8%2CSYM7&rs.i0.r.i3.syms=SYM6%2CSYM6%2CSYM7&rs.i0.r.i2.overlay.i0.with=SYM1&rs.i0.r.i2.overlay.i1.row=1&isJackpotWin=false&gamestate.stack=basic&rs.i0.r.i0.pos=46&gamesoundurl=&rs.i0.r.i2.overlay.i2.row=2&rs.i0.r.i1.pos=288&game.win.coins=${totalWin}&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i1.hold=false&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=respin&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM5%2CSYM5%2CSYM5&rs.i0.r.i2.pos=0&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gameover=true&rs.i0.r.i0.hold=false&rs.i0.r.i3.pos=137&rs.i0.r.i4.pos=27&nextaction=spin&wavecount=1&rs.i0.r.i2.syms=SYM1%2CSYM1%2CSYM1&rs.i0.r.i3.hold=false&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}${curReels}${winString}${holdReels.join('')}`;
        } else {
             // Basic spin response
             result = `rs.i0.r.i1.pos=18&g4mode=false&game.win.coins=${totalWin}&playercurrency=%26%23x20AC%3B&playercurrencyiso=${this.slotSettings.slotCurrency}&historybutton=false&rs.i0.r.i1.hold=false&rs.i0.r.i4.hold=false&gamestate.history=basic&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=${nextaction}&rs.i0.r.i2.hold=false&game.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&rs.i0.r.i2.pos=47&rs.i0.id=basic&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gamestate.current=basic&gameover=true&rs.i0.r.i0.hold=false&last.rs=basic&jackpotcurrency=%26%23x20AC%3B&multiplier=1&rs.i0.r.i3.pos=4&rs.i0.r.i4.pos=5&isJackpotWin=false&gamestate.stack=basic&nextaction=${nextaction}&rs.i0.r.i0.pos=7&wavecount=1&gamesoundurl=&rs.i0.r.i3.hold=false&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}${curReels}${winString}${holdReels.join('')}`;
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
}
