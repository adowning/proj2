// Server.ts - BananasNG game server
// Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines
// Data injection pattern - NO database calls or legacy PHP constructs

import { SlotSettings, ReelStrips } from "./SlotSettings";
import { ISlotSettingsData } from "../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'BananasNG';
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
        const result: string[] = [];

        // Parse request data
        let postData = request;
        if (request.gameData) {
            postData = request.gameData;
        }

        const reqId = postData.cmd || postData.action;
        if (!reqId) {
            return this.createErrorResponse("incorrect action");
        }

        // Handle different request types
        switch (reqId) {
            case 'InitRequest':
                return this.handleInitRequest();

            case 'EventsRequest':
                return this.handleEventsRequest();

            case 'APIVersionRequest':
                return this.handleAPIVersionRequest();

            case 'CheckBrokenGameRequest':
                return this.handleCheckBrokenGameRequest();

            case 'AuthRequest':
                return this.handleAuthRequest();

            case 'BalanceRequest':
                return this.handleBalanceRequest();

            case 'SpinRequest':
            case 'FreeSpinRequest':
                return this.handleSpinRequest(postData, reqId);

            case 'PickBonusItemRequest':
                return this.handlePickBonusItemRequest(postData);

            default:
                return this.createErrorResponse("unknown action");
        }
    }

    private handleInitRequest(): string {
        const response = {
            action: "InitResponse",
            result: true,
            sesId: this.sessionId,
            data: { id: 16183084 }
        };
        return JSON.stringify(response);
    }

    private handleEventsRequest(): string {
        const response = {
            action: "EventsResponse",
            result: true,
            sesId: this.sessionId,
            data: []
        };
        return JSON.stringify(response);
    }

    private handleAPIVersionRequest(): string {
        const response = {
            action: "APIVersionResponse",
            result: true,
            sesId: false,
            data: {
                router: "v3.12",
                transportConfig: { reconnectTimeout: 500000000000 }
            }
        };
        return JSON.stringify(response);
    }

    private handleCheckBrokenGameRequest(): string {
        const response = {
            action: "CheckBrokenGameResponse",
            result: true,
            sesId: false,
            data: { haveBrokenGame: false }
        };
        return JSON.stringify(response);
    }

    private handleAuthRequest(): string {
        // Initialize game state
        this.slotSettings.SetGameData(this.slotId + 'BonusWin', 0);
        this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
        this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
        this.slotSettings.SetGameData(this.slotId + 'TotalWin', 0);
        this.slotSettings.SetGameData(this.slotId + 'FreeBalance', 0);
        this.slotSettings.SetGameData(this.slotId + 'FreeStartWin', 0);
        this.slotSettings.SetGameData(this.slotId + 'BonusSymbol', -1);

        const lastEvent = this.slotSettings.GetHistory();
        let rp1 = '';
        let rp2 = '';
        let bet = 0;

        if (lastEvent && lastEvent !== 'NULL') {
            // Restore from history
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', lastEvent.serverResponse?.bonusWin || 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', lastEvent.serverResponse?.totalFreeGames || 0);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', lastEvent.serverResponse?.currentFreeGames || 0);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', lastEvent.serverResponse?.bonusWin || 0);
            this.slotSettings.SetGameData(this.slotId + 'BonusSymbol', lastEvent.serverResponse?.BonusSymbol || -1);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeStartWin', 0);

            // Reconstruct reel positions
            const reels = lastEvent.serverResponse?.reelsSymbols;
            if (reels) {
                rp1 = (reels.rp || []).join(',');
                const rows = [];
                for (let i = 0; i < 3; i++) {
                    const row = [];
                    for (let j = 1; j <= 5; j++) {
                        row.push(reels[`reel${j}`] ? reels[`reel${j}`][i] : 0);
                    }
                    rows.push(`[${row.join(',')}]`);
                }
                rp2 = `[${rows.join(',')}]`;
            }
            bet = (lastEvent.serverResponse?.slotBet || 0) * 100 * 10;
        } else {
            // Generate random initial reels
            const positions = [
                this.randomInt(0, (this.slotSettings.reelStrip1?.length || 50) - 3),
                this.randomInt(0, (this.slotSettings.reelStrip2?.length || 50) - 3),
                this.randomInt(0, (this.slotSettings.reelStrip3?.length || 50) - 3),
                this.randomInt(0, (this.slotSettings.reelStrip4?.length || 50) - 3),
                this.randomInt(0, (this.slotSettings.reelStrip5?.length || 50) - 3)
            ];

            rp1 = positions.join(',');

            const reels: any[] = [];
            for (let row = 0; row < 3; row++) {
                const rowSymbols: string[] = [];
                for (let reel = 1; reel <= 5; reel++) {
                    const reelData = (this.slotSettings as any)[`reelStrip${reel}`] || [];
                    rowSymbols.push(reelData[positions[reel - 1] + row] || '0');
                }
                reels.push(`[${rowSymbols.join(',')}]`);
            }
            rp2 = reels.join(',');

            bet = this.slotSettings.Bet?.[0] ? this.slotSettings.Bet[0] * 100 * 10 : 10;
        }

        // Check if free games should end
        if (this.slotSettings.GetGameData(this.slotId + 'FreeGames') ===
            this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame')) {
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
        }

        // Handle free spins restoration
        let restoreString = '';
        if (this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') <
            this.slotSettings.GetGameData(this.slotId + 'FreeGames')) {
            const fBonusWin = this.slotSettings.GetGameData(this.slotId + 'BonusWin');
            const fTotal = this.slotSettings.GetGameData(this.slotId + 'FreeGames');
            const fCurrent = this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame');
            const fRemain = fTotal - fCurrent;
            restoreString = `,"restoredGameCode":"340","lastResponse":{"spinResult":{"type":"SpinResult","rows":[${rp2}]},"freeSpinsTotal":"${fTotal}","freeSpinRemain":"${fRemain}","totalBonusWin":"${fBonusWin}","state":"FreeSpins","expandingSymbols":["1"]}`;
        }

        const response = {
            action: "AuthResponse",
            result: true,
            sesId: this.sessionId,
            data: {
                snivy: "proxy v6.10.48 (API v4.23)",
                supportedFeatures: ["Offers", "Jackpots", "InstantJackpots", "SweepStakes"],
                sessionId: this.sessionId,
                defaultLines: (() => {
                    const lines = [];
                    for (let i = 0; i < 10; i++) {
                        lines.push(i.toString());
                    }
                    return lines;
                })(),
                bets: ["1", "2", "3", "4", "5", "10", "15", "20", "30", "40", "50", "100", "200", "400", "800"],
                betMultiplier: "1.0000000",
                defaultBet: "1",
                defaultCoinValue: "0.01",
                coinValues: ["0.01"],
                gameParameters: {
                    availableLines: this.getPayLines(),
                    rtp: "92.18",
                    payouts: this.getPaytable(),
                    initialSymbols: [["8", "6", "7", "8", "4"], ["7", "0", "12", "3", "9"], ["0", "8", "9", "10", "0"]]
                },
                jackpotsEnabled: "true",
                gameModes: "[]"
            }
        };

        return JSON.stringify(response);
    }

    private handleBalanceRequest(): string {
        const response = {
            action: "BalanceResponse",
            result: true,
            sesId: this.sessionId,
            data: {
                entries: "0.00",
                totalAmount: this.slotSettings.GetBalance().toFixed(2),
                currency: this.slotSettings.slotCurrency
            }
        };
        return JSON.stringify(response);
    }

    private handleSpinRequest(postData: any, reqId: string): string {
        const linesId = this.getLinesId();
        const lines = 10;
        const betLine = postData.data.coin * postData.data.bet;
        const allbet = betLine * lines;

        let slotEvent = 'bet';
        let bonusMpl = 1;
        let gameState = 'Ready'; // Declare gameState at method level

        if (reqId === 'FreeSpinRequest') {
            slotEvent = 'freespin';
        }

        // Validate bet
        if (postData.data.coin <= 0 || postData.data.bet <= 0) {
            return this.createErrorResponse("invalid bet state");
        }

        if (this.slotSettings.GetBalance() < allbet &&
            this.slotSettings.GetGameData(this.slotId + 'FreeGames') <= 0) {
            return this.createErrorResponse("invalid balance");
        }

        // Handle bet and free spin logic
        if (slotEvent !== 'freespin') {
            this.slotSettings.SetBalance(-1 * allbet, slotEvent);
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(slotEvent, bankSum, slotEvent);
            this.slotSettings.UpdateJackpots(allbet);

            // Reset game data
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
            this.slotSettings.SetGameData(this.slotId + 'BonusSymbol', -1);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeStartWin', 0);
        } else {
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame',
                this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') + 1);
            bonusMpl = this.slotSettings.slotFreeMpl;
        }

        const balance = this.slotSettings.GetBalance().toFixed(2);
        const winTypeTmp = this.slotSettings.GetSpinSettings(slotEvent, betLine, lines);
        const winType = winTypeTmp[0];
        const spinWinLimit = winTypeTmp[1];

        // Spin simulation loop
        let totalWin = 0;
        let finalScattersCount = 0; // Store final scatters count
        const lineWins: string[] = [];
        const cWins: number[] = new Array(30); // Initialize array properly
        for (let i = 0; i < cWins.length; i++) cWins[i] = 0;
        const wild = ['12'];
        const scatter = '11';

        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            for (let k = 0; k < 10; k++) {
                cWins[k] = 0;
            }

            const reels: ReelStrips = this.slotSettings.GetReelStrips(winType, slotEvent);

            // Calculate line wins
            for (let k = 0; k < 10; k++) {
                let tmpStringWin = '';
                for (let j = 0; j < this.slotSettings.SymbolGame.length; j++) {
                    const csym = this.slotSettings.SymbolGame[j];
                    if (csym == scatter || !this.slotSettings.Paytable[`SYM_${csym}`]) {
                        continue;
                    }

                    const s = [
                        reels.reel1?.[linesId[k][0] - 1] || 0,
                        reels.reel2?.[linesId[k][1] - 1] || 0,
                        reels.reel3?.[linesId[k][2] - 1] || 0,
                        reels.reel4?.[linesId[k][3] - 1] || 0,
                        reels.reel5?.[linesId[k][4] - 1] || 0
                    ];

                    const p = [
                        linesId[k][0] - 1,
                        linesId[k][1] - 1,
                        linesId[k][2] - 1,
                        linesId[k][3] - 1,
                        linesId[k][4] - 1
                    ];

                    // Check for wins (2-5 symbols)
                    for (let count = 1; count <= 5; count++) {
                        let matchCount = 0;
                        for (let m = 0; m < count; m++) {
                            if (s[m] == csym || (wild as any).indexOf(s[m].toString()) >= 0) {
                                matchCount++;
                            } else {
                                break;
                            }
                        }

                        if (matchCount === count && count > 1) {
                            let mpl = 1;
                            if (count > 2) {
                                const wildMatches = s.slice(0, count).filter(sym =>
                                    (wild as any).indexOf(sym.toString()) >= 0).length;
                                if (wildMatches === count) {
                                    mpl = 0;
                                } else if (wildMatches > 0) {
                                    mpl = this.slotSettings.slotWildMpl;
                                }
                            }

                            const tmpWin = this.slotSettings.Paytable[`SYM_${csym}`][count] * betLine * mpl * bonusMpl;
                            if (cWins[k] < tmpWin) {
                                cWins[k] = tmpWin;
                                const wonSymbols = [];
                                for (let m = 0; m < count; m++) {
                                    wonSymbols.push(["0", p[m].toString()]);
                                }
                                tmpStringWin = `{"type":"LineWinAmount","selectedLine":"${k}","amount":"${tmpWin}","wonSymbols":${JSON.stringify(wonSymbols)}}`;
                            }
                        }
                    }
                }

                if (cWins[k] > 0 && tmpStringWin) {
                    lineWins.push(tmpStringWin);
                    totalWin += cWins[k];
                }
            }

            // Calculate scatter wins
            let scattersWin = 0;
            let scattersCount = 0; // Local variable for this iteration
            const scattersPos: string[] = [];

            for (let r = 1; r <= 5; r++) {
                for (let p = 0; p <= 2; p++) {
                    const symbol = reels[`reel${r}`]?.[p];
                    if (symbol == scatter) {
                        scattersCount++;
                        scattersPos.push(`["${r - 1}","${p}"]`);
                    }
                }
            }

            finalScattersCount = scattersCount; // Capture final value

            scattersWin = this.slotSettings.Paytable[`SYM_${scatter}`][scattersCount] * betLine * lines * bonusMpl;

            // Bonus trigger
            if (scattersCount >= 3 && this.slotSettings.slotBonus) {
                gameState = 'FreeSpins';
                const bonusItem = {
                    type: "Bonus",
                    bonusName: "FreeSpins",
                    params: { freeSpins: this.slotSettings.slotFreeCount.toString() },
                    amount: this.slotSettings.FormatFloat(scattersWin),
                    wonSymbols: scattersPos
                };
                lineWins.push(JSON.stringify(bonusItem));
            } else if (scattersCount >= 2) {
                const winAmount = {
                    wonSymbols: scattersPos,
                    amount: this.slotSettings.FormatFloat(scattersWin),
                    type: "WinAmount"
                };
                lineWins.push(JSON.stringify(winAmount));
            }

            totalWin += scattersWin;

            // Win validation logic
            if (i > 1000) {
                // Force no win if too many attempts
                totalWin = 0;
            }
            if (i > 1500) {
                return this.createErrorResponse("Bad Reel Strip");
            }

            if (this.slotSettings.MaxWin < (totalWin * this.slotSettings.CurrentDenom)) {
                continue;
            }

            const minWin = i > 700 ? 0 : this.slotSettings.GetRandomPay();

            if (this.slotSettings.increaseRTP && winType === 'win' && totalWin < (minWin * allbet)) {
                continue;
            }

            // Final win validation
            if (scattersCount >= 2 && winType !== 'bonus') {
                continue;
            } else if (totalWin <= spinWinLimit && winType === 'bonus') {
                const cBank = this.slotSettings.GetBank(slotEvent);
                if (cBank < spinWinLimit) {
                    continue;
                } else {
                    break;
                }
            } else if (totalWin > 0 && totalWin <= spinWinLimit && winType === 'win') {
                const cBank = this.slotSettings.GetBank(slotEvent);
                if (cBank < spinWinLimit) {
                    continue;
                } else {
                    break;
                }
            } else if (totalWin === 0 && winType === 'none') {
                break;
            }
        }

        // Apply win
        let flag = 0;
        if (totalWin > 0) {
            this.slotSettings.SetBank(slotEvent, -1 * totalWin);
            this.slotSettings.SetBalance(totalWin);
            flag = 6;
        }

        const reportWin = totalWin;

        // Handle free spins win accumulation
        if (slotEvent === 'freespin') {
            this.slotSettings.SetGameData(this.slotId + 'BonusWin',
                this.slotSettings.GetGameData(this.slotId + 'BonusWin') + totalWin);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin',
                this.slotSettings.GetGameData(this.slotId + 'TotalWin') + totalWin);
        } else {
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', totalWin);
        }

        // Handle bonus game trigger
        if (finalScattersCount >= 3) {
            if (this.slotSettings.GetGameData(this.slotId + 'FreeGames') > 0) {
                this.slotSettings.SetGameData(this.slotId + 'FreeGames',
                    this.slotSettings.GetGameData(this.slotId + 'FreeGames') + this.slotSettings.slotFreeCount);
            } else {
                this.slotSettings.SetGameData(this.slotId + 'FreeStartWin', totalWin);
                this.slotSettings.SetGameData(this.slotId + 'BonusWin', totalWin);
                this.slotSettings.SetGameData(this.slotId + 'FreeGames', this.slotSettings.slotFreeCount);
            }
        }

        // Generate final response
        const reels: ReelStrips = this.slotSettings.GetReelStrips('none', slotEvent);
        const jsSpin = JSON.stringify(reels);
        const jsJack = JSON.stringify(this.slotSettings.Jackpots);

        let winString = '';
        if (totalWin > 0) {
            winString = `,"slotWin":{"totalWin":"${totalWin}","lineWinAmounts":[${lineWins.join(',')}],"canGamble":"false"}`;
        }

        const response = {
            responseEvent: "spin",
            responseType: slotEvent,
            serverResponse: {
                BonusSymbol: this.slotSettings.GetGameData(this.slotId + 'BonusSymbol'),
                slotLines: lines,
                slotBet: betLine,
                totalFreeGames: this.slotSettings.GetGameData(this.slotId + 'FreeGames'),
                currentFreeGames: this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame'),
                Balance: this.slotSettings.GetBalance(),
                afterBalance: this.slotSettings.GetBalance(),
                bonusWin: this.slotSettings.GetGameData(this.slotId + 'BonusWin'),
                freeStartWin: this.slotSettings.GetGameData(this.slotId + 'FreeStartWin'),
                totalWin: totalWin,
                winLines: [],
                bonusInfo: [],
                Jackpots: this.slotSettings.Jackpots,
                reelsSymbols: reels
            }
        };

        const symb = `["${reels.reel1?.[0] || 0}","${reels.reel2?.[0] || 0}","${reels.reel3?.[0] || 0}","${reels.reel4?.[0] || 0}","${reels.reel5?.[0] || 0}"],["${reels.reel1?.[1] || 0}","${reels.reel2?.[1] || 0}","${reels.reel3?.[1] || 0}","${reels.reel4?.[1] || 0}","${reels.reel5?.[1] || 0}"],["${reels.reel1?.[2] || 0}","${reels.reel2?.[2] || 0}","${reels.reel3?.[2] || 0}","${reels.reel4?.[2] || 0}","${reels.reel5?.[2] || 0}"]`;

        this.slotSettings.SaveLogReport(JSON.stringify(response), allbet, lines, reportWin, slotEvent);

        if (slotEvent === 'freespin') {
            const bonusWin0 = this.slotSettings.GetGameData(this.slotId + 'BonusWin');
            const freeSpinRemain = this.slotSettings.GetGameData(this.slotId + 'FreeGames') -
                this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame');
            const freeSpinsTotal = this.slotSettings.GetGameData(this.slotId + 'FreeGames');
            gameState = 'FreeSpins';

            let gameParameters = '';
            if (this.slotSettings.GetGameData(this.slotId + 'FreeGames') <=
                this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') &&
                this.slotSettings.GetGameData(this.slotId + 'FreeGames') > 0) {
                gameState = 'Ready';
                gameParameters = `"gameParameters":{"initialSymbols":[${this.slotSettings.GetGameData(this.slotId + 'initialSymbols')}]},`;
            }

            const responseData: any = {
                spinResult: { type: "SpinResult", rows: [symb] },
                totalBonusWin: this.slotSettings.FormatFloat(bonusWin0),
                freeSpinRemain: freeSpinRemain,
                freeSpinsTotal: freeSpinsTotal
            };

            if (gameParameters) {
                responseData.gameParameters = { initialSymbols: JSON.parse(this.slotSettings.GetGameData(this.slotId + 'initialSymbols') || '[]') };
            }

            responseData.state = gameState + winString;

            const finalResponse = {
                action: "FreeSpinResponse",
                result: true,
                sesId: this.sessionId,
                data: responseData
            };
            return `:::${JSON.stringify(finalResponse)}`;
        } else {
            this.slotSettings.SetGameData(this.slotId + 'initialSymbols', symb);
            const finalResponse = {
                action: "SpinResponse",
                result: true,
                sesId: this.sessionId,
                data: {
                    spinResult: { type: "SpinResult", rows: [symb] },
                    state: gameState + winString
                }
            };
            return `:::${JSON.stringify(finalResponse)}`;
        }
    }

    private handlePickBonusItemRequest(postData: any): string {
        const bonusSymbol = postData.data.index;
        this.slotSettings.SetGameData(this.slotId + 'BonusSymbol', bonusSymbol);
        
        const response = {
            action: "PickBonusItemResponse",
            result: "true",
            sesId: this.sessionId,
            data: {
                state: "PickBonus",
                params: {
                    picksRemain: "0",
                    expandingSymbols: [bonusSymbol.toString()]
                }
            }
        };
        
        return JSON.stringify(response);
    }

    // Helper methods
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

        const strLog = `\n${JSON.stringify({
            responseEvent: "error",
            responseType: error.toString(),
            serverResponse: "InternalError",
            request: {},
            requestRaw: {}
        })}\n`;

        console.error(strLog);

        return this.createErrorResponse("InternalError");
    }

    private getLinesId(): number[][] {
        return [
            [2, 2, 2, 2, 2], // Line 1
            [1, 1, 1, 1, 1], // Line 2
            [3, 3, 3, 3, 3], // Line 3
            [1, 2, 3, 2, 1], // Line 4
            [3, 2, 1, 2, 3], // Line 5
            [2, 3, 3, 3, 2], // Line 6
            [2, 1, 1, 1, 2], // Line 7
            [3, 3, 2, 1, 1], // Line 8
            [1, 1, 2, 3, 3], // Line 9
            [3, 2, 2, 2, 1]  // Line 10
        ];
    }

    private getPaytable(): any[] {
        return [
            { payout: 2, symbols: ["0", "0"], type: "basic" },
            { payout: 30, symbols: ["0", "0", "0"], type: "basic" },
            { payout: 120, symbols: ["0", "0", "0", "0"], type: "basic" },
            { payout: 800, symbols: ["0", "0", "0", "0", "0"], type: "basic" },
            { payout: 2, symbols: ["1", "1"], type: "basic" },
            { payout: 30, symbols: ["1", "1", "1"], type: "basic" },
            { payout: 120, symbols: ["1", "1", "1", "1"], type: "basic" },
            { payout: 800, symbols: ["1", "1", "1", "1", "1"], type: "basic" },
            { payout: 20, symbols: ["2", "2", "2"], type: "basic" },
            { payout: 100, symbols: ["2", "2", "2", "2"], type: "basic" },
            { payout: 400, symbols: ["2", "2", "2", "2", "2"], type: "basic" },
            { payout: 20, symbols: ["3", "3", "3"], type: "basic" },
            { payout: 70, symbols: ["3", "3", "3", "3"], type: "basic" },
            { payout: 250, symbols: ["3", "3", "3", "3", "3"], type: "basic" },
            { payout: 20, symbols: ["4", "4", "4"], type: "basic" },
            { payout: 70, symbols: ["4", "4", "4", "4"], type: "basic" },
            { payout: 250, symbols: ["4", "4", "4", "4", "4"], type: "basic" },
            { payout: 10, symbols: ["5", "5", "5"], type: "basic" },
            { payout: 50, symbols: ["5", "5", "5", "5"], type: "basic" },
            { payout: 120, symbols: ["5", "5", "5", "5", "5"], type: "basic" },
            { payout: 10, symbols: ["6", "6", "6"], type: "basic" },
            { payout: 50, symbols: ["6", "6", "6", "6"], type: "basic" },
            { payout: 120, symbols: ["6", "6", "6", "6", "6"], type: "basic" },
            { payout: 4, symbols: ["7", "7", "7"], type: "basic" },
            { payout: 30, symbols: ["7", "7", "7", "7"], type: "basic" },
            { payout: 100, symbols: ["7", "7", "7", "7", "7"], type: "basic" },
            { payout: 4, symbols: ["8", "8", "8"], type: "basic" },
            { payout: 30, symbols: ["8", "8", "8", "8"], type: "basic" },
            { payout: 100, symbols: ["8", "8", "8", "8", "8"], type: "basic" },
            { payout: 4, symbols: ["9", "9", "9"], type: "basic" },
            { payout: 30, symbols: ["9", "9", "9", "9"], type: "basic" },
            { payout: 100, symbols: ["9", "9", "9", "9", "9"], type: "basic" },
            { payout: 2, symbols: ["10", "10"], type: "basic" },
            { payout: 4, symbols: ["10", "10", "10"], type: "basic" },
            { payout: 30, symbols: ["10", "10", "10", "10"], type: "basic" },
            { payout: 100, symbols: ["10", "10", "10", "10", "10"], type: "basic" },
            { payout: 2, symbols: ["11", "11"], type: "scatter" },
            { payout: 4, symbols: ["11", "11", "11"], type: "scatter" },
            { payout: 20, symbols: ["11", "11", "11", "11"], type: "scatter" },
            { payout: 500, symbols: ["11", "11", "11", "11", "11"], type: "scatter" },
            { payout: 10, symbols: ["12", "12"], type: "basic" },
            { payout: 250, symbols: ["12", "12", "12"], type: "basic" },
            { payout: 2500, symbols: ["12", "12", "12", "12"], type: "basic" },
            { payout: 9000, symbols: ["12", "12", "12", "12", "12"], type: "basic" }
        ];
    }

    private getPayLines(): number[][] {
        return [
            [1, 1, 1, 1, 1],
            [0, 0, 0, 0, 0],
            [2, 2, 2, 2, 2],
            [0, 1, 2, 1, 0],
            [2, 1, 0, 1, 2],
            [1, 2, 2, 2, 1],
            [1, 0, 0, 0, 1],
            [2, 2, 1, 0, 0],
            [0, 0, 1, 2, 2],
            [2, 1, 1, 1, 0]
        ];
    }

    private generateSessionId(): string {
        return 'a40e5dc15a83a70f288e421fbcfc6de8';
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}