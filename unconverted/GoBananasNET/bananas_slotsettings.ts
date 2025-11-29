namespace VanguardLTE.Games.GoBananasNET {
    class SlotSettings {
        public playerId: string | null = null;
        public splitScreen: boolean | null = null;
        public reelStrip1: any[] | null = null;
        public reelStrip2: any[] | null = null;
        public reelStrip3: any[] | null = null;
        public reelStrip4: any[] | null = null;
        public reelStrip5: any[] | null = null;
        public reelStrip6: any[] | null = null;
        public reelStripBonus1: any[] | null = null;
        public reelStripBonus2: any[] | null = null;
        public reelStripBonus3: any[] | null = null;
        public reelStripBonus4: any[] | null = null;
        public reelStripBonus5: any[] | null = null;
        public reelStripBonus6: any[] | null = null;
        public slotId: string = "";
        public slotDBId: string = "";
        public Line: number[] | null = null;
        public scaleMode: number | null = null;
        public numFloat: number | null = null;
        public gameLine: number[] | null = null;
        public Bet: number[] | null = null;
        public isBonusStart: boolean | null = null;
        public Balance: number | null = null;
        public SymbolGame: string[] | null = null;
        public GambleType: number | null = null;
        public lastEvent: any | null = null;
        public Jackpots: any[] = [];
        public keyController: { [key: string]: string } | null = null;
        public slotViewState: string | null = null;
        public hideButtons: any[] | null = null;
        public slotReelsConfig: any[] | null = null;
        public slotFreeCount: number[] | null = null;
        public slotFreeMpl: number | null = null;
        public slotWildMpl: number | null = null;
        public slotExitUrl: string | null = null;
        public slotBonus: boolean | null = null;
        public slotBonusType: number | null = null;
        public slotScatterType: number | null = null;
        public slotGamble: boolean | null = null;
        public Paytable: { [key: string]: number[] } = {};
        public slotSounds: any[] = [];
        public jpgs: any[] | null = null;
        private Bank: number | null = null;
        private Percent: number | null = null;
        private WinLine: number | null = null;
        private WinGamble: number | null = null;
        private Bonus: number | null = null;
        private shop_id: number | null = null;
        public currency: string | null = null;
        public user: any | null = null;
        public game: any | null = null;
        public shop: any | null = null;
        public jpgPercentZero: boolean = false;
        public count_balance: number | null = null;
    private reel: any;
    private Denominations: number[];
    private CurrentDenomination: number;
    private slotJackPercent: number[];
    private slotJackpot: number[];
    private gameData: any;
    private gameDataStatic: any;
        gamebank: any;
        MaxWin: any;
        increaseRTP: number;
        CurrentDenom: any;
        slotFastStop: number;
        slotCurrency: any;

    constructor(sid: string, playerId: string) {
        this.slotId = sid;
        this.playerId = playerId;
        this.user = User::lockForUpdate().find(this.playerId);
        this.shop_id = this.user.shop_id;
        this.gamebank = GameBank::where({ shop_id: this.shop_id }).lockForUpdate().get();
        this.game = Game::where({ name: this.slotId, shop_id: this.shop_id }).lockForUpdate().first();
        this.shop = Shop::find(this.shop_id);
        this.MaxWin = this.shop.max_win;
        this.increaseRTP = 1;
        this.CurrentDenom = this.game.denomination;
        this.scaleMode = 0;
        this.numFloat = 0;
        this.Paytable = {
            'SYM_0': [0, 0, 0, 0, 0, 0],
            'SYM_1': [0, 0, 0, 0, 0, 0],
            'SYM_2': [0, 0, 0, 0, 0, 0],
            'SYM_3': [0, 0, 0, 25, 120, 700],
            'SYM_4': [0, 0, 0, 20, 80, 350],
            'SYM_5': [0, 0, 0, 15, 60, 250],
            'SYM_6': [0, 0, 0, 15, 50, 180],
            'SYM_7': [0, 0, 0, 10, 40, 140],
            'SYM_8': [0, 0, 0, 5, 20, 70],
            'SYM_9': [0, 0, 0, 5, 15, 60],
            'SYM_10': [0, 0, 0, 5, 15, 50],
            'SYM_11': [0, 0, 0, 5, 10, 40],
            'SYM_12': [0, 0, 0, 5, 10, 30]
        };
        this.reel = new GameReel();
        const reelStrips = ['reelStrip1', 'reelStrip2', 'reelStrip3', 'reelStrip4', 'reelStrip5', 'reelStrip6'];
        reelStrips.forEach(reelStrip => {
            if (this.reel.reelsStrip[reelStrip].length) {
                this[reelStrip] = this.reel.reelsStrip[reelStrip];
            }
        });
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
        this.slotBonus = false;
        this.slotGamble = true;
        this.slotFastStop = 1;
        this.slotExitUrl = '/';
        this.slotWildMpl = 1;
        this.GambleType = 1;
        this.Denominations = Game::$values['denomination'];
        this.CurrentDenom = this.Denominations[0];
        this.CurrentDenomination = this.Denominations[0];
        this.slotFreeCount = [0, 0, 0, 15, 30, 60];
        this.slotFreeMpl = 1;
        this.slotViewState = this.game.slotViewState === '' ? 'Normal' : this.game.slotViewState;
        this.hideButtons = [];
        this.jpgs = JPG::where('shop_id', this.shop_id).lockForUpdate().get();
        this.slotJackPercent = [];
        this.slotJackpot = [];
        for (let jp = 1; jp <= 4; jp++) {
            this.slotJackpot.push(this.game['jp_' + jp]);
            this.slotJackPercent.push(this.game['jp_' + jp + '_percent']);
        }
        this.Line = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        this.gameLine = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        this.Bet = this.game.bet.split(',');
        this.Balance = this.user.balance;
        this.SymbolGame = ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
        this.Bank = this.game.get_gamebank();
        this.Percent = this.shop.percent;
        this.WinGamble = this.game.rezerv;
        this.slotDBId = this.game.id;
        this.slotCurrency = this.user.shop.currency;
        this.count_balance = this.user.count_balance;
        if (this.user.address > 0 && this.user.count_balance === 0) {
            this.Percent = 0;
            this.jpgPercentZero = true;
        } else if (this.user.count_balance === 0) {
            this.Percent = 100;
        }
        if (!this.user.session || this.user.session.length <= 0) {
            this.user.session = JSON.stringify([]);
        }
        this.gameData = JSON.parse(this.user.session);
        if (this.gameData.length > 0) {
            for (const key in this.gameData) {
                if (this.gameData[key].timelife <= Date.now()) {
                    delete this.gameData[key];
                }
            }
        }
        if (!this.game.advanced || this.game.advanced.length <= 0) {
            this.game.advanced = JSON.stringify([]);
        }
        this.gameDataStatic = JSON.parse(this.game.advanced);
        if (this.gameDataStatic.length > 0) {
            for (const key in this.gameDataStatic) {
                if (this.gameDataStatic[key].timelife <= Date.now()) {
                    delete this.gameDataStatic[key];
                }
            }
        }
    }

        public is_active(): boolean {
            // Method logic here...
            return true;
        }

        public SetGameData(key: string, value: any): void {
            // Method logic here...
        }

        public GetGameData(key: string): any {
            // Method logic here...
            return 0;
        }

        public FormatFloat(num: number): number {
            // Method logic here...
            return num;
        }

        public SaveGameData(): void {
            // Method logic here...
        }

        public CheckBonusWin(): number {
            // Method logic here...
            return 0;
        }

        public GetRandomPay(): number {
            // Method logic here...
            return 0;
        }

        public HasGameDataStatic(key: string): boolean {
            // Method logic here...
            return false;
        }

        public SaveGameDataStatic(): void {
            // Method logic here...
        }

        public SetGameDataStatic(key: string, value: any): void {
            // Method logic here...
        }

        public GetGameDataStatic(key: string): any {
            // Method logic here...
            return 0;
        }

        public HasGameData(key: string): boolean {
            // Method logic here...
            return false;
        }

        public GetHistory(): any {
            // Method logic here...
            return "NULL";
        }

        public UpdateJackpots(bet: number): void {
            // Method logic here...
        }

        public GetBank(slotState: string = ""): number {
            // Method logic here...
            return 0;
        }

        public GetPercent(): number {
            // Method logic here...
            return 0;
        }

        public GetCountBalanceUser(): number {
            // Method logic here...
            return 0;
        }

        public InternalError(errcode: string): void {
            // Method logic here...
        }

        public InternalErrorSilent(errcode: string): void {
            // Method logic here...
        }

        public SetBank(
            slotState: string = "",
            sum: number,
            slotEvent: string = ""
        ): any {
            // Method logic here...
            return null;
        }

        public SetBalance(sum: number, slotEvent: string = ""): any {
            // Method logic here...
            return null;
        }

        public GetBalance(): number {
            // Method logic here...
            return 0;
        }

        public SaveLogReport(
            spinSymbols: any,
            bet: number,
            lines: number,
            win: number,
            slotState: string
        ): void {
            // Method logic here...
        }

        public GetSpinSettings(
            garantType: string = "bet",
            bet: number,
            lines: number
        ): any {
            // Method logic here...
            return null;
        }

        public getNewSpin(
            game: any,
            spinWin: number,
            bonusWin: number,
            lines: number,
            garantType: string = "bet"
        ): any {
            // Method logic here...
            return null;
        }

        public GetRandomScatterPos(rp: any[]): number {
            // Method logic here...
            return 0;
        }

        public GetGambleSettings(): number {
            // Method logic here...
            return 0;
        }

        public GetReelStrips(winType: string, slotEvent: string): any {
            // Method logic here...
            return null;
        }
    }
}
