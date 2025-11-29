// Server.ts - TheWolfsBaneNET game server
// Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines
// Data injection pattern - NO database calls or legacy PHP constructs

import { SlotSettings, ReelStrips } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'TheWolfsBaneNET';

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
        if (postData.action === 'initbonus') {
            postData.slotEvent = 'initbonus';
        }
        if (postData.action === 'bonusaction') {
            postData.slotEvent = 'bonusaction';
        }
        if (postData.action === 'endbonus') {
            postData.slotEvent = 'endbonus';
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
            case 'spin':
                return this.handleSpinRequest(postData);
            case 'initbonus':
                return this.handleInitBonusRequest();
            case 'bonusaction':
                return this.handleBonusActionRequest(postData);
            case 'endbonus':
                return this.handleEndBonusRequest();
            case 'initfreespin':
                return this.handleInitFreespinRequest();
            default:
                return this.createErrorResponse("unknown action");
        }
    }

    private handleInitRequest(): string {
        const lastEvent = this.slotSettings.GetHistory();

        // Reset game state
        this.slotSettings.SetGameData(this.slotId + 'BonusWin', 0);
        this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
        this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
        this.slotSettings.SetGameData(this.slotId + 'TotalWin', 0);
        this.slotSettings.SetGameData(this.slotId + 'FreeBalance', 0);

        let freeState = '';
        let curReels = '';

        if (lastEvent && lastEvent !== 'NULL' && lastEvent.serverResponse) {
            const serverResponse = lastEvent.serverResponse;
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', serverResponse.totalFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', serverResponse.currentFreeGames);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', serverResponse.bonusWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', serverResponse.Balance);
            this.slotSettings.SetGameData(this.slotId + 'ReelsType', serverResponse.ReelsType);
            freeState = serverResponse.freeState || '';

            const reels = serverResponse.reelsSymbols;
            if (reels) {
                 curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1[0]}%2CSYM${reels.reel1[1]}%2CSYM${reels.reel1[2]}`;
                 curReels += `&rs.i0.r.i1.syms=SYM${reels.reel2[0]}%2CSYM${reels.reel2[1]}%2CSYM${reels.reel2[2]}`;
                 curReels += `&rs.i0.r.i2.syms=SYM${reels.reel3[0]}%2CSYM${reels.reel3[1]}%2CSYM${reels.reel3[2]}`;
                 curReels += `&rs.i0.r.i3.syms=SYM${reels.reel4[0]}%2CSYM${reels.reel4[1]}%2CSYM${reels.reel4[2]}`;
                 curReels += `&rs.i0.r.i4.syms=SYM${reels.reel5[0]}%2CSYM${reels.reel5[1]}%2CSYM${reels.reel5[2]}`;

                 // Add duplicated reels data as seen in PHP
                 curReels += `&rs.i1.r.i0.syms=SYM${reels.reel1[0]}%2CSYM${reels.reel1[1]}%2CSYM${reels.reel1[2]}`;
                 curReels += `&rs.i1.r.i1.syms=SYM${reels.reel2[0]}%2CSYM${reels.reel2[1]}%2CSYM${reels.reel2[2]}`;
                 curReels += `&rs.i1.r.i2.syms=SYM${reels.reel3[0]}%2CSYM${reels.reel3[1]}%2CSYM${reels.reel3[2]}`;
                 curReels += `&rs.i1.r.i3.syms=SYM${reels.reel4[0]}%2CSYM${reels.reel4[1]}%2CSYM${reels.reel4[2]}`;
                 curReels += `&rs.i1.r.i4.syms=SYM${reels.reel5[0]}%2CSYM${reels.reel5[1]}%2CSYM${reels.reel5[2]}`;

                 const rp = reels.rp?.[0] || 0;
                 for (let i = 0; i < 5; i++) {
                     curReels += `&rs.i0.r.i${i}.pos=${rp}`;
                 }
                  for (let i = 0; i < 5; i++) {
                     curReels += `&rs.i1.r.i${i}.pos=${rp}`;
                 }
            }
        } else {
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

        // Format denominations
        // In Typescript, we need to ensure Denominations array exists and map it
        const denominations = (this.slotSettings.game?.denominations || [1]).map(d => d * 100);

        if (this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') < this.slotSettings.GetGameData(this.slotId + 'FreeGames') && this.slotSettings.GetGameData(this.slotId + 'FreeGames') > 0) {
              const totalWin = this.slotSettings.GetGameData(this.slotId + 'BonusWin');
              const reelsType = this.slotSettings.GetGameData(this.slotId + 'ReelsType');
              const currentDenomination = this.slotSettings.CurrentDenomination * 100;
              const bonusWin = this.slotSettings.GetGameData(this.slotId + 'BonusWin');
              const totalFreeGames = this.slotSettings.GetGameData(this.slotId + 'FreeGames');
              const currentFreeGame = this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame');
              const gameDenom = this.slotSettings.GetGameData(this.slotId + 'GameDenom') * 100;
              const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

              freeState = 'previous.rs.i0=' + reelsType + '&rs.i1.r.i0.syms=SYM6%2CSYM5%2CSYM4&bl.i6.coins=1&rs.i0.r.i0.overlay.i0.pos=21&rs.i0.r.i4.hold=false&gamestate.history=basic%2Cfreespin&rs.i1.r.i2.hold=false&game.win.cents=' + (totalWin * this.slotSettings.CurrentDenomination * 100) + "\t&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i0.reelset=ALL&freespins.initial=10&rs.i0.r.i0.overlay.i0.with=SYM1&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM1%2CSYM3%2CSYM6&bl.i2.id=2&rs.i1.r.i1.pos=78&rs.i3.r.i4.pos=26&rs.i0.r.i0.pos=19&rs.i2.r.i3.pos=4&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=1&rs.i2.id=freespin_expanding&game.win.coins=" + bonusWin + '&rs.i1.r.i0.hold=false&bl.i3.id=3&ws.i1.reelset=' + reelsType + '&bl.i8.reelset=ALL&clientaction=init&rs.i4.r.i0.hold=false&rs.i0.r.i2.hold=false&rs.i4.r.i3.syms=SYM4%2CSYM6%2CSYM3&casinoID=netent&bl.i5.coins=1&rs.i3.r.i2.hold=false&bl.i8.id=8&rs.i0.r.i3.pos=26&rs.i4.r.i0.syms=SYM6%2CSYM9%2CSYM7&bl.i6.line=2%2C2%2C1%2C2%2C2&rs.i1.r.i2.attention.i0=1&bl.i0.line=1%2C1%2C1%2C1%2C1&rs.i4.r.i2.pos=2&rs.i0.r.i2.syms=SYM7%2CSYM1%2CSYM9&game.win.amount=' + bonusWin + '&betlevel.all=1&denomination.all=' + denominations.join('%2C') + '&ws.i2.pos.i1=1%2C2&rs.i2.r.i0.pos=1&current.rs.i0=' + reelsType + '&ws.i2.pos.i0=2%2C2&ws.i0.reelset=' + reelsType + '&ws.i2.pos.i2=0%2C2&bl.i1.id=1&rs.i3.r.i2.syms=SYM8%2CSYM10%2CSYM5&rs.i1.r.i4.pos=54&denomination.standard=' + currentDenomination + '&rs.i3.id=freespin_multiplier&multiplier=1&freespins.denomination=5.000&bl.i2.coins=1&bl.i6.id=6&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&freespins.totalwin.coins=' + bonusWin + '&ws.i0.direction=left_to_right&freespins.total=' + totalFreeGames + '&gamestate.stack=basic%2Cfreespin&rs.i1.r.i4.syms=SYM6%2CSYM7%2CSYM0&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&bet.betlevel=1&rs.i4.r.i2.hold=false&bl.i5.reelset=ALL&rs.i4.r.i1.syms=SYM3%2CSYM5%2CSYM4&bl.i7.id=7&rs.i2.r.i4.pos=26&rs.i3.r.i0.syms=SYM10%2CSYM6%2CSYM9&playercurrencyiso=' + this.slotSettings.slotCurrency + '&bl.i1.coins=1&rs.i4.r.i1.hold=false&ws.i2.types.i0.coins=5&rs.i3.r.i2.pos=2&ws.i2.sym=SYM9&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&rs.i0.r.i4.syms=SYM7%2CSYM6%2CSYM0&rs.i0.r.i2.pos=1&ws.i1.betline=5&rs.i1.r.i0.pos=75&bl.i0.coins=1&ws.i2.types.i0.wintype=coins&rs.i2.r.i0.syms=SYM7%2CSYM9%2CSYM10&bl.i2.reelset=ALL&rs.i3.r.i1.syms=SYM9%2CSYM3%2CSYM5&rs.i1.r.i4.hold=false&freespins.left=' + (totalFreeGames - currentFreeGame) + '&rs.i4.r.i1.pos=0&rs.i4.r.i2.syms=SYM9%2CSYM10%2CSYM8&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9&rs.i1.r.i1.attention.i0=2&rs.i3.r.i0.hold=false&rs.i0.r.i3.hold=false&bet.denomination=' + gameDenom + '&rs.i4.id=freespin_spreading&rs.i2.r.i1.hold=false&gameServerVersion=1.0.0&g4mode=false&freespins.win.coins=' + bonusWin + '&historybutton=false&ws.i2.direction=left_to_right&bl.i5.id=5&gameEventSetters.enabled=false&next.rs=' + reelsType + '&ws.i2.types.i0.cents=25&rs.i1.r.i3.pos=18&rs.i0.r.i1.syms=SYM9%2CSYM6%2CSYM1&bl.i3.coins=1&ws.i1.types.i0.coins=30&rs.i2.r.i1.pos=6&rs.i4.r.i4.pos=5&ws.i0.betline=6&rs.i1.r.i3.hold=false&totalwin.coins=' + bonusWin + '&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=freespin&rs.i4.r.i0.pos=3&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9&rs.i3.r.i1.hold=false&rs.i0.r.i3.syms=SYM1%2CSYM6%2CSYM5&rs.i1.r.i1.syms=SYM7%2CSYM9%2CSYM0&freespins.win.cents=' . (totalWin * this.slotSettings.CurrentDenomination * 100) . "\t&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&rs.i2.r.i3.hold=false&ws.i2.reelset=" . reelsType + '&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9&rs.i0.r.i1.pos=53&rs.i4.r.i4.syms=SYM10%2CSYM8%2CSYM6&rs.i1.r.i3.syms=SYM3%2CSYM8%2CSYM7&rs.i0.r.i1.hold=false&rs.i2.r.i1.syms=SYM10%2CSYM3%2CSYM6&ws.i1.types.i0.wintype=coins&bl.i9.line=1%2C0%2C1%2C0%2C1&ws.i1.sym=SYM9&betlevel.standard=1&ws.i1.types.i0.cents=150&gameover=false&rs.i3.r.i3.pos=15&ws.i1.direction=left_to_right&bl.i0.id=0&nextaction=freespin&bl.i3.line=0%2C1%2C2%2C1%2C0&rs.i1.r.i4.attention.i0=2&bl.i4.reelset=ALL&bl.i4.coins=1&freespins.totalwin.cents=' . (totalWin * this.slotSettings.CurrentDenomination * 100) . "\t&bl.i9.id=9&ws.i2.betline=2&ws.i0.pos.i3=3%2C2&freespins.betlevel=1&ws.i0.pos.i2=2%2C1&ws.i1.pos.i3=2%2C1&rs.i4.r.i3.pos=4&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&rs.i4.r.i4.hold=false&ws.i1.pos.i0=0%2C0&ws.i1.pos.i1=3%2C0&ws.i1.pos.i2=1%2C0&ws.i0.pos.i1=0%2C2&ws.i0.pos.i0=1%2C2&rs.i2.r.i4.syms=SYM4%2CSYM3%2CSYM6&rs.i4.r.i3.hold=false&rs.i0.id=" . reelsType + '&credit=' . balanceInCents + '&ws.i0.types.i0.coins=60&bl.i1.reelset=ALL&rs.i2.r.i2.pos=3&last.rs=' . reelsType + '&bl.i1.line=0%2C0%2C0%2C0%2C0&ws.i0.sym=SYM5&rs.i2.r.i2.syms=SYM4%2CSYM7%2CSYM3&rs.i1.r.i2.pos=75&rs.i3.r.i3.syms=SYM6%2CSYM7%2CSYM4&rs.i1.nearwin=4%2C3&ws.i0.types.i0.wintype=coins&rs.i3.r.i4.hold=false&rs.i0.r.i0.overlay.i0.row=2&nearwinallowed=true&bl.i8.line=1%2C0%2C0%2C0%2C1&freespins.wavecount=1&rs.i3.r.i3.hold=false&bl.i8.coins=1&bl.i2.line=2%2C2%2C2%2C2%2C2&rs.i1.r.i2.syms=SYM5%2CSYM0%2CSYM6&totalwin.cents=' . (totalWin * this.slotSettings.CurrentDenomination * 100) . '&rs.i0.r.i0.hold=false&rs.i2.r.i3.syms=SYM8%2CSYM6%2CSYM10&restore=true&rs.i1.id=basic&rs.i3.r.i4.syms=SYM5%2CSYM10%2CSYM9&bl.i4.id=4&rs.i0.r.i4.pos=53&bl.i7.coins=1&ws.i0.types.i0.cents=300&bl.i6.reelset=ALL&rs.i3.r.i0.pos=3&rs.i2.r.i2.hold=false&wavecount=1&rs.i1.r.i1.hold=false';
        }

        const result = 'rs.i4.id=basic&rs.i2.r.i1.hold=false&rs.i1.r.i0.syms=SYM7%2CSYM9%2CSYM10&bl.i6.coins=1&gameServerVersion=1.0.0&g4mode=false&historybutton=false&rs.i0.r.i4.hold=false&bl.i5.id=5&gameEventSetters.enabled=false&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=4&rs.i0.r.i1.syms=SYM5%2CSYM10%2CSYM3&bl.i3.coins=1&rs.i2.r.i1.pos=45&game.win.cents=0&rs.i4.r.i4.pos=5&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i0.reelset=ALL&rs.i1.r.i3.hold=false&totalwin.coins=0&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=basic&bl.i3.reelset=ALL&rs.i4.r.i0.pos=3&bl.i4.line=2%2C1%2C0%2C1%2C2&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&rs.i3.r.i1.hold=false&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM7%2CSYM9%2CSYM10&rs.i0.r.i3.syms=SYM4%2CSYM9%2CSYM8&rs.i1.r.i1.syms=SYM10%2CSYM3%2CSYM6&bl.i2.id=2&rs.i1.r.i1.pos=6&rs.i3.r.i4.pos=26&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&rs.i0.r.i0.pos=4&rs.i2.r.i3.hold=false&rs.i2.r.i3.pos=81&rs.i0.r.i1.pos=39&rs.i4.r.i4.syms=SYM10%2CSYM8%2CSYM6&rs.i1.r.i3.syms=SYM8%2CSYM6%2CSYM10&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=1&rs.i2.id=basic&game.win.coins=0&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&bl.i3.id=3&rs.i2.r.i1.syms=SYM9%2CSYM5%2CSYM8&bl.i8.reelset=ALL&clientaction=init&bl.i9.line=1%2C0%2C1%2C0%2C1&rs.i4.r.i0.hold=false&rs.i0.r.i2.hold=false&rs.i4.r.i3.syms=SYM4%2CSYM6%2CSYM3&casinoID=netent&betlevel.standard=1&bl.i5.coins=1&rs.i3.r.i2.hold=false&gameover=true&rs.i3.r.i3.pos=15&bl.i8.id=8&rs.i0.r.i3.pos=12&rs.i4.r.i0.syms=SYM6%2CSYM9%2CSYM7&bl.i0.id=0&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&nextaction=spin&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i4.reelset=ALL&rs.i4.r.i2.pos=2&bl.i4.coins=1&rs.i0.r.i2.syms=SYM8%2CSYM6%2CSYM9&game.win.amount=0&betlevel.all=1&bl.i9.id=9&denomination.all=' + denominations.join('%2C') + '&rs.i4.r.i3.pos=4&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&rs.i2.r.i0.pos=3&rs.i4.r.i4.hold=false&bl.i1.id=1&rs.i2.r.i4.syms=SYM0%2CSYM9%2CSYM7&rs.i3.r.i2.syms=SYM8%2CSYM10%2CSYM5&rs.i4.r.i3.hold=false&rs.i0.id=freespin_regular&credit=' + balanceInCents + '&rs.i1.r.i4.pos=26&denomination.standard=' + (this.slotSettings.CurrentDenomination * 100) + '&rs.i3.id=freespin_multiplier&bl.i1.reelset=ALL&multiplier=1&rs.i2.r.i2.pos=81&bl.i2.coins=1&bl.i6.id=6&bl.i1.line=0%2C0%2C0%2C0%2C0&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&rs.i1.r.i4.syms=SYM4%2CSYM3%2CSYM6&rs.i2.r.i2.syms=SYM2%2CSYM3%2CSYM10&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i1.r.i2.pos=3&rs.i3.r.i3.syms=SYM6%2CSYM7%2CSYM4&rs.i3.r.i4.hold=false&rs.i4.r.i2.hold=false&nearwinallowed=true&bl.i5.reelset=ALL&rs.i4.r.i1.syms=SYM3%2CSYM5%2CSYM4&bl.i7.id=7&rs.i2.r.i4.pos=1&bl.i8.line=1%2C0%2C0%2C0%2C1&rs.i3.r.i0.syms=SYM10%2CSYM6%2CSYM9&playercurrencyiso=' + this.slotSettings.slotCurrency + '&bl.i1.coins=1&rs.i4.r.i1.hold=false&rs.i3.r.i2.pos=2&rs.i3.r.i3.hold=false&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&rs.i0.r.i4.syms=SYM5%2CSYM8%2CSYM7&bl.i8.coins=1&rs.i0.r.i2.pos=25&bl.i2.line=2%2C2%2C2%2C2%2C2&rs.i1.r.i2.syms=SYM4%2CSYM7%2CSYM3&rs.i1.r.i0.pos=1&totalwin.cents=0&bl.i0.coins=1&rs.i2.r.i0.syms=SYM1%2CSYM8%2CSYM7&bl.i2.reelset=ALL&rs.i0.r.i0.hold=false&rs.i2.r.i3.syms=SYM6%2CSYM4%2CSYM10&restore=false&rs.i1.id=freespin_expanding&rs.i3.r.i4.syms=SYM5%2CSYM10%2CSYM9&rs.i3.r.i1.syms=SYM9%2CSYM3%2CSYM5&rs.i1.r.i4.hold=false&bl.i4.id=4&rs.i0.r.i4.pos=10&bl.i7.coins=1&rs.i4.r.i1.pos=0&rs.i4.r.i2.syms=SYM9%2CSYM10%2CSYM8&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9&bl.i6.reelset=ALL&rs.i3.r.i0.pos=3&rs.i3.r.i0.hold=false&rs.i2.r.i2.hold=false&wavecount=1&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false' + curReels + freeState;

        return result;
    }

    private handlePaytableRequest(): string {
        return 'pt.i0.comp.i17.symbol=SYM8&pt.i0.comp.i5.freespins=0&pt.i0.comp.i23.n=5&pt.i1.comp.i34.multi=80&pt.i0.comp.i13.symbol=SYM7&pt.i1.comp.i8.type=betline&pt.i1.comp.i4.n=4&pt.i0.comp.i15.multi=10&pt.i1.comp.i27.symbol=SYM13&pt.i1.comp.i29.freespins=0&pt.i1.comp.i30.symbol=SYM11&pt.i1.comp.i3.multi=20&pt.i0.comp.i11.n=5&pt.i1.comp.i23.symbol=SYM10&bl.i4.line=2%2C1%2C0%2C1%2C2&pt.i0.id=basic&pt.i0.comp.i1.type=betline&bl.i2.id=2&pt.i1.comp.i10.type=betline&pt.i0.comp.i4.symbol=SYM4&pt.i1.comp.i5.freespins=0&pt.i1.comp.i8.symbol=SYM5&pt.i1.comp.i19.n=4&pt.i0.comp.i17.freespins=0&pt.i0.comp.i8.symbol=SYM5&pt.i0.comp.i0.symbol=SYM3&pt.i1.comp.i36.freespins=0&pt.i0.comp.i3.freespins=0&pt.i0.comp.i10.multi=60&pt.i1.id=freespin&bl.i3.id=3&pt.i1.comp.i34.freespins=0&pt.i1.comp.i34.type=betline&pt.i0.comp.i24.n=3&bl.i8.reelset=ALL&clientaction=paytable&pt.i1.comp.i27.freespins=0&pt.i1.comp.i5.n=5&bl.i5.coins=1&pt.i1.comp.i8.multi=200&pt.i0.comp.i22.type=betline&pt.i0.comp.i24.freespins=10&pt.i1.comp.i38.type=betline&pt.i0.comp.i21.multi=5&pt.i1.comp.i13.multi=50&pt.i0.comp.i12.n=3&pt.i0.comp.i13.type=betline&bl.i0.line=1%2C1%2C1%2C1%2C1&pt.i1.comp.i7.freespins=0&pt.i0.comp.i3.multi=20&pt.i1.comp.i22.type=betline&pt.i0.comp.i21.n=3&pt.i1.comp.i6.n=3&pt.i1.comp.i31.type=betline&bl.i1.id=1&pt.i0.comp.i10.type=betline&pt.i1.comp.i11.symbol=SYM6&pt.i0.comp.i5.multi=300&pt.i1.comp.i1.freespins=0&pt.i1.comp.i16.symbol=SYM8&pt.i1.comp.i23.multi=80&pt.i1.comp.i4.type=betline&pt.i1.comp.i18.multi=5&bl.i2.coins=1&pt.i1.comp.i26.type=scatter&pt.i0.comp.i8.multi=200&pt.i0.comp.i1.freespins=0&bl.i5.reelset=ALL&pt.i0.comp.i22.n=4&pt.i1.comp.i17.type=betline&pt.i1.comp.i0.symbol=SYM3&pt.i1.comp.i7.n=4&pt.i1.comp.i5.multi=300&pt.i0.comp.i21.type=betline&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&pt.i0.comp.i8.type=betline&pt.i0.comp.i7.freespins=0&pt.i1.comp.i15.multi=10&pt.i0.comp.i13.multi=50&pt.i0.comp.i17.type=betline&pt.i1.comp.i22.symbol=SYM10&pt.i1.comp.i30.freespins=0&pt.i1.comp.i38.symbol=SYM1&bl.i0.coins=1&bl.i2.reelset=ALL&pt.i0.comp.i10.n=4&pt.i1.comp.i6.multi=15&pt.i1.comp.i19.symbol=SYM9&pt.i0.comp.i22.freespins=0&pt.i0.comp.i20.symbol=SYM9&pt.i0.comp.i15.freespins=0&pt.i0.comp.i0.n=3&pt.i1.comp.i21.multi=5&pt.i1.comp.i30.type=betline&pt.i0.comp.i0.type=betline&pt.i1.comp.i0.multi=25&g4mode=false&pt.i1.comp.i8.n=5&pt.i0.comp.i25.multi=0&pt.i1.comp.i37.multi=80&pt.i0.comp.i16.symbol=SYM8&pt.i1.comp.i21.freespins=0&pt.i0.comp.i1.multi=80&pt.i0.comp.i27.n=3&pt.i1.comp.i9.type=betline&pt.i1.comp.i24.multi=0&pt.i1.comp.i23.type=betline&pt.i1.comp.i26.n=5&pt.i1.comp.i28.symbol=SYM13&pt.i1.comp.i17.multi=100&pt.i0.comp.i18.multi=5&bl.i5.line=0%2C0%2C1%2C0%2C0&pt.i1.comp.i33.symbol=SYM12&pt.i1.comp.i35.type=betline&pt.i0.comp.i9.n=3&pt.i1.comp.i21.type=betline&bl.i7.line=1%2C2%2C2%2C2%2C1&pt.i1.comp.i31.multi=80&pt.i1.comp.i18.type=betline&pt.i0.comp.i10.symbol=SYM6&pt.i0.comp.i15.n=3&pt.i0.comp.i21.symbol=SYM10&bl.i7.reelset=ALL&pt.i1.comp.i15.n=3&pt.i1.comp.i38.n=5&isJackpotWin=false&pt.i1.comp.i20.freespins=0&pt.i1.comp.i7.type=betline&pt.i0.comp.i10.freespins=0&pt.i0.comp.i20.multi=80&pt.i0.comp.i17.multi=100&pt.i1.comp.i25.type=scatter&pt.i1.comp.i9.n=3&bl.i9.line=1%2C0%2C1%2C0%2C1&pt.i0.comp.i2.multi=500&pt.i1.comp.i27.n=3&pt.i0.comp.i0.freespins=0&pt.i1.comp.i25.multi=0&pt.i1.comp.i16.freespins=0&pt.i1.comp.i5.type=betline&pt.i1.comp.i35.symbol=SYM12&pt.i1.comp.i24.symbol=SYM0&pt.i1.comp.i13.symbol=SYM7&pt.i1.comp.i17.symbol=SYM8&pt.i0.comp.i16.n=4&bl.i0.id=0&pt.i1.comp.i16.n=4&pt.i0.comp.i5.symbol=SYM4&pt.i1.comp.i7.symbol=SYM5&pt.i0.comp.i1.symbol=SYM3&pt.i1.comp.i36.multi=25&pt.i1.comp.i31.freespins=0&bl.i9.id=9&pt.i1.comp.i9.freespins=0&playercurrency=%26%23x20AC%3B&pt.i1.comp.i30.multi=25&pt.i0.comp.i25.n=4&pt.i1.comp.i28.n=4&pt.i1.comp.i32.freespins=0&pt.i0.comp.i9.freespins=0&credit=500000&pt.i0.comp.i5.type=betline&pt.i0.comp.i11.freespins=0&pt.i0.comp.i26.multi=0&pt.i0.comp.i25.type=scatter&bl.i1.reelset=ALL&pt.i1.comp.i18.symbol=SYM9&pt.i1.comp.i12.symbol=SYM7&pt.i0.comp.i13.freespins=0&pt.i1.comp.i15.type=betline&pt.i0.comp.i26.freespins=30&pt.i1.comp.i13.type=betline&pt.i1.comp.i1.multi=80&pt.i1.comp.i8.freespins=0&pt.i0.comp.i13.n=4&pt.i1.comp.i33.freespins=0&pt.i1.comp.i17.n=5&pt.i0.comp.i23.type=betline&pt.i1.comp.i17.freespins=0&pt.i1.comp.i26.multi=0&pt.i1.comp.i32.multi=500&pt.i1.comp.i0.type=betline&pt.i1.comp.i1.symbol=SYM3&pt.i1.comp.i29.multi=500&pt.i0.comp.i25.freespins=20&pt.i0.comp.i26.n=5&pt.i0.comp.i27.symbol=SYM2&pt.i1.comp.i29.n=5&pt.i0.comp.i23.multi=80&bl.i2.line=2%2C2%2C2%2C2%2C2&pt.i1.comp.i34.symbol=SYM12&pt.i1.comp.i28.multi=80&pt.i1.comp.i33.multi=25&pt.i1.comp.i18.freespins=0&pt.i0.comp.i14.n=5&pt.i0.comp.i0.multi=25&bl.i6.reelset=ALL&pt.i0.comp.i19.multi=30&pt.i1.comp.i18.n=3&pt.i1.comp.i33.type=betline&pt.i0.comp.i12.freespins=0&pt.i0.comp.i24.multi=0&pt.i0.comp.i19.symbol=SYM9&bl.i6.coins=1&pt.i0.comp.i15.type=betline&pt.i0.comp.i23.freespins=0&pt.i1.comp.i36.type=betline&pt.i0.comp.i4.multi=70&pt.i0.comp.i15.symbol=SYM8&pt.i1.comp.i14.multi=100&pt.i0.comp.i22.multi=30&pt.i1.comp.i19.type=betline&pt.i0.comp.i11.symbol=SYM6&pt.i1.comp.i27.multi=25&bl.i0.reelset=ALL&pt.i0.comp.i16.freespins=0&pt.i1.comp.i6.freespins=0&pt.i1.comp.i29.symbol=SYM13&pt.i1.comp.i22.n=4&pt.i0.comp.i4.freespins=0&pt.i1.comp.i25.symbol=SYM0&bl.i3.reelset=ALL&pt.i1.comp.i24.type=scatter&pt.i0.comp.i19.n=4&pt.i0.comp.i2.symbol=SYM3&pt.i0.comp.i20.type=betline&pt.i0.comp.i6.symbol=SYM5&pt.i1.comp.i11.n=5&pt.i1.comp.i34.n=4&pt.i0.comp.i5.n=5&pt.i1.comp.i2.symbol=SYM3&pt.i0.comp.i3.type=betline&pt.i1.comp.i19.multi=30&pt.i1.comp.i6.symbol=SYM5&pt.i0.comp.i27.multi=0&pt.i0.comp.i9.multi=15&pt.i0.comp.i22.symbol=SYM10&pt.i0.comp.i26.symbol=SYM0&pt.i1.comp.i19.freespins=0&pt.i0.comp.i14.freespins=0&pt.i0.comp.i21.freespins=0&pt.i1.comp.i35.multi=500&pt.i1.comp.i4.freespins=0&pt.i1.comp.i12.type=betline&pt.i1.comp.i36.symbol=SYM1&pt.i1.comp.i21.symbol=SYM10&pt.i1.comp.i23.n=5&pt.i1.comp.i32.symbol=SYM11&bl.i8.id=8&pt.i0.comp.i16.multi=50&pt.i1.comp.i37.freespins=0&bl.i6.line=2%2C2%2C1%2C2%2C2&pt.i1.comp.i35.n=5&pt.i1.comp.i9.multi=15&pt.i0.comp.i19.type=betline&pt.i0.comp.i6.freespins=0&pt.i1.comp.i2.multi=500&pt.i0.comp.i6.n=3&pt.i1.comp.i12.n=3&pt.i1.comp.i3.type=betline&pt.i1.comp.i10.freespins=0&pt.i1.comp.i28.type=betline&pt.i1.comp.i20.multi=80&pt.i0.comp.i27.freespins=0&pt.i1.comp.i24.n=3&pt.i1.comp.i27.type=betline&pt.i1.comp.i2.type=betline&pt.i0.comp.i2.freespins=0&pt.i1.comp.i38.multi=500&pt.i0.comp.i7.n=4&pt.i0.comp.i11.multi=200&pt.i1.comp.i14.symbol=SYM7&pt.i0.comp.i7.type=betline&pt.i0.comp.i17.n=5&bl.i6.id=6&pt.i1.comp.i13.n=4&pt.i1.comp.i36.n=3&pt.i0.comp.i8.freespins=0&pt.i1.comp.i4.multi=70&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&pt.i0.comp.i12.type=betline&pt.i0.comp.i14.multi=100&pt.i1.comp.i7.multi=60&bl.i7.id=7&pt.i1.comp.i11.type=betline&pt.i0.comp.i6.multi=15&playercurrencyiso=' + this.slotSettings.slotCurrency + '&bl.i1.coins=1&pt.i1.comp.i5.symbol=SYM4&pt.i0.comp.i18.type=betline&pt.i0.comp.i23.symbol=SYM10&playforfun=false&pt.i1.comp.i25.n=4&pt.i0.comp.i2.type=betline&pt.i1.comp.i20.type=betline&pt.i1.comp.i22.multi=30&pt.i0.comp.i8.n=5&pt.i1.comp.i22.freespins=0&pt.i0.comp.i11.type=betline&pt.i1.comp.i35.freespins=0&pt.i0.comp.i18.n=3&pt.i1.comp.i14.n=5&pt.i1.comp.i16.multi=50&pt.i1.comp.i37.n=4&pt.i1.comp.i15.freespins=0&pt.i0.comp.i27.type=bonus&pt.i1.comp.i28.freespins=0&pt.i0.comp.i7.symbol=SYM5&pt.i1.comp.i0.freespins=0&gameServerVersion=1.0.0&historybutton=false&bl.i5.id=5&pt.i0.comp.i18.symbol=SYM9&pt.i0.comp.i12.multi=10&pt.i1.comp.i14.freespins=0&bl.i3.coins=1&pt.i0.comp.i12.symbol=SYM7&pt.i0.comp.i14.symbol=SYM7&pt.i1.comp.i13.freespins=0&pt.i0.comp.i14.type=betline&pt.i1.comp.i0.n=3&pt.i1.comp.i26.symbol=SYM0&pt.i1.comp.i31.symbol=SYM11&pt.i0.comp.i7.multi=60&jackpotcurrency=%26%23x20AC%3B&bl.i9.coins=1&pt.i1.comp.i37.type=betline&pt.i1.comp.i11.multi=200&pt.i1.comp.i30.n=3&pt.i0.comp.i1.n=4&pt.i0.comp.i20.n=5&pt.i1.comp.i3.symbol=SYM4&pt.i1.comp.i23.freespins=0&pt.i0.comp.i25.symbol=SYM0&pt.i0.comp.i26.type=scatter&pt.i0.comp.i9.type=betline&pt.i1.comp.i16.type=betline&pt.i1.comp.i20.symbol=SYM9&pt.i1.comp.i12.multi=10&pt.i1.comp.i1.n=4&pt.i1.comp.i11.freespins=0&pt.i0.comp.i9.symbol=SYM6&pt.i0.comp.i16.type=betline&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i4.reelset=ALL&bl.i4.coins=1&pt.i0.comp.i2.n=5&pt.i1.comp.i31.n=4&pt.i0.comp.i19.freespins=0&pt.i1.comp.i14.type=betline&pt.i0.comp.i6.type=betline&pt.i1.comp.i2.freespins=0&pt.i1.comp.i25.freespins=20&bl.i9.reelset=ALL&pt.i1.comp.i10.multi=60&pt.i1.comp.i10.symbol=SYM6&pt.i1.comp.i2.n=5&pt.i1.comp.i20.n=5&pt.i1.comp.i24.freespins=10&pt.i1.comp.i32.type=betline&pt.i0.comp.i4.type=betline&pt.i1.comp.i26.freespins=30&pt.i1.comp.i1.type=betline&bl.i1.line=0%2C0%2C0%2C0%2C0&pt.i0.comp.i20.freespins=0&pt.i1.comp.i29.type=betline&pt.i1.comp.i32.n=5&pt.i0.comp.i3.n=3&pt.i1.comp.i6.type=betline&pt.i1.comp.i4.symbol=SYM4&pt.i1.comp.i38.freespins=0&bl.i8.line=1%2C0%2C0%2C0%2C1&pt.i0.comp.i24.symbol=SYM0&bl.i8.coins=1&pt.i1.comp.i37.symbol=SYM1&pt.i1.comp.i3.n=3&pt.i1.comp.i21.n=3&pt.i0.comp.i18.freespins=0&pt.i1.comp.i15.symbol=SYM8&pt.i1.comp.i3.freespins=0&bl.i4.id=4&bl.i7.coins=1&pt.i1.comp.i9.symbol=SYM6&pt.i0.comp.i3.symbol=SYM4&pt.i0.comp.i24.type=scatter&pt.i1.comp.i12.freespins=0&pt.i0.comp.i4.n=4&pt.i1.comp.i10.n=4&pt.i1.comp.i33.n=3';
    }

    private handleInitFreespinRequest(): string {
        const reelsType = this.slotSettings.GetGameData(this.slotId + 'ReelsType');
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        return 'rs.i4.id=freespin_spreading&rs.i2.r.i1.hold=false&rs.i1.r.i0.syms=SYM7%2CSYM9%2CSYM10&gameServerVersion=1.0.0&g4mode=false&freespins.win.coins=0&historybutton=false&rs.i0.r.i4.hold=false&next.rs=' + reelsType + '&gamestate.history=basic&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=4&rs.i0.r.i1.syms=SYM5%2CSYM10%2CSYM3&rs.i2.r.i1.pos=25&game.win.cents=0&rs.i4.r.i4.pos=5&rs.i1.r.i3.hold=false&totalwin.coins=0&gamestate.current=freespin&freespins.initial=10&rs.i4.r.i0.pos=3&jackpotcurrency=%26%23x20AC%3B&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i3.r.i1.hold=false&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM7%2CSYM9%2CSYM10&rs.i0.r.i3.syms=SYM4%2CSYM9%2CSYM8&rs.i1.r.i1.syms=SYM10%2CSYM3%2CSYM6&rs.i1.r.i1.pos=6&rs.i3.r.i4.pos=26&freespins.win.cents=0&isJackpotWin=false&rs.i0.r.i0.pos=4&rs.i2.r.i3.hold=false&rs.i2.r.i3.pos=20&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i0.r.i1.pos=39&rs.i4.r.i4.syms=SYM10%2CSYM8%2CSYM6&rs.i1.r.i3.syms=SYM8%2CSYM6%2CSYM10&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=1&rs.i2.id=basic&game.win.coins=0&rs.i1.r.i0.hold=false&rs.i0.r.i1.hold=false&rs.i2.r.i1.syms=SYM0%2CSYM6%2CSYM9&clientaction=initfreespin&rs.i4.r.i0.hold=false&rs.i0.r.i2.hold=false&rs.i4.r.i3.syms=SYM4%2CSYM6%2CSYM3&rs.i2.r.i3.attention.i0=1&rs.i3.r.i2.hold=false&gameover=false&rs.i3.r.i3.pos=15&rs.i0.r.i3.pos=12&rs.i2.r.i1.attention.i0=0&rs.i4.r.i0.syms=SYM6%2CSYM9%2CSYM7&nextaction=freespin&rs.i2.nearwin=4%2C3&rs.i4.r.i2.pos=2&rs.i0.r.i2.syms=SYM8%2CSYM6%2CSYM9&game.win.amount=0.00&freespins.totalwin.cents=0&freespins.betlevel=1&rs.i4.r.i3.pos=4&playercurrency=%26%23x20AC%3B&rs.i2.r.i0.pos=74&rs.i4.r.i4.hold=false&current.rs.i0=' + reelsType + '&rs.i2.r.i4.syms=SYM7%2CSYM10%2CSYM6&rs.i3.r.i2.syms=SYM8%2CSYM10%2CSYM5&rs.i4.r.i3.hold=false&rs.i0.id=freespin_regular&credit=' + balanceInCents + '&rs.i1.r.i4.pos=26&rs.i3.id=' + reelsType + '&multiplier=1&rs.i2.r.i2.pos=3&freespins.denomination=5.000&freespins.totalwin.coins=0&freespins.total=10&gamestate.stack=basic%2Cfreespin&rs.i1.r.i4.syms=SYM4%2CSYM3%2CSYM6&rs.i2.r.i2.syms=SYM0%2CSYM9%2CSYM8&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i1.r.i2.pos=3&rs.i3.r.i3.syms=SYM6%2CSYM7%2CSYM4&bet.betlevel=1&rs.i3.r.i4.hold=false&rs.i4.r.i2.hold=false&rs.i4.r.i1.syms=SYM3%2CSYM5%2CSYM4&rs.i2.r.i4.pos=52&rs.i3.r.i0.syms=SYM10%2CSYM6%2CSYM9&playercurrencyiso=' + this.slotSettings.slotCurrency + '&rs.i4.r.i1.hold=false&freespins.wavecount=1&rs.i3.r.i2.pos=2&rs.i3.r.i3.hold=false&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&rs.i0.r.i4.syms=SYM5%2CSYM8%2CSYM7&rs.i0.r.i2.pos=25&rs.i1.r.i2.syms=SYM4%2CSYM7%2CSYM3&rs.i1.r.i0.pos=1&totalwin.cents=0&rs.i2.r.i0.syms=SYM3%2CSYM6%2CSYM5&rs.i0.r.i0.hold=false&rs.i2.r.i3.syms=SYM7%2CSYM0%2CSYM9&rs.i1.id=freespin_expanding&rs.i3.r.i4.syms=SYM5%2CSYM10%2CSYM9&rs.i3.r.i1.syms=SYM9%2CSYM3%2CSYM5&rs.i1.r.i4.hold=false&freespins.left=10&rs.i0.r.i4.pos=10&rs.i2.r.i2.attention.i0=0&rs.i4.r.i1.pos=0&rs.i4.r.i2.syms=SYM9%2CSYM10%2CSYM8&rs.i3.r.i0.pos=3&rs.i3.r.i0.hold=false&rs.i2.r.i2.hold=false&wavecount=1&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&bet.denomination=5';
    }

    private handleInitBonusRequest(): string {
        const pickWinMpl = this.slotSettings.GetGameData(this.slotId + 'pickWinMpl');
        const pickWin = this.slotSettings.GetGameData(this.slotId + 'pickWin');
        const reels = this.slotSettings.GetGameData(this.slotId + 'pickReels');
        const bsymPos: number[] = [];
        let bsc = 0;

        // Find bonus symbols position
        for (let r = 1; r <= 5; r++) {
            for (let p = 0; p <= 2; p++) {
                // In the PHP code it checks for '2' in reels.
                // Assuming reels is available and structured as reel1, reel2...
                const reelName = `reel${r}`;
                if (reels && reels[reelName] && reels[reelName][p] === '2') {
                    bsymPos[bsc] = p;
                    bsc++;
                }
            }
        }

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        return 'bonusitem.2.state=not_picked&gameServerVersion=1.0.0&g4mode=false&game.win.coins=0&playercurrency=%26%23x20AC%3B&playercurrencyiso=' + this.slotSettings.slotCurrency + '&historybutton=false&bonusitem.1.win=unknown&bonusitem.2.reel=4&bonusitem.1.row=' + (bsymPos[1] || 0) + '&gamestate.history=basic&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&clientaction=initbonus&game.win.cents=0&bonusitem.1.reel=2&bonusitem.2.row=' + (bsymPos[2] || 0) + '&bonusitem.0.state=not_picked&totalwin.coins=0&bonusitem.2.win=unknown&credit=' + balanceInCents + '&totalwin.cents=0&gamestate.current=bonus&gameover=false&totalbonuswin.coins=0&jackpotcurrency=%26%23x20AC%3B&multiplier=1&bonusitem.1.state=not_picked&bonusgame.coinvalue=0.05&gamestate.bonusid=wildwildwestbonusgame&isJackpotWin=false&gamestate.stack=basic%2Cbonus&bonuswin.cents=0&totalbonuswin.cents=0&nextaction=bonusaction&wavecount=1&nextactiontype=pickbonus&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&bonusitem.0.reel=0&bonusitem.0.row=' + (bsymPos[0] || 0) + '&game.win.amount=0&bonusitem.0.win=unknown&bonuswin.coins=0';
    }

    private handleBonusActionRequest(postData: any): string {
        const pickWinMpl = this.slotSettings.GetGameData(this.slotId + 'pickWinMpl');
        const pickWin = this.slotSettings.GetGameData(this.slotId + 'pickWin');
        const reels = this.slotSettings.GetGameData(this.slotId + 'pickReels');
        const allbet = this.slotSettings.GetGameData(this.slotId + 'pickBet');

        const picked = (postData.wildwildwest_bonus_pick || '').split(',');
        // Mapping index logic from PHP
        // if( $picked[0] == 4 ) { $picked[0] = 2; } else if( $picked[0] == 2 ) { $picked[0] = 1; }
        // The indices seem to map to array indices 0, 1, 2

        let pickedIndex = parseInt(picked[0]);
        if (pickedIndex === 4) pickedIndex = 2;
        else if (pickedIndex === 2) pickedIndex = 1;

        const bsymPos: number[] = [];
        for (let r = 1; r <= 5; r++) {
            for (let p = 0; p <= 2; p++) {
                const reelName = `reel${r}`;
                if (reels && reels[reelName] && reels[reelName][p] === '2') {
                    bsymPos.push(p);
                }
            }
        }

        const bsymWins = [
            this.randomInt(5, 50) * allbet,
            this.randomInt(5, 50) * allbet,
            this.randomInt(5, 50) * allbet
        ];

        const bsymWinsStr = [
             '&bonusitem.0.win=' + bsymWins[0] + '&bonusitem.0.state=not_picked',
             '&bonusitem.1.win=' + bsymWins[1] + '&bonusitem.1.state=not_picked',
             '&bonusitem.2.win=' + bsymWins[2] + '&bonusitem.2.state=not_picked'
        ];

        // Override the picked one
        bsymWinsStr[pickedIndex] = '&bonusitem.' + pickedIndex + '.win=' + pickWin + '&bonusitem.' + pickedIndex + '.state=picked';

        const totalWin = this.slotSettings.GetGameData(this.slotId + 'TotalWin');
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        return 'bonusitem.2.state=not_picked&gameServerVersion=1.0.0&g4mode=false&game.win.coins=' + totalWin + '&playercurrency=%26%23x20AC%3B&playercurrencyiso=' + this.slotSettings.slotCurrency + '&historybutton=false&bonusitem.1.win=150&bonusitem.2.reel=4&bonusitem.1.row=' + (bsymPos[1] || 0) + '&gamestate.history=basic%2Cbonus&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&clientaction=bonusaction&game.win.cents=750&bonusitem.1.reel=2&bonusitem.2.row=' + (bsymPos[2] || 0) + '&bonusitem.0.state=not_picked&totalwin.coins=' + totalWin + '&bonusitem.2.win=250&credit=' + balanceInCents + '&totalwin.cents=750&gamestate.current=bonus&gameover=false&totalbonuswin.coins=' + totalWin + '&jackpotcurrency=%26%23x20AC%3B&multiplier=1&bonusitem.1.state=picked&bonusgame.coinvalue=0.05&gamestate.bonusid=wildwildwestbonusgame&isJackpotWin=false&gamestate.stack=basic%2Cbonus&bonuswin.cents=750&totalbonuswin.cents=750&nextaction=endbonus&wavecount=1&gamesoundurl=&bonusitem.0.reel=0&bonusitem.0.row=' + (bsymPos[0] || 0) + '&game.win.amount=' + totalWin + '&bonusgameover=true&bonusitem.0.win=50&bonuswin.coins=' + totalWin + '' + bsymWinsStr.join('');
    }

    private handleEndBonusRequest(): string {
        const totalWin = this.slotSettings.GetGameData(this.slotId + 'TotalWin');
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        return 'gameServerVersion=1.0.0&g4mode=false&game.win.coins=' + totalWin + '&playercurrency=%26%23x20AC%3B&playercurrencyiso=' + this.slotSettings.slotCurrency + '&historybutton=false&current.rs.i0=basic&next.rs=basic&gamestate.history=basic%2Cbonus&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&clientaction=endbonus&game.win.cents=' + (totalWin * this.slotSettings.CurrentDenomination * 100) + '&totalwin.coins=' + totalWin + '&credit=' + balanceInCents + '&totalwin.cents=' + (totalWin * this.slotSettings.CurrentDenomination * 100) + '&gamestate.current=basic&gameover=true&jackpotcurrency=%26%23x20AC%3B&multiplier=1&isJackpotWin=false&gamestate.stack=basic&nextaction=spin&wavecount=1&gamesoundurl=&game.win.amount=' + (totalWin * this.slotSettings.CurrentDenomination) + '';
    }

    private handleSpinRequest(postData: any): string {
        const linesId = this.getLinesId();
        const linesCount = 10;
        const betline = postData.bet_betlevel;
        let allbet = betline * linesCount;

        // Handle transaction logic
        let bonusMpl = 1;
        if (postData.slotEvent !== 'freespin') {
            this.slotSettings.SetBalance(-1 * allbet, postData.slotEvent);
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(postData.slotEvent, bankSum, postData.slotEvent);
            this.slotSettings.UpdateJackpots(allbet);

            this.slotSettings.SetGameData(this.slotId + 'BonusWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'Bet', betline);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', this.slotSettings.GetBalance() * 100);
            this.slotSettings.SetGameData(this.slotId + 'ReelsType', 'basic');
        } else {
            // Logic for free spin / respin
            const storedBet = this.slotSettings.GetGameData(this.slotId + 'Bet');
            allbet = storedBet * linesCount;
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame',
                this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') + 1);
            bonusMpl = this.slotSettings.slotFreeMpl;
        }

        const winTypeTmp = this.slotSettings.GetSpinSettings(postData.slotEvent, allbet, linesCount);
        let winType = winTypeTmp[0];
        let spinWinLimit = winTypeTmp[1];

        if (winType === 'bonus' && postData.slotEvent === 'freespin') {
            winType = 'win';
        }

        let totalWin = 0;
        let lineWins: string[] = [];
        let reels: ReelStrips = { rp: [] };
        let mainSymAnim = '';
        let featureStr = '';
        let scattersStr = '';

        // Simulation loop
        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            lineWins = [];
            const cWins: number[] = new Array(linesCount).fill(0);
            const wild = ['1', '11', '12', '13'];
            const scatter = '0';

            // Get reel strips based on game state
            const currentReelsType = this.slotSettings.GetGameData(this.slotId + 'ReelsType');
            reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent, currentReelsType);

            featureStr = '';
            let reelsTmp = JSON.parse(JSON.stringify(reels)); // Deep copy

            if (postData.slotEvent === 'freespin') {
                 // Implement special wild features logic here - mirrors PHP logic for 'freespin_spreading', 'freespin_regular', 'freespin_expanding', 'freespin_multiplier'

                 let randomwildsactive = true;
                 if (randomwildsactive) {
                     let spreadingWildsArr: number[][] = [];
                     let wsym = '';
                     let wsym0 = '';
                     let startSpeadngSym: number[] = [];

                     if (currentReelsType == 'freespin_spreading') {
                         wsym = 'SYM13';
                         wsym0 = '13';
                         const rReel = this.randomInt(2, 4);
                         const rRow = this.randomInt(0, 2);
                         // Note: indices 2,3,4 map to reel2, reel3, reel4 but need to check slot structure
                         // Assuming reel2..4 are keys in reels object.
                         if ((reels as any)['reel' + rReel]) {
                             (reels as any)['reel' + rReel][rRow] = '13';
                             reelsTmp['reel' + rReel][rRow] = '13';
                         }

                         for (let r = 2; r <= 4; r++) {
                             const reelData = (reels as any)['reel' + r];
                             if (reelData && (reelData[0] == '13' || reelData[1] == '13' || reelData[2] == '13')) {
                                 if (reelData[0] == '13') {
                                     startSpeadngSym = [r, 0];
                                     spreadingWildsArr = [[r, 1], [r + 1, 0], [r - 1, 0]];
                                 } else if (reelData[1] == '13') {
                                     startSpeadngSym = [r, 1];
                                     spreadingWildsArr = [[r, 0], [r, 2], [r + 1, 1], [r - 1, 1]];
                                 } else if (reelData[2] == '13') {
                                     startSpeadngSym = [r, 2];
                                     spreadingWildsArr = [[r, 1], [r + 1, 2], [r - 1, 2]];
                                 }
                                 break;
                             }
                         }

                         // Shuffle and pick spread
                         this.shuffleArray(spreadingWildsArr);
                         const spreadCnt = this.randomInt(2, 3);
                         spreadingWildsArr = spreadingWildsArr.slice(0, spreadCnt);

                     } else if (currentReelsType == 'freespin_regular') {
                         wsym = 'SYM1';
                         wsym0 = '1';
                         spreadingWildsArr = [
                             [1, 0], [1, 1], [1, 2],
                             [2, 0], [2, 1], [2, 2],
                             [3, 0], [3, 1], [3, 2],
                             [4, 0], [4, 1], [4, 2],
                             [5, 0], [5, 1], [5, 2]
                         ];
                         this.shuffleArray(spreadingWildsArr);
                         const spreadCnt = this.randomInt(1, 5);
                         spreadingWildsArr = spreadingWildsArr.slice(0, spreadCnt);

                     } else if (currentReelsType == 'freespin_expanding') {
                         wsym = 'SYM11';
                         wsym0 = '11';
                         spreadingWildsArr = [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1]];
                         this.shuffleArray(spreadingWildsArr);
                         const spreadCnt = this.randomInt(1, 2);
                         const selected = spreadingWildsArr.slice(0, spreadCnt);
                         spreadingWildsArr = [];
                         for (const sew of selected) {
                             spreadingWildsArr.push([sew[0], 1]);
                             spreadingWildsArr.push([sew[0], 0]);
                             spreadingWildsArr.push([sew[0], 2]);
                         }

                     } else if (currentReelsType == 'freespin_multiplier') {
                         wsym = 'SYM12';
                         wsym0 = '12';
                         this.slotSettings.slotFreeMpl = 2;
                         spreadingWildsArr = [
                             [1, 0], [1, 1], [1, 2],
                             [2, 0], [2, 1], [2, 2],
                             [3, 0], [3, 1], [3, 2],
                             [4, 0], [4, 1], [4, 2],
                             [5, 0], [5, 1], [5, 2]
                         ];
                         this.shuffleArray(spreadingWildsArr);
                         const spreadCnt = this.randomInt(1, 5);
                         spreadingWildsArr = spreadingWildsArr.slice(0, spreadCnt);
                     }

                     const ps = [0, 0, 0, 0, 0, 0];
                     let ps_0 = 0;

                     for (const sw of spreadingWildsArr) {
                         if ((reels as any)['reel' + sw[0]]) {
                             (reels as any)['reel' + sw[0]][sw[1]] = wsym0;

                             featureStr += '&rs.i0.r.i' + (sw[0] - 1) + '.overlay.i' + ps[sw[0]] + '.row=' + sw[1] +
                                           '&rs.i0.r.i' + (sw[0] - 1) + '.overlay.i' + ps[sw[0]] + '.with=' + wsym +
                                           '&rs.i0.r.i' + (sw[0] - 1) + '.overlay.i' + ps[sw[0]] + '.pos=1';

                             if (currentReelsType == 'freespin_spreading') {
                                 featureStr += '&spread.from.i' + ps_0 + '=' + (startSpeadngSym[0] - 1) + '%2C' + startSpeadngSym[1];
                                 featureStr += '&spread.to.i' + ps_0 + '=' + (sw[0] - 1) + '%2C' + sw[1];
                             }
                             ps_0++;
                             ps[sw[0]]++;
                         }
                     }
                 }
            }

            // Win Calculation
            let winLineCount = 0;

            for (let k = 0; k < linesCount; k++) {
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

                                // Construct win string
                                let posStr = '';
                                for (let p = 0; p < count; p++) {
                                    posStr += '&ws.i' + winLineCount + '.pos.i' + p + '=' + p + '%2C' + (linesId[k][p] - 1);
                                }

                                tmpStringWin = '&ws.i' + winLineCount + '.reelset=basic&ws.i' + winLineCount + '.types.i0.coins=' + tmpWin + posStr + '&ws.i' + winLineCount + '.types.i0.wintype=coins&ws.i' + winLineCount + '.betline=' + k + '&ws.i' + winLineCount + '.sym=SYM' + csym + '&ws.i' + winLineCount + '.direction=left_to_right&ws.i' + winLineCount + '.types.i0.cents=' + (tmpWin * this.slotSettings.CurrentDenomination * 100);
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

            // Scatter and Bonus logic
            let scattersWin = 0;
            let pickWin = 0;
            let scattersCount = 0;
            let bonusCount = 0; // Symbol '2' is bonus
            scattersStr = '';
            let attStr = '';
            let nearwin: number[] = [];
            let nearwinCnt = 0;
            const scPos: string[] = [];
            const scPos2: string[] = [];

            for (let r = 1; r <= 5; r++) {
                for (let p = 0; p <= 2; p++) {
                    const reelVal = (reels as any)[`reel${r}`]?.[p];
                    if (reelVal == scatter) {
                        scattersCount++;
                        scPos.push('&ws.i0.pos.i' + (r - 1) + '=' + (r - 1) + '%2C' + p);
                    }
                    if (reelVal == '2') {
                        bonusCount++;
                         scPos2.push('&ws.i0.pos.i' + (r - 1) + '=' + (r - 1) + '%2C' + p);
                    }
                }
            }

            // Free spins trigger
            if (scattersCount >= 3) {
                 scattersStr = '&ws.i0.types.i0.freespins=' + this.slotSettings.slotFreeCount[scattersCount] + '&ws.i0.reelset=basic&ws.i0.betline=null&ws.i0.types.i0.wintype=freespins&ws.i0.direction=none' + scPos.join('');
            }

            // Bonus game trigger
            if (bonusCount >= 3) {
                const pickWinMpl = this.randomInt(5, 50);
                pickWin = pickWinMpl * allbet;
                this.slotSettings.SetGameData(this.slotId + 'pickWinMpl', pickWinMpl);
                this.slotSettings.SetGameData(this.slotId + 'pickWin', pickWin);
                this.slotSettings.SetGameData(this.slotId + 'pickReels', reels);
                this.slotSettings.SetGameData(this.slotId + 'pickBet', allbet);

                // Teaser/Attention logic
                for(let r = 1; r <= 5; r++) {
                    for(let p = 0; p <= 2; p++) {
                         if ((reels as any)[`reel${r}`]?.[p] == '2' && r > 3) {
                             attStr += '&rs.i0.r.i' + (r - 1) + '.attention.i0=' + p;
                             nearwin.push(r - 1);
                             break;
                         }
                    }
                }
                scattersStr = '&rs.i0.nearwin=' + nearwin.join('%2C') + '&gamestate.current=bonus&ws.i0.sym=SYM2&ws.i0.direction=none&gamestate.stack=basic%2Cbonus&ws.i0.types.i0.wintype=bonusgame&ws.i0.types.i0.bonusid=wildwildwestbonusgame' + scPos2.join('') + attStr;
            }

            totalWin += (scattersWin + pickWin);

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

             if (bonusCount >= 3 && winType !== 'bonus') {
                 // Check conditions
             } else if (scattersCount >= 3 && winType !== 'bonus') {
                 // Check conditions
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
        let curReels = '';

        // Build current reels string
        curReels = '&rs.i0.r.i0.syms=SYM' + (reels.reel1?.[0] || 0) + '%2CSYM' + (reels.reel1?.[1] || 0) + '%2CSYM' + (reels.reel1?.[2] || 0);
        curReels += '&rs.i0.r.i1.syms=SYM' + (reels.reel2?.[0] || 0) + '%2CSYM' + (reels.reel2?.[1] || 0) + '%2CSYM' + (reels.reel2?.[2] || 0);
        curReels += '&rs.i0.r.i2.syms=SYM' + (reels.reel3?.[0] || 0) + '%2CSYM' + (reels.reel3?.[1] || 0) + '%2CSYM' + (reels.reel3?.[2] || 0);
        curReels += '&rs.i0.r.i3.syms=SYM' + (reels.reel4?.[0] || 0) + '%2CSYM' + (reels.reel4?.[1] || 0) + '%2CSYM' + (reels.reel4?.[2] || 0);
        curReels += '&rs.i0.r.i4.syms=SYM' + (reels.reel5?.[0] || 0) + '%2CSYM' + (reels.reel5?.[1] || 0) + '%2CSYM' + (reels.reel5?.[2] || 0);

        if (postData.slotEvent === 'freespin') {
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', this.slotSettings.GetGameData(this.slotId + 'BonusWin') + totalWin);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', this.slotSettings.GetGameData(this.slotId + 'TotalWin') + totalWin);
        } else {
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', totalWin);
        }

        // Free spins initialization if won
        let scattersCount = 0;
        let nearwin: number[] = [];
        let attStr = '';

        for(let r=1; r<=5; r++) {
             for(let p=0; p<=2; p++) {
                 if((reels as any)[`reel${r}`]?.[p] == '0') scattersCount++;
             }
        }

        let freeState = '';
        if (scattersCount >= 3) {
            this.slotSettings.SetGameData(this.slotId + 'FreeStartWin', totalWin);
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', totalWin);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', this.slotSettings.slotFreeCount[scattersCount]);

            const rsSets = ['freespin_expanding', 'freespin_multiplier', 'freespin_regular', 'freespin_spreading'];
            const chosenReelsType = rsSets[this.randomInt(0, 3)];
            this.slotSettings.SetGameData(this.slotId + 'ReelsType', chosenReelsType);

            const fs = this.slotSettings.GetGameData(this.slotId + 'FreeGames');
             // Construct freeState string similar to PHP
             freeState = '&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&freespins.totalwin.cents=0&nextaction=freespin&freespins.left=' + fs + '&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=basic%2Cfreespin&freespins.totalwin.coins=0&freespins.total=' + fs + '&freespins.win.cents=0&gamestate.current=freespin&freespins.initial=' + fs + '&freespins.win.coins=0&freespins.betlevel=' + this.slotSettings.GetGameData(this.slotId + 'Bet') + '&totalwin.coins=' + totalWin + '&credit=' + Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100) + '&totalwin.cents=' + (totalWin * this.slotSettings.CurrentDenomination * 100) + '&rs.i0.nearwin=&game.win.amount=' + (totalWin / this.slotSettings.CurrentDenomination) + '' + attStr;
             curReels += freeState;
        }

        // Teaser logic for 2 scatters
        if (scattersCount >= 2) {
             let nearwinCnt = 0;
             for(let r=1; r<=5; r++) {
                 for(let p=0; p<=2; p++) {
                     if (nearwinCnt >= 2 && p == 0) {
                         nearwin.push(r - 1);
                     }
                     if ((reels as any)[`reel${r}`]?.[p] == '0') {
                         attStr += '&rs.i0.r.i' + (r - 1) + '.attention.i0=' + p;
                         nearwinCnt++;
                     }
                 }
             }
             if (nearwin.length > 0) {
                 attStr += '&rs.i0.nearwin=' + nearwin.join('%2C');
             }
        }

        // Construct response
        const winString = lineWins.join('');
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        // Log report (JSON for internal log)
        const logResponse = {
            responseEvent: 'spin',
            responseType: postData.slotEvent,
            serverResponse: {
                GameDenom: this.slotSettings.GetGameData(this.slotId + 'GameDenom'),
                ReelsType: this.slotSettings.GetGameData(this.slotId + 'ReelsType'),
                freeState: freeState,
                slotLines: linesCount,
                slotBet: betline,
                totalFreeGames: this.slotSettings.GetGameData(this.slotId + 'FreeGames'),
                currentFreeGames: this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame'),
                Balance: balanceInCents,
                afterBalance: balanceInCents,
                bonusWin: this.slotSettings.GetGameData(this.slotId + 'BonusWin'),
                totalWin: totalWin,
                winLines: [],
                Jackpots: this.slotSettings.Jackpots,
                reelsSymbols: reels
            }
        };
        this.slotSettings.SaveLogReport(JSON.stringify(logResponse), allbet, linesCount, reportWin, postData.slotEvent);

        this.slotSettings.SetGameData(this.slotId + 'GambleStep', 5);

        let nextaction = 'spin';
        let stack = 'basic';
        let gamestate = 'basic';
        let gameover = 'true';

        if (totalWin > 0) {
            gameover = 'false'; // Usually logic for gamble or just showing win
            // PHP logic: if ($totalWin > 0) { $gameover = 'false'; ... } else { $gameover = 'true'; }
            // Then $gameover = 'true'; explicitly set later in PHP anyway?
            // "if( $totalWin > 0 ) ... $gameover = 'true';"
            // It seems PHP sets it to true at the end.
            gameover = 'true';
        }

        if (postData.slotEvent === 'freespin') {
            totalWin = this.slotSettings.GetGameData(this.slotId + 'BonusWin');
            if (this.slotSettings.GetGameData(this.slotId + 'FreeGames') <= this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame')) {
                nextaction = 'spin';
                stack = 'basic';
                gamestate = 'basic';
            } else {
                gamestate = 'freespin';
                nextaction = 'freespin';
                stack = 'basic%2Cfreespin';
            }

            const fs = this.slotSettings.GetGameData(this.slotId + 'FreeGames');
            const fsl = this.slotSettings.GetGameData(this.slotId + 'FreeGames') - this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame');

            const fsState = '&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&freespins.totalwin.cents=0&nextaction=' + nextaction + '&freespins.left=' + fsl + '&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=' + stack + '&freespins.totalwin.coins=' + totalWin + '&freespins.total=' + fs + '&freespins.win.cents=' + (totalWin / this.slotSettings.CurrentDenomination * 100) + '&gamestate.current=' + gamestate + '&freespins.initial=' + fs + '&freespins.win.coins=' + totalWin + '&freespins.betlevel=' + this.slotSettings.GetGameData(this.slotId + 'Bet') + '&totalwin.coins=' + totalWin + '&credit=' + balanceInCents + '&totalwin.cents=' + (totalWin * this.slotSettings.CurrentDenomination * 100) + '&game.win.amount=' + (totalWin / this.slotSettings.CurrentDenomination) + '';
            curReels += fsState;
        }

        // Add bonus action features strings (scattersStr, featureStr, attStr from PHP)
        curReels += scattersStr;
        curReels += featureStr;
        curReels += attStr;

        const result = 'rs.i0.r.i1.pos=11&gameServerVersion=1.0.0&g4mode=false&game.win.coins=' + totalWin + '&playercurrency=%26%23x20AC%3B&playercurrencyiso=' + this.slotSettings.slotCurrency + '&historybutton=false&rs.i0.r.i1.hold=false&current.rs.i0=' + this.slotSettings.GetGameData(this.slotId + 'ReelsType') + '&rs.i0.r.i4.hold=false&next.rs=' + this.slotSettings.GetGameData(this.slotId + 'ReelsType') + '&gamestate.history=basic&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&clientaction=spin&rs.i0.r.i1.syms=SYM3%2CSYM9%2CSYM6&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM5%2CSYM3%2CSYM6&game.win.cents=' + (totalWin * this.slotSettings.CurrentDenomination * 100) + '&rs.i0.r.i2.pos=62&rs.i0.id=' + this.slotSettings.GetGameData(this.slotId + 'ReelsType') + '&totalwin.coins=' + totalWin + '&credit=' + balanceInCents + '&totalwin.cents=0&gamestate.current=' + this.slotSettings.GetGameData(this.slotId + 'ReelsType') + '&gameover=true&rs.i0.r.i0.hold=false&jackpotcurrency=%26%23x20AC%3B&freespins.multiplier=1&freespins.wavecount=1&multiplier=1&rs.i0.r.i3.pos=23&rs.i0.r.i4.pos=29&rs.i0.r.i0.syms=SYM4%2CSYM7%2CSYM9&rs.i0.r.i3.syms=SYM7%2CSYM8%2CSYM9&isJackpotWin=false&gamestate.stack=basic&nextaction=spin&rs.i0.r.i0.pos=30&wavecount=1&gamesoundurl=&rs.i0.r.i2.syms=SYM4%2CSYM10%2CSYM7&rs.i0.r.i3.hold=false&game.win.amount=' + (totalWin / this.slotSettings.CurrentDenomination) + '' + curReels + winString;

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
            [2, 1, 2, 1, 2]
        ];
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
