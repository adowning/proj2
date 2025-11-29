// Server.ts - BookOfNileLostChapterNG game server
// Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines

import { SlotSettings, ReelStrips } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'BookOfNileLostChapterNG';
    private sessionId: string = '';

    public constructor(slotSettingsData: ISlotSettingsData) {
        this.slotSettings = new SlotSettings(slotSettingsData);
        this.sessionId = this.generateSessionId();
    }

    public get(request: any, game: any): any {
        try {
            return this.processRequest(request, game);
        } catch (error) {
            return this.handleError(error);
        }
    }

    private processRequest(request: any, game: any): string {
        let postData = request;
        if (request.gameData) {
            postData = request.gameData;
        }

        const reqId = postData.cmd || postData.action;
        if (!reqId) {
            return this.createErrorResponse("incorrect action");
        }

        if (reqId === 'SpinRequest' || reqId === 'FreeSpinRequest') {
            if (postData.data.coin <= 0 || postData.data.bet <= 0) {
                return this.createErrorResponse("invalid bet state");
            }
            if (this.slotSettings.GetBalance() < (postData.data.coin * postData.data.bet * 10) &&
                this.slotSettings.GetGameData(this.slotId + 'FreeGames') <= 0) {
                return this.createErrorResponse("invalid balance");
            }
        }

        switch (reqId) {
            case 'APIVersionRequest':
                return this.handleAPIVersionRequest();
            case 'PickBonusItemRequest':
                return this.handlePickBonusItemRequest(postData);
            case 'CheckBrokenGameRequest':
                return this.handleCheckBrokenGameRequest();
            case 'AuthRequest':
                return this.handleAuthRequest();
            case 'BalanceRequest':
                return this.handleBalanceRequest();
            case 'BuyBonusGameRequest':
                return this.handleBuyBonusGameRequest(postData);
            case 'SpinRequest':
            case 'BonusGameRequest': // Handled same as Spin/FreeSpin
            case 'FreeSpinRequest': // Added for clarity
                return this.handleSpinRequest(postData, reqId);
            case 'GambleRequest':
                return this.handleGambleRequest();
            default:
                return this.createErrorResponse("unknown action");
        }
    }

    private handleAPIVersionRequest(): string {
        return JSON.stringify([{
            "action": "APIVersionResponse",
            "result": true,
            "sesId": false,
            "data": { "router": "v3.12", "transportConfig": { "reconnectTimeout": 500000000000 } }
        }]);
    }

    private handlePickBonusItemRequest(postData: any): string {
        const bonusSymbol = postData.data.index;
        const ExpandingSymbols = this.slotSettings.GetGameData(this.slotId + 'ExpandingSymbols') || [];
        let pickCount = this.slotSettings.GetGameData(this.slotId + 'pickCount');
        pickCount--;

        if (pickCount < 0) return "";

        ExpandingSymbols.push(bonusSymbol);

        let endData = '';
        if (pickCount <= 0) {
            endData = `,"expandingSymbols": [${ExpandingSymbols.join(',')}]`;
        }

        this.slotSettings.SetGameData(this.slotId + 'pickCount', pickCount);
        this.slotSettings.SetGameData(this.slotId + 'ExpandingSymbols', ExpandingSymbols);

        const response = {
            "action": "PickBonusItemResponse",
            "result": "true",
            "sesId": this.sessionId,
            "data": {
                "state": "PickBonus",
                "params": JSON.parse(`{"picksRemain":"${pickCount}"${endData}}`)
            }
        };
        return JSON.stringify([JSON.stringify(response)]);
    }

    private handleCheckBrokenGameRequest(): string {
        return JSON.stringify([{
            "action": "CheckBrokenGameResponse",
            "result": "true",
            "sesId": "false",
            "data": { "haveBrokenGame": "false" }
        }]);
    }

    private handleAuthRequest(): string {
        this.slotSettings.SetGameData(this.slotId + 'BonusWin', 0);
        this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
        this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
        this.slotSettings.SetGameData(this.slotId + 'TotalWin', 0);
        this.slotSettings.SetGameData(this.slotId + 'FreeBalance', 0);
        this.slotSettings.SetGameData(this.slotId + 'FreeStartWin', 0);
        this.slotSettings.SetGameData(this.slotId + 'BonusSymbol', -1);
        this.slotSettings.SetGameData(this.slotId + 'ExpandingSymbols', []);
        this.slotSettings.SetGameData(this.slotId + 'pickCount', 0);
        this.slotSettings.SetGameData(this.slotId + 'isPayBonus', 0);

        // Generate initial symbols
        const reels: any[] = [];
        for (let i = 0; i < 3; i++) {
            const row: string[] = [];
            for (let r = 1; r <= 5; r++) {
                row.push(String(this.randomInt(0, 9)));
            }
            reels.push(`[${row.map(s => `"${s}"`).join(',')}]`);
        }
        const rp2 = reels.join(',');

        const response = {
            "action": "AuthResponse",
            "result": "true",
            "sesId": this.sessionId,
            "data": {
                "snivy": "proxy DEV-v10.15.73 (API v4.16)",
                "bets": ["1", "2", "3", "4", "5", "10", "15", "20", "30", "40", "50", "100", "200", "500"],
                "coinValues": ["0.01"],
                "betMultiplier": "1.0000000",
                "defaultCoinValue": "0.01",
                "defaultBet": "1",
                "jackpotsEnabled": "false",
                "defaultLines": ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
                "supportedFeatures": ["Offers", "Jackpots", "InstantJackpots", "SweepStakes", "PaidJackpots"],
                "sessionId": this.sessionId,
                "gameParameters": {
                    "availableLines": this.getPayLines(),
                    "rtp": "96.51", // From PHP source
                    "initialSymbols": JSON.parse(`[${rp2}]`),
                    "payouts": this.getPaytable()
                },
                "gameModes": "",
                "restoredGameCode": "403",
                "lastResponse": "",
                "actions": [{
                    "type": "buyBonus",
                    "id": "bgId1",
                    "cost": "185",
                    "bonusName": "FreeSpins",
                    "params": { "freespins": "10", "lines": "10", "multiplier": "1" }
                }]
            }
        };
        return JSON.stringify([JSON.stringify(response)]);
    }

    private handleBalanceRequest(): string {
        const response = {
            "action": "BalanceResponse",
            "result": "true",
            "sesId": this.sessionId,
            "data": {
                "entries": "0.00",
                "totalAmount": this.slotSettings.GetBalance().toFixed(2),
                "currency": this.slotSettings.slotCurrency
            }
        };
        return JSON.stringify([JSON.stringify(response)]);
    }

    private handleBuyBonusGameRequest(postData: any): string {
        const lines = 10;
        const betLine = postData.data.coin * postData.data.bet;
        // In PHP GetGameData('AllBet') is used, but ensure it's set. 
        // If not, calculate from current bet.
        let allbet = this.slotSettings.GetGameData(this.slotId + 'AllBet');
        if (!allbet) allbet = betLine * lines;

        let bbbet = 0;
        let pickCount = 0;

        if (postData.data.id == 'bgId1') { bbbet = allbet * 110; pickCount = 1; }
        if (postData.data.id == 'bgId2') { bbbet = allbet * 175; pickCount = 2; }
        if (postData.data.id == 'bgId3') { bbbet = allbet * 245; pickCount = 3; }
        if (postData.data.id == 'bgId4') { bbbet = allbet * 310; pickCount = 4; }

        if (this.slotSettings.GetBalance() < bbbet) {
            return this.createErrorResponse("invalid balance");
        }

        this.slotSettings.SetBalance(-1 * (allbet + bbbet), 'bet');
        const bankSum = (bbbet + allbet) / 100 * this.slotSettings.GetPercent();
        this.slotSettings.SetBank('bet', bankSum, 'bet', true);
        this.slotSettings.UpdateJackpots(bbbet);
        this.slotSettings.SetGameData(this.slotId + 'pickCount', pickCount);
        this.slotSettings.SetGameData(this.slotId + 'isPayBonus', 1);

        const response = {
            "action": "BuyBonusGameResponse",
            "result": "true",
            "sesId": this.sessionId,
            "data": { "state": "FreeSpins", "params": { "freeSpins": "0", "multiplier": "1" } }
        };
        this.slotSettings.SaveLogReport('NULL', bbbet + allbet, lines, 0, 'BB');
        return JSON.stringify([JSON.stringify(response)]);
    }

    private handleSpinRequest(postData: any, reqId: string): string {
        const linesId = this.getLinesId();
        const lines = 10;
        const betLine = postData.data.coin * postData.data.bet;
        let allbet = betLine * lines;

        let slotEvent = 'bet';
        let bonusMpl = 1;

        if (reqId === 'BonusGameRequest') {
            slotEvent = 'freespin';
        }

        if (slotEvent !== 'freespin') {
            this.slotSettings.SetBalance(-1 * allbet, slotEvent);
            const bankSum = allbet / 100 * this.slotSettings.GetPercent();
            this.slotSettings.SetBank(slotEvent, bankSum, slotEvent);
            this.slotSettings.UpdateJackpots(allbet);

            // Reset state
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeGames', 0);
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame', 0);
            this.slotSettings.SetGameData(this.slotId + 'BonusSymbol', -1);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeBalance', 0);
            this.slotSettings.SetGameData(this.slotId + 'FreeStartWin', 0);
            this.slotSettings.SetGameData(this.slotId + 'AllBet', allbet);
            this.slotSettings.SetGameData(this.slotId + 'ExpandingSymbols', []);
        } else {
            this.slotSettings.SetGameData(this.slotId + 'CurrentFreeGame',
                this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame') + 1);
            bonusMpl = this.slotSettings.slotFreeMpl;
        }

        const winTypeTmp = this.slotSettings.GetSpinSettings(slotEvent, betLine, lines);
        let winType = winTypeTmp[0];
        let spinWinLimit = winTypeTmp[1];

        if (this.slotSettings.GetGameData(this.slotId + 'isPayBonus') == 1) {
            this.slotSettings.SetGameData(this.slotId + 'isPayBonus', 0);
            winType = 'bonus';
            spinWinLimit = this.slotSettings.GetBank('bonus');
        }

        let totalWin = 0;
        let lineWins: string[] = [];
        let reels: ReelStrips = { rp: [] };
        const wild = ['9'];
        const scatter = '9';
        let scattersCount = 0;
        let expWinStr = '';
        let expSpinStr = '';
        let response = '';
        let symb = '';
        let winString = '';
        let gameState = 'Ready';

        for (let i = 0; i <= 2000; i++) {
            totalWin = 0;
            lineWins = [];
            const cWins = new Array(lines).fill(0);
            reels = this.slotSettings.GetReelStrips(winType, slotEvent);

            // Line wins
            for (let k = 0; k < lines; k++) {
                for (let j = 0; j < this.slotSettings.SymbolGame.length; j++) {
                    const csym = this.slotSettings.SymbolGame[j];
                    if (csym === scatter || !this.slotSettings.Paytable['SYM_' + csym]) continue;

                    const s: any[] = [];
                    s[0] = reels.reel1?.[linesId[k][0] - 1];
                    s[1] = reels.reel2?.[linesId[k][1] - 1];
                    s[2] = reels.reel3?.[linesId[k][2] - 1];
                    s[3] = reels.reel4?.[linesId[k][3] - 1];
                    s[4] = reels.reel5?.[linesId[k][4] - 1];

                    // Check for match count
                    let matchCount = 0;
                    for (let m = 0; m < 5; m++) {
                        if (s[m] == csym || wild.includes(String(s[m]))) {
                            matchCount++;
                        } else {
                            break;
                        }
                    }

                    if (matchCount > 0 && this.slotSettings.Paytable['SYM_' + csym][matchCount] > 0) {
                        let mpl = 1;
                        // Wild mpl logic (simplified from PHP)
                        const wildMatches = s.slice(0, matchCount).filter(sym => wild.includes(String(sym))).length;
                        if (wildMatches === matchCount && csym !== '9') mpl = 0; // Only wilds matched as symbol
                        else if (wildMatches > 0) mpl = this.slotSettings.slotWildMpl;

                        const tmpWin = this.slotSettings.Paytable['SYM_' + csym][matchCount] * betLine * mpl * bonusMpl;
                        if (cWins[k] < tmpWin && tmpWin > 0) {
                            cWins[k] = tmpWin;
                            const wonSymbols = [];
                            for (let w = 0; w < matchCount; w++) wonSymbols.push(`["0","${linesId[k][w] - 1}"]`);
                            lineWins.push(`{"type":"LineWinAmount","selectedLine":"${k}","amount":"${tmpWin}","wonSymbols":[${wonSymbols.join(',')}]}`);
                        }
                    }
                }
                totalWin += cWins[k];
            }

            // Scatter wins
            let scattersWin = 0;
            scattersCount = 0;
            const scattersPos = [];
            for (let r = 1; r <= 5; r++) {
                for (let p = 0; p <= 2; p++) {
                    if (reels[`reel${r}`]?.[p] == scatter) {
                        scattersCount++;
                        scattersPos.push(`["${r - 1}","${p}"]`);
                    }
                }
            }
            scattersWin = this.slotSettings.Paytable['SYM_' + scatter][scattersCount] * betLine * lines * bonusMpl;

            // Expanding symbols logic (Free Spins only)
            let scattersWinB = 0;
            expWinStr = '';
            expSpinStr = '';
            if (slotEvent === 'freespin') {
                const ExpandingSymbols = this.slotSettings.GetGameData(this.slotId + 'ExpandingSymbols');
                let stgCount = 2;

                for (const bSym of ExpandingSymbols) {
                    let bSymCnt = 0;
                    // Check presence
                    for (let r = 1; r <= 5; r++) {
                        for (let p = 0; p <= 2; p++) {
                            if (reels[`reel${r}`]?.[p] == bSym) {
                                bSymCnt++;
                                break;
                            }
                        }
                    }

                    if (this.slotSettings.Paytable['SYM_' + bSym][bSymCnt] > 0) {
                        const tmpWinArr = [];
                        // Create expanded reels for visualization/calc
                        const reelsEx = JSON.parse(JSON.stringify(reels)); // Deep copy
                        for (let r = 1; r <= 5; r++) {
                            for (let p = 0; p <= 2; p++) {
                                if (reels[`reel${r}`]?.[p] == bSym) {
                                    reelsEx[`reel${r}`] = [bSym, bSym, bSym, ''];
                                    break;
                                }
                            }
                        }

                        // Calculate expand wins
                        for (let k = 0; k < lines; k++) {
                            const s = [];
                            s[0] = reelsEx.reel1[linesId[k][0] - 1];
                            s[1] = reelsEx.reel2[linesId[k][1] - 1];
                            s[2] = reelsEx.reel3[linesId[k][2] - 1];
                            s[3] = reelsEx.reel4[linesId[k][3] - 1];
                            s[4] = reelsEx.reel5[linesId[k][4] - 1];

                            const eps = [];
                            for (let k0 = 0; k0 < 5; k0++) {
                                if (s[k0] == bSym) {
                                    eps.push(`["${k0}","${linesId[k][k0] - 1}"]`);
                                }
                            }
                            // Always winning on expanded reels if enough symbols present
                            const winAmount = this.slotSettings.Paytable['SYM_' + bSym][bSymCnt] * betLine;
                            tmpWinArr.push(`{"type":"LineWinAmount","selectedLine":"${k}","amount":"${winAmount}","wonSymbols":[${eps.join(',')}]}`);
                        }

                        const se = `["${reelsEx.reel1[0]}","${reelsEx.reel2[0]}","${reelsEx.reel3[0]}","${reelsEx.reel4[0]}","${reelsEx.reel5[0]}"],["${reelsEx.reel1[1]}","${reelsEx.reel2[1]}","${reelsEx.reel3[1]}","${reelsEx.reel4[1]}","${reelsEx.reel5[1]}"],["${reelsEx.reel1[2]}","${reelsEx.reel2[2]}","${reelsEx.reel3[2]}","${reelsEx.reel4[2]}","${reelsEx.reel5[2]}"]`;
                        const exbswin = this.slotSettings.Paytable['SYM_' + bSym][bSymCnt] * betLine * lines;
                        scattersWinB += exbswin;
                        expWinStr += `,"lineWinAmountsStage${stgCount}":[${tmpWinArr.join(',')}]`;
                        expSpinStr += `,"spinResultStage${stgCount}":{"type":"SpinResult","rows":[${se}],"params":{"expandingSymbol":"${bSym}"}}`;
                        stgCount++;
                    }
                }
            }

            totalWin += scattersWin + scattersWinB;

            // Trigger bonus?
            if (scattersCount >= 3 && this.slotSettings.slotBonus) {
                gameState = 'FreeSpins';
                let expSym = this.randomInt(1, 8);
                if (this.slotSettings.GetGameData(this.slotId + 'pickCount') <= 0) {
                    this.slotSettings.SetGameData(this.slotId + 'pickCount', 1);
                }
                if (this.slotSettings.GetGameData(this.slotId + 'FreeGames') <= 0) {
                    this.slotSettings.SetGameData(this.slotId + 'ExpandingSymbols', [expSym]);
                } else {
                    // Use existing
                    const existing = this.slotSettings.GetGameData(this.slotId + 'ExpandingSymbols');
                    if (existing && existing.length > 0) expSym = existing[0];
                }

                const scw = `{"type":"Bonus","bonusName":"FreeSpins","params":{"freeSpins":"${this.slotSettings.slotFreeCount}","expandingSymbol":"${expSym}"},"amount":"${this.slotSettings.FormatFloat(scattersWin)}","wonSymbols":[${scattersPos.join(',')}]}`;
                lineWins.push(scw);
            }

            // Win limits check
            if (this.slotSettings.MaxWin < (totalWin * this.slotSettings.CurrentDenom)) continue;

            // Standard loop break conditions
            if (scattersCount >= 3 && winType !== 'bonus') continue;
            if (totalWin <= spinWinLimit && winType === 'bonus') break;
            if (totalWin > 0 && totalWin <= spinWinLimit && winType === 'win') break;
            if (totalWin === 0 && winType === 'none') break;
            if (i > 1500) { totalWin = 0; break; } // Safety break
        }

        // Apply wins
        if (totalWin > 0) {
            this.slotSettings.SetBank(slotEvent, -1 * totalWin);
            this.slotSettings.SetBalance(totalWin);
        }

        // Save game state
        if (slotEvent === 'freespin') {
            this.slotSettings.SetGameData(this.slotId + 'BonusWin', this.slotSettings.GetGameData(this.slotId + 'BonusWin') + totalWin);
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', this.slotSettings.GetGameData(this.slotId + 'TotalWin') + totalWin);
        } else {
            this.slotSettings.SetGameData(this.slotId + 'TotalWin', totalWin);
        }

        if (scattersCount >= 3) {
            if (this.slotSettings.GetGameData(this.slotId + 'pickCount') == 0) {
                // this.slotSettings.SetGameData(this.slotId + 'pickCount', 1); // PHP logic varies here slightly
            }
            if (this.slotSettings.GetGameData(this.slotId + 'FreeGames') > 0) {
                this.slotSettings.SetGameData(this.slotId + 'FreeGames', this.slotSettings.GetGameData(this.slotId + 'FreeGames') + this.slotSettings.slotFreeCount);
            } else {
                this.slotSettings.SetGameData(this.slotId + 'FreeStartWin', totalWin);
                this.slotSettings.SetGameData(this.slotId + 'BonusWin', totalWin);
                this.slotSettings.SetGameData(this.slotId + 'FreeGames', this.slotSettings.slotFreeCount);
            }
        }

        // Response Generation
        symb = `["${reels.reel1?.[0]}","${reels.reel2?.[0]}","${reels.reel3?.[0]}","${reels.reel4?.[0]}","${reels.reel5?.[0]}"],["${reels.reel1?.[1]}","${reels.reel2?.[1]}","${reels.reel3?.[1]}","${reels.reel4?.[1]}","${reels.reel5?.[1]}"],["${reels.reel1?.[2]}","${reels.reel2?.[2]}","${reels.reel3?.[2]}","${reels.reel4?.[2]}","${reels.reel5?.[2]}"]`;

        if (totalWin > 0) {
            winString = `,"slotWin":{"lineWinAmounts":[${lineWins.join(',')}]${expWinStr},"totalWin":"${this.slotSettings.FormatFloat(totalWin)}","canGamble":"true","gambleParams":{"history":["0","1","1","0","1"]}}`;
        } else {
            winString = '';
        }

        const jsSpin = JSON.stringify(reels);
        const jsJack = JSON.stringify(this.slotSettings.Jackpots);
        const responseStr = `{"responseEvent":"spin","responseType":"${slotEvent}","serverResponse":{"BonusSymbol":${this.slotSettings.GetGameData(this.slotId + 'BonusSymbol')},"slotLines":${lines},"slotBet":${betLine},"totalFreeGames":${this.slotSettings.GetGameData(this.slotId + 'FreeGames')},"currentFreeGames":${this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame')},"Balance":${this.slotSettings.GetBalance()},"afterBalance":${this.slotSettings.GetBalance()},"bonusWin":${this.slotSettings.GetGameData(this.slotId + 'BonusWin')},"freeStartWin":${this.slotSettings.GetGameData(this.slotId + 'FreeStartWin')},"totalWin":${totalWin},"winLines":[],"bonusInfo":[],"Jackpots":${jsJack},"reelsSymbols":${jsSpin}}}`;

        this.slotSettings.SaveLogReport(responseStr, allbet, lines, totalWin, slotEvent);

        if (slotEvent === 'freespin') {
            const bonusWin0 = this.slotSettings.GetGameData(this.slotId + 'BonusWin');
            const freeSpinRemain = this.slotSettings.GetGameData(this.slotId + 'FreeGames') - this.slotSettings.GetGameData(this.slotId + 'CurrentFreeGame');
            const freeSpinsTotal = this.slotSettings.GetGameData(this.slotId + 'FreeGames');
            const expandingSymbol = (this.slotSettings.GetGameData(this.slotId + 'ExpandingSymbols') || [])[0] || '';

            const resp = {
                "action": "BonusGameResponse",
                "result": "true",
                "sesId": this.sessionId,
                "data": JSON.parse(`{"state":"FreeSpins"${winString}${expSpinStr},"spinResult":{"type":"SpinResult","rows":[${symb}]},"totalBonusWin":"${this.slotSettings.FormatFloat(bonusWin0)}","freeSpinRemain":"${freeSpinRemain}","freeSpinsTotal":"${freeSpinsTotal}","expandingSymbol":"${expandingSymbol}","params":""}`)
            };
            return JSON.stringify([JSON.stringify(resp)]);
        } else {
            const resp = {
                "action": "SpinResponse",
                "result": "true",
                "sesId": this.sessionId,
                "data": JSON.parse(`{"state":"${gameState}"${winString}${expSpinStr},"spinResult":{"type":"SpinResult","rows":[${symb}]}}`)
            };
            return JSON.stringify([JSON.stringify(resp)]);
        }
    }

    private handleGambleRequest(): string {
        const Balance = this.slotSettings.GetBalance();
        let totalWin = this.slotSettings.GetGameData(this.slotId + 'TotalWin');
        let gambleWin = 0;
        let isGambleWin = this.randomInt(1, this.slotSettings.GetGambleSettings());

        // Validation
        if (this.slotSettings.MaxWin < (totalWin * this.slotSettings.CurrentDenom)) isGambleWin = 0;
        if (this.slotSettings.GetBank('bonus') < (totalWin * 2)) isGambleWin = 0;

        let gambleState = 'false';
        if (isGambleWin === 1) {
            gambleState = 'true';
            gambleWin = totalWin;
            totalWin = totalWin * 2;
        } else {
            gambleWin = -1 * totalWin;
            totalWin = 0;
        }

        this.slotSettings.SetGameData(this.slotId + 'TotalWin', totalWin);
        this.slotSettings.SetBalance(gambleWin);
        this.slotSettings.SetBank('bonus', -1 * gambleWin);
        this.slotSettings.SetGameData(this.slotId + 'BonusWin', totalWin);

        const response = {
            "action": "GambleResponse",
            "result": "true",
            "sesId": this.sessionId,
            "data": { "winning": String(totalWin), "canGamble": gambleState }
        };

        return JSON.stringify([JSON.stringify(response)]);
    }

    private createErrorResponse(message: string): string {
        return JSON.stringify({ "responseEvent": "error", "responseType": "", "serverResponse": message });
    }

    private handleError(error: any): string {
        this.slotSettings.InternalErrorSilent(error);
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
            [2, 3, 3, 3, 2],
            [2, 1, 1, 1, 2],
            [3, 3, 2, 1, 1],
            [1, 1, 2, 3, 3],
            [3, 2, 2, 2, 1]
        ];
    }

    private getPaytable(): any[] {
        return [
            { "payout": "10", "symbols": ["0", "0"], "type": "basic" },
            { "payout": "100", "symbols": ["0", "0", "0"], "type": "basic" },
            { "payout": "1000", "symbols": ["0", "0", "0", "0"], "type": "basic" },
            { "payout": "5000", "symbols": ["0", "0", "0", "0", "0"], "type": "basic" },
            { "payout": "5", "symbols": ["1", "1"], "type": "basic" },
            { "payout": "40", "symbols": ["1", "1", "1"], "type": "basic" },
            { "payout": "400", "symbols": ["1", "1", "1", "1"], "type": "basic" },
            { "payout": "2000", "symbols": ["1", "1", "1", "1", "1"], "type": "basic" },
            { "payout": "5", "symbols": ["2", "2"], "type": "basic" },
            { "payout": "30", "symbols": ["2", "2", "2"], "type": "basic" },
            { "payout": "100", "symbols": ["2", "2", "2", "2"], "type": "basic" },
            { "payout": "750", "symbols": ["2", "2", "2", "2", "2"], "type": "basic" },
            { "payout": "5", "symbols": ["3", "3"], "type": "basic" },
            { "payout": "30", "symbols": ["3", "3", "3"], "type": "basic" },
            { "payout": "100", "symbols": ["3", "3", "3", "3"], "type": "basic" },
            { "payout": "750", "symbols": ["3", "3", "3", "3", "3"], "type": "basic" },
            { "payout": "5", "symbols": ["4", "4", "4"], "type": "basic" },
            { "payout": "40", "symbols": ["4", "4", "4", "4"], "type": "basic" },
            { "payout": "150", "symbols": ["4", "4", "4", "4", "4"], "type": "basic" },
            { "payout": "5", "symbols": ["5", "5", "5"], "type": "basic" },
            { "payout": "40", "symbols": ["5", "5", "5", "5"], "type": "basic" },
            { "payout": "150", "symbols": ["5", "5", "5", "5", "5"], "type": "basic" },
            { "payout": "5", "symbols": ["6", "6", "6"], "type": "basic" },
            { "payout": "25", "symbols": ["6", "6", "6", "6"], "type": "basic" },
            { "payout": "100", "symbols": ["6", "6", "6", "6", "6"], "type": "basic" },
            { "payout": "5", "symbols": ["7", "7", "7"], "type": "basic" },
            { "payout": "25", "symbols": ["7", "7", "7", "7"], "type": "basic" },
            { "payout": "100", "symbols": ["7", "7", "7", "7", "7"], "type": "basic" },
            { "payout": "5", "symbols": ["8", "8", "8"], "type": "basic" },
            { "payout": "25", "symbols": ["8", "8", "8", "8"], "type": "basic" },
            { "payout": "100", "symbols": ["8", "8", "8", "8", "8"], "type": "basic" },
            { "payout": "2", "symbols": ["9", "9", "9"], "type": "scatter" },
            { "payout": "20", "symbols": ["9", "9", "9", "9"], "type": "scatter" },
            { "payout": "200", "symbols": ["9", "9", "9", "9", "9"], "type": "scatter" },
            { "payout": "185", "symbols": ["10"], "type": "scatter" }
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
}