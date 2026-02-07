// === GAME STATE ===
let gameState = {
    board: [],
    boardSize: 8,
    playerMode: 2,
    currentPlayer: 1,
    scores: { 1: 0, 2: 0, 3: 0 },
    gameActive: false,
    validMoves: []
};

// === DIRECTION VECTORS FOR MOVEMENT ===
const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],  // Top-left, Top, Top-right
    [0, -1],           [0, 1],    // Left, Right
    [1, -1],  [1, 0],  [1, 1]     // Bottom-left, Bottom, Bottom-right
];

// === DOM ELEMENTS ===
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const gameBoard = document.getElementById('game-board');
const startGameBtn = document.getElementById('start-game-btn');
const restartBtn = document.getElementById('restart-btn');
const backToSetupBtn = document.getElementById('back-to-setup-btn');
const endGameModal = document.getElementById('end-game-modal');
const modalRestartBtn = document.getElementById('modal-restart-btn');
const modalSetupBtn = document.getElementById('modal-setup-btn');

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    // Board size selection
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Start game
    startGameBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', () => {
        initializeBoard(gameState.boardSize, gameState.playerMode);
        renderBoard();
    });
    backToSetupBtn.addEventListener('click', showSetupScreen);
    modalRestartBtn.addEventListener('click', () => {
        endGameModal.classList.remove('active');
        initializeBoard(gameState.boardSize, gameState.playerMode);
        renderBoard();
    });
    modalSetupBtn.addEventListener('click', () => {
        endGameModal.classList.remove('active');
        showSetupScreen();
    });

    // Board clicks (using event delegation)
    gameBoard.addEventListener('click', (e) => {
        const cell = e.target.closest('.board-cell');
        if (cell && gameState.gameActive) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            handleCellClick(row, col);
        }
    });
}

// === SCREEN MANAGEMENT ===
function startGame() {
    const playerMode = parseInt(document.querySelector('input[name="player-mode"]:checked').value);
    const boardSize = parseInt(document.querySelector('.size-btn.active').dataset.size);
    
    gameState.playerMode = playerMode;
    gameState.boardSize = boardSize;
    
    setupScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    // Show/hide player 3 score panel
    const player3Panel = document.querySelector('[data-player="3"]');
    if (playerMode === 3) {
        player3Panel.classList.remove('hidden');
    } else {
        player3Panel.classList.add('hidden');
    }
    
    initializeBoard(boardSize, playerMode);
    renderBoard();
}

function showSetupScreen() {
    gameScreen.classList.remove('active');
    setupScreen.classList.add('active');
    gameState.gameActive = false;
}

// === BOARD INITIALIZATION ===
function initializeBoard(size, mode) {
    gameState.board = Array(size).fill(null).map(() => Array(size).fill(0));
    gameState.boardSize = size;
    gameState.playerMode = mode;
    gameState.currentPlayer = 1;
    gameState.gameActive = true;
    
    // Place initial discs
    const center = Math.floor(size / 2);
    
    if (mode === 2) {
        // Standard 2-player setup
        gameState.board[center - 1][center - 1] = 2;  // White
        gameState.board[center - 1][center] = 1;      // Black
        gameState.board[center][center - 1] = 1;      // Black
        gameState.board[center][center] = 2;          // White
    } else {
        // 3-player setup - balanced triangle
        gameState.board[center - 1][center - 1] = 1;  // Black
        gameState.board[center - 1][center] = 2;      // White
        gameState.board[center][center - 1] = 3;      // Red
        if (size >= 8) {
            gameState.board[center][center] = 1;      // Black
        }
    }
    
    calculateScore();
    updateValidMoves();
    updateUI();
}

// === RENDER BOARD ===
function renderBoard() {
    gameBoard.innerHTML = '';
    gameBoard.style.gridTemplateColumns = `repeat(${gameState.boardSize}, 1fr)`;
    
    for (let row = 0; row < gameState.boardSize; row++) {
        for (let col = 0; col < gameState.boardSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'board-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const value = gameState.board[row][col];
            if (value !== 0) {
                const disc = document.createElement('div');
                disc.className = 'disc';
                
                if (value === 1) disc.classList.add('disc-black');
                else if (value === 2) disc.classList.add('disc-white');
                else if (value === 3) disc.classList.add('disc-red');
                
                cell.appendChild(disc);
            }
            
            // Highlight valid moves
            if (gameState.validMoves.some(move => move.row === row && move.col === col)) {
                cell.classList.add('valid-move');
            }
            
            gameBoard.appendChild(cell);
        }
    }
}

// === HANDLE CELL CLICK ===
function handleCellClick(row, col) {
    if (!gameState.gameActive) return;
    
    if (!isValidMove(row, col, gameState.currentPlayer)) {
        return;
    }
    
    // Place disc
    gameState.board[row][col] = gameState.currentPlayer;
    
    // Get and flip discs
    const toFlip = getFlippableDiscs(row, col, gameState.currentPlayer);
    flipDiscs(toFlip);
    
    // Update game state
    calculateScore();
    switchTurn();
    updateValidMoves();
    
    // Re-render with animation
    renderBoard();
    updateUI();
    
    // Check if game should end
    setTimeout(() => {
        checkGameEnd();
    }, 100);
}

// === VALIDATE MOVE ===
function isValidMove(row, col, player) {
    if (gameState.board[row][col] !== 0) return false;
    
    const flippable = getFlippableDiscs(row, col, player);
    return flippable.length > 0;
}

// === GET FLIPPABLE DISCS ===
function getFlippableDiscs(row, col, player) {
    const toFlip = [];
    
    for (const [dx, dy] of DIRECTIONS) {
        const lineFlips = checkDirection(row, col, dx, dy, player);
        if (lineFlips.length > 0) {
            toFlip.push(...lineFlips);
        }
    }
    
    return toFlip;
}

// === CHECK DIRECTION FOR FLIPPABLE DISCS ===
function checkDirection(row, col, dx, dy, player) {
    const line = [];
    let x = row + dx;
    let y = col + dy;
    
    // For 3-player mode: track the opponent color we encounter
    let opponentColor = null;
    
    while (x >= 0 && x < gameState.boardSize && y >= 0 && y < gameState.boardSize) {
        const cellValue = gameState.board[x][y];
        
        // Empty cell - no flips
        if (cellValue === 0) break;
        
        // Same color as player - end of line
        if (cellValue === player) {
            // Valid if we have discs to flip
            if (line.length > 0) {
                return line;
            }
            break;
        }
        
        // Opponent disc
        if (gameState.playerMode === 3) {
            // In 3-player mode, must be same opponent color
            if (opponentColor === null) {
                opponentColor = cellValue;
                line.push({ row: x, col: y });
            } else if (cellValue === opponentColor) {
                line.push({ row: x, col: y });
            } else {
                // Mixed colors - invalid
                break;
            }
        } else {
            // In 2-player mode, any opponent disc
            line.push({ row: x, col: y });
        }
        
        x += dx;
        y += dy;
    }
    
    return [];
}

// === FLIP DISCS ===
function flipDiscs(discsToFlip) {
    discsToFlip.forEach(({ row, col }) => {
        gameState.board[row][col] = gameState.currentPlayer;
    });
}

// === GET ALL VALID MOVES FOR PLAYER ===
function getValidMoves(player) {
    const moves = [];
    
    for (let row = 0; row < gameState.boardSize; row++) {
        for (let col = 0; col < gameState.boardSize; col++) {
            if (gameState.board[row][col] === 0 && isValidMove(row, col, player)) {
                moves.push({ row, col });
            }
        }
    }
    
    return moves;
}

// === UPDATE VALID MOVES ===
function updateValidMoves() {
    gameState.validMoves = getValidMoves(gameState.currentPlayer);
}

// === SWITCH TURN ===
function switchTurn() {
    const maxPlayers = gameState.playerMode;
    
    // Try next player
    let nextPlayer = (gameState.currentPlayer % maxPlayers) + 1;
    let attempts = 0;
    
    // Skip players with no valid moves
    while (attempts < maxPlayers) {
        const moves = getValidMoves(nextPlayer);
        
        if (moves.length > 0) {
            gameState.currentPlayer = nextPlayer;
            gameState.validMoves = moves;
            return;
        }
        
        // No valid moves for this player - skip
        nextPlayer = (nextPlayer % maxPlayers) + 1;
        attempts++;
    }
    
    // No player has valid moves - game over
    gameState.gameActive = false;
}

// === CALCULATE SCORES ===
function calculateScore() {
    gameState.scores = { 1: 0, 2: 0, 3: 0 };
    
    for (let row = 0; row < gameState.boardSize; row++) {
        for (let col = 0; col < gameState.boardSize; col++) {
            const value = gameState.board[row][col];
            if (value !== 0) {
                gameState.scores[value]++;
            }
        }
    }
}

// === UPDATE UI ===
function updateUI() {
    // Update scores
    document.getElementById('score-1').textContent = gameState.scores[1];
    document.getElementById('score-2').textContent = gameState.scores[2];
    if (gameState.playerMode === 3) {
        document.getElementById('score-3').textContent = gameState.scores[3];
    }
    
    // Update active player indicator
    for (let i = 1; i <= 3; i++) {
        const playerPanel = document.querySelector(`[data-player="${i}"]`);
        if (playerPanel && !playerPanel.classList.contains('hidden')) {
            if (i === gameState.currentPlayer && gameState.gameActive) {
                playerPanel.classList.add('active');
            } else {
                playerPanel.classList.remove('active');
            }
        }
    }
}

// === CHECK GAME END ===
function checkGameEnd() {
    if (!gameState.gameActive) {
        showEndGameModal();
        return;
    }
    
    // Check if board is full
    let emptyCount = 0;
    for (let row = 0; row < gameState.boardSize; row++) {
        for (let col = 0; col < gameState.boardSize; col++) {
            if (gameState.board[row][col] === 0) emptyCount++;
        }
    }
    
    if (emptyCount === 0) {
        gameState.gameActive = false;
        showEndGameModal();
    }
}

// === SHOW END GAME MODAL ===
function showEndGameModal() {
    const scores = gameState.scores;
    const maxScore = Math.max(scores[1], scores[2], gameState.playerMode === 3 ? scores[3] : 0);
    
    // Find winner(s)
    const winners = [];
    if (scores[1] === maxScore) winners.push('Player 1 (Black)');
    if (scores[2] === maxScore) winners.push('Player 2 (White)');
    if (gameState.playerMode === 3 && scores[3] === maxScore) winners.push('Player 3 (Red)');
    
    // Set winner announcement
    const winnerAnnouncement = document.getElementById('winner-announcement');
    if (winners.length === 1) {
        winnerAnnouncement.textContent = `🎉 ${winners[0]} Wins! 🎉`;
    } else {
        winnerAnnouncement.textContent = `🤝 It's a Tie! 🤝`;
    }
    
    // Set final scores
    const finalScoresDiv = document.getElementById('final-scores');
    let scoresHTML = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
    
    scoresHTML += `
        <div class="final-score-item">
            <div class="disc-preview disc-black"></div>
            <span>Player 1: <strong>${scores[1]}</strong></span>
        </div>
        <div class="final-score-item">
            <div class="disc-preview disc-white"></div>
            <span>Player 2: <strong>${scores[2]}</strong></span>
        </div>
    `;
    
    if (gameState.playerMode === 3) {
        scoresHTML += `
            <div class="final-score-item">
                <div class="disc-preview disc-red"></div>
                <span>Player 3: <strong>${scores[3]}</strong></span>
            </div>
        `;
    }
    
    scoresHTML += '</div>';
    finalScoresDiv.innerHTML = scoresHTML;
    
    // Show modal
    endGameModal.classList.add('active');
}

// === RESET GAME ===
function resetGame() {
    initializeBoard(gameState.boardSize, gameState.playerMode);
    renderBoard();
    updateUI();
}
