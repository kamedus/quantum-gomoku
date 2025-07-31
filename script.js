const boardElement = document.getElementById('board');
const currentTurnDisplay = document.getElementById('currentTurn');
const resetButton = document.getElementById('resetButton');
const gameOverOverlay = document.querySelector('.game-over-overlay');
const gameOverMessage = document.getElementById('gameOverMessage');
const restartButton = document.getElementById('restartButton');
const observeButton = document.getElementById('observeButton'); // 観測ボタンを追加

const BOARD_SIZE = 11; // 11x11の交点を持つ盤面
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

// 石の確率定義
const STONE_TYPES = {
    BLACK_90: { value: 90, color: BLACK }, // 先手
    BLACK_70: { value: 70, color: BLACK }, // 先手
    WHITE_10: { value: 10, color: WHITE }, // 後手
    WHITE_30: { value: 30, color: WHITE }  // 後手
};

let board = [];
let currentTurn;
let gameOver;
let CELL_SIZE; // Make CELL_SIZE dynamic
let turnCount; // 手番を数える
let lastPlacedStone = null; // 最後に置かれた石の座標と種類を保存
let isObservedState = false; // 観測状態かどうか
let originalBoardState = []; // 観測前の盤面状態を保存

// --- ゲーム初期化 --- //
function initGame() {
    board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(EMPTY));
    gameOver = false;
    gameOverOverlay.classList.add('hidden');
    resetButton.classList.remove('hidden');
    observeButton.classList.remove('hidden'); // 観測ボタンは常に表示
    observeButton.textContent = '観測'; // ボタンのテキストを初期化
    currentTurn = BLACK; // 黒から開始
    turnCount = 0; // 手番をリセット
    updateTurnDisplay();
    isObservedState = false;
    originalBoardState = [];

    // Calculate CELL_SIZE dynamically based on the smaller of viewport width or height
    // This ensures the board always fits within the screen
    const h1 = document.querySelector('h1');
    const statusArea = document.querySelector('.status-area');
    const controls = document.querySelector('.controls');

    const h1Height = h1 ? h1.offsetHeight : 0;
    const statusAreaHeight = statusArea ? statusArea.offsetHeight : 0;
    const controlsHeight = controls ? controls.offsetHeight : 0;

    const fixedVerticalSpace = h1Height + statusAreaHeight + controlsHeight + (20 * 2); // 20px padding top/bottom
    const fixedHorizontalSpace = 20 * 2; // 20px padding left/right

    const availableWidthForBoard = window.innerWidth - fixedHorizontalSpace;
    const availableHeightForBoard = window.innerHeight - fixedVerticalSpace;

    CELL_SIZE = Math.floor(Math.min(availableWidthForBoard / (BOARD_SIZE - 1), availableHeightForBoard / (BOARD_SIZE - 1)));
    CELL_SIZE = Math.max(CELL_SIZE, 20); // Minimum 20px per cell

    // Scale down the board to 2/3 of the calculated size
    CELL_SIZE = Math.floor(CELL_SIZE * (2/3));

    document.documentElement.style.setProperty('--board-size', BOARD_SIZE);
    document.documentElement.style.setProperty('--cell-size', `${CELL_SIZE}px`);

    boardElement.style.width = `${(BOARD_SIZE - 1) * CELL_SIZE}px`;
    boardElement.style.height = `${(BOARD_SIZE - 1) * CELL_SIZE}px`;

    renderBoard();
}

// --- 盤面描画 --- //
function renderBoard() {
    boardElement.innerHTML = '';
    boardElement.removeEventListener('click', handleBoardClick); 
    boardElement.addEventListener('click', handleBoardClick);

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] !== EMPTY) {
                const stone = document.createElement('div');
                stone.classList.add('stone');
                // 観測状態であれば確定した色を、そうでなければ確率石を表示
                if (isObservedState) {
                    stone.classList.add('observed', board[r][c] === BLACK ? 'black-final' : 'white-final');
                } else {
                    // 確率石のクラスを追加
                    const stoneType = board[r][c]; // board[r][c]にはSTONE_TYPESの値が入る
                    if (stoneType === STONE_TYPES.BLACK_90) stone.classList.add('p90');
                    else if (stoneType === STONE_TYPES.BLACK_70) stone.classList.add('p70');
                    else if (stoneType === STONE_TYPES.WHITE_10) stone.classList.add('p10');
                    else if (stoneType === STONE_TYPES.WHITE_30) stone.classList.add('p30');
                }
                
                stone.style.left = `${c * CELL_SIZE}px`;
                stone.style.top = `${r * CELL_SIZE}px`;
                boardElement.appendChild(stone);
            }
        }
    }
    // 観測状態であれば盤面の色を変更
    if (isObservedState) {
        boardElement.classList.add('observed');
    } else {
        boardElement.classList.remove('observed');
    }
}

// --- 石を置く処理 --- //
function handleBoardClick(event) {
    if (gameOver || currentTurn === undefined || isObservedState) return; // ゲーム終了後、手番未設定時、観測状態では何もしない

    const rect = boardElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const col = Math.round(clickX / CELL_SIZE);
    const row = Math.round(clickY / CELL_SIZE);

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && board[row][col] === EMPTY) {
        // 観測前の盤面状態を保存
        originalBoardState = JSON.parse(JSON.stringify(board));

        let stoneType;
        const playerMoveCount = Math.floor(turnCount / 2); // 各プレイヤーの何手目か

        if (currentTurn === BLACK) {
            stoneType = (playerMoveCount % 2 === 0) ? STONE_TYPES.BLACK_90 : STONE_TYPES.BLACK_70;
        } else { // currentTurn === WHITE
            stoneType = (playerMoveCount % 2 === 0) ? STONE_TYPES.WHITE_10 : STONE_TYPES.WHITE_30;
        }
        
        board[row][col] = stoneType; // 盤面に石の種類を記録
        lastPlacedStone = { row, col, type: stoneType }; // 最後に置かれた石を保存

        turnCount++;
        currentTurn = (currentTurn === BLACK) ? WHITE : BLACK; // ターンを交代
        updateTurnDisplay();
        renderBoard(); // 石を置いた後、盤面を再描画
    }
}

function placeStone(row, col, color) {
    // この関数は観測時に確定した石を置くために使用
    board[row][col] = color;
    renderBoard();
}

// --- 観測処理 --- //
function observeBoard() {
    if (gameOver || isObservedState) return; // ゲーム終了後または既に観測状態なら何もしない

    // 観測前の盤面状態を保存（観測ボタンを押した時点の盤面）
    originalBoardState = JSON.parse(JSON.stringify(board));

    // 全ての石を確率に基づいて確定させる
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const stoneType = board[r][c];
            if (stoneType !== EMPTY) {
                const rand = Math.random() * 100; // 0-99
                if (stoneType === STONE_TYPES.BLACK_90) {
                    board[r][c] = (rand < 90) ? BLACK : WHITE;
                } else if (stoneType === STONE_TYPES.BLACK_70) {
                    board[r][c] = (rand < 70) ? BLACK : WHITE;
                } else if (stoneType === STONE_TYPES.WHITE_10) {
                    board[r][c] = (rand < 10) ? BLACK : WHITE;
                } else if (stoneType === STONE_TYPES.WHITE_30) {
                    board[r][c] = (rand < 30) ? BLACK : WHITE;
                }
            }
        }
    }
    isObservedState = true;
    renderBoard(); // 確定した盤面を再描画
    observeButton.textContent = '戻る'; // ボタンのテキストを「戻る」に変更

    // 3秒後に勝利判定
    setTimeout(() => {
        const blackWins = checkWin(null, null, BLACK); // 黒の勝利判定
        const whiteWins = checkWin(null, null, WHITE); // 白の勝利判定

        if (blackWins && whiteWins) {
            // 観測を宣言したプレイヤーの勝利
            // 最後に石を置いたプレイヤーが観測を宣言したとみなす
            const winnerColor = (lastPlacedStone.type.color === BLACK) ? BLACK : WHITE; // 最後に置いた石の色
            endGame(winnerColor);
            // 勝利確定時は「戻る」ボタンを非表示にし、「最初へ戻る」ボタンのみ表示
            observeButton.classList.add('hidden');
        } else if (blackWins) {
            endGame(BLACK);
            observeButton.classList.add('hidden');
        } else if (whiteWins) {
            endGame(WHITE);
            observeButton.classList.add('hidden');
        } else {
            // どちらも勝利条件を満たさなかった場合
            // 何もしない（「戻る」ボタンで観測前の状態に戻る）
        }
    }, 3000);
}

// --- 観測前の状態に戻す処理 --- //
function revertToPreObservation() {
    if (!isObservedState) return; // 観測状態でないなら何もしない

    board = JSON.parse(JSON.stringify(originalBoardState)); // 観測前の盤面に戻す
    isObservedState = false;
    renderBoard(); // 観測前の盤面を再描画
    observeButton.textContent = '観測'; // ボタンのテキストを「観測」に戻す
    gameOverOverlay.classList.add('hidden'); // ゲームオーバー表示を隠す
}

// --- 勝利判定 --- //
function checkWin(row, col, color) { // row, col は使わないが引数として残す
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === color) {
                // 縦、横、斜めの4方向をチェック
                const directions = [
                    [0, 1],  // 横
                    [1, 0],  // 縦
                    [1, 1],  // 右下がり斜め
                    [1, -1]  // 右上がり斜め
                ];

                for (const [dr, dc] of directions) {
                    let count = 0;
                    for (let i = 0; i < 5; i++) {
                        const nr = r + dr * i;
                        const nc = c + dc * i;
                        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === color) {
                            count++;
                        } else {
                            break;
                        }
                    }
                    if (count >= 5) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

// --- ターン表示更新 --- //
function updateTurnDisplay() {
    currentTurnDisplay.textContent = (currentTurn === BLACK) ? '黒' : '白';
}

// --- ゲーム終了 --- //
function endGame(winnerColor) {
    gameOver = true;
    gameOverOverlay.classList.remove('hidden');
    if (winnerColor === BLACK) {
        gameOverMessage.textContent = '黒の勝利！';
    } else if (winnerColor === WHITE) {
        gameOverMessage.textContent = '白の勝利！';
    } else {
        gameOverMessage.textContent = '引き分け！'; // このケースは発生しないはずだが念のため
    }
    // 勝利確定時は「戻る」ボタンを非表示にし、「最初へ戻る」ボタンのみ表示
    observeButton.classList.add('hidden');
}

// --- イベントリスナー --- //
resetButton.addEventListener('click', initGame);

// restartButton は「最初へ戻る」ボタンとして機能
restartButton.addEventListener('click', () => {
    initGame();
});

// 観測ボタンのイベントリスナー
observeButton.addEventListener('click', () => {
    if (isObservedState) {
        revertToPreObservation();
    } else {
        observeBoard();
    }
});

// Add resize event listener to re-initialize game on window resize
window.addEventListener('resize', initGame);

// --- 初期化 --- //
initGame();