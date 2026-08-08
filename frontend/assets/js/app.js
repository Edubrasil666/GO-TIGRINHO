document.addEventListener("DOMContentLoaded", function () {

    // =========================
    // ELEMENTOS PRINCIPAIS
    // =========================

    const header = document.getElementById("main-header");
    const homeContent = document.getElementById("home-content");

    const loginScreen = document.getElementById("login-screen");
    const registerScreen = document.getElementById("register-screen");
    const gameScreen = document.getElementById("game-screen");

    const loginButton = document.querySelector(".btn-login");
    const registerButton = document.querySelector(".btn-register");

    const loginSubmit = document.getElementById("login-submit");
    const registerSubmit = document.getElementById("register-submit");

    const goRegister = document.getElementById("go-register");
    const goLogin = document.getElementById("go-login");

    const backHomeLogin = document.getElementById("back-home-login");
    const backHomeRegister = document.getElementById("back-home-register");

    const playButton = document.getElementById("play-button");
    const logoutButton = document.getElementById("logout-button");

    let token = localStorage.getItem("token");

    // =========================
    // SÍMBOLOS DO TIGRINHO
    // =========================

    const slotSymbols = [
        "🐯",
        "🍒",
        "🍋",
        "💎",
        "🔔",
        "7️⃣"
    ];

    let spinning = false;


    // =========================
    // MOSTRAR LOGIN
    // =========================

    function showLogin() {

        if (header) header.style.display = "none";
        if (homeContent) homeContent.style.display = "none";
        if (registerScreen) registerScreen.style.display = "none";
        if (gameScreen) gameScreen.style.display = "none";
        if (loginScreen) loginScreen.style.display = "flex";
    }


    // =========================
    // MOSTRAR CADASTRO
    // =========================

    function showRegister() {

        if (header) header.style.display = "none";
        if (homeContent) homeContent.style.display = "none";
        if (loginScreen) loginScreen.style.display = "none";
        if (gameScreen) gameScreen.style.display = "none";
        if (registerScreen) registerScreen.style.display = "flex";
    }


    // =========================
    // MOSTRAR HOME
    // =========================

    function showHome() {

        if (loginScreen) loginScreen.style.display = "none";
        if (registerScreen) registerScreen.style.display = "none";
        if (gameScreen) gameScreen.style.display = "none";

        if (header) header.style.display = "flex";
        if (homeContent) homeContent.style.display = "block";
    }


    // =========================
    // MOSTRAR JOGO
    // =========================

    function showGame(user) {

        if (header) header.style.display = "none";
        if (homeContent) homeContent.style.display = "none";
        if (loginScreen) loginScreen.style.display = "none";
        if (registerScreen) registerScreen.style.display = "none";
        if (gameScreen) gameScreen.style.display = "flex";

        const balance = document.getElementById("balance");

        if (balance && user) {
            balance.textContent = user.balance;
        }
    }


    // =========================
    // ENTRAR
    // =========================

    if (loginButton) {
        loginButton.onclick = function () {
            showLogin();
        };
    }


    // =========================
    // CRIAR CONTA
    // =========================

    if (registerButton) {
        registerButton.onclick = function () {
            showRegister();
        };
    }


    // =========================
    // LINK CRIAR CONTA
    // =========================

    if (goRegister) {
        goRegister.onclick = function (event) {
            event.preventDefault();
            showRegister();
        };
    }


    // =========================
    // LINK ENTRAR
    // =========================

    if (goLogin) {
        goLogin.onclick = function (event) {
            event.preventDefault();
            showLogin();
        };
    }


    // =========================
    // VOLTAR HOME
    // =========================

    if (backHomeLogin) {
        backHomeLogin.onclick = function (event) {
            event.preventDefault();
            showHome();
        };
    }

    if (backHomeRegister) {
        backHomeRegister.onclick = function (event) {
            event.preventDefault();
            showHome();
        };
    }


    // =========================
    // CADASTRO
    // =========================

    if (registerSubmit) {

        registerSubmit.onclick = async function () {

            const usernameElement =
                document.getElementById("register-username");

            const emailElement =
                document.getElementById("register-email");

            const passwordElement =
                document.getElementById("register-password");

            const confirmElement =
                document.getElementById("register-password-confirm");

            const message =
                document.getElementById("register-message");

            const username = usernameElement.value.trim();
            const email = emailElement.value.trim();
            const password = passwordElement.value;
            const confirmPassword = confirmElement.value;

            message.textContent = "";

            if (!username || !email || !password || !confirmPassword) {
                message.textContent = "Preencha todos os campos.";
                return;
            }

            if (!email.includes("@")) {
                message.textContent = "Digite um e-mail válido.";
                return;
            }

            if (password.length < 6) {
                message.textContent =
                    "A senha precisa ter pelo menos 6 caracteres.";
                return;
            }

            if (password !== confirmPassword) {
                message.textContent =
                    "As senhas não são iguais.";
                return;
            }

            try {

                message.textContent = "Criando sua conta...";

                const response = await fetch("/api/register", {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        username: username,
                        email: email,
                        password: password
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    message.textContent =
                        data.error || "Erro ao criar conta.";
                    return;
                }

                token = data.token;

                localStorage.setItem("token", token);

                message.textContent =
                    "Conta criada com sucesso!";

                setTimeout(function () {
                    showGame(data.user);
                }, 800);

            } catch (error) {

                console.error(error);

                message.textContent =
                    "Não foi possível conectar ao servidor.";
            }
        };
    }


    // =========================
    // LOGIN
    // =========================

    if (loginSubmit) {

        loginSubmit.onclick = async function () {

            const usernameElement =
                document.getElementById("login-username");

            const passwordElement =
                document.getElementById("login-password");

            const message =
                document.getElementById("login-message");

            const username =
                usernameElement.value.trim();

            const password =
                passwordElement.value;

            message.textContent = "";

            if (!username || !password) {
                message.textContent =
                    "Digite usuário e senha.";
                return;
            }

            try {

                message.textContent = "Entrando...";

                const response = await fetch("/api/login", {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                const data = await response.json();

                if (!response.ok) {

                    message.textContent =
                        data.error ||
                        "Usuário ou senha incorretos.";

                    return;
                }

                token = data.token;

                localStorage.setItem("token", token);

                message.textContent =
                    "Login realizado com sucesso!";

                setTimeout(function () {
                    showGame(data.user);
                }, 500);

            } catch (error) {

                console.error(error);

                message.textContent =
                    "Não foi possível conectar ao servidor.";
            }
        };
    }


    // =========================
    // ANIMAÇÃO DOS ROLOS
    // =========================

    function spinSlots(finalSymbols) {

        return new Promise(function (resolve) {

            const slots = [
                document.getElementById("slot1"),
                document.getElementById("slot2"),
                document.getElementById("slot3")
            ];

            const durations = [
                1100,
                1600,
                2100
            ];

            let finished = 0;

            slots.forEach(function (slot, index) {

                if (!slot) {
                    finished++;
                    return;
                }

                const start = Date.now();

                const timer = setInterval(function () {

                    const elapsed = Date.now() - start;

                    const randomIndex =
                        Math.floor(
                            Math.random() * slotSymbols.length
                        );

                    slot.textContent =
                        slotSymbols[randomIndex];

                    // Pequeno efeito de movimento
                    slot.style.transform =
                        "scale(" +
                        (1 + Math.random() * 0.08) +
                        ")";

                    if (elapsed >= durations[index]) {

                        clearInterval(timer);

                        slot.textContent =
                            finalSymbols[index];

                        slot.style.transform =
                            "scale(1)";

                        // Pequeno destaque ao parar
                        slot.style.borderColor =
                            "#f5a623";

                        setTimeout(function () {

                            slot.style.borderColor =
                                "";

                        }, 350);

                        finished++;

                        if (finished === slots.length) {
                            resolve();
                        }
                    }

                }, 80);

            });

        });
    }


    // =========================
    // JOGAR
    // =========================

    if (playButton) {

        playButton.onclick = async function () {

            if (spinning) {
                return;
            }

            const betElement =
                document.getElementById("bet");

            const message =
                document.getElementById("game-message");

            const bet =
                Number(betElement.value);

            if (!token) {
                showLogin();
                return;
            }

            if (!bet || bet < 1) {

                message.textContent =
                    "Digite uma aposta válida.";

                return;
            }

            spinning = true;

            playButton.disabled = true;

            playButton.textContent = "🎰 GIRANDO...";

            message.textContent =
                "Boa sorte! Os rolos estão girando...";

            try {

                const response =
                    await fetch("/api/play/tiger", {

                        method: "POST",

                        headers: {
                            "Content-Type": "application/json",

                            "Authorization":
                                "Bearer " + token
                        },

                        body: JSON.stringify({
                            bet: bet
                        })
                    });

                const data =
                    await response.json();

                if (!response.ok) {

                    message.textContent =
                        data.error || "Erro ao jogar.";

                    spinning = false;
                    playButton.disabled = false;
                    playButton.textContent = "JOGAR";

                    return;
                }

                const symbols =
                    data.result.symbols;

                // =========================
                // ROLAR OS TRÊS SÍMBOLOS
                // =========================

                await spinSlots(symbols);

                // Atualizar saldo
                document.getElementById("balance").textContent =
                    data.balance;

                // Mensagem
                if (data.result.win > 0) {

                    message.textContent =
                        "🎉 VOCÊ GANHOU " +
                        data.result.win +
                        " MOEDAS!";

                } else {

                    message.textContent =
                        "😿 Não foi dessa vez. Tente novamente!";
                }

            } catch (error) {

                console.error(error);

                message.textContent =
                    "Erro ao conectar ao servidor.";

            }

            spinning = false;

            playButton.disabled = false;

            playButton.textContent = "JOGAR";
        };
    }


    // =========================
    // SAIR
    // =========================

    if (logoutButton) {

        logoutButton.onclick = function () {

            localStorage.removeItem("token");

            token = null;

            showHome();
        };
    }


    // =========================
    // JOGAR AGORA
    // =========================

    const playNowButton =
        document.querySelector(".btn-primary");

    if (playNowButton) {

        playNowButton.onclick = function () {

            document
                .querySelector(".games-section")
                .scrollIntoView({
                    behavior: "smooth"
                });
        };
    }


    // =========================
    // VER JOGOS
    // =========================

    const gamesButton =
        document.querySelector(".btn-secondary");

    if (gamesButton) {

        gamesButton.onclick = function () {

            document
                .querySelector(".games-section")
                .scrollIntoView({
                    behavior: "smooth"
                });
        };
    }


    // =========================
    // MENU
    // =========================

    const menuLinks =
        document.querySelectorAll(".menu a");

    menuLinks.forEach(function (link) {

        link.onclick = function (event) {

            event.preventDefault();

            const menuName =
                link.textContent.trim();

            if (menuName === "Início") {

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }

            if (menuName === "Jogos") {

                document
                    .querySelector(".games-section")
                    .scrollIntoView({
                        behavior: "smooth"
                    });
            }

            if (menuName === "Promoções") {

                alert(
                    "A área de promoções será adicionada."
                );
            }

            if (menuName === "Torneios") {

                alert(
                    "A área de torneios será adicionada."
                );
            }
        };
    });


    // =========================
    // BOTÕES DOS JOGOS
    // =========================

    const gameButtons =
        document.querySelectorAll(".game-info button");

    gameButtons.forEach(function (button) {

        button.onclick = function () {

            const card =
                button.closest(".game-card");

            if (!card) {
                return;
            }

            const title =
                card.querySelector("h3");

            if (!title) {
                return;
            }

            const gameName =
                title.textContent.trim();

            if (gameName === "Fortuna do Tigre") {

                if (token) {

                    fetch("/api/me", {

                        headers: {
                            "Authorization":
                                "Bearer " + token
                        }

                    })
                    .then(function (response) {
                        return response.json();
                    })
                    .then(function (user) {

                        if (user.id) {
                            showGame(user);
                        } else {
                            showLogin();
                        }
                    })
                    .catch(function () {
                        showLogin();
                    });

                } else {

                    showLogin();
                }

            } else {

                alert(
                    gameName +
                    " estará disponível em breve."
                );
            }
        };
    });


    // =========================
    // VERIFICAR LOGIN EXISTENTE
    // =========================

    async function checkLogin() {

        if (!token) {
            return;
        }

        try {

            const response =
                await fetch("/api/me", {

                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                });

            if (!response.ok) {

                localStorage.removeItem("token");

                token = null;

                return;
            }

            const user =
                await response.json();

            showGame(user);

        } catch (error) {

            console.error(error);
        }
    }

    checkLogin();

});
