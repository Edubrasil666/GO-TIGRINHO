package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"net/smtp"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID       bson.ObjectID `bson:"_id,omitempty" json:"id"`
	Username string        `bson:"username" json:"username"`
	Email    string        `bson:"email" json:"email"`
	Password string        `bson:"password" json:"-"`

	Balance float64   `bson:"balance" json:"balance"`
	Created time.Time `bson:"created" json:"created"`

	ResetCode    string    `bson:"resetCode,omitempty" json:"-"`
	ResetExpires time.Time `bson:"resetExpires,omitempty" json:"-"`
}

type Bet struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    bson.ObjectID `bson:"userId" json:"userId"`
	Game      string        `bson:"game" json:"game"`
	Bet       int64         `bson:"bet" json:"bet"`
	Win       int64         `bson:"win" json:"win"`
	Result    any           `bson:"result" json:"result"`
	CreatedAt time.Time     `bson:"createdAt" json:"createdAt"`
}

var users *mongo.Collection
var bets *mongo.Collection

var jwtSecret = []byte(
	getenv(
		"JWT_SECRET",
		"dev-only-change-this-secret",
	),
)

func main() {
	uri := getenv(
		"MONGO_URI",
		"mongodb://localhost:27017",
	)

	dbName := getenv(
		"MONGO_DB",
		"tigrinho",
	)

	port := getenv(
		"PORT",
		"8080",
	)

	ctx, cancel := context.WithTimeout(
		context.Background(),
		15*time.Second,
	)

	defer cancel()

	client, err := mongo.Connect(
		options.Client().
			ApplyURI(uri),
	)

	if err != nil {
		fmt.Println(
			"Erro MongoDB:",
			err,
		)
		return
	}

	if err := client.Ping(
		ctx,
		nil,
	); err != nil {
		fmt.Println(
			"Erro ao conectar ao MongoDB:",
			err,
		)
		return
	}

	db := client.Database(dbName)

	users = db.Collection("users")
	bets = db.Collection("bets")

	mux := http.NewServeMux()

	mux.HandleFunc(
		"/api/register",
		register,
	)

	mux.HandleFunc(
		"/api/login",
		login,
	)

	mux.HandleFunc(
		"/api/forgot-password",
		forgotPassword,
	)

	mux.HandleFunc(
		"/api/verify-reset-code",
		verifyResetCode,
	)

	mux.HandleFunc(
		"/api/reset-password",
		resetPassword,
	)

	mux.HandleFunc(
		"/api/me",
		auth(me),
	)

	mux.HandleFunc(
		"/api/play/tiger",
		auth(playTiger),
	)

	mux.HandleFunc(
		"/api/history",
		auth(history),
	)

	frontendPath := filepath.Join(
		"..",
		"frontend",
	)

	mux.Handle(
		"/assets/",
		http.StripPrefix(
			"/assets/",
			http.FileServer(
				http.Dir(
					filepath.Join(
						frontendPath,
						"assets",
					),
				),
			),
		),
	)

	mux.HandleFunc(
		"/",
		func(
			w http.ResponseWriter,
			r *http.Request,
		) {
			if r.URL.Path != "/" {
				http.NotFound(
					w,
					r,
				)
				return
			}

			http.ServeFile(
				w,
				r,
				filepath.Join(
					frontendPath,
					"index.html",
				),
			)
		},
	)

	fmt.Println(
		"MongoDB conectado com sucesso.",
	)

	fmt.Println(
		"GO-TIGRINHO funcionando em http://localhost:" +
			port,
	)

	err = http.ListenAndServe(
		":"+port,
		cors(mux),
	)

	if err != nil {
		fmt.Println(
			"Erro:",
			err,
		)
	}
}

func getenv(
	key string,
	fallback string,
) string {
	value := os.Getenv(key)

	if value != "" {
		return value
	}

	return fallback
}

func writeJSON(
	w http.ResponseWriter,
	status int,
	value any,
) {
	w.Header().Set(
		"Content-Type",
		"application/json; charset=utf-8",
	)

	w.WriteHeader(status)

	_ = json.NewEncoder(w).
		Encode(value)
}

func readJSON(
	r *http.Request,
	value any,
) error {
	return json.NewDecoder(
		r.Body,
	).Decode(value)
}

/* =========================================================
CADASTRO
========================================================= */

func register(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		writeJSON(
			w,
			http.StatusMethodNotAllowed,
			map[string]string{
				"error": "método não permitido",
			},
		)
		return
	}

	var input struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := readJSON(
		r,
		&input,
	); err != nil {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "JSON inválido",
			},
		)
		return
	}

	input.Username = strings.ToLower(
		strings.TrimSpace(
			input.Username,
		),
	)

	input.Email = strings.ToLower(
		strings.TrimSpace(
			input.Email,
		),
	)

	if len(input.Username) < 3 {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "usuário precisa ter pelo menos 3 caracteres",
			},
		)
		return
	}

	if !strings.Contains(
		input.Email,
		"@",
	) {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "e-mail inválido",
			},
		)
		return
	}

	if len(input.Password) < 6 {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "senha precisa ter pelo menos 6 caracteres",
			},
		)
		return
	}

	ctx, cancel := context.WithTimeout(
		r.Context(),
		5*time.Second,
	)

	defer cancel()

	count, err := users.CountDocuments(
		ctx,
		bson.M{
			"username": input.Username,
		},
	)

	if err != nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "erro ao consultar usuário",
			},
		)
		return
	}

	if count > 0 {
		writeJSON(
			w,
			http.StatusConflict,
			map[string]string{
				"error": "usuário já existe",
			},
		)
		return
	}

	emailCount, err := users.CountDocuments(
		ctx,
		bson.M{
			"email": input.Email,
		},
	)

	if err != nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "erro ao consultar e-mail",
			},
		)
		return
	}

	if emailCount > 0 {
		writeJSON(
			w,
			http.StatusConflict,
			map[string]string{
				"error": "e-mail já está cadastrado",
			},
		)
		return
	}

	passwordHash, err :=
		bcrypt.GenerateFromPassword(
			[]byte(input.Password),
			bcrypt.DefaultCost,
		)

	if err != nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "erro ao proteger senha",
			},
		)
		return
	}

	user := User{
		Username: input.Username,
		Email:    input.Email,
		Password: string(passwordHash),
		Balance:  10000,
		Created:  time.Now(),
	}

	result, err := users.InsertOne(
		ctx,
		user,
	)

	if err != nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "erro ao criar usuário",
			},
		)
		return
	}

	user.ID = result.InsertedID.(bson.ObjectID)

	token, err := makeToken(
		user.ID,
	)

	if err != nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "erro ao gerar token",
			},
		)
		return
	}

	writeJSON(
		w,
		http.StatusCreated,
		map[string]any{
			"token": token,
			"user":  user,
		},
	)
}

/* =========================================================
LOGIN
========================================================= */

func login(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		writeJSON(
			w,
			http.StatusMethodNotAllowed,
			map[string]string{
				"error": "método não permitido",
			},
		)
		return
	}

	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := readJSON(
		r,
		&input,
	); err != nil {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "JSON inválido",
			},
		)
		return
	}

	username := strings.ToLower(
		strings.TrimSpace(
			input.Username,
		),
	)

	ctx, cancel := context.WithTimeout(
		r.Context(),
		5*time.Second,
	)

	defer cancel()

	var user User

	err := users.FindOne(
		ctx,
		bson.M{
			"username": username,
		},
	).Decode(&user)

	if err != nil {
		writeJSON(
			w,
			http.StatusUnauthorized,
			map[string]string{
				"error": "usuário ou senha incorretos",
			},
		)
		return
	}

	if bcrypt.CompareHashAndPassword(
		[]byte(user.Password),
		[]byte(input.Password),
	) != nil {
		writeJSON(
			w,
			http.StatusUnauthorized,
			map[string]string{
				"error": "usuário ou senha incorretos",
			},
		)
		return
	}

	token, err := makeToken(
		user.ID,
	)

	if err != nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "erro ao gerar token",
			},
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]any{
			"token": token,
			"user":  user,
		},
	)
}

/* =========================================================
RECUPERAÇÃO DE SENHA
========================================================= */

func generateResetCode() string {
	number, err := rand.Int(
		rand.Reader,
		big.NewInt(900000),
	)

	if err != nil {
		return fmt.Sprintf(
			"%06d",
			time.Now().UnixNano()%1000000,
		)
	}

	return fmt.Sprintf(
		"%06d",
		number.Int64()+100000,
	)
}

func sendResetEmail(
	to string,
	code string,
) error {
	host := getenv(
		"SMTP_HOST",
		"",
	)

	port := getenv(
		"SMTP_PORT",
		"587",
	)

	username := getenv(
		"SMTP_USER",
		"",
	)

	password := getenv(
		"SMTP_PASS",
		"",
	)

	from := getenv(
		"SMTP_FROM",
		username,
	)

	if host == "" ||
		username == "" ||
		password == "" ||
		from == "" {
		return fmt.Errorf(
			"SMTP não configurado",
		)
	}

	subject :=
		"GO-TIGRINHO - Código para redefinir sua senha"

	body := fmt.Sprintf(
		"Olá!\r\n\r\n"+
			"Seu código para redefinir a senha é: %s\r\n\r\n"+
			"Este código expira em 10 minutos.\r\n\r\n"+
			"Se você não solicitou esta alteração, ignore este e-mail.\r\n",
		code,
	)

	message := []byte(
		"From: GO-TIGRINHO <" + from + ">\r\n" +
			"To: " + to + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/plain; charset=UTF-8\r\n" +
			"\r\n" +
			body,
	)

	auth := smtp.PlainAuth(
		"",
		username,
		password,
		host,
	)

	return smtp.SendMail(
		host+":"+port,
		auth,
		from,
		[]string{to},
		message,
	)
}

func forgotPassword(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		writeJSON(
			w,
			http.StatusMethodNotAllowed,
			map[string]string{
				"error": "método não permitido",
			},
		)
		return
	}

	var input struct {
		Email string `json:"email"`
	}

	if err := readJSON(
		r,
		&input,
	); err != nil {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "JSON inválido",
			},
		)
		return
	}

	email := strings.ToLower(
		strings.TrimSpace(
			input.Email,
		),
	)

	if !strings.Contains(
		email,
		"@",
	) {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "Digite um e-mail válido.",
			},
		)
		return
	}

	ctx, cancel := context.WithTimeout(
		r.Context(),
		5*time.Second,
	)

	defer cancel()

	var user User

	err := users.FindOne(
		ctx,
		bson.M{
			"email": email,
		},
	).Decode(&user)

	if err != nil {
		writeJSON(
			w,
			http.StatusOK,
			map[string]string{
				"message": "Se o e-mail estiver cadastrado, enviaremos um código.",
			},
		)
		return
	}

	code := generateResetCode()

	expires := time.Now().Add(
		10 * time.Minute,
	)

	_, err = users.UpdateOne(
		ctx,
		bson.M{
			"_id": user.ID,
		},
		bson.M{
			"$set": bson.M{
				"resetCode":    code,
				"resetExpires": expires,
			},
		},
	)

	if err != nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "Não foi possível gerar o código.",
			},
		)
		return
	}

	err = sendResetEmail(
		user.Email,
		code,
	)

	if err != nil {
		fmt.Println(
			"Erro ao enviar e-mail:",
			err,
		)

		_, _ = users.UpdateOne(
			ctx,
			bson.M{
				"_id": user.ID,
			},
			bson.M{
				"$unset": bson.M{
					"resetCode":    "",
					"resetExpires": "",
				},
			},
		)

		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "Não foi possível enviar o código para o e-mail. Configure o SMTP do servidor.",
			},
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]string{
			"message": "Código enviado para o seu e-mail.",
		},
	)
}

/* =========================================================
VERIFICAR CÓDIGO DE RECUPERAÇÃO
========================================================= */

func verifyResetCode(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		writeJSON(
			w,
			http.StatusMethodNotAllowed,
			map[string]string{
				"error": "método não permitido",
			},
		)
		return
	}

	var input struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}

	if err := readJSON(
		r,
		&input,
	); err != nil {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "JSON inválido",
			},
		)
		return
	}

	email := strings.ToLower(
		strings.TrimSpace(
			input.Email,
		),
	)

	code := strings.TrimSpace(
		input.Code,
	)

	if !strings.Contains(
		email,
		"@",
	) {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "E-mail inválido.",
			},
		)
		return
	}

	if len(code) != 6 {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "Digite o código de 6 dígitos.",
			},
		)
		return
	}

	ctx, cancel := context.WithTimeout(
		r.Context(),
		5*time.Second,
	)

	defer cancel()

	var user User

	err := users.FindOne(
		ctx,
		bson.M{
			"email": email,
		},
	).Decode(&user)

	if err != nil {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "Código inválido ou expirado.",
			},
		)
		return
	}

	if user.ResetCode == "" {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "Nenhum código de recuperação foi solicitado.",
			},
		)
		return
	}

	if user.ResetCode != code {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "Código inválido.",
			},
		)
		return
	}

	if user.ResetExpires.Before(
		time.Now(),
	) {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "Código expirado. Solicite um novo código.",
			},
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]string{
			"message": "Código confirmado com sucesso.",
		},
	)
}

/* =========================================================
REDEFINIR SENHA
========================================================= */

func resetPassword(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		writeJSON(
			w,
			http.StatusMethodNotAllowed,
			map[string]string{
				"error": "método não permitido",
			},
		)
		return
	}

	var input struct {
		Email    string `json:"email"`
		Code     string `json:"code"`
		Password string `json:"password"`
	}

	if err := readJSON(
		r,
		&input,
	); err != nil {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "JSON inválido",
			},
		)
		return
	}

	email := strings.ToLower(
		strings.TrimSpace(
			input.Email,
		),
	)

	code := strings.TrimSpace(
		input.Code,
	)

	if !strings.Contains(
		email,
		"@",
	) {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "E-mail inválido.",
			},
		)
		return
	}

	if len(code) != 6 {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "Código inválido.",
			},
		)
		return
	}

	if len(input.Password) < 6 {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "A nova senha precisa ter pelo menos 6 caracteres.",
			},
		)
		return
	}

	ctx, cancel := context.WithTimeout(
		r.Context(),
		5*time.Second,
	)

	defer cancel()

	var user User

	err := users.FindOne(
		ctx,
		bson.M{
			"email": email,
		},
	).Decode(&user)

	if err != nil ||
		user.ResetCode == "" ||
		user.ResetCode != code ||
		user.ResetExpires.Before(time.Now()) {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "Código inválido ou expirado.",
			},
		)
		return
	}

	passwordHash, err :=
		bcrypt.GenerateFromPassword(
			[]byte(input.Password),
			bcrypt.DefaultCost,
		)

	if err != nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "Erro ao proteger a nova senha.",
			},
		)
		return
	}

	_, err = users.UpdateOne(
		ctx,
		bson.M{
			"_id": user.ID,
		},
		bson.M{
			"$set": bson.M{
				"password": string(passwordHash),
			},
			"$unset": bson.M{
				"resetCode":    "",
				"resetExpires": "",
			},
		},
	)

	if err != nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "Não foi possível alterar a senha.",
			},
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]string{
			"message": "Senha alterada com sucesso.",
		},
	)
}

/* =========================================================
TOKEN
========================================================= */

func makeToken(
	id bson.ObjectID,
) (string, error) {
	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		jwt.MapClaims{
			"sub": id.Hex(),
			"exp": time.Now().
				Add(
					24 * time.Hour,
				).
				Unix(),
		},
	)

	return token.SignedString(
		jwtSecret,
	)
}

/* =========================================================
AUTENTICAÇÃO
========================================================= */

func auth(
	next http.HandlerFunc,
) http.HandlerFunc {
	return func(
		w http.ResponseWriter,
		r *http.Request,
	) {
		header := r.Header.Get(
			"Authorization",
		)

		if !strings.HasPrefix(
			header,
			"Bearer ",
		) {
			writeJSON(
				w,
				http.StatusUnauthorized,
				map[string]string{
					"error": "token ausente",
				},
			)
			return
		}

		tokenString := strings.TrimPrefix(
			header,
			"Bearer ",
		)

		token, err := jwt.Parse(
			tokenString,
			func(
				token *jwt.Token,
			) (any, error) {
				if token.Method != jwt.SigningMethodHS256 {
					return nil,
						jwt.ErrTokenSignatureInvalid
				}

				return jwtSecret, nil
			},
		)

		if err != nil ||
			!token.Valid {
			writeJSON(
				w,
				http.StatusUnauthorized,
				map[string]string{
					"error": "token inválido",
				},
			)
			return
		}

		claims, ok :=
			token.Claims.(jwt.MapClaims)

		if !ok {
			writeJSON(
				w,
				http.StatusUnauthorized,
				map[string]string{
					"error": "token inválido",
				},
			)
			return
		}

		sub, ok :=
			claims["sub"].(string)

		if !ok {
			writeJSON(
				w,
				http.StatusUnauthorized,
				map[string]string{
					"error": "token inválido",
				},
			)
			return
		}

		id, err :=
			bson.ObjectIDFromHex(sub)

		if err != nil {
			writeJSON(
				w,
				http.StatusUnauthorized,
				map[string]string{
					"error": "token inválido",
				},
			)
			return
		}

		ctx := context.WithValue(
			r.Context(),
			"userID",
			id,
		)

		next(
			w,
			r.WithContext(ctx),
		)
	}
}

/* =========================================================
ME
========================================================= */

func me(
	w http.ResponseWriter,
	r *http.Request,
) {
	id := r.Context().
		Value("userID").(bson.ObjectID)

	ctx, cancel := context.WithTimeout(
		r.Context(),
		5*time.Second,
	)

	defer cancel()

	var user User

	err := users.FindOne(
		ctx,
		bson.M{
			"_id": id,
		},
	).Decode(&user)

	if err != nil {
		writeJSON(
			w,
			http.StatusNotFound,
			map[string]string{
				"error": "usuário não encontrado",
			},
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		user,
	)
}

/* =========================================================
JOGO
========================================================= */

func secureInt(
	max int64,
) int64 {
	if max <= 0 {
		return 0
	}

	n, err := rand.Int(
		rand.Reader,
		big.NewInt(max),
	)

	if err != nil {
		return time.Now().
			UnixNano() % max
	}

	return n.Int64()
}

func playTiger(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		writeJSON(
			w,
			http.StatusMethodNotAllowed,
			map[string]string{
				"error": "método não permitido",
			},
		)
		return
	}

	var input struct {
		Bet int64 `json:"bet"`
	}

	if err := readJSON(
		r,
		&input,
	); err != nil {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "JSON inválido",
			},
		)
		return
	}

	if input.Bet < 1 ||
		input.Bet > 100000 {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "aposta virtual entre 1 e 100000",
			},
		)
		return
	}

	id := r.Context().
		Value("userID").(bson.ObjectID)

	ctx, cancel := context.WithTimeout(
		r.Context(),
		5*time.Second,
	)

	defer cancel()

	var user User

	err := users.FindOne(
		ctx,
		bson.M{
			"_id": id,
		},
	).Decode(&user)

	if err != nil {
		writeJSON(
			w,
			http.StatusNotFound,
			map[string]string{
				"error": "usuário não encontrado",
			},
		)
		return
	}

	if user.Balance <
		float64(input.Bet) {
		writeJSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "saldo virtual insuficiente",
			},
		)
		return
	}

	symbols := []string{
		"🐯",
		"💰",
		"🪙",
		"💎",
		"🔔",
		"7️⃣",
	}

	a := symbols[secureInt(int64(len(symbols)))]
	b := symbols[secureInt(int64(len(symbols)))]
	c := symbols[secureInt(int64(len(symbols)))]

	var win int64

	if a == b &&
		b == c {

		switch a {

		case "🐯":
			win = input.Bet * 10

		case "💎":
			win = input.Bet * 8

		case "7️⃣":
			win = input.Bet * 6

		default:
			win = input.Bet * 4
		}

	} else if a == b ||
		b == c ||
		a == c {

		win = input.Bet * 2
	}

	newBalance :=
		user.Balance -
			float64(input.Bet) +
			float64(win)

	_, err = users.UpdateOne(
		ctx,
		bson.M{
			"_id": id,
		},
		bson.M{
			"$set": bson.M{
				"balance": newBalance,
			},
		},
	)

	if err != nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "erro ao atualizar saldo",
			},
		)
		return
	}

	result := map[string]any{
		"symbols": []string{
			a,
			b,
			c,
		},
		"win": win,
		"net": win - input.Bet,
	}

	_, _ = bets.InsertOne(
		ctx,
		Bet{
			UserID:    id,
			Game:      "tiger-demo",
			Bet:       input.Bet,
			Win:       win,
			Result:    result,
			CreatedAt: time.Now(),
		},
	)

	writeJSON(
		w,
		http.StatusOK,
		map[string]any{
			"balance": newBalance,
			"result":  result,
		},
	)
}

/* =========================================================
HISTÓRICO
========================================================= */

func history(
	w http.ResponseWriter,
	r *http.Request,
) {
	id := r.Context().
		Value("userID").(bson.ObjectID)

	ctx, cancel := context.WithTimeout(
		r.Context(),
		5*time.Second,
	)

	defer cancel()

	cursor, err := bets.Find(
		ctx,
		bson.M{
			"userId": id,
		},
		options.Find().
			SetSort(
				bson.D{
					{
						Key:   "createdAt",
						Value: -1,
					},
				},
			).
			SetLimit(50),
	)

	if err != nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "erro no histórico",
			},
		)
		return
	}

	defer cursor.Close(ctx)

	var result []Bet

	if err := cursor.All(
		ctx,
		&result,
	); err != nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "erro no histórico",
			},
		)
		return
	}

	if result == nil {
		result = []Bet{}
	}

	writeJSON(
		w,
		http.StatusOK,
		result,
	)
}

/* =========================================================
CORS
========================================================= */

func cors(
	next http.Handler,
) http.Handler {
	return http.HandlerFunc(
		func(
			w http.ResponseWriter,
			r *http.Request,
		) {
			w.Header().Set(
				"Access-Control-Allow-Origin",
				"*",
			)

			w.Header().Set(
				"Access-Control-Allow-Headers",
				"Content-Type, Authorization",
			)

			w.Header().Set(
				"Access-Control-Allow-Methods",
				"GET, POST, OPTIONS",
			)

			if r.Method ==
				http.MethodOptions {
				w.WriteHeader(
					http.StatusNoContent,
				)
				return
			}

			next.ServeHTTP(
				w,
				r,
			)
		},
	)
}
