document.addEventListener("DOMContentLoaded", function () {

const form = document.getElementById("registerForm");
const message = document.getElementById("registerMessage");

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    message.textContent = "";

    if (password !== confirmPassword) {
        message.textContent = "As senhas não são iguais.";
        return;
    }

    if (password.length < 6) {
        message.textContent = "A senha precisa ter pelo menos 6 caracteres.";
        return;
    }

    message.textContent = "Criando sua conta...";

    try {

        const response = await fetch("http://localhost:8080/api/register", {
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
            message.textContent = data.error || "Não foi possível criar a conta.";
            return;
        }

        message.textContent = "Conta criada com sucesso!";

        form.reset();

    } catch (error) {

        console.error(error);

        message.textContent =
            "Não foi possível conectar ao servidor.";

    }

});

});