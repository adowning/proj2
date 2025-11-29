
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
            // Logic to restore from history
             // Implement logic to parse lastEvent for state restoration
        } else {
             // Random reels generation
             curReels = `&rs.i0.r.i0.syms=SYM${this.randomInt(1, 7)}...`;
        }

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        return `rs.i1.r.i0.syms=SYM5%2CSYM5%2CSYM9...&credit=${balanceInCents}...`;
    }

    private handlePaytableRequest(): string {
        return 'pt.i0.comp.i19.symbol=SYM8...';
    }

    private handlePurchaseStars(postData: any): string {
        const starAmountArr = [400, 1000, 2000];
        const starPriceArr = [6, 15, 29.5];
        const allbet = this.slotSettings.GetGameData(this.slotId + 'AllBet');

        if(!postData.starbuy_amount) return this.createErrorResponse("invalid starbuy amount");

        const starAmount = starAmountArr[postData.starbuy_amount];
        const starPrice = starPriceArr[postData.starbuy_amount] * allbet;

        if (starPrice <= this.slotSettings.GetBalance()) {
             this.slotSettings.SetBalance(-1 * starPrice, 'bet');
             // Update bank and jackpots logic...
             this.slotSettings.UpdateJackpots(starPrice);
        } else {
             return this.createErrorResponse("invalid balance", postData.slotEvent);
        }

        let Stars = this.slotSettings.GetGameData(this.slotId + 'Stars') || 0;
        Stars += starAmount;
        if(Stars > 2000) Stars = 2000;
        this.slotSettings.SetGameData(this.slotId + 'Stars', Stars);

        return `stars.total=${Stars}&clientaction=purchasestars...`;
    }

    private handleGamble(): string {
        const Stars = this.slotSettings.GetGameData(this.slotId + 'Stars');
        const GambleChance = Stars / 20;
        const gambleWin = Math.random() * 100 < GambleChance;

        // Reset stars after gamble
        this.slotSettings.SetGameData(this.slotId + 'Stars', 0);

        if(gambleWin) {
            return `gamble.win=true&nextaction=superfreespin...`;
        } else {
             return `gamble.win=false&nextaction=freespin...`;
        }
    }

    private handleInitFreespinRequest(): string {
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        return `rs.i4.id=freespin3...&credit=${balanceInCents}...`;
    }

    private handleStartFreespins(): string {
        return 'freespins.betlevel=1...';
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
        if (postData.freeMode == 'superfreespin') {
             // Increment multiplierlogic
             let superMpl = this.slotSettings.GetGameData(this.slotId + 'SuperMpl');
             // Logic to increase...
             superMpl++;
             this.slotSettings.SetGameData(this.slotId + 'SuperMpl', superMpl);
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

                for (let rws = 1; rws <= 5; rws++) {
                    const curWays = waysLimit[RespinId][rws - 1];
                    for(const cws of curWays) {
                        const sym = reels[`reel${rws}`][cws];
                        if(sym == csym || sym == '1') { // Check match or wild
                             waysCountArr[rws]++;
                        }
                    }
                    if (waysCountArr[rws] <= 0) break;
                    waysCount *= waysCountArr[rws];
                }

                // Calculate wins 3, 4, 5
                if(waysCountArr[1] > 0 && waysCountArr[2] > 0 && waysCountArr[3] > 0) {
                     // Check for 3
                     if(this.slotSettings.Paytable['SYM_' + csym][3] > 0) {
                         cWins[j] = this.slotSettings.Paytable['SYM_' + csym][3] * betline * waysCount * bonusMpl;
                     }
                }
                if(waysCountArr[1] > 0 && waysCountArr[2] > 0 && waysCountArr[3] > 0 && waysCountArr[4] > 0) {
                     // Check for 4
                     if(this.slotSettings.Paytable['SYM_' + csym][4] > 0) {
                         cWins[j] = this.slotSettings.Paytable['SYM_' + csym][4] * betline * waysCount * bonusMpl;
                     }
                }
                if(waysCountArr[1] > 0 && waysCountArr[2] > 0 && waysCountArr[3] > 0 && waysCountArr[4] > 0 && waysCountArr[5] > 0) {
                     // Check for 5
                     if(this.slotSettings.Paytable['SYM_' + csym][5] > 0) {
                         cWins[j] = this.slotSettings.Paytable['SYM_' + csym][5] * betline * waysCount * bonusMpl;
                     }
                }

                if (cWins[j] > 0) {
                    totalWin += cWins[j];
                    // Add to lineWins string array if needed
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
        const jsSpin = JSON.stringify(reels);
        const jsJack = JSON.stringify(this.slotSettings.Jackpots);

        let freeState = '';
        // Logic to construct freeState if needed

        const response = JSON.stringify({
            responseEvent: 'spin',
            responseType: postData.slotEvent,
            serverResponse: {
                freeState: freeState,
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
                reelsSymbols: reels,
                features: featureStr // Returning feature string part
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
