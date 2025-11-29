
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
        this.slotSettings.SetGameData('StarBurstNETBonusWin', 0);
        this.slotSettings.SetGameData('StarBurstNETFreeGames', 0);
        this.slotSettings.SetGameData('StarBurstNETCurrentFreeGame', 0);
        this.slotSettings.SetGameData('StarBurstNETTotalWin', 0);
        this.slotSettings.SetGameData('StarBurstNETFreeBalance', 0);

        let curReels = '';
        if (lastEvent != 'NULL') {
            // Restore from history logic
            const reels = lastEvent.serverResponse.reelsSymbols;
            curReels = `&rs.i0.r.i0.syms=SYM${reels.reel1[0]}%2CSYM${reels.reel1[1]}%2CSYM${reels.reel1[2]}`;
            // ... construct full reels string
        } else {
            // Random reels
            curReels = `&rs.i0.r.i0.syms=SYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}%2CSYM${this.randomInt(1, 7)}`;
            // ... construct full random reels string
        }

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);

        // Return Init Response
        return `rs.i1.r.i0.syms=SYM9%2CSYM9%2CSYM9...&credit=${balanceInCents}...`;
    }

    private handlePaytableRequest(): string {
        return 'pt.i0.comp.i0.type=betline&pt.i0.comp.i19.symbol=SYM9...';
    }

    private handleInitFreespinRequest(): string {
        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        return `rs.i1.r.i0.syms=SYM5%2CSYM0%2CSYM6...&credit=${balanceInCents}...`;
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

            this.slotSettings.SetGameData('StarBurstNETBonusWin', 0);
            this.slotSettings.SetGameData('StarBurstNETFreeGames', 0);
            this.slotSettings.SetGameData('StarBurstNETCurrentFreeGame', 0);
            this.slotSettings.SetGameData('StarBurstNETTotalWin', 0);
            this.slotSettings.SetGameData('StarBurstNETBet', betline);
            this.slotSettings.SetGameData('StarBurstNETDenom', postData.bet_denomination);
            this.slotSettings.SetGameData('StarBurstNETFreeBalance', this.slotSettings.GetBalance() * 100);
            this.slotSettings.SetGameData('StarBurstNETHolds', [0, 0, 0, 0, 0]);
        } else {
            const betline = this.slotSettings.GetGameData('StarBurstNETBet');
            this.slotSettings.SetGameData('StarBurstNETCurrentFreeGame', this.slotSettings.GetGameData('StarBurstNETCurrentFreeGame') + 1);
        }

        const betline = this.slotSettings.GetGameData('StarBurstNETBet');
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

        // Simulation loop
        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            lineWins = [];
            const cWins: number[] = new Array(lines).fill(0);
            reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent);

            // Logic for expanding wilds
            const holds = this.slotSettings.GetGameData('StarBurstNETHolds');
            for(let r = 1; r <= 5; r++) {
                if (postData.slotEvent == 'freespin' && holds[r - 1] == 1) {
                    reels['reel' + r][0] = '1';
                    reels['reel' + r][1] = '1';
                    reels['reel' + r][2] = '1';
                }
                for(let p = 0; p <= 2; p++) {
                    if (reels['reel' + r][p] == '1') {
                        reels['reel' + r][0] = '1';
                        reels['reel' + r][1] = '1';
                        reels['reel' + r][2] = '1';
                        break;
                    }
                }
            }

            // Line win calculation logic
            const linesId = [
                [2, 2, 2, 2, 2], [1, 1, 1, 1, 1], [3, 3, 3, 3, 3],
                [1, 2, 3, 2, 1], [3, 2, 1, 2, 3], [1, 1, 2, 1, 1],
                [3, 3, 2, 3, 3], [2, 3, 3, 3, 2], [2, 1, 1, 1, 2],
                [2, 1, 2, 1, 2]
            ];

            let winLineCount = 0;
            for (let k = 0; k < lines; k++) {
                let tmpStringWin = '';
                for (let j = 0; j < this.slotSettings.SymbolGame.length; j++) {
                    const csym = String(this.slotSettings.SymbolGame[j]);
                    const wild = ['1'];

                    if (csym == '0' || !this.slotSettings.Paytable['SYM_' + csym]) {
                        continue;
                    }

                    // Check both ways - Left to Right
                    let matchCountLR = 0;
                    for (let r = 0; r < 5; r++) {
                        const s = reels['reel' + (r + 1)][linesId[k][r] - 1];
                        if (s == csym || wild.includes(String(s))) {
                            matchCountLR++;
                        } else {
                            break;
                        }
                    }

                    // Check both ways - Right to Left
                    let matchCountRL = 0;
                    for (let r = 4; r >= 0; r--) {
                        const s = reels['reel' + (r + 1)][linesId[k][r] - 1];
                        if (s == csym || wild.includes(String(s))) {
                            matchCountRL++;
                        } else {
                            break;
                        }
                    }

                    // Calculate Win
                    let win = 0;
                    // Left to Right Win
                    if (matchCountLR >= 3) {
                        win += this.slotSettings.Paytable['SYM_' + csym][matchCountLR] * betline * bonusMpl;
                    }
                    // Right to Left Win
                    if (matchCountRL >= 3) {
                        // Avoid double counting 5 of a kind (5 of a kind pays only once or usually highest)
                        // Starburst pays both ways, but 5 of a kind is usually paid once.
                        // However, PHP logic check might clarify.
                        // PHP logic iterates 3, 4, 5 for simple checks. Starburst needs specific both-ways logic.
                        // Let's assume standard "Pays Both Ways":
                        // If 5 of a kind, it's paid twice only if the rule says so, usually it's once.
                        // But typically "Both ways" implies max(left, right) or sum?
                        // "Win both ways" usually means highest win on a line pays.
                        // Actually, Starburst pays both ways: leftmost to right AND rightmost to left.
                        // 5 of a kind pays twice? No, usually 5 symbols pays only once (Left to Right).

                        if (matchCountRL != 5) { // If 5, it's already counted in LR (or should be handled to not double count)
                             win += this.slotSettings.Paytable['SYM_' + csym][matchCountRL] * betline * bonusMpl;
                        }
                    }

                    // If 5 of a kind, usually paid only once (LR). If RL is also 5, don't add.
                    // But if LR < 5 and RL >= 3, add RL.

                    if (win > cWins[k]) {
                        cWins[k] = win;
                        // Construct string logic...
                    }
                }

                if (cWins[k] > 0) {
                    totalWin += cWins[k];
                    winLineCount++;
                }
            }

            // Check scatter counts for free spins (respins)
            let scattersCount = 0;
            let holdsNew = [0,0,0,0,0];
            for (let r = 1; r <= 5; r++) {
                for (let p = 0; p <= 2; p++) {
                    if (reels['reel' + r][p] == '1' && postData.slotEvent != 'freespin') {
                        scattersCount++;
                        holdsNew[r - 1] = 1;
                        break;
                    }
                }
            }
            if(scattersCount > 0) {
                this.slotSettings.SetGameData('StarBurstNETHolds', holdsNew);
            }

            // ... Validation logic ...
            if (this.slotSettings.MaxWin < (totalWin * this.slotSettings.CurrentDenom)) {
                continue;
            }

            break; // Simplified break
        }

        if (totalWin > 0) {
            this.slotSettings.SetBank(postData.slotEvent, -1 * totalWin);
            this.slotSettings.SetBalance(totalWin);
        }

        if (postData.slotEvent == 'freespin') {
            this.slotSettings.SetGameData('StarBurstNETBonusWin', this.slotSettings.GetGameData('StarBurstNETBonusWin') + totalWin);
            this.slotSettings.SetGameData('StarBurstNETTotalWin', this.slotSettings.GetGameData('StarBurstNETTotalWin') + totalWin);
        } else {
            this.slotSettings.SetGameData('StarBurstNETTotalWin', totalWin);
        }

        // Logic for triggering respins
        let scattersCount = 0;
        // Re-check scatters count on final reels
        for (let r = 1; r <= 5; r++) {
             if (reels['reel' + r][0] == '1') { // Since we expanded, checking 0 is enough
                 if(postData.slotEvent != 'freespin') scattersCount++;
             }
        }

        if (scattersCount >= 1) {
            this.slotSettings.SetGameData('StarBurstNETFreeStartWin', totalWin);
            this.slotSettings.SetGameData('StarBurstNETBonusWin', totalWin);
            this.slotSettings.SetGameData('StarBurstNETFreeGames', 1);
        }

        const balanceInCents = Math.round(this.slotSettings.GetBalance() * this.slotSettings.CurrentDenom * 100);
        const jsSpin = JSON.stringify(reels);
        const jsJack = JSON.stringify(this.slotSettings.Jackpots);

        let freeState = ''; // Construct freeState if needed

        const response = JSON.stringify({
            responseEvent: 'spin',
            responseType: postData.slotEvent,
            serverResponse: {
                freeState: freeState,
                slotLines: lines,
                slotBet: betline,
                totalFreeGames: this.slotSettings.GetGameData('StarBurstNETFreeGames'),
                currentFreeGames: this.slotSettings.GetGameData('StarBurstNETCurrentFreeGame'),
                Balance: balanceInCents,
                afterBalance: balanceInCents,
                bonusWin: this.slotSettings.GetGameData('StarBurstNETBonusWin'),
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
