class Minesweeper {
    constructor() {
        this.difficulties = {
            easy: { rows: 9, cols: 9, mines: 10 },
            medium: { rows: 16, cols: 16, mines: 40 },
            hard: { rows: 16, cols: 30, mines: 99 }
        };
        this.currentDifficulty = 'easy';
        this.board = [];
        this.revealedCells = 0;
        this.flaggedCells = 0;
        this.gameStarted = false;
        this.gameOver = false;
        this.timer = 0;
        this.timerInterval = null;
        this.elements = {
            board: document.getElementById('game-board'),
            resetBtn: document.getElementById('reset-btn'),
            timer: document.querySelector('.timer'),
            mineCounter: document.querySelector('.mine-counter'),
            difficultyButtons: document.querySelectorAll('.difficulty-selector button')
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startNewGame();
    }

    setupEventListeners() {
        // 重新开始按钮
        this.elements.resetBtn.addEventListener('click', () => this.startNewGame());

        // 难度选择按钮
        this.elements.difficultyButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const difficulty = e.target.dataset.difficulty;
                this.changeDifficulty(difficulty);
            });
        });
    }

    changeDifficulty(difficulty) {
        this.currentDifficulty = difficulty;
        this.elements.difficultyButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.difficulty === difficulty) {
                btn.classList.add('active');
            }
        });
        this.startNewGame();
    }

    startNewGame() {
        const { rows, cols, mines } = this.difficulties[this.currentDifficulty];
        this.board = [];
        this.revealedCells = 0;
        this.flaggedCells = 0;
        this.gameStarted = false;
        this.gameOver = false;
        this.timer = 0;
        this.clearTimer();
        this.updateTimer();
        this.updateMineCounter(mines);
        this.createBoard(rows, cols, mines);
        this.renderBoard();
    }

    createBoard(rows, cols, mines) {
        // 初始化棋盘
        for (let i = 0; i < rows; i++) {
            this.board[i] = [];
            for (let j = 0; j < cols; j++) {
                this.board[i][j] = {
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    isQuestion: false,
                    adjacentMines: 0
                };
            }
        }
    }

    placeMines(firstClickRow, firstClickCol) {
        const { rows, cols, mines } = this.difficulties[this.currentDifficulty];
        let minesPlaced = 0;

        while (minesPlaced < mines) {
            const row = Math.floor(Math.random() * rows);
            const col = Math.floor(Math.random() * cols);

            // 确保不在首次点击的位置及其周围放置地雷
            if (!this.board[row][col].isMine && 
                !(Math.abs(row - firstClickRow) <= 1 && 
                  Math.abs(col - firstClickCol) <= 1)) {
                this.board[row][col].isMine = true;
                minesPlaced++;
            }
        }

        // 计算每个单元格周围的地雷数
        this.calculateAdjacentMines();
    }

    calculateAdjacentMines() {
        const { rows, cols } = this.difficulties[this.currentDifficulty];

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (!this.board[i][j].isMine) {
                    let count = 0;
                    for (let di = -1; di <= 1; di++) {
                        for (let dj = -1; dj <= 1; dj++) {
                            const ni = i + di;
                            const nj = j + dj;
                            if (ni >= 0 && ni < rows && nj >= 0 && nj < cols && this.board[ni][nj].isMine) {
                                count++;
                            }
                        }
                    }
                    this.board[i][j].adjacentMines = count;
                }
            }
        }
    }

    renderBoard() {
        const { rows, cols } = this.difficulties[this.currentDifficulty];
        this.elements.board.innerHTML = '';

        for (let i = 0; i < rows; i++) {
            const rowElement = document.createElement('div');
            rowElement.className = 'row';

            for (let j = 0; j < cols; j++) {
                const cellElement = document.createElement('div');
                cellElement.className = 'cell';
                cellElement.dataset.row = i;
                cellElement.dataset.col = j;

                // 添加点击事件
                cellElement.addEventListener('click', (e) => this.handleCellClick(e, i, j));
                // 添加右键标记事件
                cellElement.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.handleCellRightClick(i, j);
                });
                
                // 添加触摸事件支持（移动设备）
                let touchTimer;
                let touchStartTime;
                cellElement.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    touchStartTime = Date.now();
                    touchTimer = setTimeout(() => {
                        this.handleCellRightClick(i, j);
                    }, 500);
                });
                
                cellElement.addEventListener('touchend', () => {
                    const touchEndTime = Date.now();
                    const touchDuration = touchEndTime - touchStartTime;
                    
                    // 清除长按定时器
                    clearTimeout(touchTimer);
                    
                    // 如果触摸时间小于200毫秒，视为快速点击，执行左键点击功能
                    if (touchDuration < 200) {
                        this.handleCellClick(null, i, j);
                    }
                });
                
                cellElement.addEventListener('touchmove', () => {
                    clearTimeout(touchTimer);
                });

                rowElement.appendChild(cellElement);
            }

            this.elements.board.appendChild(rowElement);
        }
    }

    handleCellClick(e, row, col) {
        if (this.gameOver || this.board[row][col].isRevealed || this.board[row][col].isFlagged) {
            return;
        }

        // 游戏开始
        if (!this.gameStarted) {
            this.gameStarted = true;
            this.placeMines(row, col);
            this.startTimer();
        }

        // 点击到地雷
        if (this.board[row][col].isMine) {
            this.revealMine(row, col);
            this.gameOver = true;
            this.clearTimer();
            this.showGameOverModal(false);
            return;
        }

        // 揭示单元格
        this.revealCell(row, col);

        // 检查是否获胜
        this.checkWin();
    }

    handleCellRightClick(row, col) {
        if (this.gameOver || this.board[row][col].isRevealed) {
            return;
        }

        const { mines } = this.difficulties[this.currentDifficulty];
        const cell = this.board[row][col];

        if (cell.isFlagged) {
            // 从标记状态切换到问号状态
            cell.isFlagged = false;
            cell.isQuestion = true;
            this.flaggedCells--;
        } else if (cell.isQuestion) {
            // 从问号状态切换到未标记状态
            cell.isQuestion = false;
        } else {
            // 从未标记状态切换到标记状态
            if (this.flaggedCells < mines) {
                cell.isFlagged = true;
                this.flaggedCells++;
            }
        }

        this.updateMineCounter(mines - this.flaggedCells);
        this.updateCellDisplay(row, col);
    }

    revealCell(row, col) {
        const { rows, cols } = this.difficulties[this.currentDifficulty];
        const cell = this.board[row][col];

        if (cell.isRevealed || cell.isFlagged) {
            return;
        }

        // 清除问号标记
        cell.isQuestion = false;
        cell.isRevealed = true;
        this.revealedCells++;
        this.updateCellDisplay(row, col);

        // 如果是空白单元格，递归揭示周围单元格
        if (cell.adjacentMines === 0) {
            for (let di = -1; di <= 1; di++) {
                for (let dj = -1; dj <= 1; dj++) {
                    const ni = row + di;
                    const nj = col + dj;
                    if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
                        this.revealCell(ni, nj);
                    }
                }
            }
        }
    }

    revealMine(row, col) {
        const { rows, cols } = this.difficulties[this.currentDifficulty];
        this.board[row][col].isRevealed = true;
        this.updateCellDisplay(row, col);

        // 揭示所有地雷
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (this.board[i][j].isMine) {
                    this.board[i][j].isRevealed = true;
                    this.updateCellDisplay(i, j);
                }
            }
        }
    }

    updateCellDisplay(row, col) {
        const cellElement = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        const cell = this.board[row][col];

        cellElement.className = 'cell';

        if (cell.isRevealed) {
            cellElement.classList.add('revealed');
            if (cell.isMine) {
                cellElement.classList.add('mine');
                cellElement.textContent = '💣';
            } else if (cell.adjacentMines > 0) {
                cellElement.classList.add(`num-${cell.adjacentMines}`);
                cellElement.textContent = cell.adjacentMines;
            }
        } else if (cell.isFlagged) {
            cellElement.classList.add('flagged');
            cellElement.textContent = '🚩';
        } else if (cell.isQuestion) {
            cellElement.classList.add('question');
            cellElement.textContent = '?';
        } else {
            cellElement.textContent = '';
        }
    }

    checkWin() {
        const { rows, cols, mines } = this.difficulties[this.currentDifficulty];
        const totalCells = rows * cols;
        const nonMineCells = totalCells - mines;

        if (this.revealedCells === nonMineCells) {
            this.gameOver = true;
            this.clearTimer();
            this.showGameOverModal(true);
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.updateTimer();
        }, 1000);
    }

    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimer() {
        this.elements.timer.textContent = `时间: ${this.timer}`;
    }

    updateMineCounter(count) {
        this.elements.mineCounter.textContent = `地雷: ${count}`;
    }

    showGameOverModal(isWin) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>${isWin ? '恭喜获胜！' : '游戏结束'}</h2>
                <p>${isWin ? `你用了 ${this.timer} 秒完成了游戏！` : '很遗憾，你踩到了地雷。'}</p>
                <button onclick="minesweeper.startNewGame(); this.parentElement.parentElement.remove();">再玩一次</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// 初始化游戏
let minesweeper;
window.addEventListener('DOMContentLoaded', () => {
    minesweeper = new Minesweeper();
});