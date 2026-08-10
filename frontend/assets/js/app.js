document.addEventListener("DOMContentLoaded", function () {

"use strict";

/* =========================================================
   ELEMENTOS PRINCIPAIS
========================================================= */

const header = document.querySelector(".header");

const pageHome = document.getElementById("page-home");
const pageLogin = document.getElementById("page-login");
const pageRegister = document.getElementById("page-register");
const pageGames = document.getElementById("page-games");
const pageAccount = document.getElementById("page-account");
const pageGame = document.getElementById("page-game");

/* =========================================================
   CABEÇALHO
========================================================= */

const loginButton = document.getElementById("header-login");
const registerButton = document.getElementById("header-register");
const headerLogout = document.getElementById("header-logout");

/* =========================================================
   LOGIN / CADASTRO
========================================================= */

const loginSubmit = document.getElementById("login-submit");
const registerSubmit = document.getElementById("register-submit");

const goRegister = document.getElementById("go-register");
const goLogin = document.getElementById("go-login");

const backHomeLogin = document.getElementById("back-home-login");
const backHomeRegister = document.getElementById("back-home-register");

/* =========================================================
   MENU
========================================================= */

const menuHome = document.getElementById("menu-home");
const menuGames = document.getElementById("menu-games");
const menuAccount = document.getElementById("menu-account");

/* =========================================================
   HOME
========================================================= */

const heroPlay = document.getElementById("hero-play");
const heroGames = document.getElementById("hero-games");
const seeAllGames = document.getElementById("see-all-games");

/* =========================================================
   JOGOS
========================================================= */

const gameTiger = document.getElementById("game-tiger");
const gamesTiger = document.getElementById("games-tiger");
const accountGames = document.getElementById("account-games");
const backToGames = document.getElementById("back-to-games");

/* =========================================================
   JOGO
========================================================= */

const playButton = document.getElementById("play-button");
const turboButton = document.getElementById("turbo-button");
const autoPlayButton = document.getElementById("auto-play-button");
const autoOptions = document.getElementById("auto-options");

const autoPlayDefaultContent =
    autoPlayButton
        ? autoPlayButton.innerHTML
        : "";

/* =========================================================
   RECUPERAÇÃO DE SENHA
========================================================= */

const forgotPasswordLink =
    document.getElementById("forgot-password-link");

const forgotPasswordView =
    document.getElementById("forgot-password-view");

const backToLogin =
    document.getElementById("back-to-login");

const sendResetCode =
    document.getElementById("send-reset-code");

const resetCodeArea =
    document.getElementById("reset-code-area");

const resetPasswordSubmit =
    document.getElementById("reset-password-submit");

const forgotEmail =
    document.getElementById("forgot-email");

const resetCode =
    document.getElementById("reset-code");

const confirmResetCode =
    document.getElementById("confirm-reset-code");

const newPasswordArea =
    document.getElementById("new-password-area");

const newPassword =
    document.getElementById("new-password");

const newPasswordConfirm =
    document.getElementById("new-password-confirm");

const forgotMessage =
    document.getElementById("forgot-message");

/* =========================================================
   ESTADO
========================================================= */

let token = localStorage.getItem("token");
let currentUser = null;

let spinning = false;
let turboLevel = 0;

let autoPlaying = false;
let autoRounds = 0;
let autoCancelRequested = false;
let autoRunId = 0;

/* =========================================================
   CONFIGURAÇÃO DO DEMO
========================================================= */

const DEMO_START_BALANCE = 10000;

/*
   MODALIDADE DA APOSTA

   Mantida separada para que a modalidade possa
   ser alterada sem mexer no restante do jogo.
*/
const DEMO_MAX_BET = 100000;

/* =========================================================
   SÍMBOLOS
========================================================= */

const slotSymbols = [
    "🐯",
    "💰",
    "🍒",
    "💎",
    "🔔",
    "7️⃣"
];

/* =========================================================
   FORMATAÇÃO
========================================================= */

function formatMoney(value) {

    const number = Number(value || 0);

    return number.toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}

/* =========================================================
   IDENTIFICADOR DO SALDO DEMO
========================================================= */

function getDemoBalanceKey() {

    if (!currentUser) {
        return "demoBalance:guest";
    }

    const identifier =
        currentUser.id ||
        currentUser.userId ||
        currentUser.email ||
        currentUser.username ||
        "default";

    return "demoBalance:" +
        String(identifier).toLowerCase();
}

/* =========================================================
   GARANTIR SALDO
========================================================= */

function ensureDemoBalance() {

    if (!currentUser) {
        return;
    }

    const key = getDemoBalanceKey();

    const saved = Number(
        localStorage.getItem(key)
    );

    if (
        Number.isFinite(saved) &&
        saved >= 0
    ) {

        currentUser.demoBalance = saved;

    } else {

        currentUser.demoBalance =
            DEMO_START_BALANCE;

        localStorage.setItem(
            key,
            String(DEMO_START_BALANCE)
        );
    }
}

/* =========================================================
   SALVAR SALDO
========================================================= */

function saveDemoBalance() {

    if (!currentUser) {
        return;
    }

    localStorage.setItem(
        getDemoBalanceKey(),
        String(currentUser.demoBalance)
    );
}

/* =========================================================
   ATUALIZAR SALDO
========================================================= */

function updateDemoBalanceVisual() {

    if (!currentUser) {
        return;
    }

    ensureDemoBalance();

    const balance =
        document.getElementById("balance");

    const headerBalanceValue =
        document.getElementById(
            "header-balance-value"
        );

    const accountBalance =
        document.getElementById(
            "account-balance"
        );

    const value =
        formatMoney(
            currentUser.demoBalance
        );

    if (balance) {
        balance.textContent = value;
    }

    if (headerBalanceValue) {
        headerBalanceValue.textContent = value;
    }

    if (accountBalance) {
        accountBalance.textContent =
            "R$ " + value;
    }
}

/* =========================================================
   OCULTAR PÁGINAS
========================================================= */

function hideAllPages() {

    const pages = [
        pageHome,
        pageLogin,
        pageRegister,
        pageGames,
        pageAccount,
        pageGame
    ];

    pages.forEach(function (page) {

        if (page) {
            page.style.display = "none";
        }
    });
}

/* =========================================================
   CABEÇALHO
========================================================= */

function updateHeader(user) {

    const loggedUser =
        document.getElementById("logged-user");

    const username =
        document.getElementById("header-username");

    const headerBalance =
        document.getElementById("header-balance");

    const balanceValue =
        document.getElementById(
            "header-balance-value"
        );

    if (!user) {

        if (loggedUser) {
            loggedUser.style.display = "none";
        }

        if (headerBalance) {
            headerBalance.style.display = "none";
        }

        if (headerLogout) {
            headerLogout.style.display = "none";
        }

        if (loginButton) {
            loginButton.style.display =
                "inline-flex";
        }

        if (registerButton) {
            registerButton.style.display =
                "inline-flex";
        }

        [
            menuHome,
            menuGames,
            menuAccount
        ].forEach(function (element) {

            if (element) {
                element.style.setProperty(
                    "display",
                    "none",
                    "important"
                );
            }
        });

        return;
    }

    ensureDemoBalance();

    if (loggedUser) {
        loggedUser.style.display =
            "inline-flex";
    }

    if (username) {
        username.textContent =
            String(
                user.username || "JOGADOR"
            ).toUpperCase();
    }

    if (headerBalance) {
        headerBalance.style.display =
            "inline-flex";
    }

    if (balanceValue) {
        balanceValue.textContent =
            formatMoney(
                user.demoBalance
            );
    }

    if (loginButton) {
        loginButton.style.display = "none";
    }

    if (registerButton) {
        registerButton.style.display = "none";
    }

    if (headerLogout) {
        headerLogout.style.display =
            "inline-flex";
    }

    [
        menuHome,
        menuGames,
        menuAccount
    ].forEach(function (element) {

        if (element) {
            element.style.setProperty(
                "display",
                "inline-flex",
                "important"
            );
        }
    });
}

/* =========================================================
   PÁGINAS
========================================================= */

function showHome() {

    hideAllPages();

    if (header) {
        header.style.display = "grid";
    }

    if (pageHome) {
        pageHome.style.display = "block";
    }

    updateHeader(currentUser);

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function showLogin() {

    hideAllPages();

    if (header) {
        header.style.display = "none";
    }

    if (pageLogin) {
        pageLogin.style.display = "flex";
    }

    showLoginForm();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function showRegister() {

    hideAllPages();

    if (header) {
        header.style.display = "none";
    }

    if (pageRegister) {
        pageRegister.style.display = "flex";
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function showGames(user) {

    if (user) {
        currentUser = user;
    }

    ensureDemoBalance();

    hideAllPages();

    if (header) {
        header.style.display = "grid";
    }

    if (pageGames) {
        pageGames.style.display = "block";
    }

    updateHeader(currentUser);
    updateAccountData(currentUser);

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function showAccount(user) {

    if (user) {
        currentUser = user;
    }

    ensureDemoBalance();

    hideAllPages();

    if (header) {
        header.style.display = "grid";
    }

    if (pageAccount) {
        pageAccount.style.display = "flex";
    }

    updateHeader(currentUser);
    updateAccountData(currentUser);

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function showGame(user) {

    if (user) {
        currentUser = user;
    }

    ensureDemoBalance();

    hideAllPages();

    if (header) {
        header.style.display = "none";
    }

    if (pageGame) {
        pageGame.style.display = "flex";
    }

    updateAccountData(currentUser);
    updateGameVisuals();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* =========================================================
   CONTA
========================================================= */

function updateAccountData(user) {

    if (!user) {
        return;
    }

    ensureDemoBalance();

    const accountUsername =
        document.getElementById(
            "account-username"
        );

    const accountBalance =
        document.getElementById(
            "account-balance"
        );

    const balance =
        document.getElementById("balance");

    if (accountUsername) {
        accountUsername.textContent =
            String(
                user.username || "JOGADOR"
            ).toUpperCase();
    }

    if (accountBalance) {
        accountBalance.textContent =
            "R$ " +
            formatMoney(
                user.demoBalance
            );
    }

    if (balance) {
        balance.textContent =
            formatMoney(
                user.demoBalance
            );
    }
}

/* =========================================================
   VISUAL DO JOGO
========================================================= */

function updateGameVisuals() {

    ensureDemoBalance();

    updateDemoBalanceVisual();
    updateTurboButton();
}

/* =========================================================
   USUÁRIO ATUAL
========================================================= */

async function loadCurrentUser() {

    if (!token) {

        currentUser = null;

        return null;
    }

    try {

        const response =
            await fetch(
                "/api/me",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        if (!response.ok) {

            localStorage.removeItem("token");

            token = null;
            currentUser = null;

            return null;
        }

        currentUser =
            await response.json();

        ensureDemoBalance();
        saveDemoBalance();

        return currentUser;

    } catch (error) {

        console.error(
            "Erro ao carregar usuário:",
            error
        );

        return null;
    }
}

/* =========================================================
   FORMULÁRIO DE LOGIN
========================================================= */

function showLoginForm() {

    document
        .querySelectorAll(".login-field")
        .forEach(function (field) {

            field.style.display = "block";
        });

    if (loginSubmit) {
        loginSubmit.style.display = "flex";
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.style.display =
            "block";
    }

    document
        .querySelectorAll(".login-footer")
        .forEach(function (element) {

            if (
                element.classList.contains(
                    "auth-footer"
                )
            ) {

                element.style.display = "block";

            } else {

                element.style.display =
                    "inline-block";
            }
        });

    if (forgotPasswordView) {
        forgotPasswordView.style.display =
            "none";
    }
}

/* =========================================================
   RECUPERAÇÃO
========================================================= */

function showForgotPassword() {

    document
        .querySelectorAll(".login-field")
        .forEach(function (field) {

            field.style.display = "none";
        });

    if (loginSubmit) {
        loginSubmit.style.display = "none";
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.style.display =
            "none";
    }

    document
        .querySelectorAll(".login-footer")
        .forEach(function (element) {

            element.style.display = "none";
        });

    if (forgotPasswordView) {
        forgotPasswordView.style.display =
            "block";
    }

    if (forgotMessage) {
        forgotMessage.textContent = "";
    }

    if (resetCodeArea) {
        resetCodeArea.style.display = "none";
    }

    if (forgotEmail) {
        forgotEmail.focus();
    }
}

/* =========================================================
   NAVEGAÇÃO
========================================================= */

if (loginButton) {
    loginButton.addEventListener(
        "click",
        showLogin
    );
}

if (registerButton) {
    registerButton.addEventListener(
        "click",
        showRegister
    );
}

if (goRegister) {
    goRegister.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            showRegister();
        }
    );
}

if (goLogin) {
    goLogin.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            showLogin();
        }
    );
}

if (backHomeLogin) {
    backHomeLogin.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            showHome();
        }
    );
}

if (backHomeRegister) {
    backHomeRegister.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            showHome();
        }
    );
}

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            showForgotPassword();
        }
    );
}

if (backToLogin) {
    backToLogin.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            showLoginForm();
        }
    );
}

/* =========================================================
RECUPERAÇÃO DE SENHA
========================================================= */

if (sendResetCode) {

    sendResetCode.addEventListener(
        "click",
        async function () {

            const email =
                forgotEmail?.value
                    .trim()
                    .toLowerCase();

            if (
                !email ||
                !email.includes("@")
            ) {

                if (forgotMessage) {
                    forgotMessage.textContent =
                        "Digite um e-mail válido.";
                }

                return;
            }

            sendResetCode.disabled = true;
            sendResetCode.textContent =
                "ENVIANDO...";

            try {

                const response =
                    await fetch(
                        "/api/forgot-password",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    email: email
                                })
                        }
                    );

                let data = {};

                try {
                    data =
                        await response.json();
                } catch (_) {}

                if (!response.ok) {

                    if (forgotMessage) {
                        forgotMessage.textContent =
                            data.error ||
                            "Não foi possível enviar o código.";
                    }

                    return;
                }

                if (forgotMessage) {
                    forgotMessage.textContent =
                        data.message ||
                        "Código enviado para o seu e-mail.";
                }

                if (resetCodeArea) {
                    resetCodeArea.style.display =
                        "block";
                }

                /*
                 * Garante que a área da nova senha
                 * continue escondida até confirmar o código.
                 */
                if (newPasswordArea) {
                    newPasswordArea.style.display =
                        "none";
                }

                if (confirmResetCode) {
                    confirmResetCode.style.display =
                        "block";
                }

                if (resetCode) {
                    resetCode.focus();
                }

            } catch (error) {

                console.error(error);

                if (forgotMessage) {
                    forgotMessage.textContent =
                        "Não foi possível conectar ao servidor.";
                }

            } finally {

                sendResetCode.disabled = false;

                /*
                 * Não volta para ENVIAR CÓDIGO.
                 * Depois do primeiro envio permanece REENVIAR CÓDIGO.
                 */
                if (
                    sendResetCode.textContent ===
                    "ENVIANDO..."
                ) {
                    sendResetCode.textContent =
                        "REENVIAR CÓDIGO";
                }
            }
        }
    );
}


/* =========================================================
CONFIRMAR CÓDIGO
========================================================= */

if (confirmResetCode) {

    confirmResetCode.addEventListener(
        "click",
        async function () {

            const email =
                forgotEmail?.value
                    .trim()
                    .toLowerCase();

            const code =
                resetCode?.value
                    .trim();

            if (
                !email ||
                !email.includes("@")
            ) {

                if (forgotMessage) {
                    forgotMessage.textContent =
                        "Digite um e-mail válido.";
                }

                return;
            }

            if (
                !code ||
                code.length !== 6
            ) {

                if (forgotMessage) {
                    forgotMessage.textContent =
                        "Digite o código de 6 dígitos recebido.";
                }

                if (resetCode) {
                    resetCode.focus();
                }

                return;
            }

            confirmResetCode.disabled = true;
            confirmResetCode.textContent =
                "CONFIRMANDO...";

            try {

                const response =
                    await fetch(
                        "/api/verify-reset-code",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    email: email,
                                    code: code
                                })
                        }
                    );

                let data = {};

                try {
                    data =
                        await response.json();
                } catch (_) {}

                if (!response.ok) {

                    if (forgotMessage) {
                        forgotMessage.textContent =
                            data.error ||
                            "Código inválido ou expirado.";
                    }

                    return;
                }

                if (forgotMessage) {
                    forgotMessage.textContent =
                        "Código confirmado. Digite sua nova senha.";
                }

                /*
                 * Esconde o botão de confirmar
                 * porque o código já foi validado.
                 */
                confirmResetCode.style.display =
                    "none";

                /*
                 * Mostra os campos de nova senha.
                 */
                if (newPasswordArea) {
                    newPasswordArea.style.display =
                        "block";
                }

                if (newPassword) {
                    newPassword.focus();
                }

            } catch (error) {

                console.error(error);

                if (forgotMessage) {
                    forgotMessage.textContent =
                        "Não foi possível conectar ao servidor.";
                }

            } finally {

                confirmResetCode.disabled = false;
                confirmResetCode.textContent =
                    "CONFIRMAR CÓDIGO";
            }
        }
    );
}


/* =========================================================
ALTERAR SENHA
========================================================= */


if (resetPasswordSubmit) {

    resetPasswordSubmit.addEventListener(
        "click",
        async function () {

            const email =
                forgotEmail?.value
                    .trim()
                    .toLowerCase();

            const code =
                resetCode?.value.trim();

            const password =
                newPassword?.value || "";

            const confirmation =
                newPasswordConfirm?.value || "";

            if (
                !email ||
                !code ||
                !password ||
                !confirmation
            ) {

                if (forgotMessage) {
                    forgotMessage.textContent =
                        "Preencha todos os campos.";
                }

                return;
            }

            if (code.length !== 6) {

                if (forgotMessage) {
                    forgotMessage.textContent =
                        "Digite o código de 6 dígitos.";
                }

                return;
            }

            if (password.length < 6) {

                if (forgotMessage) {
                    forgotMessage.textContent =
                        "A nova senha precisa ter pelo menos 6 caracteres.";
                }

                return;
            }

            if (password !== confirmation) {

                if (forgotMessage) {
                    forgotMessage.textContent =
                        "As senhas não são iguais.";
                }

                return;
            }

            resetPasswordSubmit.disabled = true;
            resetPasswordSubmit.textContent =
                "ALTERANDO...";

            try {

                const response =
                    await fetch(
                        "/api/reset-password",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    email,
                                    code,
                                    password
                                })
                        }
                    );

                let data = {};

                try {
                    data =
                        await response.json();
                } catch (_) {}

                if (!response.ok) {

                    if (forgotMessage) {
                        forgotMessage.textContent =
                            data.error ||
                            "Não foi possível alterar a senha.";
                    }

                    return;
                }

                if (forgotMessage) {
                    forgotMessage.textContent =
                        "Senha alterada com sucesso!";
                }

                setTimeout(
                    function () {

                        showLoginForm();

                        const loginMessage =
                            document.getElementById(
                                "login-message"
                            );

                        if (loginMessage) {
                            loginMessage.textContent =
                                "Senha alterada com sucesso. Entre com sua nova senha.";
                        }

                    },
                    900
                );

            } catch (error) {

                console.error(error);

                if (forgotMessage) {
                    forgotMessage.textContent =
                        "Não foi possível conectar ao servidor.";
                }

            } finally {

                resetPasswordSubmit.disabled = false;
                resetPasswordSubmit.textContent =
                    "ALTERAR SENHA";
            }
        }
    );
}

/* =========================================================
   CADASTRO
========================================================= */

if (registerSubmit) {

    registerSubmit.addEventListener(
        "click",
        async function () {

            const username =
                document
                    .getElementById(
                        "register-username"
                    )
                    ?.value.trim();

            const email =
                document
                    .getElementById(
                        "register-email"
                    )
                    ?.value
                    .trim()
                    .toLowerCase();

            const password =
                document
                    .getElementById(
                        "register-password"
                    )
                    ?.value || "";

            const confirmation =
                document
                    .getElementById(
                        "register-password-confirm"
                    )
                    ?.value || "";

            const message =
                document.getElementById(
                    "register-message"
                );

            if (message) {
                message.textContent = "";
            }

            if (
                !username ||
                !email ||
                !password ||
                !confirmation
            ) {

                if (message) {
                    message.textContent =
                        "Preencha todos os campos.";
                }

                return;
            }

            if (!email.includes("@")) {

                if (message) {
                    message.textContent =
                        "Digite um e-mail válido.";
                }

                return;
            }

            if (password.length < 6) {

                if (message) {
                    message.textContent =
                        "A senha precisa ter pelo menos 6 caracteres.";
                }

                return;
            }

            if (password !== confirmation) {

                if (message) {
                    message.textContent =
                        "As senhas não são iguais.";
                }

                return;
            }

            registerSubmit.disabled = true;
            registerSubmit.textContent =
                "CRIANDO...";

            try {

                const response =
                    await fetch(
                        "/api/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    username,
                                    email,
                                    password
                                })
                        }
                    );

                let data = {};

                try {
                    data =
                        await response.json();
                } catch (_) {}

                if (!response.ok) {

                    if (message) {
                        message.textContent =
                            data.error ||
                            "Erro ao criar conta.";
                    }

                    return;
                }

                token =
                    data.token || null;

                if (token) {
                    localStorage.setItem(
                        "token",
                        token
                    );
                }

                currentUser =
                    data.user || null;

                if (currentUser) {

                    currentUser.demoBalance =
                        DEMO_START_BALANCE;

                    saveDemoBalance();

                    showGames(currentUser);

                } else {

                    showLogin();
                }

            } catch (error) {

                console.error(error);

                if (message) {
                    message.textContent =
                        "Não foi possível conectar ao servidor.";
                }

            } finally {

                registerSubmit.disabled = false;
                registerSubmit.textContent =
                    "CRIAR CONTA";
            }
        }
    );
}

/* =========================================================
   LOGIN
========================================================= */

if (loginSubmit) {

    loginSubmit.addEventListener(
        "click",
        async function () {

            const username =
                document
                    .getElementById(
                        "login-username"
                    )
                    ?.value.trim();

            const password =
                document
                    .getElementById(
                        "login-password"
                    )
                    ?.value || "";

            const message =
                document.getElementById(
                    "login-message"
                );

            if (message) {
                message.textContent = "";
            }

            if (!username || !password) {

                if (message) {
                    message.textContent =
                        "Digite usuário e senha.";
                }

                return;
            }

            loginSubmit.disabled = true;
            loginSubmit.textContent =
                "ENTRANDO...";

            try {

                const response =
                    await fetch(
                        "/api/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    username,
                                    password
                                })
                        }
                    );

                let data = {};

                try {
                    data =
                        await response.json();
                } catch (_) {}

                if (!response.ok) {

                    if (message) {
                        message.textContent =
                            data.error ||
                            "Usuário ou senha incorretos.";
                    }

                    return;
                }

                token =
                    data.token || null;

                if (token) {
                    localStorage.setItem(
                        "token",
                        token
                    );
                }

                currentUser =
                    data.user || null;

                if (currentUser) {

                    ensureDemoBalance();
                    saveDemoBalance();

                    showGames(currentUser);

                } else {

                    const user =
                        await loadCurrentUser();

                    if (user) {
                        showGames(user);
                    } else {
                        showHome();
                    }
                }

            } catch (error) {

                console.error(error);

                if (message) {
                    message.textContent =
                        "Não foi possível conectar ao servidor.";
                }

            } finally {

                loginSubmit.disabled = false;
                loginSubmit.textContent =
                    "ENTRAR";
            }
        }
    );
}

/* =========================================================
   HERO
========================================================= */

if (heroPlay) {

    heroPlay.addEventListener(
        "click",
        async function () {

            if (!token) {
                showLogin();
                return;
            }

            const user =
                await loadCurrentUser();

            if (user) {
                showGames(user);
            } else {
                showLogin();
            }
        }
    );
}

if (heroGames) {

    heroGames.addEventListener(
        "click",
        async function () {

            if (!token) {

                const gamesSection =
                    document.querySelector(
                        ".games-section"
                    );

                if (gamesSection) {
                    gamesSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }

                return;
            }

            const user =
                await loadCurrentUser();

            if (user) {
                showGames(user);
            } else {
                showLogin();
            }
        }
    );
}

if (seeAllGames) {

    seeAllGames.addEventListener(
        "click",
        async function () {

            if (!token) {
                showLogin();
                return;
            }

            const user =
                await loadCurrentUser();

            if (user) {
                showGames(user);
            } else {
                showLogin();
            }
        }
    );
}

/* =========================================================
   MENU
========================================================= */

if (menuHome) {

    menuHome.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            if (!currentUser) {
                showLogin();
                return;
            }

            showHome();
        }
    );
}

if (menuGames) {

    menuGames.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();

            if (!token) {
                showLogin();
                return;
            }

            const user =
                await loadCurrentUser();

            if (user) {
                showGames(user);
            } else {
                showLogin();
            }
        }
    );
}

if (menuAccount) {

    menuAccount.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();

            if (!token) {
                showLogin();
                return;
            }

            const user =
                await loadCurrentUser();

            if (user) {
                showAccount(user);
            } else {
                showLogin();
            }
        }
    );
}

/* =========================================================
   JOGO
========================================================= */

async function openGame() {

    if (!token) {
        showLogin();
        return;
    }

    const user =
        await loadCurrentUser();

    if (user) {
        showGame(user);
    } else {
        showLogin();
    }
}

if (gameTiger) {
    gameTiger.addEventListener(
        "click",
        openGame
    );
}

if (gamesTiger) {
    gamesTiger.addEventListener(
        "click",
        openGame
    );
}

if (accountGames) {

    accountGames.addEventListener(
        "click",
        async function () {

            const user =
                await loadCurrentUser();

            if (user) {
                showGames(user);
            } else {
                showLogin();
            }
        }
    );
}

if (backToGames) {

    backToGames.addEventListener(
        "click",
        async function () {

            const user =
                await loadCurrentUser();

            if (user) {
                showGames(user);
            } else {
                showLogin();
            }
        }
    );
}

/* =========================================================
   TURBO
========================================================= */

function updateTurboButton() {

    if (!turboButton) {
        return;
    }

    turboButton.classList.remove(
        "turbo-active",
        "super-turbo"
    );

    turboButton.dataset.mode =
        "normal";

    if (turboLevel === 1) {

        turboButton.classList.add(
            "turbo-active"
        );

        turboButton.dataset.mode =
            "turbo";

    } else if (turboLevel === 2) {

        turboButton.classList.add(
            "super-turbo"
        );

        turboButton.dataset.mode =
            "super";
    }
}

if (turboButton) {

    turboButton.addEventListener(
        "click",
        function () {

            turboLevel++;

            if (turboLevel > 2) {
                turboLevel = 0;
            }

            updateTurboButton();
        }
    );
}

/* =========================================================
   AUTO
========================================================= */

if (autoPlayButton) {

    autoPlayButton.addEventListener(
        "click",
        function () {

            if (autoPlaying) {

                autoCancelRequested = true;
                return;
            }

            if (!autoOptions) {
                return;
            }

            autoOptions.classList.toggle(
                "show"
            );

            autoPlayButton.classList.toggle(
                "active"
            );
        }
    );
}

/* =========================================================
   SLOTS
========================================================= */

function spinSlots() {

    return new Promise(function (resolve) {

        const slots = [
            document.getElementById("slot1"),
            document.getElementById("slot2"),
            document.getElementById("slot3")
        ];

        const validSlots =
            slots.filter(function (slot) {
                return !!slot;
            });

        if (!validSlots.length) {
            resolve([]);
            return;
        }

        let durations;

        if (turboLevel === 0) {

            durations = [
                900,
                1250,
                1600
            ];

        } else if (turboLevel === 1) {

            durations = [
                350,
                500,
                650
            ];

        } else {

            durations = [
                100,
                130,
                160
            ];
        }

        const finalSymbols = [
            slotSymbols[
                Math.floor(
                    Math.random() *
                    slotSymbols.length
                )
            ],
            slotSymbols[
                Math.floor(
                    Math.random() *
                    slotSymbols.length
                )
            ],
            slotSymbols[
                Math.floor(
                    Math.random() *
                    slotSymbols.length
                )
            ]
        ];

        let finished = 0;

        validSlots.forEach(
            function (slot, index) {

                if (turboLevel === 2) {

                    slot.textContent =
                        finalSymbols[index];

                    finished++;

                    if (
                        finished ===
                        validSlots.length
                    ) {
                        resolve(finalSymbols);
                    }

                    return;
                }

                const duration =
                    durations[index] ||
                    durations[
                        durations.length - 1
                    ];

                const start = Date.now();

                const timer =
                    setInterval(
                        function () {

                            const randomIndex =
                                Math.floor(
                                    Math.random() *
                                    slotSymbols.length
                                );

                            slot.textContent =
                                slotSymbols[
                                    randomIndex
                                ];

                            if (
                                Date.now() -
                                start >=
                                duration
                            ) {

                                clearInterval(timer);

                                slot.textContent =
                                    finalSymbols[index];

                                finished++;

                                if (
                                    finished ===
                                    validSlots.length
                                ) {
                                    resolve(
                                        finalSymbols
                                    );
                                }
                            }

                        },
                        turboLevel === 1
                            ? 35
                            : 70
                    );
            }
        );
    });
}

/* =========================================================
   PROCESSAR RESULTADO DA RODADA
========================================================= */

function processDemoResult(symbols, bet) {

    if (
        !symbols ||
        symbols.length !== 3 ||
        !currentUser
    ) {
        return null;
    }

    ensureDemoBalance();

    console.log("SALDO ATUAL:", currentUser.demoBalance);

    bet = Number(bet);

    if (
        !Number.isFinite(bet) ||
        bet <= 0 ||
        bet > DEMO_MAX_BET
    ) {
        return null;
    }

    /*
       O VALOR DA APOSTA É DESCONTADO
       ANTES DO RESULTADO.
    */

    currentUser.demoBalance -= bet;

    console.log("=== TESTE DE SALDO ===");
    console.log("Saldo antes do débito:", currentUser.demoBalance + bet);
    console.log("Valor informado:", bet);
    console.log("Saldo depois do débito:", currentUser.demoBalance);

    saveDemoBalance();
    updateDemoBalanceVisual();

    let payout = 0;
    let multiplier = 0;
    let resultType = "lose";

    /*
       TRÊS SÍMBOLOS IGUAIS

       🐯 TIGRE = 50x
       💰 MOEDA = 30x
       🍒 CEREJA = 20x
       💎 DIAMANTE = 15x
       🔔 SINO = 10x
       7️⃣ SETE = 5x
    */

    if (
        symbols[0] === symbols[1] &&
        symbols[1] === symbols[2]
    ) {

        const tripleMultipliers = {

            "🐯": 50,
            "💰": 30,
            "🍒": 20,
            "💎": 15,
            "🔔": 10,
            "7️⃣": 5

        };

        multiplier =
            tripleMultipliers[symbols[0]] || 0;

        payout =
            bet * multiplier;

        resultType = "triple";

    } else {

        /*
           DUAS IGUAIS

           Mantém uma premiação menor.
        */

        let pairSymbol = null;

        if (symbols[0] === symbols[1]) {
            pairSymbol = symbols[0];

        } else if (symbols[1] === symbols[2]) {
            pairSymbol = symbols[1];

        } else if (symbols[0] === symbols[2]) {
            pairSymbol = symbols[0];
        }

        if (pairSymbol) {

            const pairMultipliers = {

                "🐯": 5,
                "💰": 3,
                "🍒": 2,
                "💎": 1.5,
                "🔔": 1,
                "7️⃣": 0.5

            };

            multiplier =
                pairMultipliers[pairSymbol] || 0;

            payout =
                Math.floor(
                    bet * multiplier
                );

            resultType = "pair";
        }
    }

    /*
       ADICIONA O PRÊMIO AO SALDO.
    */

    currentUser.demoBalance += payout;

    saveDemoBalance();
    updateDemoBalanceVisual();

    return {
        bet: bet,
        payout: payout,
        multiplier: multiplier,
        type: resultType
    };
}

/* =========================================================
   RODADA
========================================================= */

async function playDemoRound() {

    if (spinning) {
        return false;
    }

    if (!token || !currentUser) {
        showLogin();
        return false;
    }

    ensureDemoBalance();

    /*
       PEGA O VALOR DIGITADO PELO USUÁRIO.
    */

    const betInput =
        document.getElementById("bet");

    let bet =
        Number(
            betInput?.value || 0
        );

    /*
       VALIDA A APOSTA.
    */

    if (
        !Number.isFinite(bet) ||
        bet <= 0
    ) {

        const message =
            document.getElementById(
                "game-message"
            );

        if (message) {
            message.textContent =
                "Digite um valor de aposta válido.";
        }

        return false;
    }

    if (bet > DEMO_MAX_BET) {

        const message =
            document.getElementById(
                "game-message"
            );

        if (message) {
            message.textContent =
                "A aposta máxima é de 100.000 pontos.";
        }

        return false;
    }

    /*
       NÃO PERMITE APOSTAR MAIS DO QUE O SALDO.
    */

    if (
        currentUser.demoBalance < bet
    ) {

        const message =
            document.getElementById(
                "game-message"
            );

        if (message) {
            message.textContent =
                "Saldo demo insuficiente para essa aposta.";
        }

        return false;
    }

    spinning = true;

    if (playButton) {

        playButton.disabled = true;

        if (!autoPlaying) {
            playButton.textContent =
                "GIRANDO...";
        }
    }

    const message =
        document.getElementById(
            "game-message"
        );

    try {

        if (message) {
            message.textContent =
                "Boa sorte!";
        }

        /*
           GIRA OS SÍMBOLOS.
        */

        const symbols =
            await spinSlots();

        /*
           CALCULA O RESULTADO
           UTILIZANDO A APOSTA DIGITADA.
        */

        const result =
            processDemoResult(
                symbols,
                bet
            );

        if (!result) {
            return false;
        }

        /*
           RESULTADO: TRÊS IGUAIS
        */

        if (result.type === "triple") {

            if (message) {

                message.textContent =
                    "🎉 COMBINAÇÃO TRIPLA! " +
                    result.payout.toLocaleString("pt-BR") +
                    " Reais!";
            }

        /*
           RESULTADO: DUAS IGUAIS
        */

        } else if (result.type === "pair") {

            if (message) {

                message.textContent =
                    "✨ DUAS IGUAIS! +" +
                    result.payout.toLocaleString("pt-BR") +
                    " Reais!";
            }

        /*
           SEM COMBINAÇÃO
        */

        } else {

            if (message) {

                message.textContent =
                    "Não foi dessa vez.";
            }
        }

        /*
           ATUALIZA TUDO NOVAMENTE.
        */

        updateDemoBalanceVisual();

        return true;

    } catch (error) {

        console.error(
            "Erro na rodada:",
            error
        );

        if (message) {
            message.textContent =
                "Não foi possível concluir a rodada.";
        }

        return false;

    } finally {

        spinning = false;

        if (
            playButton &&
            !autoPlaying
        ) {

            playButton.disabled = false;

            playButton.textContent =
                "JOGAR";
        }
    }
}

/* =========================================================
   RODADAS AUTOMÁTICAS
========================================================= */

async function startAutoRounds(rounds) {

    if (autoPlaying || spinning) {
        return;
    }

    rounds = Number(rounds);

/*
   Permite Infinity somente para a modalidade
   de rodadas infinitas.
*/
const infiniteRounds = rounds === Infinity;

if (
    (!infiniteRounds && !Number.isFinite(rounds)) ||
    rounds <= 0
) {
    return;
}

    if (!currentUser || !token) {
        showLogin();
        return;
    }

    ensureDemoBalance();

    /*
       O AUTO UTILIZA A MESMA APOSTA
       INFORMADA NO CAMPO "bet".
    */

    const betInput =
        document.getElementById("bet");

    const bet =
        Number(
            betInput?.value || 0
        );

    if (
        !Number.isFinite(bet) ||
        bet <= 0
    ) {

        const message =
            document.getElementById(
                "game-message"
            );

        if (message) {
            message.textContent =
                "Digite um valor de aposta válido.";
        }

        return;
    }

    if (bet > DEMO_MAX_BET) {

        const message =
            document.getElementById(
                "game-message"
            );

        if (message) {
            message.textContent =
                "A aposta máxima é de 500,00 Reais.";
        }

        return;
    }

    if (currentUser.demoBalance < bet) {

        const message =
            document.getElementById(
                "game-message"
            );

        if (message) {
            message.textContent =
                "Saldo demo insuficiente para essa aposta.";
        }

        return;
    }

    autoPlaying = true;
    autoRounds = rounds;
    autoCancelRequested = false;

    if (autoPlayButton) {

        autoPlayButton.classList.add(
            "active"
        );

        autoPlayButton.innerHTML =
            "⏸️";
    }

    if (playButton) {

        playButton.disabled = false;
        playButton.textContent =
            "JOGAR";
    }

    const message =
        document.getElementById(
            "game-message"
        );

    try {

        for (
            let round = 1;
            round <= rounds;
            round++
        ) {

            /*
               CANCELAMENTO ANTES DA RODADA.
            */

            if (autoCancelRequested) {
                break;
            }

            /*
               VERIFICA O SALDO ANTES DE CADA RODADA.
            */

            if (
                !currentUser ||
                currentUser.demoBalance < bet
            ) {

                if (message) {
                    message.textContent =
                        "Saldo insuficiente.";
                }

                break;
            }

            if (message) {

                message.textContent =
                    "RODADA " +
                    round +
                    " DE " +
                    rounds;
            }

            await new Promise(
                function (resolve) {

                    setTimeout(
                        resolve,
                        turboLevel === 2
                            ? 150
                            : 350
                    );
                }
            );

            /*
               CANCELAMENTO DURANTE A ESPERA.
            */

            if (autoCancelRequested) {
                break;
            }

            /*
               EXECUTA A RODADA NORMAL.
               playDemoRound() usa o mesmo
               valor do campo "bet".
            */

            const result =
                await playDemoRound();

            /*
               SE A RODADA NÃO PÔDE SER EXECUTADA,
               ENCERRA O AUTO.
            */

            if (!result) {
                break;
            }

            /*
               PERMITE CANCELAR LOGO APÓS A RODADA.
            */

            if (autoCancelRequested) {
                break;
            }

            /*
               ESPERA ENTRE AS RODADAS.
            */

            if (round < rounds) {

                await new Promise(
                    function (resolve) {

                        setTimeout(
                            resolve,
                            turboLevel === 2
                                ? 150
                                : 400
                        );
                    }
                );
            }
        }

    } catch (error) {

        console.error(
            "Erro nas rodadas automáticas:",
            error
        );

        if (message) {
            message.textContent =
                "Rodadas automáticas encerradas.";
        }

    } finally {

        /*
           SEMPRE LIBERA O AUTO.
           ISSO É O MAIS IMPORTANTE.
        */

        const saldoInsuficiente =
            currentUser &&
            currentUser.demoBalance < bet;

        stopAutoRounds(
            !saldoInsuficiente &&
            !autoCancelRequested
        );

        /*
           GARANTE QUE O ESTADO FIQUE LIMPO
           MESMO SE HOUVER ALGUM ERRO.
        */

        autoPlaying = false;
        autoRounds = 0;
        autoCancelRequested = false;
        spinning = false;

        if (autoPlayButton) {

            autoPlayButton.classList.remove(
                "active"
            );

            autoPlayButton.innerHTML =
                autoPlayDefaultContent;
        }

        if (autoOptions) {

            autoOptions.classList.remove(
                "show"
            );
        }

        if (playButton) {

            playButton.disabled = false;
            playButton.textContent =
                "JOGAR";
        }
    }
}

/* =========================================================
   PARAR AUTO
========================================================= */

function stopAutoRounds(
    showMessage = true
) {

    autoPlaying = false;
    autoRounds = 0;
    autoCancelRequested = false;

    if (autoPlayButton) {

        autoPlayButton.classList.remove(
            "active"
        );

        autoPlayButton.innerHTML =
            autoPlayDefaultContent;
    }

    if (autoOptions) {
        autoOptions.classList.remove(
            "show"
        );
    }

    if (playButton) {

        playButton.disabled = false;
        playButton.textContent =
            "JOGAR";
    }

    if (showMessage) {

        const message =
            document.getElementById(
                "game-message"
            );

        if (message) {
            message.textContent =
                "Rodadas automáticas encerradas.";
        }
    }
}


/* =========================================================
SELETOR DE BET
========================================================= */

(function () {

    const betButton =
        document.getElementById("bet-button");

    const betOptions =
        document.getElementById("bet-options");

    const betInput =
        document.getElementById("bet");

    const betValue =
        document.getElementById("bet-value");

    if (!betButton || !betOptions || !betInput || !betValue) {
        return;
    }

    betButton.addEventListener("click", function (event) {

        event.stopPropagation();

        betOptions.classList.toggle("show");

    });

    betOptions
        .querySelectorAll("[data-bet]")
        .forEach(function (button) {

            button.addEventListener("click", function (event) {

                event.stopPropagation();

                const value =
                    Number(button.dataset.bet);

                if (
                    !Number.isFinite(value) ||
                    value <= 0 ||
                    value > 500
                ) {
                    return;
                }

                betInput.value = String(value);

                betValue.textContent =
                    value.toFixed(2).replace(".", ",");

                betOptions.classList.remove("show");

            });

        });

    document.addEventListener("click", function () {

        betOptions.classList.remove("show");

    });

})();

/* =========================================================
   OPÇÕES AUTO
========================================================= */

if (autoOptions) {

    autoOptions
        .querySelectorAll("button")
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();

                    /*
                       DETECTA O BOTÃO DE RODADAS INFINITAS.
                    */

                    const buttonText =
                        button.textContent
                            .trim()
                            .toLowerCase();

                    const isInfinite =
                        buttonText === "∞" ||
                        buttonText.includes("infin");

                    /*
                       MODO INFINITO
                    */

                    if (isInfinite) {

                        autoOptions.classList.remove(
                            "show"
                        );

                        if (autoPlayButton) {
                            autoPlayButton.classList.add(
                                "active"
                            );
                        }

                        startAutoRounds(Infinity);

                        return;
                    }

                    /*
                       RODADAS NORMAIS
                    */

                    const value =
                        Number(
                            button.dataset.rounds ||
                            button.dataset.value ||
                            button.value ||
                            button.textContent
                                .replace(/\D/g, "")
                        );

                    if (
                        !Number.isFinite(value) ||
                        value <= 0
                    ) {
                        return;
                    }

                    autoOptions.classList.remove(
                        "show"
                    );

                    if (autoPlayButton) {
                        autoPlayButton.classList.remove(
                            "active"
                        );
                    }

                    startAutoRounds(value);
                }
            );
        });
}

/* =========================================================
   JOGAR
========================================================= */

if (playButton) {

    playButton.addEventListener(
        "click",
        async function () {

            if (autoPlaying) {

                autoCancelRequested = true;
                return;
            }

            await playDemoRound();
        }
    );
}

/* =========================================================
   LOGOUT
========================================================= */

function logout() {

    autoCancelRequested = true;
    autoPlaying = false;
    autoRounds = 0;
    spinning = false;

    localStorage.removeItem("token");

    token = null;
    currentUser = null;

    if (playButton) {

        playButton.disabled = false;
        playButton.textContent =
            "JOGAR";
    }

    if (autoPlayButton) {

        autoPlayButton.classList.remove(
            "active"
        );

        autoPlayButton.innerHTML =
            autoPlayDefaultContent;
    }

    if (autoOptions) {
        autoOptions.classList.remove(
            "show"
        );
    }

    showHome();
}

if (headerLogout) {
    headerLogout.addEventListener(
        "click",
        logout
    );
}

/* =========================================================
   ENTER
========================================================= */

const loginUsername =
    document.getElementById(
        "login-username"
    );

const loginPassword =
    document.getElementById(
        "login-password"
    );

if (loginUsername) {

    loginUsername.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" &&
                loginSubmit
            ) {
                loginSubmit.click();
            }
        }
    );
}

if (loginPassword) {

    loginPassword.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" &&
                loginSubmit
            ) {
                loginSubmit.click();
            }
        }
    );
}

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function initialize() {

    updateTurboButton();

    [
        menuHome,
        menuGames,
        menuAccount
    ].forEach(function (element) {

        if (element) {
            element.style.setProperty(
                "display",
                "none",
                "important"
            );
        }
    });

    if (headerLogout) {
        headerLogout.style.display = "none";
    }

    if (autoPlayButton) {
        autoPlayButton.innerHTML =
            autoPlayDefaultContent;
    }

    if (!token) {

        currentUser = null;
        showHome();

        return;
    }

    const user =
        await loadCurrentUser();

    if (!user) {

        showHome();

        return;
    }

    ensureDemoBalance();
    saveDemoBalance();

    showHome();
    updateHeader(user);
}

initialize();

});



