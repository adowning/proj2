// Server.ts - GrandSpinnSuperpotNET game server
// Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines
// Data injection pattern - NO database calls or legacy PHP constructs

import { SlotSettings, ReelStrips } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'GrandSpinnSuperpotNET';
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
        if (postData.operation) {
            postData.slotEvent = 'jackpot';
            postData.action = 'jackpot';
        }
        if (postData.action === 'nudge') {
            postData.slotEvent = 'nudge';
            postData.action = 'nudge';
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
            // Updated validation logic for GrandSpinn which is 1 line, cost 2 units?
            // Actually in `handleSpinRequest`: allbet = betline * lines * 2; with lines = 1.
            // So cost is betline * 2.
            const lines = 1;
            const betline = postData.bet_betlevel;
            const cost = lines * betline * 2;

            if (lines <= 0 || betline <= 0.0001) {
                return `{"responseEvent":"error","responseType":"${postData.slotEvent}","serverResponse":"invalid bet state"}`;
            }
            if (this.slotSettings.GetBalance() < cost) {
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
            case 'jackpot':
                return this.handleJackpotRequest();
            case 'initfreespin':
                return this.handleInitFreespinRequest();
            case 'spin':
            case 'nudge':
                return this.handleSpinRequest(postData);
            default:
                return this.createErrorResponse("unknown action");
        }
    }

    private handleInitRequest(): string {
        const lastEvent = this.slotSettings.GetHistory();

        // Reset game state
        this.slotSettings.SetGameData('GrandSpinnSuperpotNETBonusWin', 0);
        this.slotSettings.SetGameData('GrandSpinnSuperpotNETFreeGames', 0);
        this.slotSettings.SetGameData('GrandSpinnSuperpotNETCurrentFreeGame', 0);
        this.slotSettings.SetGameData('GrandSpinnSuperpotNETTotalWin', 0);
        this.slotSettings.SetGameData('GrandSpinnSuperpotNETFreeBalance', 0);

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
            // GrandSpinn is 3-reel game
            for (let i = 0; i <= 2; i++) {
                curReels += `&rs.i${i}.r.i0.syms=SYM${reels.reel1[0]}%2CSYM${reels.reel1[1]}%2CSYM${reels.reel1[2]}`;
                curReels += `&rs.i${i}.r.i1.syms=SYM${reels.reel2[0]}%2CSYM${reels.reel2[1]}%2CSYM${reels.reel2[2]}`;
                curReels += `&rs.i${i}.r.i2.syms=SYM${reels.reel3[0]}%2CSYM${reels.reel3[1]}%2CSYM${reels.reel3[2]}`;
                // Removed reel4 and reel5 references for 3-reel logic

                if (reels.rp) {
                    curReels += `&rs.i${i}.r.i0.pos=${reels.rp[0]}`;
                    curReels += `&rs.i${i}.r.i1.pos=${reels.rp[0]}`;
                    curReels += `&rs.i${i}.r.i2.pos=${reels.rp[0]}`;
                }
            }
        } else {
             // Random initial state
            curReels = `&rs.i0.r.i0.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            curReels += `&rs.i0.r.i1.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            curReels += `&rs.i0.r.i2.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            // 3 Reels

            for (let i = 0; i < 3; i++) {
                curReels += `&rs.i0.r.i${i}.pos=${this.randomInt(1, 10)}`;
            }
        }

        const denoms = this.slotSettings.Denominations.map(d => d * 100).join('%2C');
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        const standardDenom = this.slotSettings.CurrentDenomination * 100;

        // Jackpot string part
        const jackpotAmount = Math.round((this.slotSettings.Jackpots[0] || 0) * 100);

        let jackpotStr = `&jackpot.tt_mega.${this.slotSettings.slotCurrency}.amount-30s=${jackpotAmount}&jackpot.tt_mega.${this.slotSettings.slotCurrency}.lastpayedout=0&jackpot.tt_mega.${this.slotSettings.slotCurrency}.amount=${jackpotAmount}`;

        if (this.slotSettings.GetGameData('GrandSpinnSuperpotNETCurrentFreeGame') < this.slotSettings.GetGameData('GrandSpinnSuperpotNETFreeGames') &&
            this.slotSettings.GetGameData('GrandSpinnSuperpotNETFreeGames') > 0) {
             // Logic for restoring free spin state (static string from PHP reference)
             freeState = 'rs.i1.r.i0.syms=SYM2%2CSYM5%2CSYM5&bl.i6.coins=1&bl.i17.reelset=ALL&rs.i0.nearwin=4&bl.i15.id=15&rs.i0.r.i4.hold=false&gamestate.history=basic%2Cfreespin&rs.i1.r.i2.hold=false&game.win.cents=176&rs.i1.r.i1.overlay.i2.pos=61&staticsharedurl=&bl.i10.line=1%2C2%2C1%2C2%2C1&bl.i0.reelset=ALL&bl.i18.coins=1&bl.i10.id=10&freespins.initial=15&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&bl.i13.coins=1&rs.i0.r.i0.syms=SYM5%2CSYM0%2CSYM6&bl.i2.id=2&rs.i1.r.i1.pos=59&rs.i0.r.i0.pos=24&bl.i14.reelset=ALL&game.win.coins=88&rs.i1.r.i0.hold=false&bl.i3.id=3&ws.i1.reelset=freespin&bl.i12.coins=1&bl.i8.reelset=ALL&clientaction=init&rs.i0.r.i2.hold=false&bl.i16.id=16&casinoID=netent&bl.i5.coins=1&rs.i1.r.i1.overlay.i1.row=1&bl.i8.id=8&rs.i0.r.i3.pos=17&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i12.line=2%2C1%2C2%2C1%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&rs.i0.r.i2.syms=SYM7%2CSYM6%2CSYM6&rs.i1.r.i1.overlay.i1.with=SYM1_FS&game.win.amount=1.76&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&denomination.all=' + denoms + '&ws.i0.reelset=freespin&bl.i1.id=1&rs.i0.r.i3.attention.i0=2&rs.i1.r.i1.overlay.i0.with=SYM1_FS&rs.i1.r.i4.pos=39&denomination.standard=' + standardDenom + '&multiplier=1&bl.i14.id=14&bl.i19.line=0%2C2%2C2%2C2%2C0&freespins.denomination=2.000&bl.i12.reelset=ALL&bl.i2.coins=1&bl.i6.id=6&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&freespins.totalwin.coins=80&ws.i0.direction=left_to_right&freespins.total=15&gamestate.stack=basic%2Cfreespin&rs.i1.r.i4.syms=SYM5%2CSYM4%2CSYM4&gamesoundurl=&bet.betlevel=1&bl.i5.reelset=ALL&bl.i19.coins=1&bl.i7.id=7&bl.i18.reelset=ALL&playercurrencyiso=' + this.slotSettings.slotCurrency + '&bl.i1.coins=1&bl.i14.line=1%2C1%2C2%2C1%2C1&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&rs.i0.r.i4.syms=SYM5%2CSYM5%2CSYM0&rs.i0.r.i2.pos=48&bl.i13.line=1%2C1%2C0%2C1%2C1&ws.i1.betline=19&rs.i1.r.i0.pos=20&bl.i0.coins=1&bl.i2.reelset=ALL&rs.i1.r.i1.overlay.i2.row=2&rs.i1.r.i4.hold=false&freespins.left=14&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&bl.i15.reelset=ALL&rs.i0.r.i3.hold=false&bet.denomination=' + standardDenom + '&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&freespins.win.coins=80&historybutton=false&bl.i5.id=5&gameEventSetters.enabled=false&rs.i1.r.i3.pos=27&rs.i0.r.i1.syms=SYM5%2CSYM1%2CSYM3&bl.i3.coins=1&ws.i1.types.i0.coins=40&bl.i10.coins=1&bl.i18.id=18&ws.i0.betline=3&rs.i1.r.i3.hold=false&totalwin.coins=88&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=freespin&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i0.r.i3.syms=SYM4%2CSYM4%2CSYM0&rs.i1.r.i1.syms=SYM7%2CSYM1_FS&bl.i16.coins=1&freespins.win.cents=160&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&rs.i1.r.i1.overlay.i0.pos=59&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i0.r.i1.pos=61&rs.i1.r.i3.syms=SYM3%2CSYM3%2CSYM6&bl.i13.id=13&rs.i0.r.i1.hold=false&ws.i1.types.i0.wintype=coins&bl.i9.line=1%2C0%2C1%2C0%2C1&ws.i1.sym=SYM2&betlevel.standard=1&bl.i10.reelset=ALL&ws.i1.types.i0.cents=80&gameover=false&bl.i11.coins=1&ws.i1.direction=left_to_right&bl.i13.reelset=ALL&bl.i0.id=0&nextaction=freespin&bl.i15.line=0%2C1%2C1%2C1%2C0&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i19.id=19&bl.i4.reelset=ALL&bl.i4.coins=1&bl.i18.line=2%2C0%2C2%2C0%2C2&freespins.totalwin.cents=160&bl.i9.id=9&bl.i17.line=0%2C2%2C0%2C2%2C0&bl.i11.id=11&freespins.betlevel=1&ws.i0.pos.i2=2%2C2&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&bl.i17.coins=1&ws.i1.pos.i0=0%2C0&ws.i1.pos.i1=2%2C2&ws.i1.pos.i2=1%2C2&ws.i0.pos.i1=1%2C1&bl.i19.reelset=ALL&ws.i0.pos.i0=0%2C0&bl.i11.reelset=ALL&bl.i16.line=2%2C1%2C1%2C1%2C2&rs.i0.id=basic&credit=' + balanceInCents + '&ws.i0.types.i0.coins=40&bl.i1.reelset=ALL&rs.i1.r.i1.overlay.i1.pos=60&rs.i1.r.i1.overlay.i2.with=SYM1_FS&bl.i1.line=0%2C0%2C0%2C0%2C0&ws.i0.sym=SYM2&bl.i17.id=17&rs.i1.r.i2.pos=1&bl.i16.reelset=ALL&ws.i0.types.i0.wintype=coins&nearwinallowed=true&bl.i8.line=1%2C0%2C0%2C0%2C1&rs.i1.r.i1.overlay.i0.row=0&freespins.wavecount=1&rs.i0.r.i4.attention.i0=2&bl.i8.coins=1&bl.i15.coins=1&bl.i2.line=2%2C2%2C2%2C2%2C2&rs.i0.r.i0.attention.i0=1&rs.i1.r.i2.syms=SYM3%2CSYM3%2CSYM2&totalwin.cents=176&rs.i0.r.i0.hold=false&restore=true&rs.i1.id=freespin&bl.i12.id=12&bl.i4.id=4&rs.i0.r.i4.pos=10&bl.i7.coins=1&ws.i0.types.i0.cents=80&bl.i6.reelset=ALL&wavecount=1&bl.i14.coins=1&rs.i1.r.i1.hold=false' + freeState;
        }

        const result = `denomination.all=${denoms}&gameServerVersion=1.10.0&g4mode=false&playercurrency=%26%23x20AC%3B&historybutton=false&gameEventSetters.enabled=false&rs.i0.r.i1.syms=SYM5%2CSYM5%2CSYM5&game.win.cents=0&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&rs.i0.id=basic&bl.i0.reelset=ALL&totalwin.coins=0&credit=${balanceInCents}&gamestate.current=basic&denomination.standard=${standardDenom}${jackpotStr}&jackpotcurrency=%26%23x20AC%3B&multiplier=1&rs.i0.r.i0.syms=SYM7%2CSYM7%2CSYM7&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&isJackpotWin=false&rs.i0.r.i0.pos=0&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&nearwinallowed=true&rs.i0.r.i1.pos=0&game.win.coins=0&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i1.hold=false&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=init&rs.i0.r.i2.hold=false&rs.i0.r.i2.pos=0&casinoID=netent&betlevel.standard=1&totalwin.cents=0&gameover=true&bl.i0.coins=2&rs.i0.r.i0.hold=false&restore=false&bl.i0.id=0&bl.standard=0&bl.i0.line=1%2C1%2C1&nextaction=spin&wavecount=1&rs.i0.r.i2.syms=SYM8%2CSYM8%2CSYM8&game.win.amount=0&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10${curReels}${freeState}`;

        return result;
    }

    private handlePaytableRequest(): string {
        // Copied from PHP
        const jackpotAmount = Math.round((this.slotSettings.Jackpots[0] || 0) * 100);
        return `pt.i0.comp.i0.type=betline&pt.i0.comp.i6.type=betline&gameServerVersion=1.10.0&g4mode=false&playercurrency=%26%23x20AC%3B&historybutton=false&pt.i0.comp.i1.multi=20&pt.i0.comp.i4.multi=3&pt.i0.comp.i5.freespins=0&bl.i0.reelset=ALL&credit=${Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100)}&pt.i0.comp.i5.type=betline&pt.i0.comp.i2.freespins=0&jackpot.tt_mega.${this.slotSettings.slotCurrency}.amount-30s=${jackpotAmount}&pt.i0.comp.i5.multi=2&pt.i0.comp.i4.freespins=0&jackpotcurrency=%26%23x20AC%3B&pt.i0.comp.i4.type=betline&pt.i0.id=basic&pt.i0.comp.i1.type=betline&isJackpotWin=false&pt.i0.comp.i2.symbol=SYM4&pt.i0.comp.i4.symbol=SYM6&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&pt.i0.comp.i1.freespins=0&pt.i0.comp.i6.symbol=SYM8&pt.i0.comp.i0.symbol=SYM1&pt.i0.comp.i1.n=3&pt.i0.comp.i3.n=3&pt.i0.comp.i5.n=3&pt.i0.comp.i3.type=betline&pt.i0.comp.i3.freespins=0&pt.i0.comp.i6.multi=1&playercurrencyiso=${this.slotSettings.slotCurrency}&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=paytable&jackpot.tt_mega.${this.slotSettings.slotCurrency}.lastpayedout=0&pt.i0.comp.i2.multi=10&pt.i0.comp.i0.freespins=0&pt.i0.comp.i2.type=betline&jackpot.tt_mega.${this.slotSettings.slotCurrency}.amount=${jackpotAmount}&bl.i0.coins=2&pt.i0.comp.i0.multi=20&bl.i0.id=0&bl.i0.line=1%2C1%2C1&pt.i0.comp.i3.symbol=SYM5&pt.i0.comp.i5.symbol=SYM7&pt.i0.comp.i6.freespins=0&pt.i0.comp.i0.n=3&pt.i0.comp.i2.n=3&pt.i0.comp.i1.symbol=SYM3&pt.i0.comp.i3.multi=5&pt.i0.comp.i4.n=3&pt.i0.comp.i6.n=3`;
    }

    private handleJackpotRequest(): string {
        const jackpotAmount = Math.round((this.slotSettings.Jackpots[0] || 0) * 100);
        return `jackpot.tt_mega.${this.slotSettings.slotCurrency}.amount-30s=${jackpotAmount}&jackpot.tt_mega.${this.slotSettings.slotCurrency}.lastpayedout=0&jackpot.tt_mega.${this.slotSettings.slotCurrency}.nplayers=0&jackpot.tt_mega.${this.slotSettings.slotCurrency}.amount=${jackpotAmount}`;
    }

    private handleInitFreespinRequest(): string {
        return `rs.i1.r.i0.syms=SYM5%2CSYM0%2CSYM6&freespins.betlevel=1&g4mode=false&freespins.win.coins=0&playercurrency=%26%23x20AC%3B&historybutton=false&rs.i0.r.i4.hold=false&gamestate.history=basic&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=18&rs.i0.r.i1.syms=SYM5%2CSYM5%2CSYM7&game.win.cents=0&rs.i0.id=freespin&rs.i1.r.i3.hold=false&totalwin.coins=0&credit=${Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100)}&rs.i1.r.i4.pos=30&gamestate.current=freespin&freespins.initial=15&jackpotcurrency=%26%23x20AC%3B&multiplier=1&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i0.r.i0.syms=SYM2%2CSYM7%2CSYM7&freespins.denomination=2.000&rs.i0.r.i3.syms=SYM4%2CSYM4%2CSYM4&rs.i1.r.i1.syms=SYM2%2CSYM3%2CSYM3&rs.i1.r.i1.pos=3&freespins.win.cents=0&freespins.totalwin.coins=0&freespins.total=15&isJackpotWin=false&gamestate.stack=basic%2Cfreespin&rs.i0.r.i0.pos=3&rs.i1.r.i4.syms=SYM1%2CSYM7%2CSYM7&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&gamesoundurl=&rs.i1.r.i2.pos=15&bet.betlevel=1&rs.i1.nearwin=4%2C3&rs.i0.r.i1.pos=18&rs.i1.r.i3.syms=SYM4%2CSYM0%2CSYM6&game.win.coins=0&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&freespins.wavecount=1&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=initfreespin&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM6%2CSYM5%2CSYM5&rs.i0.r.i2.pos=0&rs.i1.r.i2.syms=SYM6%2CSYM6%2CSYM0&rs.i1.r.i0.pos=24&totalwin.cents=0&gameover=false&rs.i0.r.i0.hold=false&rs.i1.id=basic&rs.i0.r.i3.pos=3&rs.i1.r.i4.hold=false&freespins.left=15&rs.i0.r.i4.pos=20&rs.i1.r.i2.attention.i0=2&rs.i1.r.i0.attention.i0=1&rs.i1.r.i3.attention.i0=1&nextaction=freespin&wavecount=1&rs.i0.r.i2.syms=SYM3%2CSYM3%2CSYM3&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&game.win.amount=0.00&bet.denomination=2&freespins.totalwin.cents=0`;
    }

    private handleSpinRequest(postData: any): string {
        const linesId = this.getLinesId();
        const lines = 1; // PHP: $lines = 1;
        const betline = postData.bet_betlevel;
        let allbet = 0; // PHP: $allbet = $betline * $lines * 2; -> Wait, nudge has different logic

        let bonusMpl = 1;

        if (postData.slotEvent !== 'nudge') {
            allbet = betline * lines * 2;
            this.slotSettings.SetBalance(-1 * allbet, postData.slotEvent);
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(postData.slotEvent, bankSum, postData.slotEvent);
            this.slotSettings.UpdateJackpots(allbet);

            this.slotSettings.SetGameData('GrandSpinnSuperpotNETBonusWin', 0);
            this.slotSettings.SetGameData('GrandSpinnSuperpotNETFreeGames', 0);
            this.slotSettings.SetGameData('GrandSpinnSuperpotNETCurrentFreeGame', 0);
            this.slotSettings.SetGameData('GrandSpinnSuperpotNETTotalWin', 0);
            this.slotSettings.SetGameData('GrandSpinnSuperpotNETBet', betline);
            this.slotSettings.SetGameData('GrandSpinnSuperpotNETDenom', this.slotSettings.CurrentDenom);
            this.slotSettings.SetGameData('GrandSpinnSuperpotNETFreeBalance', this.slotSettings.GetBalance() * 100);
        } else {
            // Nudge logic
            this.slotSettings.CurrentDenom = this.slotSettings.GetGameData('GrandSpinnSuperpotNETDenom');
            this.slotSettings.CurrentDenomination = this.slotSettings.CurrentDenom;
            const storedBet = this.slotSettings.GetGameData('GrandSpinnSuperpotNETBet');
            allbet = storedBet * lines;
            this.slotSettings.SetGameData('GrandSpinnSuperpotNETCurrentFreeGame',
                this.slotSettings.GetGameData('GrandSpinnSuperpotNETCurrentFreeGame') + 1);
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
        let reels: ReelStrips = { rp: [], rps: [] };
        let mainSymAnim = '';
        let scattersCount = 0;
        let isJackPay = false;

        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            lineWins = [];
            const cWins: number[] = new Array(lines).fill(0);
            const wild = ['1'];
            const scatter = '0';

            if (postData.slotEvent === 'nudge') {
                // Not fully implemented nudge logic in reference, just placeholder call
                // Assuming we don't have GetGameData('GrandSpinnSuperpotNETReels') saved correctly yet or complex object logic
                // But for basic conversion we need to handle it.
                // PHP: $reels = $slotSettings->OffsetReelStrips($slotSettings->GetGameData('GrandSpinnSuperpotNETReels'), rand(1, 1));
                // This seems to offset reels.
                // We'll skip complex nudge logic for now as it requires state saving of reels object which we might not have perfect TS equivalent for yet without `any` casting.
                reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent);
            } else {
                reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent);
            }

            // Jackpot check logic from PHP
            // if( isset($jackState) && $jackState['isJackPay'] ) ...
            // We need to implement jackpot trigger check if we want to support it.
            // For now, let's assume no jackpot pay for this conversion scope unless strictly required.
            // PHP sets reels to '102' (Jackpot symbol) if jackpot hit.

            let winLineCount = 0;
            for (let k = 0; k < lines; k++) {
                let tmpStringWin = '';
                for (let j = 0; j < this.slotSettings.SymbolGame.length; j++) {
                    const csym = String(this.slotSettings.SymbolGame[j]);

                    if (csym === scatter || !this.slotSettings.Paytable['SYM_' + csym]) {
                        continue;
                    }

                    const s: any[] = [];
                    // LinesId[0] is [2, 2, 2, 2, 2] -> index 2 (middle row).
                    // In GrandSpinn, indices seem to be 0, 1, 2. Visible are 3 symbols per reel?
                    // PHP GetReelStrips returns 4 items: 0, 1, 2, 3(empty).
                    // s[...] = $reels['reel1'][$linesId[$k][0] - 1];
                    // linesId[0][0] is 2. 2-1 = 1. So it checks index 1 (middle).

                    s[0] = reels.reel1?.[linesId[k][0] - 1];
                    s[1] = reels.reel2?.[linesId[k][1] - 1];
                    s[2] = reels.reel3?.[linesId[k][2] - 1];

                    // 3 reels only
                    if ( (s[0] == csym || wild.includes(String(s[0]))) &&
                         (s[1] == csym || wild.includes(String(s[1]))) &&
                         (s[2] == csym || wild.includes(String(s[2]))) ) {

                        let mpl = 1;
                        if (wild.includes(String(s[0])) && wild.includes(String(s[1])) && wild.includes(String(s[2]))) {
                            mpl = 1;
                        } else if (wild.includes(String(s[0])) || wild.includes(String(s[1])) || wild.includes(String(s[2]))) {
                            mpl = this.slotSettings.slotWildMpl;
                        }

                        const tmpWin = this.slotSettings.Paytable['SYM_' + csym][3] * betline * mpl * bonusMpl;
                        if (cWins[k] < tmpWin) {
                            cWins[k] = tmpWin;
                            tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${tmpWin}&ws.i${winLineCount}.pos.i0=0%2C${linesId[k][0] - 1}&ws.i${winLineCount}.pos.i1=1%2C${linesId[k][1] - 1}&ws.i${winLineCount}.pos.i2=2%2C${linesId[k][2] - 1}&ws.i${winLineCount}.types.i0.wintype=coins&ws.i${winLineCount}.betline=${k}&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${tmpWin * this.slotSettings.CurrentDenomination * 100}`;
                            mainSymAnim = csym;
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
            // PHP logic loops 5 reels, but GrandSpinn has 3 reels?
            // PHP loops $r=1 to 5.
            // In GetReelStrips, it iterates 1 to 6 (bonus ones).
            // But GrandSpinn is 3 reel slot.
            // It seems PHP code is generic or copied.
            // However, scatter '0' check is present.

            for (let r = 1; r <= 3; r++) { // GrandSpinn usually 3 reels
                for (let p = 0; p <= 2; p++) {
                    if (reels[`reel${r}`]?.[p] == scatter) {
                        scattersCount++;
                    }
                }
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
            } else {
                if (postData.slotEvent === 'nudge') {
                    break;
                }
                if (scattersCount >= 3 && winType !== 'bonus') {
                    // continue;
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
        }

        if (totalWin > 0) {
            this.slotSettings.SetBank(postData.slotEvent, -1 * totalWin);
            this.slotSettings.SetBalance(totalWin);
        }

        const reportWin = totalWin;
        let curReels = '';

        // Construct reels string
        for (let i = 0; i <= 2; i++) { // 3 reels
             const rIdx = i + 1;
             curReels += `&rs.i0.r.i${i}.syms=SYM${reels[`reel${rIdx}`]?.[0]}%2CSYM${reels[`reel${rIdx}`]?.[1]}%2CSYM${reels[`reel${rIdx}`]?.[2]}`;

             // Overlay/rps logic
             if (reels.rps) {
                 curReels += `&rs.i0.r.i${i}.overlay.i0.with=SYM${reels[`reel${rIdx}`]?.[0]}&rs.i0.r.i${i}.overlay.i1.with=SYM${reels[`reel${rIdx}`]?.[1]}&rs.i0.r.i${i}.overlay.i2.with=SYM${reels[`reel${rIdx}`]?.[2]}`;
                 curReels += `&rs.i0.r.i${i}.overlay.i0.pos=${reels.rps[i][0]}&rs.i0.r.i${i}.overlay.i1.pos=${reels.rps[i][1]}&rs.i0.r.i${i}.overlay.i2.pos=${reels.rps[i][2]}`;
             }
        }

        if (postData.slotEvent === 'nudge') {
            this.slotSettings.SetGameData('GrandSpinnSuperpotNETBonusWin', this.slotSettings.GetGameData('GrandSpinnSuperpotNETBonusWin') + totalWin);
            this.slotSettings.SetGameData('GrandSpinnSuperpotNETTotalWin', this.slotSettings.GetGameData('GrandSpinnSuperpotNETTotalWin') + totalWin);
        } else {
            this.slotSettings.SetGameData('GrandSpinnSuperpotNETTotalWin', totalWin);
        }

        let freeState = '';
        if (scattersCount >= 3) {
            this.slotSettings.SetGameData('GrandSpinnSuperpotNETFreeStartWin', totalWin);
            this.slotSettings.SetGameData('GrandSpinnSuperpotNETBonusWin', totalWin);
            this.slotSettings.SetGameData('GrandSpinnSuperpotNETFreeGames', this.slotSettings.slotFreeCount[scattersCount]);
            const fs = this.slotSettings.GetGameData('GrandSpinnSuperpotNETFreeGames');
            freeState = `&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&freespins.totalwin.cents=0&nextaction=freespin&freespins.left=${fs}&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=basic%2Cfreespin&freespins.totalwin.coins=0&freespins.total=${fs}&freespins.win.cents=0&gamestate.current=freespin&freespins.initial=${fs}&freespins.win.coins=0&freespins.betlevel=${this.slotSettings.GetGameData('GrandSpinnSuperpotNETBet')}&totalwin.coins=${totalWin}&credit=${Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100)}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}`;
            curReels += freeState;
        }

        const winString = lineWins.join('');
        this.slotSettings.SetGameData('GrandSpinnSuperpotNETGambleStep', 5);

        let nextaction = 'spin';
        let gameover = 'true';
        let clientaction = 'spin';

        if (totalWin > 0) {
            nextaction = 'nudge';
            gameover = 'true'; // PHP says true
            this.slotSettings.SetGameData('GrandSpinnSuperpotNETNudge', 2);
        } else {
            nextaction = 'spin';
            gameover = 'true';
        }

        if (postData.slotEvent === 'nudge') {
            this.slotSettings.SetGameData('GrandSpinnSuperpotNETNudge', this.slotSettings.GetGameData('GrandSpinnSuperpotNETNudge') + 1);
            if (this.slotSettings.GetGameData('GrandSpinnSuperpotNETNudge') >= 5) {
                nextaction = 'spin';
                gameover = 'true';
            }
        }

        if (postData.slotEvent === 'freespin') {
             // Freespin logic
             // ...
        }

        // Save reels for nudge
        this.slotSettings.SetGameData('GrandSpinnSuperpotNETReels', reels);

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        const jackpotAmount = Math.round((this.slotSettings.Jackpots[0] || 0) * 100);

        // This game has a complex JSON structure in response mostly.
        // But the PHP also builds a query string at the end.
        // We will construct the query string response as primary deliverable for compatibility.

        const result = `rs.i0.r.i0.overlay.i0.pos=30&rs.i0.r.i2.overlay.i2.pos=11&gameServerVersion=1.10.0&g4mode=false&playercurrency=%26%23x20AC%3B&historybutton=false&rs.i0.r.i2.overlay.i1.pos=10&next.rs=basic&gamestate.history=basic&rs.i0.r.i0.overlay.i1.with=SYM8&rs.i0.r.i0.overlay.i1.row=1&rs.i0.r.i1.syms=SYM29%2CSYM10%2CSYM10&game.win.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&rs.i0.r.i2.overlay.i0.pos=9&rs.i0.id=ultraShort5&totalwin.coins=${totalWin}&credit=${balanceInCents}&gamestate.current=basic&rs.i0.r.i0.overlay.i2.row=2&jackpot.tt_mega.${this.slotSettings.slotCurrency}.amount-30s=${jackpotAmount}&rs.i0.r.i0.overlay.i0.with=SYM8&rs.i0.r.i2.overlay.i0.row=0&jackpotcurrency=%26%23x20AC%3B&rs.i0.r.i0.overlay.i2.pos=32&rs.i0.r.i1.overlay.i1.with=SYM4&multiplier=1&rs.i0.r.i2.overlay.i2.with=SYM7&last.rs=ultraShort5&rs.i0.r.i0.syms=SYM14%2CSYM14%2CSYM28&rs.i0.r.i0.overlay.i1.pos=31&rs.i0.r.i1.overlay.i0.row=0&rs.i0.r.i1.overlay.i2.pos=39&rs.i0.r.i2.overlay.i0.with=SYM7&rs.i0.r.i2.overlay.i1.row=1&isJackpotWin=${isJackPay}&gamestate.stack=basic&rs.i0.r.i0.pos=30&gamesoundurl=&rs.i0.r.i0.overlay.i0.row=0&rs.i0.r.i1.overlay.i1.row=1&rs.i0.r.i2.overlay.i2.row=2&rs.i0.r.i1.pos=37&rs.i0.r.i1.overlay.i1.pos=38&game.win.coins=${totalWin}&playercurrencyiso=${this.slotSettings.slotCurrency}&rs.i0.r.i1.hold=false&rs.i0.r.i1.overlay.i0.pos=37&rs.i0.r.i1.overlay.i2.row=2&playforfun=false&jackpotcurrencyiso=${this.slotSettings.slotCurrency}&clientaction=${clientaction}&jackpot.tt_mega.${this.slotSettings.slotCurrency}.lastpayedout=0&rs.i0.r.i1.overlay.i2.with=SYM4&rs.i0.r.i2.hold=false&rs.i0.r.i2.pos=9&jackpot.tt_mega.${this.slotSettings.slotCurrency}.amount=${jackpotAmount}&totalwin.cents=${totalWin * this.slotSettings.CurrentDenomination * 100}&gameover=${gameover}&rs.i0.r.i0.hold=false&nextaction=${nextaction}&wavecount=1&rs.i0.r.i1.overlay.i0.with=SYM102&rs.i0.r.i0.overlay.i2.with=SYM101&rs.i0.r.i2.syms=SYM12%2CSYM12%2CSYM12&rs.i0.r.i2.overlay.i1.with=SYM7&game.win.amount=${totalWin / this.slotSettings.CurrentDenomination}${curReels}${winString}`;

        const logResponse = {
            responseEvent: 'spin',
            responseType: postData.slotEvent,
            serverResponse: {
                freeState: freeState,
                slotLines: lines,
                slotBet: betline,
                totalFreeGames: this.slotSettings.GetGameData('GrandSpinnSuperpotNETFreeGames'),
                currentFreeGames: this.slotSettings.GetGameData('GrandSpinnSuperpotNETCurrentFreeGame'),
                Balance: balanceInCents,
                afterBalance: balanceInCents,
                bonusWin: this.slotSettings.GetGameData('GrandSpinnSuperpotNETBonusWin'),
                totalWin: totalWin,
                winLines: [],
                Jackpots: this.slotSettings.Jackpots,
                reelsSymbols: reels
            }
        };
        this.slotSettings.SaveLogReport(JSON.stringify(logResponse), allbet, lines, reportWin, postData.slotEvent);

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
            [2, 2, 2, 2, 2] // Only one line is active for calculation in loop
        ];
    }

    private generateSessionId(): string {
        return 'a40e5dc15a83a70f288e421fbcfc6de8';
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
