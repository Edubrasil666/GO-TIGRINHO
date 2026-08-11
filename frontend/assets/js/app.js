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

/* =========================================================
   CONFIGURAÇÃO DO DEMO
========================================================= */

const DEMO_START_BALANCE = 10000;
const DEMO_MAX_BET = 500;

/*
 * IMPORTANTE:
 *
 * NÃO existe mais saldo salvo em localStorage.
 *
 * O saldo oficial é SEMPRE o saldo retornado
 * pelo servidor através de /api/me e /api/demo/balance.
 */

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
   ATUALIZAR SALDO NO SERVIDOR
========================================================= */

/*
 * Esta é a função PRINCIPAL de saldo.
 *
 * O navegador envia somente a alteração.
 *
 * Exemplo:
 *
 * delta = -10
 *
 * servidor:
 * 10000 - 10 = 9990
 *
 * Depois o servidor devolve:
 *
 * balance: 9990
 *
 * currentUser recebe exatamente esse valor.
 */

async function changeServerBalance(delta) {

    if (!token) {
        return null;
    }

    const value = Number(delta);

    if (!Number.isFinite(value)) {
        console.error("Delta de saldo inválido:", delta);
        return null;
    }

    try {

        const response =
            await fetch(
                "/api/demo/balance",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + token
                    },

                    cache: "no-store",

                    body:
                        JSON.stringify({
                            delta: value
                        })
                }
            );

        let data = {};

        try {
            data = await response.json();
        } catch (_) {}

        if (!response.ok) {

            console.error(
                "Erro ao atualizar saldo:",
                data
            );

            return null;
        }

        /*
         * SERVIDOR É A FONTE OFICIAL.
         */

        if (
            data &&
            Number.isFinite(
                Number(data.balance)
            )
        ) {

            currentUser.balance =
                Number(data.balance);

            updateDemoBalanceVisual();
        }

        return data;

    } catch (error) {

        console.error(
            "Erro de conexão ao atualizar saldo:",
            error
        );

        return null;
    }
}

/* =========================================================
   SALDO DA CONTA
========================================================= */

async function refreshAccountFromServer() {

    if (!token) {
        return null;
    }

    try {

        const response =
            await fetch(
                "/api/me",
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            "Bearer " + token
                    },

                    cache: "no-store"
                }
            );

        if (!response.ok) {

            console.error(
                "Erro ao consultar a conta:",
                response.status
            );

            if (
                response.status === 401 ||
                response.status === 403
            ) {

                localStorage.removeItem("token");

                token = null;
                currentUser = null;
            }

            return null;
        }

        const user =
            await response.json();

        /*
         * O servidor é a fonte oficial.
         */

        currentUser = user;

        updateDemoBalanceVisual();
        updateHeader(currentUser);
        updateAccountData(currentUser);

        return currentUser;

    } catch (error) {

        console.error(
            "Erro ao consultar o servidor:",
            error
        );

        return null;
    }
}

/* =========================================================
   SINCRONIZAÇÃO DO SALDO
========================================================= */

/*
 * Atualiza o saldo diretamente do servidor.
 *
 * Pode ser chamada sempre que abrirmos
 * a conta ou o jogo.
 */

async function syncBalance() {

    if (!token) {
        return null;
    }

    const user =
        await refreshAccountFromServer();

    if (user) {
        updateDemoBalanceVisual();
    }

    return user;
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
                user.balance
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

async function showGames(user) {

    if (user) {
        currentUser = user;
    }

    /*
     * Atualiza novamente pelo servidor.
     */

    if (token) {
        await syncBalance();
    }

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

async function showAccount(user) {

    if (user) {
        currentUser = user;
    }

    if (token) {
        await syncBalance();
    }

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

async function showGame(user) {

    if (user) {
        currentUser = user;
    }

    /*
     * Sempre entra no jogo com saldo
     * atualizado pelo servidor.
     */

    if (token) {
        await syncBalance();
    }

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
                user.balance
            );
    }

    if (balance) {
        balance.textContent =
            formatMoney(
                user.balance
            );
    }
}

/* =========================================================
   VISUAL DO JOGO
========================================================= */

function updateDemoBalanceVisual() {

    if (!currentUser) {
        return;
    }

    const serverBalance =
        Number(currentUser.balance);

    const value =
        formatMoney(
            Number.isFinite(serverBalance)
                ? serverBalance
                : 0
        );

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

    if (balance) {
        balance.textContent = value;
    }

    if (headerBalanceValue) {
        headerBalanceValue.textContent =
            value;
    }

    if (accountBalance) {
        accountBalance.textContent =
            "R$ " + value;
    }
}

/* =========================================================
   VISUAL DO JOGO
========================================================= */

function updateGameVisuals() {

    updateDemoBalanceVisual();
}

/* =========================================================
   USUÁRIO ATUAL
========================================================= */

async function loadCurrentUser() {

    if (!token) {

        currentUser = null;

        return null;
    }

    return await refreshAccountFromServer();
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

                element.style.display =
                    "block";

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

    if (newPasswordArea) {
        newPasswordArea.style.display = "none";
    }

    if (confirmResetCode) {
        confirmResetCode.style.display =
            "block";
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

                sendResetCode.textContent =
                    "REENVIAR CÓDIGO";
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

                confirmResetCode.style.display =
                    "none";

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

                /*
                 * Depois do cadastro,
                 * pega o saldo diretamente
                 * do banco.
                 */

                if (currentUser) {

                    await refreshAccountFromServer();

                    await showGames(
                        currentUser
                    );

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

                /*
                 * NÃO confia no saldo que veio
                 * apenas no login.
                 *
                 * Consulta novamente /api/me.
                 */

                currentUser =
                    data.user || null;

                const user =
                    await refreshAccountFromServer();

                if (user) {

                    currentUser = user;

                    await showGames(user);

                } else {

                    showHome();
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
                await showGames(user);
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
                await showGames(user);
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
                await showGames(user);
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
                await showGames(user);
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
                await showAccount(user);
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
        await showGame(user);
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
                await showGames(user);
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
                await showGames(user);
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

        /*
         * PESOS DOS SÍMBOLOS
         */

        const symbolWeights = [
            {
                symbol: "🐯",
                weight: 1
            },
            {
                symbol: "💰",
                weight: 5
            },
            {
                symbol: "🍒",
                weight: 15
            },
            {
                symbol: "💎",
                weight: 22
            },
            {
                symbol: "🔔",
                weight: 27
            },
            {
                symbol: "7️⃣",
                weight: 30
            }
        ];

        function randomSymbol() {

            const totalWeight =
                symbolWeights.reduce(
                    function (total, item) {
                        return total + item.weight;
                    },
                    0
                );

            let random =
                Math.random() *
                totalWeight;

            for (
                let i = 0;
                i < symbolWeights.length;
                i++
            ) {

                random -=
                    symbolWeights[i].weight;

                if (random <= 0) {
                    return symbolWeights[i].symbol;
                }
            }

            return "7️⃣";
        }

        let finalSymbols = [
            randomSymbol(),
            randomSymbol(),
            randomSymbol()
        ];

        /*
         * Redução adicional da ocorrência
         * de triplas.
         */

        if (
            finalSymbols[0] === finalSymbols[1] &&
            finalSymbols[1] === finalSymbols[2]
        ) {

            const allowTriple =
                Math.random() < 0.08;

            if (!allowTriple) {

                let replacement =
                    randomSymbol();

                while (
                    replacement ===
                    finalSymbols[0]
                ) {

                    replacement =
                        randomSymbol();
                }

                finalSymbols[2] =
                    replacement;
            }
        }

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

                const start =
                    Date.now();

                const timer =
                    setInterval(
                        function () {

                            slot.textContent =
                                randomSymbol();

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

/*
 * IMPORTANTE:
 *
 * Esta função agora é ASYNC.
 *
 * Ela:
 *
 * 1. desconta a aposta no servidor;
 * 2. calcula o resultado;
 * 3. adiciona o prêmio no servidor;
 * 4. atualiza currentUser;
 * 5. atualiza a tela.
 */

async function processDemoResult(
    symbols,
    bet
) {

    if (
        !symbols ||
        symbols.length !== 3 ||
        !currentUser ||
        !token
    ) {
        return null;
    }

    bet = Number(bet);

    if (
        !Number.isFinite(bet) ||
        bet <= 0 ||
        bet > DEMO_MAX_BET
    ) {
        return null;
    }

    /*
     * PRIMEIRO:
     * desconta a aposta no servidor.
     */

    const debit =
        await changeServerBalance(
            -bet
        );

    if (!debit) {

        console.error(
            "Não foi possível descontar a aposta."
        );

        return null;
    }

    let payout = 0;
    let multiplier = 0;
    let resultType = "lose";

    /*
     * TRÊS SÍMBOLOS IGUAIS
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
            tripleMultipliers[
                symbols[0]
            ] || 0;

        payout =
            bet * multiplier;

        resultType =
            "triple";

    } else {

        /*
         * DUAS IGUAIS
         */

        let pairSymbol = null;

        if (
            symbols[0] ===
            symbols[1]
        ) {

            pairSymbol =
                symbols[0];

        } else if (
            symbols[1] ===
            symbols[2]
        ) {

            pairSymbol =
                symbols[1];

        } else if (
            symbols[0] ===
            symbols[2]
        ) {

            pairSymbol =
                symbols[0];
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
                pairMultipliers[
                    pairSymbol
                ] || 0;

            payout =
                bet * multiplier;

            resultType =
                "pair";
        }
    }

    /*
     * SEGUNDO:
     *
     * Se ganhou, adiciona o prêmio
     * no servidor.
     */

    if (payout > 0) {

        const credit =
            await changeServerBalance(
                payout
            );

        if (!credit) {

            /*
             * Não atualiza saldo local
             * se o servidor rejeitar.
             */

            console.error(
                "Não foi possível creditar o prêmio."
            );

            /*
             * Reconsulta o saldo real.
             */

            await syncBalance();

            return null;
        }
    }

    /*
     * Busca novamente o saldo oficial.
     */

    await syncBalance();

    return {

        bet: bet,

        payout: payout,

        multiplier: multiplier,

        type: resultType,

        balance:
            currentUser
                ? currentUser.balance
                : 0
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

    /*
     * Antes de começar:
     * pega o saldo REAL do servidor.
     */

    const freshUser =
        await syncBalance();

    if (!freshUser) {
        return false;
    }

    const betInput =
        document.getElementById("bet");

    let bet =
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

        return false;
    }

    if (bet > DEMO_MAX_BET) {

        const message =
            document.getElementById(
                "game-message"
            );

        if (message) {

            message.textContent =
                "A aposta máxima é de R$ 500,00.";
        }

        return false;
    }

    if (
        Number(currentUser.balance) <
        bet
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

        const symbols =
            await spinSlots();

        const result =
            await processDemoResult(
                symbols,
                bet
            );

        if (!result) {
            return false;
        }

        if (
            result.type ===
            "triple"
        ) {

            if (message) {

                message.textContent =
                    "🎉 COMBINAÇÃO TRIPLA! +" +
                    formatMoney(
                        result.payout
                    ) +
                    " Reais!";
            }

        } else if (
            result.type ===
            "pair"
        ) {

            if (message) {

                message.textContent =
                    "✨ DUAS IGUAIS! +" +
                    formatMoney(
                        result.payout
                    ) +
                    " Reais!";
            }

        } else {

            if (message) {

                message.textContent =
                    "Não foi dessa vez.";
            }
        }

        /*
         * Atualiza visual novamente.
         */

        updateDemoBalanceVisual();

        return true;

    } catch (error) {

        console.error(
            "Erro na rodada:",
            error
        );

        /*
         * Em caso de erro,
         * busca o saldo verdadeiro.
         */

        await syncBalance();

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

            playButton.disabled =
                false;

            playButton.textContent =
                "JOGAR";
        }
    }
}

/* =========================================================
   RODADAS AUTOMÁTICAS
========================================================= */

async function startAutoRounds(
    rounds
) {

    if (
        autoPlaying ||
        spinning
    ) {
        return;
    }

    rounds =
        Number(rounds);

    const infiniteRounds =
        rounds === Infinity;

    if (
        !infiniteRounds &&
        !Number.isFinite(rounds)
    ) {
        return;
    }

    if (
        !infiniteRounds &&
        rounds <= 0
    ) {
        return;
    }

    if (
        !currentUser ||
        !token
    ) {

        showLogin();

        return;
    }

    /*
     * Atualiza saldo antes do AUTO.
     */

    await syncBalance();

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
                "A aposta máxima é de R$ 500,00.";
        }

        return;
    }

    if (
        Number(currentUser.balance) <
        bet
    ) {

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
            infiniteRounds ||
            round <= rounds;
            round++
        ) {

            if (autoCancelRequested) {
                break;
            }

            /*
             * IMPORTANTE:
             *
             * Sempre consulta o servidor
             * antes da próxima rodada.
             */

            const freshUser =
                await syncBalance();

            if (!freshUser) {
                break;
            }

            if (
                Number(currentUser.balance) <
                bet
            ) {

                if (message) {

                    message.textContent =
                        "Saldo insuficiente.";
                }

                break;
            }

            if (message) {

                if (infiniteRounds) {

                    message.textContent =
                        "RODADA " +
                        round;

                } else {

                    message.textContent =
                        "RODADA " +
                        round +
                        " DE " +
                        rounds;
                }
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

            if (autoCancelRequested) {
                break;
            }

            const result =
                await playDemoRound();

            if (!result) {
                break;
            }

            if (autoCancelRequested) {
                break;
            }

            if (
                infiniteRounds ||
                round < rounds
            ) {

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

        await syncBalance();

        if (message) {

            message.textContent =
                "Rodadas automáticas encerradas.";
        }

    } finally {

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

        /*
         * Última sincronização.
         */

        await syncBalance();
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
    autoCancelRequested = true;

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
        document.getElementById(
            "bet-button"
        );

    const betOptions =
        document.getElementById(
            "bet-options"
        );

    const betInput =
        document.getElementById(
            "bet"
        );

    const betValue =
        document.getElementById(
            "bet-value"
        );

    if (
        !betButton ||
        !betOptions ||
        !betInput ||
        !betValue
    ) {
        return;
    }

    betButton.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            betOptions.classList.toggle(
                "show"
            );
        }
    );

    betOptions
        .querySelectorAll(
            "[data-bet]"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function (event) {

                        event.stopPropagation();

                        const value =
                            Number(
                                button.dataset.bet
                            );

                        if (
                            !Number.isFinite(
                                value
                            ) ||
                            value <= 0 ||
                            value > DEMO_MAX_BET
                        ) {
                            return;
                        }

                        betInput.value =
                            String(value);

                        betValue.textContent =
                            value
                                .toFixed(2)
                                .replace(
                                    ".",
                                    ","
                                );

                        betOptions.classList.remove(
                            "show"
                        );
                    }
                );
            }
        );

    document.addEventListener(
        "click",
        function () {

            betOptions.classList.remove(
                "show"
            );
        }
    );

})();

/* =========================================================
   OPÇÕES AUTO
========================================================= */

if (autoOptions) {

    autoOptions
        .querySelectorAll("button")
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function (event) {

                        event.stopPropagation();

                        const buttonText =
                            button.textContent
                                .trim()
                                .toLowerCase();

                        const isInfinite =
                            buttonText === "∞" ||
                            buttonText.includes(
                                "infin"
                            );

                        if (isInfinite) {

                            autoOptions.classList.remove(
                                "show"
                            );

                            if (autoPlayButton) {

                                autoPlayButton.classList.add(
                                    "active"
                                );
                            }

                            startAutoRounds(
                                Infinity
                            );

                            return;
                        }

                        const value =
                            Number(
                                button.dataset.rounds ||
                                button.dataset.value ||
                                button.value ||
                                button.textContent
                                    .replace(
                                        /\D/g,
                                        ""
                                    )
                            );

                        if (
                            !Number.isFinite(
                                value
                            ) ||
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

                        startAutoRounds(
                            value
                        );
                    }
                );
            }
        );
}

/* =========================================================
   JOGAR
========================================================= */

if (playButton) {

    playButton.addEventListener(
        "click",
        async function () {

            if (autoPlaying) {

                autoCancelRequested =
                    true;

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

    autoCancelRequested =
        true;

    autoPlaying =
        false;

    autoRounds =
        0;

    spinning =
        false;

    /*
     * Remove SOMENTE o token.
     *
     * Não existe mais saldo local
     * para apagar.
     */

    localStorage.removeItem(
        "token"
    );

    token = null;
    currentUser = null;

    if (playButton) {

        playButton.disabled =
            false;

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
   SINCRONIZAÇÃO QUANDO A ABA VOLTA AO FOCO
========================================================= */

/*
 * Isso é importante para computador + celular.
 *
 * Se o saldo foi alterado em outro lugar,
 * quando esta página voltar a ficar ativa,
 * ela consulta /api/me novamente.
 */

document.addEventListener(
    "visibilitychange",
    async function () {

        if (
            document.visibilityState ===
            "visible"
        ) {

            if (token && !spinning) {

                await syncBalance();
            }
        }
    }
);

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
        headerLogout.style.display =
            "none";
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

    /*
     * NÃO usa saldo local.
     *
     * Busca tudo diretamente do servidor.
     */

    const user =
        await loadCurrentUser();

    if (!user) {

        showHome();

        return;
    }

    currentUser =
        user;

    updateDemoBalanceVisual();
    updateHeader(user);

    showHome();
}

initialize();

});