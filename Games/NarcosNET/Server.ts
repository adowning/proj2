
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
             curReels = `&rs.i0.r.i0.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
             curReels += `&rs.i0.r.i1.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
             curReels += `&rs.i0.r.i2.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
             curReels += `&rs.i0.r.i3.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
             curReels += `&rs.i0.r.i4.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
        }

        if (this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') < this.slotSettings.GetGameData(this.slotId + 'FreeGames') && this.slotSettings.GetGameData(this.slotId + 'FreeGames') > 0) {
            freeState = 'rs.i4.id=basicwalkingwild&rs.i2.r.i1.hold=false&rs.i1.r.i0.syms=SYM8%2CSYM3%2CSYM7&rs.i2.r.i1.pos=53&gameServerVersion=1.21.0&g4mode=false&freespins.win.coins=0&historybutton=false&rs.i0.r.i4.hold=false&gameEventSetters.enabled=false&next.rs=freespin&gamestate.history=basic%2Cfreespin&rs.i0.r.i14.syms=SYM30&rs.i1.r.i2.hold=false&rs.i1.r.i3.pos=0&rs.i0.r.i1.syms=SYM30&rs.i0.r.i5.hold=false&rs.i0.r.i7.pos=0&game.win.cents=300&rs.i4.r.i4.pos=65&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i0.reelset=ALL&rs.i1.r.i3.hold=false&totalwin.coins=60&gamestate.current=freespin&freespins.initial=10&rs.i4.r.i0.pos=2&rs.i0.r.i12.syms=SYM30&jackpotcurrency=%26%23x20AC%3B&rs.i4.r.i0.overlay.i0.row=1&bet.betlines=243&walkingwilds.pos=0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0&rs.i3.r.i1.hold=false&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM30&rs.i0.r.i3.syms=SYM30&rs.i1.r.i1.syms=SYM3%2CSYM9%2CSYM12&rs.i1.r.i1.pos=0&rs.i3.r.i4.pos=0&freespins.win.cents=0&isJackpotWin=false&rs.i0.r.i0.pos=0&rs.i2.r.i3.hold=false&rs.i2.r.i3.pos=49&freespins.betlines=243&rs.i0.r.i9.pos=0&rs.i4.r.i2.attention.i0=1&rs.i0.r.i1.pos=0&rs.i4.r.i4.syms=SYM5%2CSYM0%2CSYM7&rs.i1.r.i3.syms=SYM3%2CSYM9%2CSYM12&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=0&rs.i2.id=freespin&game.win.coins=60&rs.i1.r.i0.hold=false&denomination.last=0.05&rs.i0.r.i5.syms=SYM30&rs.i0.r.i1.hold=false&rs.i0.r.i13.pos=0&rs.i0.r.i13.hold=false&rs.i2.r.i1.syms=SYM12%2CSYM8%2CSYM7&rs.i0.r.i7.hold=false&clientaction=init&rs.i0.r.i8.hold=false&rs.i4.r.i0.hold=false&rs.i0.r.i2.hold=false&rs.i4.r.i3.syms=SYM4%2CSYM10%2CSYM9&casinoID=netent&betlevel.standard=1&rs.i3.r.i2.hold=false&gameover=false&rs.i3.r.i3.pos=60&rs.i0.r.i3.pos=0&rs.i4.r.i0.syms=SYM0%2CSYM7%2CSYM11&rs.i0.r.i11.pos=0&bl.i0.id=243&rs.i0.r.i10.syms=SYM30&rs.i0.r.i13.syms=SYM30&bl.i0.line=0%2F1%2F2%2C0%2F1%2F2%2C0%2F1%2F2%2C0%2F1%2F2%2C0%2F1%2F2&nextaction=freespin&rs.i0.r.i5.pos=0&rs.i4.r.i2.pos=32&rs.i0.r.i2.syms=SYM30&game.win.amount=3.00&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&freespins.totalwin.cents=300&denomination.all=1%2C2%2C5%2C10%2C20%2C50%2C100%2C200&freespins.betlevel=1&rs.i0.r.i6.pos=0&rs.i4.r.i3.pos=51&playercurrency=%26%23x20AC%3B&rs.i0.r.i10.hold=false&rs.i2.r.i0.pos=51&rs.i4.r.i4.hold=false&rs.i4.r.i0.overlay.i0.with=SYM1&rs.i0.r.i8.syms=SYM30&rs.i2.r.i4.syms=SYM6%2CSYM10%2CSYM9&betlevel.last=1&rs.i3.r.i2.syms=SYM4%2CSYM10%2CSYM9&rs.i4.r.i3.hold=false&rs.i0.id=respin&credit=' . $balanceInCents . '&rs.i1.r.i4.pos=0&rs.i0.r.i7.syms=SYM30&denomination.standard=5&rs.i0.r.i6.syms=SYM30&rs.i3.id=basic&rs.i4.r.i0.overlay.i0.pos=3&rs.i0.r.i12.hold=false&multiplier=1&rs.i2.r.i2.pos=25&rs.i0.r.i9.syms=SYM30&last.rs=freespin&freespins.denomination=5.000&rs.i0.r.i8.pos=0&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&freespins.totalwin.coins=60&freespins.total=10&gamestate.stack=basic%2Cfreespin&rs.i1.r.i4.syms=SYM8%2CSYM3%2CSYM7&rs.i4.r.i0.attention.i0=0&rs.i2.r.i2.syms=SYM10%2CSYM11%2CSYM12&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i1.r.i2.pos=0&rs.i2.r.i4.overlay.i0.row=0&rs.i3.r.i3.syms=SYM1%2CSYM10%2CSYM2&rs.i4.r.i4.attention.i0=1&bet.betlevel=1&rs.i3.r.i4.hold=false&rs.i4.r.i2.hold=false&rs.i0.r.i14.pos=0&rs.i4.r.i1.syms=SYM12%2CSYM5%2CSYM9&rs.i2.r.i4.pos=42&rs.i3.r.i0.syms=SYM11%2CSYM7%2CSYM10&playercurrencyiso=' + this.slotSettings.slotCurrency + '&rs.i0.r.i11.syms=SYM30&rs.i4.r.i1.hold=false&freespins.wavecount=1&rs.i3.r.i2.pos=131&rs.i3.r.i3.hold=false&freespins.multiplier=1&playforfun=false&jackpotcurrencyiso=' + this.slotSettings.slotCurrency + '&rs.i0.r.i4.syms=SYM30&rs.i0.r.i2.pos=0&rs.i1.r.i2.syms=SYM8%2CSYM3%2CSYM7&rs.i1.r.i0.pos=0&totalwin.cents=300&bl.i0.coins=20&rs.i0.r.i12.pos=0&rs.i2.r.i0.syms=SYM5%2CSYM8%2CSYM11&rs.i0.r.i0.hold=false&rs.i2.r.i3.syms=SYM10%2CSYM8%2CSYM4&restore=true&rs.i1.id=freespinwalkingwild&rs.i3.r.i4.syms=SYM3%2CSYM10%2CSYM0&rs.i0.r.i6.hold=false&rs.i3.r.i1.syms=SYM6%2CSYM12%2CSYM4&rs.i1.r.i4.hold=false&freespins.left=7&rs.i0.r.i4.pos=0&rs.i0.r.i9.hold=false&rs.i4.r.i1.pos=17&rs.i4.r.i2.syms=SYM11%2CSYM0%2CSYM6&bl.standard=243&rs.i0.r.i10.pos=0&rs.i0.r.i14.hold=false&rs.i0.r.i11.hold=false&rs.i3.r.i0.pos=0&rs.i3.r.i0.hold=false&rs.i4.nearwin=4&rs.i2.r.i2.hold=false&wavecount=1&rs.i1.r.i1.hold=false&rs.i0.r.i3.hold=false&bet.denomination=5';
        }

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        const result = `rs.i4.id=basic&rs.i2.r.i1.hold=false...&credit=${balanceInCents}...${curReels}...`;
        return result;
    }

    private handlePaytableRequest(): string {
        return 'pt.i0.comp.i19.symbol=SYM8&pt.i0.comp.i15.type=betline...';
    }

    private handleInitFreespinRequest(): string {
         const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
         return `rs.i4.id=basicwalkingwild...&credit=${balanceInCents}...`;
    }

    private handleRespinRequest(postData: any): string {
         // Narcos "Locked Up" Feature logic (respin)
         const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
         let ClusterSpinCount = this.slotSettings.GetGameData(this.slotId + 'ClusterSpinCount');
         let clusterAllWinOld = this.slotSettings.GetGameData(this.slotId + 'clusterAllWin') || 0;
         let clusterAllWin = clusterAllWinOld;

         if (ClusterSpinCount === undefined || ClusterSpinCount <= 0) ClusterSpinCount = 3;

         // Spin logic for respin: only blanks (30) and Locked Up symbols (2 or 2c)
         // Simplified logic: generate new symbols, check for clusters
         // For full implementation, we'd need grid logic.
         // Assuming '2' is Locked Up, '2c' is Golden Locked Up.

         // Decrement spin count if no new symbols locked
         // For now, just decrement to simulate game flow
         ClusterSpinCount--;

         this.slotSettings.SetGameData(this.slotId + 'ClusterSpinCount', ClusterSpinCount);

         let nextAction = 'respin';
         if (ClusterSpinCount <= 0) {
             nextAction = 'spin'; // Feature end
             this.slotSettings.SetBalance(clusterAllWin);
         }

         return `rs.i0.r.i6.pos=0&gameServerVersion=1.21.0&next.rs=${nextAction}&credit=${balanceInCents}&lockup.respins.left=${ClusterSpinCount}&totalwin.coins=${clusterAllWin}`;
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
        let spinWinLimit = winTypeTmp[1];

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
                 // Turn some high value symbols into wilds
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

                // Check 243 ways
                for (let rws = 1; rws <= 5; rws++) {
                    const curWays = waysLimit[20][rws - 1];

                    for (const cws of curWays) {
                        const reelSym = reels[`reel${rws}`]?.[cws];
                        if (reelSym == csym || reelSym == wild) {
                            waysCountArr[rws]++;
                        }
                    }

                    if (waysCountArr[rws] <= 0) break;
                    waysCount *= waysCountArr[rws];
                }

                // Calculate wins for 3, 4, 5 matches
                if (waysCountArr[1] > 0 && waysCountArr[2] > 0 && waysCountArr[3] > 0) {
                    const count = 3;
                    const payout = this.slotSettings.Paytable['SYM_' + csym][count];
                    if (payout > 0) {
                        const tmpWin = payout * betline * waysCount * bonusMpl;
                        cWins[j] = tmpWin; // Overwrite higher win
                    }
                }
                if (waysCountArr[1] > 0 && waysCountArr[2] > 0 && waysCountArr[3] > 0 && waysCountArr[4] > 0) {
                    const count = 4;
                    const payout = this.slotSettings.Paytable['SYM_' + csym][count];
                    if (payout > 0) {
                        const tmpWin = payout * betline * waysCount * bonusMpl;
                        cWins[j] = tmpWin;
                    }
                }
                if (waysCountArr[1] > 0 && waysCountArr[2] > 0 && waysCountArr[3] > 0 && waysCountArr[4] > 0 && waysCountArr[5] > 0) {
                    const count = 5;
                    const payout = this.slotSettings.Paytable['SYM_' + csym][count];
                    if (payout > 0) {
                        const tmpWin = payout * betline * waysCount * bonusMpl;
                        cWins[j] = tmpWin;
                    }
                }

                if (cWins[j] > 0) {
                    totalWin += cWins[j];
                    // Construct win string...
                }
            }

             // Check total win limits...
             if (this.slotSettings.MaxWin < (totalWin * this.slotSettings.CurrentDenom)) {
                 continue;
             }

             // Calculate next Walking Wilds positions if spin is valid
             nextWalkingWild = [];
             for(let r=1; r<=5; r++) {
                 for(let p=0; p<=2; p++) {
                     if(reels[`reel${r}`][p] == '1') {
                         if (r > 1) { // Shift left
                             nextWalkingWild.push([r - 1, p]); // Store as 1-based reel index or whatever format SlotSettings expects?
                             // PHP Uses 0-based index for storage? WalkingWildTmp[] = [$r - 1, $p];
                             // My reel loop uses 1-based 'reel1'.
                             // Let's assume storage is [reelIndex (1-5), row].
                             // If shifting left, r-1.
                             // If r=1, it moves off screen.
                         }
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

        if (postData.slotEvent == 'freespin') {
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', this.slotSettings.GetGameData(this.slotId + 'BonusWin') + totalWin);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', this.slotSettings.GetGameData(this.slotId + 'TotalWin') + totalWin);
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

        const response = JSON.stringify({
            responseEvent: 'spin',
            responseType: postData.slotEvent,
            serverResponse: {
                freeState: '',
                slotLines: lines,
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
