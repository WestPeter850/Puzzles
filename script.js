document.addEventListener('DOMContentLoaded', () => {
    let PUZZLE_IMAGE_SRC = 'assets/puzzle-image.jpg';

    const gameSetupScreen = document.getElementById('game-setup');
    const startGameBtn = document.getElementById('start-game-btn');
    const mainGame = document.querySelector('main');
    const challengeOptionsContainer = document.getElementById('challenge-options');
    const imageUpload = document.getElementById('image-upload');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');

    let ws;
    let userColor;

    const settings = {
        'Quick Fix': { pieces: 50, rows: 5, cols: 10, time: 600 },
        'Standard Challenge': { pieces: 100, rows: 10, cols: 10, time: 1200 },
        'Ultimate Test': { pieces: 200, rows: 10, cols: 20, time: 1800 }
    };

    let NUM_ROWS;
    let NUM_COLS;

    const puzzleContainer = document.getElementById('puzzle-container');
    const piecesBox = document.getElementById('pieces-box');
    const referenceImage = document.getElementById('reference-image');
    const timerElement = document.getElementById('timer');

    let pieces = [];
    let puzzleWidth, puzzleHeight;
    let timerInterval;
    let timeLeft = 600; // 10 minutes in seconds

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function updateTimer() {
        timeLeft--;
        timerElement.textContent = formatTime(timeLeft);

        timerElement.classList.remove('green', 'yellow', 'red');

        if (timeLeft <= 15) {
            timerElement.classList.add('red');
        } else if (timeLeft <= 30) {
            timerElement.classList.add('yellow');
        } else {
            timerElement.classList.add('green');
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("Time's up!");
            // Disable further interaction
            pieces.forEach(p => p.style.pointerEvents = 'none');
        }
    }

    function startTimer() {
        timerElement.textContent = formatTime(timeLeft);
        timerElement.classList.add('green');
        timerInterval = setInterval(updateTimer, 1000);
    }

    function initPuzzle() {
        referenceImage.src = PUZZLE_IMAGE_SRC;

        const img = new Image();
        img.onload = () => {
            puzzleWidth = img.width;
            puzzleHeight = img.height;
            puzzleContainer.style.width = `${puzzleWidth}px`;
            puzzleContainer.style.height = `${puzzleHeight}px`;
            sliceImage(img);
            startTimer(); // Start the timer after image is loaded
        };
        img.src = PUZZLE_IMAGE_SRC;
    }

    function sliceImage(image) {
        const pieceWidth = puzzleWidth / NUM_COLS;
        const pieceHeight = puzzleHeight / NUM_ROWS;

        for (let row = 0; row < NUM_ROWS; row++) {
            for (let col = 0; col < NUM_COLS; col++) {
                const piece = document.createElement('canvas');
                piece.width = pieceWidth;
                piece.height = pieceHeight;
                piece.classList.add('puzzle-piece');

                const context = piece.getContext('2d');
                context.drawImage(
                    image,
                    col * pieceWidth, // source x
                    row * pieceHeight, // source y
                    pieceWidth,        // source width
                    pieceHeight,       // source height
                    0,                 // dest x
                    0,                 // dest y
                    pieceWidth,        // dest width
                    pieceHeight        // dest height
                );

                // Store correct position
                piece.dataset.correctRow = row;
                piece.dataset.correctCol = col;

                // Tag edge pieces
                if (row === 0 || row === NUM_ROWS - 1 || col === 0 || col === NUM_COLS - 1) {
                    piece.dataset.isEdge = 'true';
                }

                // Position pieces in a grid to start
                // This logic will be added after the loop
                piecesBox.appendChild(piece);
                pieces.push(piece);
            }
        }

        // Lay out pieces in a grid
        const containerWidth = piecesBox.clientWidth;
        const padding = 5;
        let x = padding;
        let y = padding;
        let maxY = 0;

        pieces.forEach(piece => {
            const pieceWidth = piece.width;
            const pieceHeight = piece.height;

            if (x + pieceWidth + padding > containerWidth) {
                x = padding;
                y += maxY + padding;
                maxY = 0;
            }
            piece.style.left = `${x}px`;
            piece.style.top = `${y}px`;

            x += pieceWidth + padding;
            if (pieceHeight > maxY) {
                maxY = pieceHeight;
            }
        });
    }

    function setupDragAndDrop() {
        let selectedPiece = null;
        let offsetX, offsetY;

        pieces.forEach(piece => {
            piece.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('snapped')) return;

                selectedPiece = e.target;
                selectedPiece.style.zIndex = 1000;
                offsetX = e.clientX - selectedPiece.offsetLeft;
                offsetY = e.clientY - selectedPiece.offsetTop;
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (!selectedPiece) return;

            const newLeft = e.clientX - offsetX;
            const newTop = e.clientY - offsetY;
            selectedPiece.style.left = `${newLeft}px`;
            selectedPiece.style.top = `${newTop}px`;
        });

        document.addEventListener('mouseup', (e) => {
            if (!selectedPiece) return;

            selectedPiece.style.zIndex = 1;

            const pieceWidth = selectedPiece.width;
            const pieceHeight = selectedPiece.height;
            const correctRow = parseInt(selectedPiece.dataset.correctRow);
            const correctCol = parseInt(selectedPiece.dataset.correctCol);

            const targetLeft = correctCol * pieceWidth;
            const targetTop = correctRow * pieceHeight;

            const pieceRect = selectedPiece.getBoundingClientRect();
            const puzzleRect = puzzleContainer.getBoundingClientRect();

            const dropLeft = pieceRect.left - puzzleRect.left;
            const dropTop = pieceRect.top - puzzleRect.top;


            const snapTolerance = 30; // pixels

            if (Math.abs(dropLeft - targetLeft) < snapTolerance &&
                Math.abs(dropTop - targetTop) < snapTolerance) {

                // Snap into place
                selectedPiece.style.left = `${targetLeft}px`;
                selectedPiece.style.top = `${targetTop}px`;
                selectedPiece.classList.add('snapped');
                puzzleContainer.appendChild(selectedPiece);
                checkCompletion();
            }

            selectedPiece = null;
        });
    }

    function checkCompletion() {
        const allSnapped = pieces.every(p => p.classList.contains('snapped'));
        if (allSnapped) {
            clearInterval(timerInterval);
            setTimeout(() => alert("Congratulations! You completed the puzzle!"), 100);
        }
    }

    function populateChallengeOptions() {
        challengeOptionsContainer.innerHTML = '';
        let isFirst = true;
        for (const challengeName in settings) {
            const id = `challenge-${challengeName.replace(/\s+/g, '-')}`;
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'challenge';
            input.value = challengeName;
            input.id = id;
            if (isFirst) {
                input.checked = true;
                isFirst = false;
            }
            label.htmlFor = id;
            label.appendChild(input);
            label.append(` ${challengeName} (${settings[challengeName].pieces} pieces)`);
            challengeOptionsContainer.appendChild(label);
        }
    }

    startGameBtn.addEventListener('click', () => {
        const selectedChallenge = document.querySelector('input[name="challenge"]:checked').value;
        const gameSettings = settings[selectedChallenge];

        gameSetupScreen.style.display = 'none';
        mainGame.style.display = 'block';

        ws = new WebSocket('ws://localhost:8080');

        ws.onopen = () => {
            console.log('Connected to WebSocket server');
        };

        ws.onmessage = event => {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);

            switch(message.type) {
                case 'userColor':
                    userColor = message.color;
                    break;
                case 'chatMessage':
                    displayChatMessage(message);
                    break;
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from WebSocket server');
        };

        ws.onerror = error => {
            console.error('WebSocket error:', error);
        };

        initPuzzle(gameSettings);
    });

    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                PUZZLE_IMAGE_SRC = event.target.result;
                // Optionally, show a preview
                document.getElementById('reference-image').src = PUZZLE_IMAGE_SRC;
            };
            reader.readAsDataURL(file);
        }
    });

    // Initial population
    populateChallengeOptions();


    // Modify initPuzzle to accept settings
    function initPuzzle(config) {
        NUM_ROWS = config.rows;
        NUM_COLS = config.cols;
        timeLeft = config.time;

        referenceImage.src = PUZZLE_IMAGE_SRC;

        const img = new Image();
        img.onload = () => {
            puzzleWidth = img.width;
            puzzleHeight = img.height;
            puzzleContainer.style.width = `${puzzleWidth}px`;
            puzzleContainer.style.height = `${puzzleHeight}px`;
            sliceImage(img);
            setupDragAndDrop();
            startTimer();
        };
        img.src = PUZZLE_IMAGE_SRC;
    }

    function displayChatMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');

        const usernameElement = document.createElement('span');
        usernameElement.classList.add('username');
        usernameElement.style.color = message.color;
        usernameElement.textContent = message.username;

        const textElement = document.createElement('span');
        textElement.textContent = `: ${message.text}`;

        messageElement.appendChild(usernameElement);
        messageElement.appendChild(textElement);
        chatMessages.appendChild(messageElement);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function sendChatMessage() {
        const text = chatInput.value;
        if (text.trim() === '' || !ws || ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const message = {
            type: 'chatMessage',
            text: text
        };

        ws.send(JSON.stringify(message));
        chatInput.value = '';
    }

    chatSendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
});
