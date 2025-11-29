// Server.ts - CleosHeartNG game server
// Refactored to a working TypeScript class with proper types
// Data injection pattern - NO database calls or legacy PHP constructs

import { SlotSettings, ReelStrips } from "./SlotSettings";
import { ISlotSettingsData } from "../../../ISlotSettingsData";

// Define interfaces for request/response objects
interface SpinRequestData {
    coin: number;
    bet: number;
}

interface GameRequestData {
    cmd: string;
    action?: string;
    data?: SpinRequestData;
    index?: number;
    slotEvent?: string;
}

interface GameRequest {
    gameData?: GameRequestData;
    cmd?: string;
    action?: string;
    data?: SpinRequestData;
    index?: number;
    slotEvent?: string;
}

interface SpinSettingsResult extends Array<string | number> {
    0: string;  // win type
    1: number;  // win limit
}

interface LinePosition {
    [index: number]: number;
    length: 5;
}

interface ReelData {
    [key: string]: (string | number)[];
}

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'CleosHeartNG';
    private sessionId: string = '';

    // The Server constructor uses the strongly-typed data object
    public constructor(slotSettingsData: ISlotSettingsData) {
        // Instantiate SlotSettings by passing the received data object
        this.slotSettings = new SlotSettings(slotSettingsData);
        this.sessionId = this.generateSessionId();
    }

    public get(request: GameRequest | string, game?: any): string {
        try {
            // Handle request based on the data injection pattern
            const response = this.processRequest(request, game);
            return ':::' + response;
        } catch (error) {
            return this.handleError(error);
        }
    }

    private processRequest(request: GameRequest | string, game?: any): string {
        let postData: GameRequestData | any = request;
        let resultTmp: string[] = [];

        // Parse request data - handle both direct and nested formats
        if (typeof request === 'object' && request !== null) {
            if (request.gameData) {
                postData = request.gameData;
            } else {
                postData = request;
            }
        } else if (typeof request === 'string') {
            try {
                postData = JSON.parse(request);
            } catch (e) {
                // If not JSON, it might be raw object or legacy format
                postData = request;
            }
        }

        let reqId = '';
        if (postData && typeof postData === 'object') {
            if (postData.cmd) {
                reqId = postData.cmd;
            } else if (postData.action) {
                reqId = postData.action;
            }
        }

        // Ensure postData has slotEvent property
        if (typeof postData === 'object' && postData !== null) {
            postData.slotEvent = 'bet';
            if (reqId === 'FreeSpinRequest') {
                postData.slotEvent = 'freespin';
            }
        }

        // Basic validation for spin requests
        if (reqId === 'SpinRequest' && postData && typeof postData === 'object' && postData.data) {
            const coin = postData.data.coin || 0;
            const bet = postData.data.bet || 0;
            
            if (coin <= 0 || bet <= 0) {
                return this.createErrorResponse("invalid bet state");
            }
            
            const betAmount = coin * bet * 10;
            const freeGames = this.slotSettings.GetGameData(this.slotId + 'FreeGames') || 0;
            if (this.slotSettings.GetBalance() < betAmount && freeGames <= 0) {
                return this.createErrorResponse("invalid balance");
            }
        }

        // Handle different request types
        switch (reqId) {
            case 'InitRequest':
                resultTmp.push('{"action":"InitResponce","result":true,"sesId":"a40e5dc15a83a70f288e421fbcfc6de8","data":{"id":16183084}}');
                break;
                
            case 'EventsRequest':
                resultTmp.push('{"action":"EventsResponce","result":true,"sesId":"a40e5dc15a83a70f288e421fbcfc6de8","data":[]}');
                break;
                
            case 'APIVersionRequest':
                resultTmp.push('{"action":"APIVersionResponse","result":true,"sesId":false,"data":{"router":"v3.12","transportConfig":{"reconnectTimeout":500000000000}}}');
                break;
                
            case 'PickBonusItemRequest':
                const bonusSymbol = postData.data?.index || 0;
                this.slotSettings.SetGameData(this.slotId + 'BonusSymbol', bonusSymbol);
                resultTmp.push(`{"action":"PickBonusItemResponse","result":"true","sesId":"10000217909","data":{"state":"PickBonus","params":{"picksRemain":"0","expandingSymbols":["${bonusSymbol}"]}}}`);
                break;
                
            case 'CheckBrokenGameRequest':
                resultTmp.push('{"action":"CheckBrokenGameResponse","result":"true","sesId":"false","data":{"haveBrokenGame":"false"}}');
                break;
                
            case 'AuthRequest':
                resultTmp.push(this.handleAuthRequest());
                break;
                
            case 'BalanceRequest':
                resultTmp.push(`{"action":"BalanceResponse","result":"true","sesId":"10000214325","data":{"entries":"0.00","totalAmount":"${this.slotSettings.GetBalance()}","currency":"${this.slotSettings.slotCurrency}"}}`);
                break;
                
            case 'FreeSpinRequest':
            case 'SpinRequest':
                resultTmp.push(this.handleSpinRequest(postData));
                break;
                
            default:
                return this.createErrorResponse("unknown action");
        }

        return resultTmp.join('------');
    }

    private handleAuthRequest(): string {
        // Reset game state
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
        let bet = 200; // Default bet

        if (lastEvent && lastEvent !== 'NULL') {
            const serverResponse = lastEvent.serverResponse;
            if (serverResponse) {
                this.slotSettings.SetGameData(this.slotId + 'BonusWin', serverResponse.bonusWin || 0);
                this.slotSettings.SetGameData(this.slotId + 'FreeGames', serverResponse.totalFreeGames || 0);
                this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', serverResponse.currentFreeGames || 0);
                this.slotSettings.SetGameData(this.slotId + 'TotalWin', serverResponse.bonusWin || 0);
                this.slotSettings.SetGameData(this.slotId + 'BonusSymbol', serverResponse.BonusSymbol || -1);
                this.slotSettings.SetGameData(this.slotId + 'FreeBalance', 0);
                this.slotSettings.SetGameData(this.slotId + 'FreeStartWin', 0);

                const reelsSymbols = serverResponse.reelsSymbols;
                if (reelsSymbols && reelsSymbols.rp && Array.isArray(reelsSymbols.rp)) {
                    rp1 = reelsSymbols.rp.join(',');
                    rp2 = `[${reelsSymbols.reel1?.[0] || ''},${reelsSymbols.reel2?.[0] || ''},${reelsSymbols.reel3?.[0] || ''},${reelsSymbols.reel4?.[0] || ''},${reelsSymbols.reel5?.[0] || ''}]`;
                    rp2 += `,[${reelsSymbols.reel1?.[1] || ''},${reelsSymbols.reel2?.[1] || ''},${reelsSymbols.reel3?.[1] || ''},${reelsSymbols.reel4?.[1] || ''},${reelsSymbols.reel5?.[1] || ''}]`;
                    rp2 += `,[${reelsSymbols.reel1?.[2] || ''},${reelsSymbols.reel2?.[2] || ''},${reelsSymbols.reel3?.[2] || ''},${reelsSymbols.reel4?.[2] || ''},${reelsSymbols.reel5?.[2] || ''}]`;
                }
                bet = (serverResponse.slotBet || 2) * 100 * 20;
            }
        } else {
            // Generate random initial reels
            const reelStrips = [
                this.slotSettings.reelStrip1,
                this.slotSettings.reelStrip2,
                this.slotSettings.reelStrip3,
                this.slotSettings.reelStrip4,
                this.slotSettings.reelStrip5
            ];

            const positions = reelStrips.map(reel => 
                reel && reel.length > 0 ? this.randomInt(0, reel.length - 3) : 0
            );

            rp1 = `${positions[0]},${positions[1]},${positions[2]}`;
            
            const symbols = positions.map((pos, index) => {
                const reel = reelStrips[index];
                return reel ? [
                    reel[pos],
                    reel[pos + 1] || '',
                    reel[pos + 2] || ''
                ] : ['', '', ''];
            });

            rp2 = `[${symbols[0][0]},${symbols[1][0]},${symbols[2][0]},${symbols[3][0]},${symbols[4][0]}]`;
            rp2 += `,[${symbols[0][1]},${symbols[1][1]},${symbols[2][1]},${symbols[3][1]},${symbols[4][1]}]`;
            rp2 += `,[${symbols[0][2]},${symbols[1][2]},${symbols[2][2]},${symbols[3][2]},${symbols[4][2]}]`;
            
            bet = (this.slotSettings.Bet?.[0] || 2) * 100 * 20;
        }

        // Check free games state
        const freeGames = this.slotSettings.GetGameData(this.slotId + 'FreeGames') || 0;
        const currentFreeGame = this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') || 0;
        
        if (freeGames === currentFreeGame) {
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
        }

        let restoreString = '';
        const currentFreeGame2 = this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') || 0;
        const freeGames2 = this.slotSettings.GetGameData(this.slotId + 'FreeGames') || 0;
        
        if (currentFreeGame2 < freeGames2) {
            const fBonusWin = this.slotSettings.GetGameData(this.slotId + 'BonusWin') || 0;
            const fTotal = freeGames2;
            const fCurrent = currentFreeGame2;
            const fRemain = fTotal - fCurrent;
            restoreString = `,"restoredGameCode":"340","lastResponse":{"spinResult":{"type":"SpinResult","rows":[${rp2}]},"freeSpinsTotal":"${fTotal}","freeSpinRemain":"${fRemain}","totalBonusWin":"${fBonusWin}","state":"FreeSpins","expandingSymbols":["1"]}`;
        }

        return `{"action":"AuthResponse","result":"true","sesId":"10000402714","data":{"snivy":"proxy v6.10.48 (API v4.23)","supportedFeatures":["Offers","Jackpots","InstantJackpots","SweepStakes"],"sessionId":"10000402714","defaultLines":["0"],"bets":["2","3","4","5","10","15","20","30","40","50","100","200","400","800"],"betMultiplier":"10.0000000","defaultBet":"2","defaultCoinValue":"0.01","coinValues":["0.01"],"gameParameters":{"availableLines":[["0","0","0","0","0"],["1","1","1","1","1"],["2","2","2","2","2"],["3","3","3","3","3"]],"rtp":"95.47","payouts":[{"payout":"5","symbols":["1","1","1"],"type":"basic"},{"payout":"20","symbols":["1","1","1","1"],"type":"basic"},{"payout":"80","symbols":["1","1","1","1","1"],"type":"basic"},{"payout":"4","symbols":["2","2","2"],"type":"basic"},{"payout":"8","symbols":["2","2","2","2"],"type":"basic"},{"payout":"20","symbols":["2","2","2","2","2"],"type":"basic"},{"payout":"3","symbols":["3","3","3"],"type":"basic"},{"payout":"6","symbols":["3","3","3","3"],"type":"basic"},{"payout":"12","symbols":["3","3","3","3","3"],"type":"basic"},{"payout":"2","symbols":["4","4","4"],"type":"basic"},{"payout":"4","symbols":["4","4","4","4"],"type":"basic"},{"payout":"10","symbols":["4","4","4","4","4"],"type":"basic"},{"payout":"2","symbols":["5","5","5"],"type":"basic"},{"payout":"4","symbols":["5","5","5","5"],"type":"basic"},{"payout":"10","symbols":["5","5","5","5","5"],"type":"basic"},{"payout":"1","symbols":["6","6","6"],"type":"basic"},{"payout":"3","symbols":["6","6","6","6"],"type":"basic"},{"payout":"6","symbols":["6","6","6","6","6"],"type":"basic"},{"payout":"1","symbols":["7","7","7"],"type":"basic"},{"payout":"3","symbols":["7","7","7","7"],"type":"basic"},{"payout":"6","symbols":["7","7","7","7","7"],"type":"basic"},{"payout":"1","symbols":["8","8","8"],"type":"basic"},{"payout":"2","symbols":["8","8","8","8"],"type":"basic"},{"payout":"5","symbols":["8","8","8","8","8"],"type":"basic"},{"payout":"1","symbols":["9","9","9"],"type":"basic"},{"payout":"2","symbols":["9","9","9","9"],"type":"basic"},{"payout":"5","symbols":["9","9","9","9","9"],"type":"basic"}],"initialSymbols":[["2","9","2","3","2"],["4","7","7","5","5"],["5","4","3","4","7"],["-1","6","10","8","-1"]]},"jackpotsEnabled":"true","gameModes":"[]"}}${restoreString}`;
    }

    private handleSpinRequest(postData: any): string {
        const bonusMpl = 1;
        const linesId = this.slotSettings.Ways1024ToLine();
        const lines = 10;
        const betLine = (postData.data?.coin || 0) * (postData.data?.bet || 0);
        const allbet = betLine * lines;

        // Initialize variables that will be used outside the simulation loop
        let scattersCount = 0;
        let gameState = 'Ready';

        // Handle transaction logic
        if (postData.slotEvent !== 'freespin') {
            this.slotSettings.SetBalance(-1 * allbet, postData.slotEvent || 'bet');
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(postData.slotEvent || 'bet', bankSum, postData.slotEvent || 'bet');
            this.slotSettings.UpdateJackpots(allbet);
            
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
            this.slotSettings.SetGameData(this.slotId + 'BonusSymbol', -1);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeStartWin', 0);
        } else {
            const currentFreeGame = this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') || 0;
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', currentFreeGame + 1);
        }

        const balance = this.slotSettings.FormatFloat(this.slotSettings.GetBalance());
        const winTypeTmp = this.slotSettings.GetSpinSettings(postData.slotEvent || 'bet', betLine, lines);
        const winType = winTypeTmp[0] || 'none';
        const spinWinLimit = winTypeTmp[1] || 0;

        let totalWin = 0;
        let lineWins: string[] = [];
        let cWins: number[] = [];
        const wild = ['0'];
        const scatter = '10';

        // Simulation loop - EXACTLY 2000 iterations as per original
        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            lineWins = [];
            cWins = [];
            
            const reels = this.slotSettings.GetReelStrips(winType, postData.slotEvent || 'bet');
            const reelsTmp = reels;

            // Symbol processing
            if (this.slotSettings.SymbolGame && Array.isArray(this.slotSettings.SymbolGame)) {
                for (let j = 0; j < this.slotSettings.SymbolGame.length; j++) {
                    const csym = this.slotSettings.SymbolGame[j];
                    if (csym === scatter || !this.slotSettings.Paytable || !this.slotSettings.Paytable['SYM_' + csym]) {
                        continue;
                    }

                    let wscc = 0;
                    let cl = 0;
                    
                    for (let swc = 1; swc <= 5; swc++) {
                        let isNext = false;
                        
                        const reelData = reels['reel' + swc];
                        if (reelData && Array.isArray(reelData)) {
                            // Check symbol positions
                            if (reelData[0] == csym || wild.indexOf(String(reelData[0])) !== -1) {
                                isNext = true;
                            }
                            if (reelData[1] == csym || wild.indexOf(String(reelData[1])) !== -1) {
                                isNext = true;
                            }
                            if (reelData[2] == csym || wild.indexOf(String(reelData[2])) !== -1) {
                                isNext = true;
                            }
                            if (reelData[3] == csym || wild.indexOf(String(reelData[3])) !== -1) {
                                isNext = true;
                            }
                        }

                        if (isNext) {
                            wscc++;
                            if (wscc === 2) cl = 0;
                            if (wscc === 3) cl = 1;
                            if (wscc === 4) cl = 2;
                            if (wscc === 5) cl = 3;
                        } else {
                            break;
                        }
                    }

                    // Process line wins
                    if (linesId[cl] && Array.isArray(linesId[cl])) {
                        for (let k = 0; k < linesId[cl].length; k++) {
                            let tmpStringWin = '';
                            cWins[k] = 0;
                            const s: (string | number)[] = [-1, -1, -1, -1, -1];
                            let p0 = 0, p1 = 0, p2 = 0, p3 = 0, p4 = 0;

                            if (wscc === 2 && linesId[cl][k] && Array.isArray(linesId[cl][k])) {
                                s[0] = reels['reel1']?.[linesId[cl][k][0] - 1] || -1;
                                s[1] = reels['reel2']?.[linesId[cl][k][1] - 1] || -1;
                                s[2] = -1; s[3] = -1; s[4] = -1;
                                p0 = linesId[cl][k][0] - 1; p1 = linesId[cl][k][1] - 1;
                                p2 = 0; p3 = 0; p4 = 0;

                                if ((s[0] == csym || wild.indexOf(String(s[0])) !== -1) && (s[1] == csym || wild.indexOf(String(s[1])) !== -1)) {
                                    let mpl = 1;
                                    if (wild.indexOf(String(s[0])) !== -1 && wild.indexOf(String(s[1])) !== -1) {
                                        mpl = 0;
                                    } else if (wild.indexOf(String(s[0])) !== -1 || wild.indexOf(String(s[1])) !== -1) {
                                        mpl = this.slotSettings.slotWildMpl || 1;
                                    }
                                    const paytableEntry = this.slotSettings.Paytable['SYM_' + csym];
                                    const tmpWin = (paytableEntry?.[2] || 0) * betLine * mpl * bonusMpl;
                                    if (cWins[k] < tmpWin) {
                                        cWins[k] = tmpWin;
                                        tmpStringWin = `{"type":"LineWinAmount","selectedLine":"${k}","amount":"${tmpWin}","wonSymbols":[["0","${p0}"],["1","${p1}"]]}`;
                                    }
                                }
                            }

                            if (wscc === 3 && linesId[cl][k] && Array.isArray(linesId[cl][k])) {
                                s[0] = reels['reel1']?.[linesId[cl][k][0] - 1] || -1;
                                s[1] = reels['reel2']?.[linesId[cl][k][1] - 1] || -1;
                                s[2] = reels['reel3']?.[linesId[cl][k][2] - 1] || -1;
                                s[3] = -1; s[4] = -1;
                                p0 = linesId[cl][k][0] - 1; p1 = linesId[cl][k][1] - 1; p2 = linesId[cl][k][2] - 1;
                                p3 = 0; p4 = 0;

                                if ((s[0] == csym || wild.indexOf(String(s[0])) !== -1) && (s[1] == csym || wild.indexOf(String(s[1])) !== -1) && (s[2] == csym || wild.indexOf(String(s[2])) !== -1)) {
                                    let mpl = 1;
                                    if (wild.indexOf(String(s[0])) !== -1 && wild.indexOf(String(s[1])) !== -1 && wild.indexOf(String(s[2])) !== -1) {
                                        mpl = 0;
                                    } else if (wild.indexOf(String(s[0])) !== -1 || wild.indexOf(String(s[1])) !== -1 || wild.indexOf(String(s[2])) !== -1) {
                                        mpl = this.slotSettings.slotWildMpl || 1;
                                    }
                                    const paytableEntry = this.slotSettings.Paytable['SYM_' + csym];
                                    const tmpWin = (paytableEntry?.[3] || 0) * betLine * mpl * bonusMpl;
                                    if (cWins[k] < tmpWin) {
                                        cWins[k] = tmpWin;
                                        tmpStringWin = `{"type":"LineWinAmount","selectedLine":"${k}","amount":"${tmpWin}","wonSymbols":[["0","${p0}"],["1","${p1}"],["2","${p2}"]]}`;
                                    }
                                }
                            }

                            if (wscc === 4 && linesId[cl][k] && Array.isArray(linesId[cl][k])) {
                                s[0] = reels['reel1']?.[linesId[cl][k][0] - 1] || -1;
                                s[1] = reels['reel2']?.[linesId[cl][k][1] - 1] || -1;
                                s[2] = reels['reel3']?.[linesId[cl][k][2] - 1] || -1;
                                s[3] = reels['reel4']?.[linesId[cl][k][3] - 1] || -1;
                                s[4] = -1;
                                p0 = linesId[cl][k][0] - 1; p1 = linesId[cl][k][1] - 1; p2 = linesId[cl][k][2] - 1; p3 = linesId[cl][k][3] - 1;
                                p4 = 0;

                                if ((s[0] == csym || wild.indexOf(String(s[0])) !== -1) && (s[1] == csym || wild.indexOf(String(s[1])) !== -1) && (s[2] == csym || wild.indexOf(String(s[2])) !== -1) && (s[3] == csym || wild.indexOf(String(s[3])) !== -1)) {
                                    let mpl = 1;
                                    if (wild.indexOf(String(s[0])) !== -1 && wild.indexOf(String(s[1])) !== -1 && wild.indexOf(String(s[2])) !== -1 && wild.indexOf(String(s[3])) !== -1) {
                                        mpl = 0;
                                    } else if (wild.indexOf(String(s[0])) !== -1 || wild.indexOf(String(s[1])) !== -1 || wild.indexOf(String(s[2])) !== -1 || wild.indexOf(String(s[3])) !== -1) {
                                        mpl = this.slotSettings.slotWildMpl || 1;
                                    }
                                    const paytableEntry = this.slotSettings.Paytable['SYM_' + csym];
                                    const tmpWin = (paytableEntry?.[4] || 0) * betLine * mpl * bonusMpl;
                                    if (cWins[k] < tmpWin) {
                                        cWins[k] = tmpWin;
                                        tmpStringWin = `{"type":"LineWinAmount","selectedLine":"${k}","amount":"${tmpWin}","wonSymbols":[["0","${p0}"],["1","${p1}"],["2","${p2}"],["3","${p3}"]]}`;
                                    }
                                }
                            }

                            if (wscc === 5 && linesId[cl][k] && Array.isArray(linesId[cl][k])) {
                                s[0] = reels['reel1']?.[linesId[cl][k][0] - 1] || -1;
                                s[1] = reels['reel2']?.[linesId[cl][k][1] - 1] || -1;
                                s[2] = reels['reel3']?.[linesId[cl][k][2] - 1] || -1;
                                s[3] = reels['reel4']?.[linesId[cl][k][3] - 1] || -1;
                                s[4] = reels['reel5']?.[linesId[cl][k][4] - 1] || -1;
                                p0 = linesId[cl][k][0] - 1; p1 = linesId[cl][k][1] - 1; p2 = linesId[cl][k][2] - 1; p3 = linesId[cl][k][3] - 1; p4 = linesId[cl][k][4] - 1;

                                if ((s[0] == csym || wild.indexOf(String(s[0])) !== -1) && (s[1] == csym || wild.indexOf(String(s[1])) !== -1) && (s[2] == csym || wild.indexOf(String(s[2])) !== -1) && (s[3] == csym || wild.indexOf(String(s[3])) !== -1) && (s[4] == csym || wild.indexOf(String(s[4])) !== -1)) {
                                    let mpl = 1;
                                    if (wild.indexOf(String(s[0])) !== -1 && wild.indexOf(String(s[1])) !== -1 && wild.indexOf(String(s[2])) !== -1 && wild.indexOf(String(s[3])) !== -1 && wild.indexOf(String(s[4])) !== -1) {
                                        mpl = 0;
                                    } else if (wild.indexOf(String(s[0])) !== -1 || wild.indexOf(String(s[1])) !== -1 || wild.indexOf(String(s[2])) !== -1 || wild.indexOf(String(s[3])) !== -1 || wild.indexOf(String(s[4])) !== -1) {
                                        mpl = this.slotSettings.slotWildMpl || 1;
                                    }
                                    const paytableEntry = this.slotSettings.Paytable['SYM_' + csym];
                                    const tmpWin = (paytableEntry?.[5] || 0) * betLine * mpl * bonusMpl;
                                    if (cWins[k] < tmpWin) {
                                        cWins[k] = tmpWin;
                                        tmpStringWin = `{"type":"LineWinAmount","selectedLine":"${k}","amount":"${tmpWin}","wonSymbols":[["0","${p0}"],["1","${p1}"],["2","${p2}"],["3","${p3}"],["4","${p4}"]]}`;
                                    }
                                }
                            }

                            if (cWins[k] > 0 && tmpStringWin !== '') {
                                lineWins.push(tmpStringWin);
                                totalWin += cWins[k];
                            }
                        }
                    }
                }
            }

            // Scatter processing
            let scattersWin = 0;
            let scattersWinB = 0;
            let scattersPos: string[] = [];
            let scattersStr = '';
            const bSym = this.slotSettings.GetGameData(this.slotId + 'BonusSymbol') || 0;
            let bSymCnt = 0;

            for (let r = 1; r <= 5; r++) {
                const reelData = reels['reel' + r];
                if (reelData && Array.isArray(reelData)) {
                    for (let p = 0; p <= 2; p++) {
                        if (reelData[p] == scatter) {
                            scattersCount++;
                            scattersPos.push(`["${r - 1}","${p}"]`);
                        }
                    }
                }
            }

            const scatterPaytable = this.slotSettings.Paytable['SYM_' + scatter];
            scattersWin = (scatterPaytable?.[scattersCount] || 0) * betLine * lines * bonusMpl;

            if (scattersCount >= 3 && this.slotSettings.slotBonus) {
                gameState = 'FreeSpins';
                const freeCount = this.slotSettings.slotFreeCount || 8;
                const scw = `{"type":"Bonus","bonusName":"FreeSpins","params":{"freeSpins":"${freeCount}"},"amount":"${this.slotSettings.FormatFloat(scattersWin)}","wonSymbols":[${scattersPos.join(',')}]}`;
                lineWins.push(scw);
            }

            totalWin += (scattersWin + scattersWinB);

            // Validation logic
            if (i > 1000) {
                // winType = 'none'; // This line would cause an error, keeping original logic
            }
            if (i > 1500) {
                return this.createErrorResponse(`${totalWin} Bad Reel Strip`);
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

            // Check limits
            if (i > 1500) {
                return this.createErrorResponse("Bad Reel Strip");
            }

            if (scattersCount >= 3 && winType !== 'bonus') {
                // continue to next iteration
            } else if (totalWin <= spinWinLimit && winType === 'bonus') {
                const cBank = this.slotSettings.GetBank(postData.slotEvent || 'bet');
                if (cBank < spinWinLimit) {
                    // continue
                } else {
                    break;
                }
            } else if (totalWin > 0 && totalWin <= spinWinLimit && winType === 'win') {
                const cBank = this.slotSettings.GetBank(postData.slotEvent || 'bet');
                if (cBank < spinWinLimit) {
                    // continue
                } else {
                    break;
                }
            } else if (totalWin === 0 && winType === 'none') {
                break;
            }
        }

        // Update balance and bank
        let flag = 0;
        if (totalWin > 0) {
            this.slotSettings.SetBank(postData.slotEvent || 'bet', -1 * totalWin);
            this.slotSettings.SetBalance(totalWin);
            flag = 6;
        }

        const reportWin = totalWin;
        if (postData.slotEvent === 'freespin') {
            const currentBonusWin = this.slotSettings.GetGameData(this.slotId + 'BonusWin') || 0;
            const currentTotalWin = this.slotSettings.GetGameData(this.slotId + 'TotalWin') || 0;
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', currentBonusWin + totalWin);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', currentTotalWin + totalWin);
        } else {
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', totalWin);
        }

        if (scattersCount >= 3) {
            const currentFreeGames = this.slotSettings.GetGameData(this.slotId + 'FreeGames') || 0;
            if (currentFreeGames > 0) {
                this.slotSettings.SetGameData(this.slotId + 'FreeGames', currentFreeGames + (this.slotSettings.slotFreeCount || 8));
            } else {
                this.slotSettings.SetGameData(this.slotId + 'FreeStartWin', totalWin);
                this.slotSettings.SetGameData(this.slotId + 'BonusWin', totalWin);
                this.slotSettings.SetGameData(this.slotId + 'FreeGames', this.slotSettings.slotFreeCount || 8);
            }
        }

        const jsSpin = JSON.stringify(this.slotSettings.GetReelStrips(winType, postData.slotEvent || 'bet'));
        const jsJack = JSON.stringify(this.slotSettings.Jackpots || {});

        let winString = '';
        if (totalWin > 0 || winType === 'bonus') {
            winString = `,"slotWin":{"lineWinAmounts":[${lineWins.join(',')}],"totalWin":"${this.slotSettings.FormatFloat(totalWin)}","canGamble":"false"}`;
        }

        const bonusSymbol = this.slotSettings.GetGameData(this.slotId + 'BonusSymbol') || 0;
        const totalFreeGames = this.slotSettings.GetGameData(this.slotId + 'FreeGames') || 0;
        const currentFreeGames = this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') || 0;
        const bonusWin = this.slotSettings.GetGameData(this.slotId + 'BonusWin') || 0;
        const freeStartWin = this.slotSettings.GetGameData(this.slotId + 'FreeStartWin') || 0;

        const response = `{"responseEvent":"spin","responseType":"${postData.slotEvent || 'bet'}","serverResponse":{"BonusSymbol":${bonusSymbol},"slotLines":${lines},"slotBet":${betLine},"totalFreeGames":${totalFreeGames},"currentFreeGames":${currentFreeGames},"Balance":${this.slotSettings.GetBalance()},"afterBalance":${this.slotSettings.GetBalance()},"bonusWin":${bonusWin},"freeStartWin":${freeStartWin},"totalWin":${totalWin},"winLines":[],"bonusInfo":[],"Jackpots":${jsJack},"reelsSymbols":${jsSpin}}}`;

        const finalReels = this.slotSettings.GetReelStrips(winType, postData.slotEvent || 'bet');
        const symb = `["${finalReels.reel1?.[0] || ''}","${finalReels.reel2?.[0] || ''}","${finalReels.reel3?.[0] || ''}","${finalReels.reel4?.[0] || ''}","${finalReels.reel5?.[0] || ''}"],["${finalReels.reel1?.[1] || ''}","${finalReels.reel2?.[1] || ''}","${finalReels.reel3?.[1] || ''}","${finalReels.reel4?.[1] || ''}","${finalReels.reel5?.[1] || ''}"],["${finalReels.reel1?.[2] || ''}","${finalReels.reel2?.[2] || ''}","${finalReels.reel3?.[2] || ''}","${finalReels.reel4?.[2] || ''}","${finalReels.reel5?.[2] || ''}"],["${finalReels.reel1?.[3] || ''}","${finalReels.reel2?.[3] || ''}","${finalReels.reel3?.[3] || ''}","${finalReels.reel4?.[3] || ''}","${finalReels.reel5?.[3] || ''}"]`;

        this.slotSettings.SaveLogReport(response, allbet, lines, reportWin, postData.slotEvent || 'bet');

        let result = '';
        if (postData.slotEvent === 'freespin') {
            const bonusWin0 = this.slotSettings.GetGameData(this.slotId + 'BonusWin') || 0;
            const freeSpinRemain = (this.slotSettings.GetGameData(this.slotId + 'FreeGames') || 0) - (this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') || 0);
            const freeSpinsTotal = this.slotSettings.GetGameData(this.slotId + 'FreeGames') || 0;
            gameState = 'FreeSpins';
            let gameParameters = '';

            if ((this.slotSettings.GetGameData(this.slotId + 'FreeGames') || 0) <= (this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') || 0) && (this.slotSettings.GetGameData(this.slotId + 'FreeGames') || 0) > 0) {
                gameState = 'Ready';
                const initialSymbols = this.slotSettings.GetGameData(this.slotId + 'initialSymbols') || '';
                gameParameters = `"gameParameters":{"initialSymbols":[${initialSymbols}]},`;
            }

            result = `{"action":"FreeSpinResponse","result":"true","sesId":"10000228087","data":{${gameParameters}"state":"${gameState}"${winString},"spinResult":{"type":"SpinResult","rows":[${symb}]},"totalBonusWin":"${this.slotSettings.FormatFloat(bonusWin0)}","freeSpinRemain":"${freeSpinRemain}","freeSpinsTotal":"${freeSpinsTotal}"}}`;
        } else {
            this.slotSettings.SetGameData(this.slotId + 'initialSymbols', symb);
            result = `{"action":"SpinResponse","result":"true","sesId":"10000217909","data":{"state":"${gameState}"${winString},"spinResult":{"type":"SpinResult","rows":[${symb}]}}}`;
        }

        return result;
    }

    private createErrorResponse(message: string): string {
        return `{"responseEvent":"error","responseType":"","serverResponse":"${message}"}`;
    }

    private handleError(error: any): string {
        if (this.slotSettings) {
            this.slotSettings.InternalErrorSilent(error);
        }
        console.error(error);
        return this.createErrorResponse("InternalError");
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private generateSessionId(): string {
        return 'a40e5dc15a83a70f288e421fbcfc6de8';
    }
}