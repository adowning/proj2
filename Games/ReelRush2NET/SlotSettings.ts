
import { BaseSlotSettings } from "../../BaseSlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class SlotSettings extends BaseSlotSettings {

    public constructor(slotSettingsData: ISlotSettingsData) {
        super(slotSettingsData);
        this.initializeFromGameState(slotSettingsData);
    }

    private initializeFromGameState(gameStateData: ISlotSettingsData): void {
        this.MaxWin = this.shop?.max_win ?? 50000;
        this.increaseRTP = 1;
        this.CurrentDenom = this.game?.denominations?.[0] ?? 1;
        this.scaleMode = 0;
        this.numFloat = 0;

        this.Paytable = {
            'SYM_0': [0, 0, 0, 0, 0, 0],
            'SYM_1': [0, 0, 0, 0, 0, 0],
            'SYM_2': [0, 0, 0, 0, 0, 0],
            'SYM_3': [0, 0, 0, 10, 50, 200],
            'SYM_4': [0, 0, 0, 8, 25, 100],
            'SYM_5': [0, 0, 0, 7, 15, 30],
            'SYM_6': [0, 0, 0, 7, 15, 30],
            'SYM_7': [0, 0, 0, 5, 10, 20],
            'SYM_8': [0, 0, 0, 5, 10, 20],
            'SYM_9': [0, 0, 0, 1, 6, 12],
            'SYM_10': [0, 0, 0, 1, 6, 12],
            'SYM_11': [0, 0, 0, 1, 5, 10],
            'SYM_12': [0, 0, 0, 1, 5, 10],
            'SYM_13': [0, 0, 0, 1, 5, 10]
        };

        this.keyController = {
            '13': 'uiButtonSpin,uiButtonSkip',
            '49': 'uiButtonInfo',
            '50': 'uiButtonCollect',
            '51': 'uiButtonExit2',
            '52': 'uiButtonLinesMinus',
            '53': 'uiButtonLinesPlus',
            '54': 'uiButtonBetMinus',
            '55': 'uiButtonBetPlus',
            '56': 'uiButtonGamble',
            '57': 'uiButtonRed',
            '48': 'uiButtonBlack',
            '189': 'uiButtonAuto',
            '187': 'uiButtonSpin'
        };

        this.slotReelsConfig = [
            [425, 142, 3],
            [669, 142, 3],
            [913, 142, 3],
            [1157, 142, 3],
            [1401, 142, 3]
        ];

        this.slotBonusType = 1;
        this.slotScatterType = 0;
        this.splitScreen = false;
        this.slotBonus = true;
        this.slotGamble = true;
        this.slotFastStop = 1;
        this.slotExitUrl = '/';
        this.slotWildMpl = 1;
        this.GambleType = 1;
        this.Denominations = this.game?.denominations ?? [1];
        this.CurrentDenom = this.Denominations[0] ?? 1;
        this.CurrentDenomination = this.Denominations[0] ?? 1;

        this.slotFreeCount = [0, 0, 0, 8, 8, 8];
        this.slotFreeMpl = 1;

        this.slotViewState = (this.game?.slotViewState || 'Normal');
        this.hideButtons = [];

        this.Line = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        this.gameLine = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

        this.Bet = this.game?.bet ? this.game.bet.split(',').map(b => parseInt(b.trim())) : [1, 2, 3, 4, 5, 10, 15, 20, 30, 40, 50, 100, 200, 300];

        this.Balance = this.user?.balance ?? 0;
        this.SymbolGame = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];

        this.Bank = this.game?.balance ?? 1000;
        this.Percent = this.shop?.percent ?? 10;
        this.WinGamble = this.game?.rezerv ?? 0;
        this.slotDBId = (this.game?.id ?? 0).toString();
        this.slotCurrency = this.shop?.currency ?? 'USD';
        this.count_balance = this.user?.count_balance ?? 0;

        if ((this.user?.address ?? 0) > 0 && this.user?.count_balance === 0) {
            this.Percent = 0;
            this.jpgPercentZero = true;
        } else if (this.user?.count_balance === 0) {
            this.Percent = 100;
        }

        this.initializeReelStrips();
    }

    private initializeReelStrips(): void {
        const reelStrips = this.gameDataStatic?.reelStrips;
        if (reelStrips) {
            for (const reelStrip of ['reelStrip1', 'reelStrip2', 'reelStrip3', 'reelStrip4', 'reelStrip5', 'reelStrip6']) {
                if (reelStrips[reelStrip] && reelStrips[reelStrip].length > 0) {
                    (this as any)[reelStrip] = reelStrips[reelStrip];
                }
            }
        }
    }

    public GetSpinSettings(garantType: string = 'bet', bet: number, lines: number): [string, number] {
        let curField = 10;

        switch (lines) {
            case 10:
                curField = 10;
                break;
            case 9:
            case 8:
                curField = 9;
                break;
            case 7:
            case 6:
                curField = 7;
                break;
            case 5:
            case 4:
                curField = 5;
                break;
            case 3:
            case 2:
                curField = 3;
                break;
            case 1:
                curField = 1;
                break;
            default:
                curField = 10;
                break;
        }

        const pref = garantType !== 'bet' ? '_bonus' : '';
        this.AllBet = bet * lines;

        const linesPercentConfigSpin = this.getLinesPercentConfig('spin');
        const linesPercentConfigBonus = this.getLinesPercentConfig('bonus');

        const currentPercent = this.shop?.percent ?? 10;
        let currentSpinWinChance = 0;
        let currentBonusWinChance = 0;
        let percentLevel = '';

        const configKey = `line${curField}${pref}`;
        const configData = linesPercentConfigSpin[configKey] || {};

        for (const k of Object.keys(configData)) {
            const [l0, l1] = k.split('_').map(Number);
            if (l0 <= currentPercent && currentPercent <= l1) {
                percentLevel = k;
                break;
            }
        }

        currentSpinWinChance = configData[percentLevel] || 20;
        currentBonusWinChance = (linesPercentConfigBonus[configKey] || {})[percentLevel] || 50;

        const RtpControlCount = 200;

        if (!this.HasGameDataStatic('SpinWinLimit')) {
            this.SetGameDataStatic('SpinWinLimit', 0);
        }

        if (!this.HasGameDataStatic('RtpControlCount')) {
            this.SetGameDataStatic('RtpControlCount', RtpControlCount);
        }

        const rtpRange = (this.game?.stat_in ?? 0) > 0 ?
            (this.game?.stat_out ?? 0) / (this.game?.stat_in ?? 1) * 100 : 0;

        const rtpControlCount = this.GetGameDataStatic('RtpControlCount');
        const spinWinLimit = this.GetGameDataStatic('SpinWinLimit');

        if (rtpControlCount === 0) {
            if (currentPercent + this.randomInt(1, 2) < rtpRange && spinWinLimit <= 0) {
                this.SetGameDataStatic('SpinWinLimit', this.randomInt(25, 50));
            }
            if (pref === '' && spinWinLimit > 0) {
                currentBonusWinChance = 5000;
                currentSpinWinChance = 20;
                this.MaxWin = this.randomInt(1, 5);
                if (rtpRange < (currentPercent - 1)) {
                    this.SetGameDataStatic('SpinWinLimit', 0);
                    this.SetGameDataStatic('RtpControlCount', rtpControlCount - 1);
                }
            }
        } else if (rtpControlCount < 0) {
            if (currentPercent + this.randomInt(1, 2) < rtpRange && spinWinLimit <= 0) {
                this.SetGameDataStatic('SpinWinLimit', this.randomInt(25, 50));
            }
            this.SetGameDataStatic('RtpControlCount', rtpControlCount - 1);
            if (pref === '' && spinWinLimit > 0) {
                currentBonusWinChance = 5000;
                currentSpinWinChance = 20;
                this.MaxWin = this.randomInt(1, 5);
                if (rtpRange < (currentPercent - 1)) {
                    this.SetGameDataStatic('SpinWinLimit', 0);
                }
            }
            if (rtpControlCount < (-1 * RtpControlCount) &&
                currentPercent - 1 <= rtpRange && rtpRange <= (currentPercent + 2)) {
                this.SetGameDataStatic('RtpControlCount', RtpControlCount);
            }
        } else {
            this.SetGameDataStatic('RtpControlCount', rtpControlCount - 1);
        }

        const bonusWin = this.randomInt(1, currentBonusWinChance);
        const spinWin = this.randomInt(1, currentSpinWinChance);
        let returnValue: [string, number] = ['none', 0];

        if (bonusWin === 1 && this.slotBonus) {
            this.isBonusStart = true;
            garantType = 'bonus';
            const winLimit = this.GetBank(garantType);
            returnValue = ['bonus', winLimit];

            if ((this.game?.stat_in ?? 0) < (this.CheckBonusWin() * bet + (this.game?.stat_out ?? 0)) ||
                winLimit < (this.CheckBonusWin() * bet)) {
                returnValue = ['none', 0];
            }
        } else if (spinWin === 1) {
            const winLimit = this.GetBank(garantType);
            returnValue = ['win', winLimit];
        }

        if (garantType === 'bet' && this.GetBalance() <= (2 / this.CurrentDenom)) {
            const randomPush = this.randomInt(1, 10);
            if (randomPush === 1) {
                const winLimit = this.GetBank('');
                returnValue = ['win', winLimit];
            }
        }

        return returnValue;
    }

    public getNewSpin(game: any, spinWin: number, bonusWin: number, lines: number, garantType: string = 'bet'): any {
        let curField = 10;
        switch (lines) {
            case 10:
                curField = 10;
                break;
            case 9:
            case 8:
                curField = 9;
                break;
            case 7:
            case 6:
                curField = 7;
                break;
            case 5:
            case 4:
                curField = 5;
                break;
            case 3:
            case 2:
                curField = 3;
                break;
            case 1:
                curField = 1;
                break;
            default:
                curField = 10;
                break;
        }

        const pref = garantType !== 'bet' ? '_bonus' : '';
        let win: any[] = [];

        if (spinWin) {
            win = (game?.game_win?.[`winline${pref}${curField}`] || '').split(',');
        }
        if (bonusWin) {
            win = (game?.game_win?.[`winbonus${pref}${curField}`] || '').split(',');
        }

        const number = this.randomInt(0, win.length - 1);
        return win[number];
    }

    public GetRandomScatterPos(rp: string[]): number {
        const rpResult: number[] = [];

        for (let i = 0; i < rp.length; i++) {
            if (rp[i] == '0') {
                if (rp[i + 1] && rp[i - 1]) {
                    rpResult.push(i);
                }
                if (rp[i - 1] && rp[i - 2]) {
                    rpResult.push(i - 1);
                }
                if (rp[i + 1] && rp[i + 2]) {
                    rpResult.push(i + 1);
                }
            }
        }

        this.shuffleArray(rpResult);

        if (rpResult.length === 0) {
            rpResult[0] = this.randomInt(2, rp.length - 3);
        }

        return rpResult[0];
    }

    public GetGambleSettings(): number {
        const spinWin = this.randomInt(1, this.WinGamble ?? 0);
        return spinWin;
    }

    public SymbolUpgrade(reels: any, fCnt: number): string {
        const RespinId = this.GetGameData(this.slotId + 'RespinId') || 0;
        const respinIdClamped = Math.min(RespinId, 5);

        const waysLimit: number[][][] = [
            [[2], [1, 2, 3], [0, 1, 2, 3, 4], [1, 2, 3], [2]],
            [[1, 2, 3], [1, 2, 3], [0, 1, 2, 3, 4], [1, 2, 3], [2]],
            [[1, 2, 3], [1, 2, 3], [0, 1, 2, 3, 4], [1, 2, 3], [1, 2, 3]],
            [[1, 2, 3], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [1, 2, 3]],
            [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [1, 2, 3]],
            [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4]]
        ];

        let featureStr = '';
        const randomwildspArr: string[] = [];
        const cSym0 = this.randomInt(4, 13);
        const cSym1 = cSym0 - 1;

        for (let r = 1; r <= 5; r++) {
            const curWays = waysLimit[respinIdClamped][r - 1];
            for (const p of curWays) {
                if (reels[`reel${r}`][p] == cSym0) {
                    reels[`reel${r}`][p] = cSym1;
                    randomwildspArr.push(`(${r - 1},${p})`);
                }
            }
        }

        featureStr = `&features.i${fCnt}.data.to=SYM${cSym1}&features.i${fCnt}.type=SymbolUpgrade&features.i${fCnt}.data.positions=${randomwildspArr.join('%2C')}&features.i${fCnt}.data.from=SYM${cSym0}`;
        return featureStr;
    }

    public RandomWilds(reels: any, fCnt: number): string {
        const RespinId = this.GetGameData(this.slotId + 'RespinId') || 0;
        const respinIdClamped = Math.min(RespinId, 5);

        const waysLimit: number[][][] = [
            [[2], [1, 2, 3], [0, 1, 2, 3, 4], [1, 2, 3], [2]],
            [[1, 2, 3], [1, 2, 3], [0, 1, 2, 3, 4], [1, 2, 3], [2]],
            [[1, 2, 3], [1, 2, 3], [0, 1, 2, 3, 4], [1, 2, 3], [1, 2, 3]],
            [[1, 2, 3], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [1, 2, 3]],
            [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [1, 2, 3]],
            [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4]]
        ];

        let featureStr = '';
        const randomwildspArr: string[] = [];
        let wcnt = 0;

        for (let rr = 1; rr <= 50; rr++) {
            for (let r = 2; r <= 5; r++) {
                const curWays = waysLimit[respinIdClamped][r - 1];
                for (const p of curWays) {
                    if (this.randomInt(1, 5) === 1 && wcnt < 3) {
                        reels[`reel${r}`][p] = '1';
                        randomwildspArr.push(`(${r - 1},${p})`);
                        wcnt++;
                    }
                }
            }
            featureStr = `&features.i${fCnt}.type=RandomWilds&features.i${fCnt}.data.positions=${randomwildspArr.join('%2C')}`;
            if (randomwildspArr.length > 0) {
                break;
            }
        }
        return featureStr;
    }

    public GetReelStrips(winType: string, slotEvent: string): any {
        if (slotEvent == 'freespin') {
            // Logic for free spins if specific strips logic is needed
            // Assuming base strips logic handles it via available properties
        }

        const prs: { [key: number]: number } = {};

        if (winType != 'bonus') {
            for (let index = 0; index < ['reelStrip1', 'reelStrip2', 'reelStrip3', 'reelStrip4', 'reelStrip5', 'reelStrip6'].length; index++) {
                const reelStrip = `reelStrip${index + 1}`;
                const reelData = (this as any)[reelStrip];
                if (Array.isArray(reelData) && reelData.length > 0) {
                    prs[index + 1] = this.randomInt(0, reelData.length - 3);
                }
            }
        } else {
            const reelsId = [];
            for(let i=1; i<=6; i++) {
                if((this as any)[`reelStrip${i}`]) reelsId.push(i);
            }

            const scattersCnt = this.randomInt(3, reelsId.length);
            this.shuffleArray(reelsId);

            for (let i = 0; i < reelsId.length; i++) {
                const idx = reelsId[i];
                if (i < scattersCnt) {
                    prs[idx] = this.GetRandomScatterPos((this as any)[`reelStrip${idx}`]);
                } else {
                    prs[idx] = this.randomInt(0, (this as any)[`reelStrip${idx}`].length - 3);
                }
            }
        }

        const reel: any = {
            rp: []
        };

        for (const [index, value] of Object.entries(prs)) {
            const reelIndex = parseInt(index);
            const key = (this as any)[`reelStrip${reelIndex}`];
            if (key && key.length > 0) {
                const cnt = key.length;
                const v_minus_1 = value - 1 < 0 ? key[cnt - 1] : key[value - 1];

                reel[`reel${reelIndex}`] = [];
                reel[`reel${reelIndex}`][0] = v_minus_1;
                reel[`reel${reelIndex}`][1] = key[value];
                reel[`reel${reelIndex}`][2] = key[value + 1];
                reel[`reel${reelIndex}`][3] = key[value + 2];
                reel[`reel${reelIndex}`][4] = key[value + 3];
                reel[`reel${reelIndex}`][5] = '';
                reel['rp'].push(value);
            }
        }

        return reel;
    }

    private getLinesPercentConfig(type: string): { [key: string]: any } {
        const defaultConfig = {
            'line10': { '0_100': 100 }
        };
        const configKey = type === 'spin' ? 'linesPercentConfigSpin' : 'linesPercentConfigBonus';
        return this.gameDataStatic?.[configKey] || {};
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
