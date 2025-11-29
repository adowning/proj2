/** biome-ignore-all lint/style/useTemplate: <explanation> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */
/** biome-ignore-all lint/suspicious/noDoubleEquals: <explanation> */
/** biome-ignore-all lint/correctness/noInnerDeclarations: <explanation> */
/** biome-ignore-all lint/correctness/noUnusedVariables: <explanation> */
/** biome-ignore-all lint/correctness/noSwitchDeclarations: <explanation> */
/** biome-ignore-all lint/style/useConst: <explanation> */
import {rand, round, count, implode } from 'locutus'

   export class Server {
        public get(request: any, game: any): void {
                // \DB:: transaction(function () use($request, $game) {
                //     try {
                //         let userId = \Auth:: id();
                //         if(userId == null) {
                //     let response = '{"responseEvent":"error","responseType":"","serverResponse":"invalid login"}';
                //     exit(response);
                // }
                var slotSettings = new SlotSettings(game, userId);
                if (!slotSettings.is_active()) {
                    let response = '{"responseEvent":"error","responseType":"","serverResponse":"Game is disabled"}';
                    exit(response);
                }
                var postData = request['postData'];
                var balanceInCents = round(slotSettings.GetBalance() * slotSettings.CurrentDenom * 100);
                var result_tmp:any[] = [];
                var aid = '';
                postData['slotEvent'] = 'bet';
                if (postData['action'] == 'freespin') {
                    postData['slotEvent'] = 'freespin';
                    postData['action'] = 'spin';
                }
                if (postData['action'] == 'respin') {
                    postData['slotEvent'] = 'respin';
                    postData['action'] = 'spin';
                }
                if (postData['action'] == 'init' || postData['action'] == 'reloadbalance') {
                    postData['action'] = 'init';
                    postData['slotEvent'] = 'init';
                }
                if (postData['action'] == 'paytable') {
                    postData['slotEvent'] = 'paytable';
                }
                if (postData['action'] == 'initfreespin') {
                    postData['slotEvent'] = 'initfreespin';
                }
                if (postData['bet_denomination'] >= 1) {
                    postData['bet_denomination'] = postData['bet_denomination'] / 100;
                    slotSettings.CurrentDenom = postData['bet_denomination'];
                    slotSettings.CurrentDenomination = postData['bet_denomination'];
                    slotSettings.SetGameData(slotSettings.slotId + 'GameDenom', postData['bet_denomination']);
                } else if (slotSettings.HasGameData(slotSettings.slotId + 'GameDenom')) {
                    postData['bet_denomination'] = slotSettings.GetGameData(slotSettings.slotId + 'GameDenom');
                    slotSettings.CurrentDenom = postData['bet_denomination'];
                    slotSettings.CurrentDenomination = postData['bet_denomination'];
                }
                balanceInCents = round(slotSettings.GetBalance() * slotSettings.CurrentDenom * 100);
                if (postData['slotEvent'] == 'bet') {
                    let lines = 20;
                    let betline = postData['bet_betlevel'];
                    if (lines <= 0 || betline <= 0.0001) {
                        let response = '{"responseEvent":"error","responseType":"' + postData['slotEvent'] + '","serverResponse":"invalid bet state"}';
                        exit(response);
                    }
                    if (slotSettings.GetBalance() < (lines * betline)) {
                        let response = '{"responseEvent":"error","responseType":"' + postData['slotEvent'] + '","serverResponse":"invalid balance"}';
                        exit(response);
                    }
                }
                if (slotSettings.GetGameData(slotSettings.slotId + 'FreeGames') < slotSettings.GetGameData(slotSettings.slotId + 'CurrentFreeGame') && postData['slotEvent'] == 'freespin') {
                    let response = '{"responseEvent":"error","responseType":"' + postData['slotEvent'] + '","serverResponse":"invalid bonus state"}';
                    exit(response);
                }
                aid = (string)postData['action'];
               
                switch (aid) {
                    case 'init':
                      var freeState = '';
                        var curReels = '';
                    let gameBets = slotSettings.Bet;
                        let lastEvent = slotSettings.GetHistory();
                        slotSettings.SetGameData('CreatureFromTheBlackLagoonNETBonusWin', 0);
                        slotSettings.SetGameData('CreatureFromTheBlackLagoonNETFreeGames', 0);
                        slotSettings.SetGameData('CreatureFromTheBlackLagoonNETCurrentFreeGame', 0);
                        slotSettings.SetGameData('CreatureFromTheBlackLagoonNETTotalWin', 0);
                        slotSettings.SetGameData('CreatureFromTheBlackLagoonNETFreeBalance', 0);
                       
                        if (lastEvent != 'NULL') {
                            slotSettings.SetGameData(slotSettings.slotId + 'BonusWin', lastEvent.serverResponse.bonusWin);
                            slotSettings.SetGameData(slotSettings.slotId + 'FreeGames', lastEvent.serverResponse.totalFreeGames);
                            slotSettings.SetGameData(slotSettings.slotId + 'CurrentFreeGame', lastEvent.serverResponse.currentFreeGames);
                            slotSettings.SetGameData(slotSettings.slotId + 'TotalWin', lastEvent.serverResponse.bonusWin);
                            slotSettings.SetGameData(slotSettings.slotId + 'FreeBalance', lastEvent.serverResponse.Balance);
                            freeState = lastEvent.serverResponse.freeState;
                            let reels = lastEvent.serverResponse.reelsSymbols;
                            let curReels = '&rs.i0.r.i0.syms=SYM' + reels.reel1[0] + '%2CSYM' + reels.reel1[1] + '%2CSYM' + reels.reel1[2] + '';
                            curReels += ('&rs.i0.r.i1.syms=SYM' + reels.reel2[0] + '%2CSYM' + reels.reel2[1] + '%2CSYM' + reels.reel2[2] + '');
                            curReels += ('&rs.i0.r.i2.syms=SYM' + reels.reel3[0] + '%2CSYM' + reels.reel3[1] + '%2CSYM' + reels.reel3[2] + '');
                            curReels += ('&rs.i0.r.i3.syms=SYM' + reels.reel4[0] + '%2CSYM' + reels.reel4[1] + '%2CSYM' + reels.reel4[2] + '');
                            curReels += ('&rs.i0.r.i4.syms=SYM' + reels.reel5[0] + '%2CSYM' + reels.reel5[1] + '%2CSYM' + reels.reel5[2] + '');
                            curReels += ('&rs.i1.r.i0.syms=SYM' + reels.reel1[0] + '%2CSYM' + reels.reel1[1] + '%2CSYM' + reels.reel1[2] + '');
                            curReels += ('&rs.i1.r.i1.syms=SYM' + reels.reel2[0] + '%2CSYM' + reels.reel2[1] + '%2CSYM' + reels.reel2[2] + '');
                            curReels += ('&rs.i1.r.i2.syms=SYM' + reels.reel3[0] + '%2CSYM' + reels.reel3[1] + '%2CSYM' + reels.reel3[2] + '');
                            curReels += ('&rs.i1.r.i3.syms=SYM' + reels.reel4[0] + '%2CSYM' + reels.reel4[1] + '%2CSYM' + reels.reel4[2] + '');
                            curReels += ('&rs.i1.r.i4.syms=SYM' + reels.reel5[0] + '%2CSYM' + reels.reel5[1] + '%2CSYM' + reels.reel5[2] + '');
                            curReels += ('&rs.i0.r.i0.pos=' + reels.rp[0]);
                            curReels += ('&rs.i0.r.i1.pos=' + reels.rp[0]);
                            curReels += ('&rs.i0.r.i2.pos=' + reels.rp[0]);
                            curReels += ('&rs.i0.r.i3.pos=' + reels.rp[0]);
                            curReels += ('&rs.i0.r.i4.pos=' + reels.rp[0]);
                            curReels += ('&rs.i1.r.i0.pos=' + reels.rp[0]);
                            curReels += ('&rs.i1.r.i1.pos=' + reels.rp[0]);
                            curReels += ('&rs.i1.r.i2.pos=' + reels.rp[0]);
                            curReels += ('&rs.i1.r.i3.pos=' + reels.rp[0]);
                            curReels += ('&rs.i1.r.i4.pos=' + reels.rp[0]);
                        } else {
                            curReels = '&rs.i0.r.i0.syms=SYM' + rand(1, 7) + '%2CSYM' + rand(1, 7) + '%2CSYM' + rand(1, 7) + '%2CSYM' + rand(1, 7) + '';
                            curReels += ('&rs.i0.r.i1.syms=SYM' + rand(1, 7) + '%2CSYM' + rand(1, 7) + '%2CSYM' + rand(1, 7) + '%2CSYM' + rand(1, 7) + '');
                            curReels += ('&rs.i0.r.i2.syms=SYM' + rand(1, 7) + '%2CSYM' + rand(1, 7) + '%2CSYM' + rand(1, 7) + '%2CSYM' + rand(1, 7) + '');
                            curReels += ('&rs.i0.r.i3.syms=SYM' + rand(1, 7) + '%2CSYM' + rand(1, 7) + '%2CSYM' + rand(1, 7) + '%2CSYM' + rand(1, 7) + '');
                            curReels += ('&rs.i0.r.i4.syms=SYM' + rand(1, 7) + '%2CSYM' + rand(1, 7) + '%2CSYM' + rand(1, 7) + '%2CSYM' + rand(1, 7) + '');
                            curReels += ('&rs.i0.r.i0.pos=' + rand(1, 10));
                            curReels += ('&rs.i0.r.i1.pos=' + rand(1, 10));
                            curReels += ('&rs.i0.r.i2.pos=' + rand(1, 10));
                            curReels += ('&rs.i0.r.i3.pos=' + rand(1, 10));
                            curReels += ('&rs.i0.r.i4.pos=' + rand(1, 10));
                            curReels += ('&rs.i1.r.i0.pos=' + rand(1, 10));
                            curReels += ('&rs.i1.r.i1.pos=' + rand(1, 10));
                            curReels += ('&rs.i1.r.i2.pos=' + rand(1, 10));
                            curReels += ('&rs.i1.r.i3.pos=' + rand(1, 10));
                            curReels += ('&rs.i1.r.i4.pos=' + rand(1, 10));
                        }
                        for (let d = 0; d < count(slotSettings.Denominations); d++) {
                            slotSettings.Denominations[d] = slotSettings.Denominations[d] * 100;
                        }
                        if (slotSettings.GetGameData('CreatureFromTheBlackLagoonNETCurrentFreeGame') < slotSettings.GetGameData('CreatureFromTheBlackLagoonNETFreeGames') && slotSettings.GetGameData('CreatureFromTheBlackLagoonNETFreeGames') > 0) {
                            freeState = 'previous.rs.i0=freespinlevel0&rs.i1.r.i0.syms=SYM6%2CSYM3%2CSYM5&bl.i6.coins=1&rs.i8.r.i3.hold=false&bl.i17.reelset=ALL&bl.i15.id=15&rs.i0.r.i4.hold=false&rs.i9.r.i1.hold=false&gamestate.history=basic%2Cfreespin&rs.i1.r.i2.hold=false&rs.i8.r.i1.syms=SYM3%2CSYM9%2CSYM9&game.win.cents=685&rs.i7.r.i3.syms=SYM4%2CSYM8%2CSYM10&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i10.line=1%2C2%2C1%2C2%2C1&bl.i0.reelset=ALL&bl.i18.coins=1&bl.i10.id=10&freespins.initial=10&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&bl.i13.coins=1&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM7%2CSYM4%2CSYM7&rs.i9.r.i3.hold=false&bl.i2.id=2&rs.i1.r.i1.pos=1&rs.i7.r.i1.syms=SYM0%2CSYM5%2CSYM10&rs.i3.r.i4.pos=0&rs.i6.r.i3.syms=SYM5%2CSYM4%2CSYM8&rs.i0.r.i0.pos=0&bl.i14.reelset=ALL&rs.i2.r.i3.pos=62&rs.i5.r.i1.overlay.i0.with=SYM1&rs.i5.r.i0.pos=5&rs.i7.id=basic&rs.i7.r.i3.pos=99&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=0&rs.i2.id=freespinlevel0respin&rs.i6.r.i1.pos=0&game.win.coins=137&rs.i1.r.i0.hold=false&bl.i3.id=3&ws.i1.reelset=freespinlevel0&bl.i12.coins=1&bl.i8.reelset=ALL&clientaction=init&rs.i4.r.i0.hold=false&rs.i0.r.i2.hold=false&rs.i4.r.i3.syms=SYM5%2CSYM4%2CSYM8&bl.i16.id=16&casinoID=netent&rs.i2.r.i3.overlay.i0.with=SYM1&bl.i5.coins=1&rs.i3.r.i2.hold=false&bl.i8.id=8&rs.i5.r.i1.syms=SYM6%2CSYM10%2CSYM1&rs.i7.r.i0.pos=42&rs.i7.r.i3.hold=false&rs.i0.r.i3.pos=0&rs.i4.r.i0.syms=SYM7%2CSYM4%2CSYM7&rs.i8.r.i1.pos=0&rs.i5.r.i3.pos=87&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i12.line=2%2C1%2C2%2C1%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&wild.w0.expand.position.row=2&rs.i4.r.i2.pos=0&rs.i0.r.i2.syms=SYM8%2CSYM8%2CSYM4&rs.i8.r.i1.hold=false&rs.i9.r.i2.pos=0&game.win.amount=6.85&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&rs.i5.r.i2.hold=false&denomination.all=1%2C2%2C5%2C10%2C20%2C50&rs.i2.r.i0.pos=20&current.rs.i0=freespinlevel0respin&ws.i0.reelset=freespinlevel0&rs.i7.r.i2.pos=91&bl.i1.id=1&rs.i3.r.i2.syms=SYM10%2CSYM10%2CSYM5&rs.i1.r.i4.pos=10&rs.i8.id=freespinlevel3&denomination.standard=5&rs.i3.id=freespinlevel1&multiplier=1&bl.i14.id=14&wild.w0.expand.position.reel=1&bl.i19.line=0%2C2%2C2%2C2%2C0&freespins.denomination=5.000&bl.i12.reelset=ALL&bl.i2.coins=1&bl.i6.id=6&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&freespins.totalwin.coins=137&ws.i0.direction=left_to_right&freespins.total=10&gamestate.stack=basic%2Cfreespin&rs.i6.r.i2.pos=0&rs.i1.r.i4.syms=SYM9%2CSYM9%2CSYM5&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i5.r.i2.syms=SYM10%2CSYM7%2CSYM4&rs.i5.r.i3.hold=false&bet.betlevel=1&rs.i2.r.i3.overlay.i0.pos=63&rs.i4.r.i2.hold=false&bl.i5.reelset=ALL&rs.i4.r.i1.syms=SYM7%2CSYM7%2CSYM3&bl.i19.coins=1&bl.i7.id=7&bl.i18.reelset=ALL&rs.i2.r.i4.pos=2&rs.i3.r.i0.syms=SYM7%2CSYM4%2CSYM7&rs.i8.r.i4.pos=0&playercurrencyiso=' + slotSettings.slotCurrency + '&bl.i1.coins=1&rs.i2.r.i3.overlay.i0.row=1&rs.i4.r.i1.hold=false&rs.i3.r.i2.pos=0&bl.i14.line=1%2C1%2C2%2C1%2C1&freespins.multiplier=1&playforfun=false&rs.i8.r.i0.hold=false&jackpotcurrencyiso=' + slotSettings.slotCurrency + '&rs.i0.r.i4.syms=SYM6%2CSYM10%2CSYM9&rs.i0.r.i2.pos=0&bl.i13.line=1%2C1%2C0%2C1%2C1&rs.i6.r.i3.pos=0&ws.i1.betline=13&rs.i1.r.i0.pos=10&rs.i6.r.i3.hold=false&bl.i0.coins=1&rs.i2.r.i0.syms=SYM7%2CSYM7%2CSYM8&bl.i2.reelset=ALL&rs.i3.r.i1.syms=SYM3%2CSYM9%2CSYM9&rs.i1.r.i4.hold=false&freespins.left=6&rs.i9.r.i3.pos=0&rs.i4.r.i1.pos=0&rs.i4.r.i2.syms=SYM8%2CSYM8%2CSYM4&bl.standard=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i5.r.i3.syms=SYM3%2CSYM9%2CSYM9&rs.i3.r.i0.hold=false&rs.i9.r.i1.syms=SYM3%2CSYM9%2CSYM9&rs.i6.r.i4.syms=SYM6%2CSYM10%2CSYM4&rs.i8.r.i0.syms=SYM7%2CSYM4%2CSYM7&rs.i8.r.i0.pos=0&bl.i15.reelset=ALL&rs.i0.r.i3.hold=false&bet.denomination=5&rs.i5.r.i4.pos=4&rs.i9.id=freespinlevel2&rs.i4.id=freespinlevel3respin&rs.i7.r.i2.syms=SYM9%2CSYM4%2CSYM10&rs.i2.r.i1.hold=false&gameServerVersion=1.5.0&g4mode=false&bl.i11.line=0%2C1%2C0%2C1%2C0&freespins.win.coins=8&historybutton=false&bl.i5.id=5&gameEventSetters.enabled=false&next.rs=freespinlevel0respin&rs.i1.r.i3.pos=2&rs.i0.r.i1.syms=SYM7%2CSYM7%2CSYM3&bl.i3.coins=1&ws.i1.types.i0.coins=4&bl.i10.coins=1&bl.i18.id=18&rs.i2.r.i1.pos=12&rs.i7.r.i4.hold=false&rs.i4.r.i4.pos=0&rs.i8.r.i2.hold=false&ws.i0.betline=4&rs.i1.r.i3.hold=false&rs.i7.r.i1.pos=123&totalwin.coins=137&rs.i5.r.i4.syms=SYM6%2CSYM6%2CSYM9&rs.i9.r.i4.pos=0&bl.i5.line=0%2C0%2C1%2C0%2C0&gamestate.current=freespin&rs.i4.r.i0.pos=0&jackpotcurrency=%26%23x20AC%3B&bl.i7.line=1%2C2%2C2%2C2%2C1&rs.i8.r.i2.syms=SYM10%2CSYM10%2CSYM5&rs.i9.r.i0.hold=false&bet.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i3.r.i1.hold=false&rs.i9.r.i0.syms=SYM7%2CSYM4%2CSYM7&rs.i7.r.i4.syms=SYM0%2CSYM9%2CSYM7&rs.i0.r.i3.syms=SYM5%2CSYM4%2CSYM8&rs.i1.r.i1.syms=SYM7%2CSYM7%2CSYM6&bl.i16.coins=1&rs.i5.r.i1.overlay.i0.pos=22&freespins.win.cents=40&bl.i9.coins=1&bl.i7.reelset=ALL&isJackpotWin=false&rs.i6.r.i4.hold=false&rs.i2.r.i3.hold=false&wild.w0.expand.type=NONE&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&rs.i0.r.i1.pos=0&rs.i4.r.i4.syms=SYM6%2CSYM10%2CSYM9&rs.i1.r.i3.syms=SYM7%2CSYM6%2CSYM8&bl.i13.id=13&rs.i0.r.i1.hold=false&rs.i2.r.i1.syms=SYM10%2CSYM4%2CSYM10&ws.i1.types.i0.wintype=coins&rs.i9.r.i2.syms=SYM10%2CSYM10%2CSYM5&bl.i9.line=1%2C0%2C1%2C0%2C1&rs.i8.r.i4.syms=SYM6%2CSYM9%2CSYM9&rs.i9.r.i0.pos=0&rs.i8.r.i3.pos=0&ws.i1.sym=SYM10&betlevel.standard=1&bl.i10.reelset=ALL&ws.i1.types.i0.cents=20&rs.i6.r.i2.syms=SYM8%2CSYM6%2CSYM4&rs.i7.r.i0.syms=SYM5%2CSYM7%2CSYM0&gameover=false&rs.i3.r.i3.pos=0&rs.i5.id=freespinlevel0&rs.i7.r.i0.hold=false&rs.i6.r.i4.pos=0&bl.i11.coins=1&rs.i5.r.i1.hold=false&ws.i1.direction=left_to_right&rs.i5.r.i4.hold=false&rs.i6.r.i2.hold=false&bl.i13.reelset=ALL&bl.i0.id=0&rs.i9.r.i2.hold=false&nextaction=respin&bl.i15.line=0%2C1%2C1%2C1%2C0&bl.i3.line=0%2C1%2C2%2C1%2C0&bl.i19.id=19&bl.i4.reelset=ALL&rs.i7.r.i1.attention.i0=0&bl.i4.coins=1&bl.i18.line=2%2C0%2C2%2C0%2C2&rs.i8.r.i4.hold=false&freespins.totalwin.cents=685&bl.i9.id=9&bl.i17.line=0%2C2%2C0%2C2%2C0&bl.i11.id=11&freespins.betlevel=1&ws.i0.pos.i2=2%2C0&rs.i4.r.i3.pos=0&playercurrency=%26%23x20AC%3B&bl.i9.reelset=ALL&rs.i4.r.i4.hold=false&bl.i17.coins=1&ws.i1.pos.i0=1%2C1&ws.i1.pos.i1=0%2C1&ws.i1.pos.i2=2%2C0&ws.i0.pos.i1=0%2C2&rs.i5.r.i0.syms=SYM9%2CSYM10%2CSYM10&bl.i19.reelset=ALL&ws.i0.pos.i0=1%2C1&rs.i2.r.i4.syms=SYM4%2CSYM8%2CSYM8&rs.i7.r.i4.pos=41&rs.i4.r.i3.hold=false&rs.i6.r.i0.hold=false&bl.i11.reelset=ALL&bl.i16.line=2%2C1%2C1%2C1%2C2&rs.i0.id=freespinlevel2respin&credit=494540&ws.i0.types.i0.coins=4&rs.i9.r.i3.syms=SYM6%2CSYM7%2CSYM7&bl.i1.reelset=ALL&rs.i2.r.i2.pos=20&last.rs=freespinlevel0&rs.i5.r.i1.overlay.i0.row=2&rs.i5.r.i1.pos=20&bl.i1.line=0%2C0%2C0%2C0%2C0&ws.i0.sym=SYM10&rs.i6.r.i0.syms=SYM7%2CSYM4%2CSYM7&rs.i6.r.i1.hold=false&bl.i17.id=17&rs.i2.r.i2.syms=SYM4%2CSYM6%2CSYM7&rs.i1.r.i2.pos=19&bl.i16.reelset=ALL&rs.i3.r.i3.syms=SYM6%2CSYM7%2CSYM7&ws.i0.types.i0.wintype=coins&rs.i3.r.i4.hold=false&rs.i5.r.i0.hold=false&nearwinallowed=true&collectablesWon=2&rs.i9.r.i1.pos=0&bl.i8.line=1%2C0%2C0%2C0%2C1&rs.i7.r.i2.hold=false&rs.i6.r.i1.syms=SYM5%2CSYM9%2CSYM9&freespins.wavecount=1&rs.i3.r.i3.hold=false&rs.i6.r.i0.pos=0&bl.i8.coins=1&bl.i15.coins=1&bl.i2.line=2%2C2%2C2%2C2%2C2&rs.i1.r.i2.syms=SYM8%2CSYM4%2CSYM3&rs.i7.nearwin=4%2C2%2C3&rs.i9.r.i4.hold=false&rs.i6.id=freespinlevel1respin&totalwin.cents=685&rs.i7.r.i1.hold=false&rs.i5.r.i2.pos=98&rs.i0.r.i0.hold=false&rs.i2.r.i3.syms=SYM9%2CSYM9%2CSYM5&rs.i8.r.i2.pos=0&restore=true&rs.i1.id=basicrespin&rs.i3.r.i4.syms=SYM6%2CSYM9%2CSYM9&bl.i12.id=12&bl.i4.id=4&rs.i0.r.i4.pos=0&bl.i7.coins=1&ws.i0.types.i0.cents=20&bl.i6.reelset=ALL&rs.i3.r.i0.pos=0&rs.i2.r.i2.hold=false&rs.i7.r.i0.attention.i0=2&wavecount=1&rs.i9.r.i4.syms=SYM6%2CSYM9%2CSYM9&bl.i14.coins=1&rs.i8.r.i3.syms=SYM6%2CSYM7%2CSYM7&rs.i1.r.i1.hold=false&rs.i7.r.i4.attention.i0=0' + freeState;
                        }
                        result_tmp[] = 'rs.i1.r.i0.syms=SYM1%2CSYM1%2CSYM1&bl.i6.coins=1&rs.i8.r.i3.hold=false&bl.i17.reelset=ALL&bl.i15.id=15&rs.i0.r.i4.hold=false&rs.i9.r.i1.hold=false&rs.i1.r.i2.hold=false&rs.i8.r.i1.syms=SYM3%2CSYM9%2CSYM9&game.win.cents=0&rs.i7.r.i3.syms=SYM7%2CSYM6%2CSYM8&staticsharedurl=https%3A%2F%2Fstatic-shared.casinomodule.com%2Fgameclient_html%2Fdevicedetection%2Fcurrent&bl.i10.line=1%2C2%2C1%2C2%2C1&bl.i0.reelset=ALL&bl.i18.coins=1&bl.i10.id=10&bl.i3.reelset=ALL&bl.i4.line=2%2C1%2C0%2C1%2C2&bl.i13.coins=1&rs.i2.r.i0.hold=false&rs.i0.r.i0.syms=SYM7%2CSYM4%2CSYM7&rs.i9.r.i3.hold=false&bl.i2.id=2&rs.i1.r.i1.pos=1&rs.i7.r.i1.syms=SYM7%2CSYM7%2CSYM6&rs.i3.r.i4.pos=0&rs.i6.r.i3.syms=SYM5%2CSYM4%2CSYM8&rs.i0.r.i0.pos=0&bl.i14.reelset=ALL&rs.i2.r.i3.pos=0&rs.i5.r.i0.pos=0&rs.i7.id=basic&rs.i7.r.i3.pos=2&rs.i2.r.i4.hold=false&rs.i3.r.i1.pos=0&rs.i2.id=freespinlevel1&rs.i6.r.i1.pos=0&game.win.coins=0&rs.i1.r.i0.hold=false&bl.i3.id=3&bl.i12.coins=1&bl.i8.reelset=ALL&clientaction=init&rs.i4.r.i0.hold=false&rs.i0.r.i2.hold=false&rs.i4.r.i3.syms=SYM5%2CSYM4%2CSYM8&bl.i16.id=16&casinoID=netent&bl.i5.coins=1&rs.i3.r.i2.hold=false&bl.i8.id=8&rs.i5.r.i1.syms=SYM3%2CSYM9%2CSYM9&rs.i7.r.i0.pos=10&rs.i7.r.i3.hold=false&rs.i0.r.i3.pos=0&rs.i4.r.i0.syms=SYM7%2CSYM4%2CSYM7&rs.i8.r.i1.pos=0&rs.i5.r.i3.pos=0&bl.i6.line=2%2C2%2C1%2C2%2C2&bl.i12.line=2%2C1%2C2%2C1%2C2&bl.i0.line=1%2C1%2C1%2C1%2C1&rs.i4.r.i2.pos=0&rs.i0.r.i2.syms=SYM8%2CSYM8%2CSYM4&rs.i8.r.i1.hold=false&rs.i9.r.i2.pos=0&game.win.amount=0&betlevel.all=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&rs.i5.r.i2.hold=false&denomination.all=' + implode('%2C', slotSettings.Denominations) + '&rs.i2.r.i0.pos=0&current.rs.i0=basic&rs.i7.r.i2.pos=19&bl.i1.id=1&rs.i3.r.i2.syms=SYM8%2CSYM8%2CSYM4&rs.i1.r.i4.pos=10&rs.i8.id=freespinlevel3&denomination.standard=' + (slotSettings.CurrentDenomination * 100) + '&rs.i3.id=freespinlevel0respin&multiplier=1&bl.i14.id=14&bl.i19.line=0%2C2%2C2%2C2%2C0&bl.i12.reelset=ALL&bl.i2.coins=1&bl.i6.id=6&autoplay=10%2C25%2C50%2C75%2C100%2C250%2C500%2C750%2C1000&rs.i6.r.i2.pos=0&rs.i1.r.i4.syms=SYM9%2CSYM9%2CSYM5&gamesoundurl=https%3A%2F%2Fstatic.casinomodule.com%2F&rs.i5.r.i2.syms=SYM10%2CSYM10%2CSYM5&rs.i5.r.i3.hold=false&rs.i4.r.i2.hold=false&bl.i5.reelset=ALL&rs.i4.r.i1.syms=SYM7%2CSYM7%2CSYM3&bl.i19.coins=1&bl.i7.id=7&bl.i18.reelset=ALL&rs.i2.r.i4.pos=0&rs.i3.r.i0.syms=SYM4%2CSYM7%2CSYM7&rs.i8.r.i4.pos=0&playercurrencyiso=' + slotSettings.slotCurrency + '&bl.i1.coins=1&rs.i4.r.i1.hold=false&rs.i3.r.i2.pos=0&bl.i


                            case 'spin':
                                  var freeState = '';
                        var curReels = '';
                                let linesId: number[][] = [];
                                linesId[0] = [2, 2, 2, 2, 2];
                                linesId[1] = [1, 1, 1, 1, 1];
                                linesId[2] = [3, 3, 3, 3, 3];
                                linesId[3] = [1, 2, 3, 2, 1];
                                linesId[4] = [3, 2, 1, 2, 3];
                                linesId[5] = [1, 1, 2, 1, 1];
                                linesId[6] = [3, 3, 2, 3, 3];
                                linesId[7] = [2, 3, 3, 3, 2];
                                linesId[8] = [2, 1, 1, 1, 2];
                                linesId[9] = [2, 1, 2, 1, 2];
                                linesId[10] = [2, 3, 2, 3, 2];
                                linesId[11] = [1, 2, 1, 2, 1];
                                linesId[12] = [3, 2, 3, 2, 3];
                                linesId[13] = [2, 2, 1, 2, 2];
                                linesId[14] = [2, 2, 3, 2, 2];
                                linesId[15] = [1, 2, 2, 2, 1];
                                linesId[16] = [3, 2, 2, 2, 3];
                                linesId[17] = [1, 3, 1, 3, 1];
                                linesId[18] = [3, 1, 3, 1, 3];
                                linesId[19] = [1, 3, 3, 3, 1];
                                const lines = 20;
                                slotSettings.CurrentDenom = postData['bet_denomination'];
                                slotSettings.CurrentDenomination = postData['bet_denomination'];
                                if (postData['slotEvent'] !== 'freespin' && postData['slotEvent'] !== 'respin') {
                                    const betline = postData['bet_betlevel'];
                                    const allbet = betline * lines;
                                    slotSettings.UpdateJackpots(allbet);
                                    if (!postData['slotEvent']) {
                                        postData['slotEvent'] = 'bet';
                                    }
                                    slotSettings.SetBalance(-1 * allbet, postData['slotEvent']);
                                    const bankSum = allbet / 100 * slotSettings.GetPercent();
                                    slotSettings.SetBank(postData['slotEvent'] || '', bankSum, postData['slotEvent']);
                                    slotSettings.UpdateJackpots(allbet);
                                    slotSettings.SetGameData('CreatureFromTheBlackLagoonNETBonusWin', 0);
                                    slotSettings.SetGameData('CreatureFromTheBlackLagoonNETFreeGames', 0);
                                    slotSettings.SetGameData('CreatureFromTheBlackLagoonNETCurrentFreeGame', 0);
                                    slotSettings.SetGameData('CreatureFromTheBlackLagoonNETTotalWin', 0);
                                    slotSettings.SetGameData('CreatureFromTheBlackLagoonNETBet', betline);
                                    slotSettings.SetGameData('CreatureFromTheBlackLagoonNETDenom', postData['bet_denomination']);
                                    slotSettings.SetGameData('CreatureFromTheBlackLagoonNETFreeBalance', parseFloat(slotSettings.GetBalance().toFixed(2)) * 100);
                                    const bonusMpl = 1;
                                } else {
                                    postData['bet_denomination'] = slotSettings.GetGameData('CreatureFromTheBlackLagoonNETDenom');
                                    slotSettings.CurrentDenom = postData['bet_denomination'];
                                    slotSettings.CurrentDenomination = postData['bet_denomination'];
                                    const betline = slotSettings.GetGameData('CreatureFromTheBlackLagoonNETBet');
                                    const allbet = betline * lines;
                                    slotSettings.SetGameData('CreatureFromTheBlackLagoonNETCurrentFreeGame', slotSettings.GetGameData('CreatureFromTheBlackLagoonNETCurrentFreeGame') + 1);
                                    const bonusMpl = slotSettings.slotFreeMpl;
                                }
                                const winTypeTmp = slotSettings.GetSpinSettings(postData['slotEvent'], allbet, lines);
                                const winType = winTypeTmp[0];
                                const spinWinLimit = winTypeTmp[1];
                                 balanceInCents = Math.round(slotSettings.GetBalance() * slotSettings.CurrentDenom * 100);
                                if (winType === 'bonus' && (postData['slotEvent'] === 'freespin' || postData['slotEvent'] === 'respin')) {
                                    winType = 'win';
                                }
                                const jackRandom = Math.floor(Math.random() * 500) + 1;
                                let mainSymAnim = '';
                                for (let i = 0; i <= 2000; i++) {
                                    let totalWin = 0;
                                    let lineWins: string[] = [];
                                    let cWins = Array(32).fill(0);
                                    const wild = ['1'];
                                    const scatter = '0';
                                    const reels = slotSettings.GetReelStrips(winType, postData['slotEvent']);
                                    if (postData['slotEvent'] === 'freespin' && Math.floor(Math.random() * 5) + 1 === 1 && slotSettings.GetGameData('CreatureFromTheBlackLagoonNETMonsterHealth') < 10) {
                                        reels['reel5'][Math.floor(Math.random() * 3)] = 2;
                                    }
                                    if (postData['slotEvent'] === 'respin') {
                                        const overlayWildsArrLast = slotSettings.GetGameData('CreatureFromTheBlackLagoonNEToverlayWildsArr');
                                        for (const wsp of overlayWildsArrLast) {
                                            reels['reel' + wsp[0]][wsp[1]] = 1;
                                        }
                                    }
                                    let winLineCount = 0;
                                    for (let k = 0; k < lines; k++) {
                                        let tmpStringWin = '';
                                        for (let j = 0; j < slotSettings.SymbolGame.length; j++) {
                                            const csym = slotSettings.SymbolGame[j].toString();
                                            if (csym === scatter || !slotSettings.Paytable['SYM_' + csym]) {
                                                continue;
                                            } else {
                                                let s: string[] = [];
                                                s[0] = reels['reel1'][linesId[k][0] - 1];
                                                s[1] = reels['reel2'][linesId[k][1] - 1];
                                                s[2] = reels['reel3'][linesId[k][2] - 1];
                                                s[3] = reels['reel4'][linesId[k][3] - 1];
                                                s[4] = reels['reel5'][linesId[k][4] - 1];
                                                if ((s[0] === csym || wild.includes(s[0])) && (s[1] === csym || wild.includes(s[1])) && (s[2] === csym || wild.includes(s[2]))) {
                                                    let mpl = 1;
                                                    if (wild.includes(s[0]) && wild.includes(s[1]) && wild.includes(s[2])) {
                                                        mpl = 1;
                                                    } else if (wild.includes(s[0]) || wild.includes(s[1]) || wild.includes(s[2])) {
                                                        mpl = slotSettings.slotWildMpl;
                                                    }
                                                    let tmpWin = slotSettings.Paytable['SYM_' + csym][3] * betline * mpl * bonusMpl;
                                                    if (cWins[k] < tmpWin) {
                                                        cWins[k] = tmpWin;
                                                        tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${tmpWin}&ws.i${winLineCount}.pos.i0=0%2C${linesId[k][0] - 1}&ws.i${winLineCount}.pos.i1=1%2C${linesId[k][1] - 1}&ws.i${winLineCount}.pos.i2=2%2C${linesId[k][2] - 1}&ws.i${winLineCount}.types.i0.wintype=coins&ws.i${winLineCount}.betline=${k}&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${tmpWin * slotSettings.CurrentDenomination * 100}`;
                                                        mainSymAnim = csym;
                                                    }
                                                }
                                                if ((s[0] === csym || wild.includes(s[0])) && (s[1] === csym || wild.includes(s[1])) && (s[2] === csym || wild.includes(s[2])) && (s[3] === csym || wild.includes(s[3]))) {
                                                    let mpl = 1;
                                                    if (wild.includes(s[0]) && wild.includes(s[1]) && wild.includes(s[2]) && wild.includes(s[3])) {
                                                        mpl = 1;
                                                    } else if (wild.includes(s[0]) || wild.includes(s[1]) || wild.includes(s[2]) || wild.includes(s[3])) {
                                                        mpl = slotSettings.slotWildMpl;
                                                    }
                                                    let tmpWin = slotSettings.Paytable['SYM_' + csym][4] * betline * mpl * bonusMpl;
                                                    if (cWins[k] < tmpWin) {
                                                        cWins[k] = tmpWin;
                                                        tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${tmpWin}&ws.i${winLineCount}.pos.i0=0%2C${linesId[k][0] - 1}&ws.i${winLineCount}.pos.i1=1%2C${linesId[k][1] - 1}&ws.i${winLineCount}.pos.i2=2%2C${linesId[k][2] - 1}&ws.i${winLineCount}.pos.i3=3%2C${linesId[k][3] - 1}&ws.i${winLineCount}.types.i0.wintype=coins&ws.i${winLineCount}.betline=${k}&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${tmpWin * slotSettings.CurrentDenomination * 100}`;
                                                        mainSymAnim = csym;
                                                    }
                                                }
                                                if ((s[0] === csym || wild.includes(s[0])) && (s[1] === csym || wild.includes(s[1])) && (s[2] === csym || wild.includes(s[2])) && (s[3] === csym || wild.includes(s[3])) && (s[4] === csym || wild.includes(s[4]))) {
                                                    let mpl = 1;
                                                    if (wild.includes(s[0]) && wild.includes(s[1]) && wild.includes(s[2]) && wild.includes(s[3]) && wild.includes(s[4])) {
                                                        mpl = 1;
                                                    } else if (wild.includes(s[0]) || wild.includes(s[1]) || wild.includes(s[2]) || wild.includes(s[3]) || wild.includes(s[4])) {
                                                        mpl = slotSettings.slotWildMpl;
                                                    }
                                                    let tmpWin = slotSettings.Paytable['SYM_' + csym][5] * betline * mpl * bonusMpl;
                                                    if (cWins[k] < tmpWin) {
                                                        cWins[k] = tmpWin;
                                                        tmpStringWin = `&ws.i${winLineCount}.reelset=basic&ws.i${winLineCount}.types.i0.coins=${tmpWin}&ws.i${winLineCount}.pos.i0=0%2C${linesId[k][0] - 1}&ws.i${winLineCount}.pos.i1=1%2C${linesId[k][1] - 1}&ws.i${winLineCount}.pos.i2=2%2C${linesId[k][2] - 1}&ws.i${winLineCount}.pos.i3=3%2C${linesId[k][3] - 1}&ws.i${winLineCount}.pos.i4=4%2C${linesId[k][4] - 1}&ws.i${winLineCount}.types.i0.wintype=coins&ws.i${winLineCount}.betline=${k}&ws.i${winLineCount}.sym=SYM${csym}&ws.i${winLineCount}.direction=left_to_right&ws.i${winLineCount}.types.i0.cents=${tmpWin * slotSettings.CurrentDenomination * 100}`;
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
                                    let scattersWin = 0;
                                    let scattersStr = '';
                                    let scattersCount = 0;
                                    let wildsRespinCount = 0;
                                    let overlayWilds: string[] = [];
                                    let overlayWildsArr: number[][] = [];
                                    let scPos: string[] = [];
                                    let isMonsterShoot = false;
                                    for (let r = 1; r <= 5; r++) {
                                        for (let p = 0; p <= 2; p++) {
                                            if (reels['reel' + r][p] === scatter) {
                                                scattersCount++;
                                                scPos.push(`&ws.i0.pos.i${r - 1}=${r - 1}%2C${p}`);
                                            }
                                            if (reels['reel' + r][p] === '1' && postData['slotEvent'] !== 'respin') {
                                                wildsRespinCount++;
                                                overlayWilds = ['&rs.i0.r.i' + (r - 1) + '.overlay.i0.row=' + p + '&rs.i0.r.i' + (r - 1) + '.overlay.i0.with=SYM1&rs.i0.r.i' + (r - 1) + '.overlay.i0.pos=132'];
                                                overlayWildsArr.push([r, p]);
                                            }
                                            if (reels['reel' + r][p] === '2') {
                                                isMonsterShoot = true;
                                            }
                                        }
                                    }
                                    if (scattersCount >= 3) {
                                        scattersStr = `&ws.i0.types.i0.freespins=${slotSettings.slotFreeCount[scattersCount]}&ws.i0.reelset=basic&ws.i0.betline=null&ws.i0.types.i0.wintype=freespins&ws.i0.direction=none${scPos.join('')}`;
                                    }
                                    totalWin += scattersWin;
                                    if (i > 1000) {
                                        winType = 'none';
                                    }
                                    if (i > 1500) {
                                        const response = JSON.stringify({
                                            responseEvent: "error",
                                            responseType: postData['slotEvent'],
                                            serverResponse: "Bad Reel Strip"
                                        });
                                        throw new Error(response);
                                    }
                                    if (slotSettings.MaxWin < (totalWin * slotSettings.CurrentDenom)) {
                                        // Handle max win condition
                                    } else {
                                        const minWin = slotSettings.GetRandomPay();
                                        if (i > 700) {
                                            minWin = 0;
                                        }
                                        if (slotSettings.increaseRTP && winType === 'win' && totalWin < (minWin * allbet)) {
                                            // Handle RTP increase condition
                                        } else if (wildsRespinCount >= 1 && (postData['slotEvent'] === 'freespin' || winType === 'bonus')) {
                                            // Handle wilds respin condition
                                        } else if (scattersCount >= 3 && winType !== 'bonus') {
                                            // Handle scatters condition
                                        } else if (totalWin <= spinWinLimit && winType === 'bonus') {
                                            const cBank = slotSettings.GetBank(postData['slotEvent'] || '');
                                            if (cBank < spinWinLimit) {
                                                spinWinLimit = cBank;
                                            } else {
                                                break;
                                            }
                                        } else if (totalWin > 0 && totalWin <= spinWinLimit && winType === 'win') {
                                            const cBank = slotSettings.GetBank(postData['slotEvent'] || '');
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
                                let freeState = '';
                                if (totalWin > 0) {
                                    slotSettings.SetBank(postData['slotEvent'] || '', -1 * totalWin);
                                    slotSettings.SetBalance(totalWin);
                                }
                                const reportWin = totalWin;
                                let curReels = `&rs.i0.r.i0.syms=SYM${reels['reel1'][0]}%2CSYM${reels['reel1'][1]}%2CSYM${reels['reel1'][2]}`;
                                curReels += `&rs.i0.r.i1.syms=SYM${reels['reel2'][0]}%2CSYM${reels['reel2'][1]}%2CSYM${reels['reel2'][2]}`;
                                curReels += `&rs.i0.r.i2.syms=SYM${reels['reel3'][0]}%2CSYM${reels['reel3'][1]}%2CSYM${reels['reel3'][2]}`;
                                curReels += `&rs.i0.r.i3.syms=SYM${reels['reel4'][0]}%2CSYM${reels['reel4'][1]}%2CSYM${reels['reel4'][2]}`;
                                curReels += `&rs.i0.r.i4.syms=SYM${reels['reel5'][0]}%2CSYM${reels['reel5'][1]}%2CSYM${reels['reel5'][2]}`;
                                if (postData['slotEvent'] === 'freespin' || postData['slotEvent'] === 'respin') {
                                    slotSettings.SetGameData('CreatureFromTheBlackLagoonNETBonusWin', slotSettings.GetGameData('CreatureFromTheBlackLagoonNETBonusWin') + totalWin);
                                    slotSettings.SetGameData('CreatureFromTheBlackLagoonNETTotalWin', slotSettings.GetGameData('CreatureFromTheBlackLagoonNETTotalWin') + totalWin);
                                    let monsterState = `previous.rs.i0=${FreeLevel0}&current.rs.i0=${FreeLevel0}&next.rs=${FreeLevel0}&rs.i0.id=${FreeLevel0}&last.rs=${FreeLevel0}&collectablesWon=${MonsterHealth}`;
                                    let freeState = `&freespins.betlines=0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19&freespins.totalwin.cents=0&nextaction=${nextaction}&freespins.left=${fsl}&freespins.wavecount=1&freespins.multiplier=1&gamestate.stack=${stack}&freespins.totalwin.coins=${totalWin}&freespins.total=${fs}&freespins.win.cents=${(totalWin / slotSettings.CurrentDenomination * 100)}&gamestate.current=${gamestate}&freespins.initial=${fs}&freespins.win.coins=${totalWin}&freespins.betlevel=${slotSettings.GetGameData('CreatureFromTheBlackLagoonNETBet')}&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${(totalWin * slotSettings.CurrentDenomination * 100)}&game.win.amount=${(totalWin / slotSettings.CurrentDenomination)}${monsterState}`;
                                    curReels += freeState;
                                }
                                let response = `{"responseEvent":"spin","responseType":"${postData['slotEvent']}","serverResponse":{"FreeLevel":${slotSettings.GetGameData('CreatureFromTheBlackLagoonNETFreeLevel')},"MonsterHealth":${slotSettings.GetGameData('CreatureFromTheBlackLagoonNETMonsterHealth')},"freeState":"${freeState}","slotLines":${lines},"slotBet":${betline},"totalFreeGames":${slotSettings.GetGameData('CreatureFromTheBlackLagoonNETFreeGames')},"currentFreeGames":${slotSettings.GetGameData('CreatureFromTheBlackLagoonNETCurrentFreeGame')},"Balance":${balanceInCents},"afterBalance":${balanceInCents},"bonusWin":${slotSettings.GetGameData('CreatureFromTheBlackLagoonNETBonusWin')},"totalWin":${totalWin},"winLines":[],"Jackpots":${jsJack},"reelsSymbols":${jsSpin}}}`;
                                if (postData['slotEvent'] == 'respin') {
                                    postData['slotEvent'] = 'BG2';
                                }
                                slotSettings.SaveLogReport(response, allbet, lines, reportWin, postData['slotEvent']);
                                balanceInCents = Math.round(slotSettings.GetBalance() * slotSettings.CurrentDenom * 100);
                                result_tmp.push(`previous.rs.i0=basic&rs.i0.r.i1.pos=15&gameServerVersion=1.5.0&g4mode=false&game.win.coins=${totalWin}&playercurrencyiso=${slotSettings.slotCurrency}&historybutton=false&rs.i0.r.i1.hold=false&current.rs.i0=basic&rs.i0.r.i4.hold=false&next.rs=basic&gamestate.history=basic&playforfun=false&jackpotcurrencyiso=${slotSettings.slotCurrency}&clientaction=spin&rs.i0.r.i1.syms=SYM9%2CSYM7%2CSYM5&rs.i0.r.i2.hold=false&rs.i0.r.i4.syms=SYM0%2CSYM3%2CSYM8&game.win.cents=${(totalWin * slotSettings.CurrentDenomination * 100)}&rs.i0.r.i2.pos=80&rs.i0.id=basic&totalwin.coins=${totalWin}&credit=${balanceInCents}&totalwin.cents=${(totalWin * slotSettings.CurrentDenomination * 100)}&gamestate.current=basic&gameover=true&rs.i0.r.i0.hold=false&jackpotcurrency=%26%23x20AC%3B&multiplier=1&rs.i0.r.i3.pos=119&last.rs=basic&rs.i0.r.i4.pos=53&rs.i0.r.i0.syms=SYM10%2CSYM9%2CSYM5&rs.i0.r.i3.syms=SYM7%2CSYM10%2CSYM7&isJackpotWin=false&gamestate.stack=basic&nextaction=spin&rs.i0.r.i0.pos=114&wavecount=1&gamesoundurl=&rs.i0.r.i2.syms=SYM3%2CSYM8%2CSYM7&rs.i0.r.i3.hold=false&game.win.amount=${(totalWin / slotSettings.CurrentDenomination)}${curReels}${winString}&rs.i0.r.i3.attention.i0=1&rs.i0.r.i0.attention.i0=2&rs.i0.r.i2.attention.i0=1${attStr}`);
                                break;
                            }
                        }
                }
// function rand(arg0: number, arg1: number) {
//     throw new Error("Function not implemented.");
// }

function exit(response: string) {
    throw new Error("Function not implemented.");
}

// function round(arg0: number) {
//     throw new Error("Function not implemented.");
// }

// function count(Denominations: any) {
//     throw new Error("Function not implemented.");
// }

// function implode(arg0: string, Denominations: any) {
//     throw new Error("Function not implemented.");
// }

