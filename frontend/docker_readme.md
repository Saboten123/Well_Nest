# Running WellNest with Docker

This guide starts the whole app — frontend, main API, blockchain API and AI
assistant — with Docker, on **Windows, macOS or Linux**. It does not matter which
system you use; only the MongoDB step differs.

| Service | Container | Port | What it is |
|---|---|---|---|
| Frontend | `wellnest-frontend` | **5173** | React app served by nginx. This is the address you open. |
| Main API | `wellnest-backend` | 5000 | Users, appointments, video-call signalling |
| Blockchain API | `wellnest-blockchain` | 7000 | Payments, donations, outbreak reports |
| AI assistant | `wellnest-ai` | 8000 | FastAPI + Gemini |

The browser only talks to the frontend. nginx forwards `/api`, `/chain`, `/ai`
and `/socket.io` to the right container, so nothing else needs configuring.

---

## 1. Install the prerequisites

- **Docker Desktop** (Windows / macOS) or **Docker Engine + Compose plugin** (Linux).
  Check it works: `docker --version` and `docker compose version`.
  On Windows/macOS make sure Docker Desktop is open and says *Engine running*.
- **Git**, to download the project.
- A database — pick **one** of the two options in step 3.

## 2. Get the code and create the `.env` files

```bash
git clone https://github.com/Saboten123/Well_Nest.git
cd Well_Nest
```

The `.env` files hold secrets and are **not** in the repository, so create them:

**`backend/.env`**
```
JWT_ACCESS_SECRET=put-a-long-random-string-here
JWT_REFRESH_SECRET=put-a-different-long-random-string-here
# optional — only needed for password-reset / OTP emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@example.com
SMTP_PASS=your-app-password
MAIL_FROM=WellNest <you@example.com>
```

**`blockchain_backend/.env`**
```
# must be the SAME value as JWT_ACCESS_SECRET above — this API checks the login token
JWT_SECRET=put-a-long-random-string-here
PRIVATE_KEY=your-TEST-wallet-private-key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-key
```
Use a throw-away test wallet only, never one that holds real funds.

**`ai_backend/.env`**
```
GEMINI_API_KEY=your-gemini-key
TAVILY_API_KEY=your-tavily-key
```

You do **not** need to write `MONGODB_URI` or `PORT` in these files. Docker sets
them. (If you do, the Docker value wins.)

Generate a good random secret with: `openssl rand -hex 32`

## 3. Choose where MongoDB lives

### Option A — MongoDB inside Docker (easiest, works everywhere)

Nothing to install. Use the extra compose file that adds a MongoDB container:

```bash
docker compose -f docker-compose.yml -f docker-compose.mongo.yml up -d --build
```

Your data is stored in a Docker volume called `mongo_data`, so it survives restarts.
Skip to **step 4**.

### Option B — Use MongoDB already installed on this computer

The containers reach your machine through `host.docker.internal`. MongoDB only
listens on `127.0.0.1` by default, so allow connections from Docker:

| System | Config file | Restart command |
|---|---|---|
| Windows | `C:\Program Files\MongoDB\Server\<version>\bin\mongod.cfg` (edit as Administrator) | `net stop MongoDB` then `net start MongoDB` |
| macOS (Homebrew) | `/opt/homebrew/etc/mongod.conf` (Intel: `/usr/local/etc/mongod.conf`) | `brew services restart mongodb-community` |
| Linux | `/etc/mongod.conf` | `sudo systemctl restart mongod` |

In that file, change

```yaml
net:
  bindIp: 127.0.0.1
```
to
```yaml
net:
  bindIp: 127.0.0.1,0.0.0.0
```

> **Security:** this lets other devices on your network reach the database. Keep
> port 27017 blocked from outside in your firewall, or enable MongoDB
> authentication. For anything beyond local testing, prefer Option A.

Check MongoDB is reachable, then start the app:

```bash
# Windows PowerShell
Test-NetConnection 127.0.0.1 -Port 27017      # TcpTestSucceeded : True

# macOS / Linux
nc -zv 127.0.0.1 27017

docker compose up -d --build
```

## 4. Open the app

Wait a few minutes on the first run (it downloads images and installs packages),
then check everything is up:

```bash
docker compose ps
```

Open **http://localhost:5173**, create an account with *Sign up*, and log in.
A new database starts empty, so you need to register first.

Healthy backend logs end with `MongoDB connected` and
`API with WebRTC support running`:

```bash
docker compose logs --tail 20 backend
```

---

## Share a public link (optional)

This uses a free Cloudflare "quick tunnel". No account is needed.

```bash
docker compose --profile share up -d --build
docker compose logs tunnel
```

Look for an address like `https://something-random.trycloudflare.com` and send
it to anyone. Things to know:

- It only works while **your computer, Docker and the database are running**.
- The address **changes every time the tunnel restarts** (`down`/`up`, reboot,
  `restart tunnel`). Read the logs again to get the new one.
- Anyone with the link can sign up and use your AI keys. Share it only with people
  you trust. Stop sharing with `docker compose --profile share down`.
- Using Option A? Add the same `-f` flags:
  `docker compose -f docker-compose.yml -f docker-compose.mongo.yml --profile share up -d --build`

## Video calls

Calls use WebRTC. Two people on different networks (especially a phone on mobile
data) usually need a **TURN relay** or they will not see each other. A free
public relay is built in as a best effort. For reliable calls, create a free
TURN account (for example at metered.ca or Cloudflare Calls) and add a `.env`
file in the **project root**:

```
VITE_ICE_SERVERS=[{"urls":"turn:YOUR-HOST:443","username":"YOUR-USER","credential":"YOUR-PASS"}]
```

Then rebuild the frontend: `docker compose up -d --build frontend`.
Browsers only allow camera and microphone on **HTTPS or localhost**, so use the
tunnel link (HTTPS) rather than a plain `http://192.168…` address.

---

## Everyday commands

| What | Command |
|---|---|
| Start in the background | `docker compose up -d` |
| Stop everything (data is kept) | `docker compose down` |
| Watch all logs | `docker compose logs -f` |
| Logs of one service | `docker compose logs -f backend` |
| Rebuild one service after changing code | `docker compose up -d --build frontend` |
| Restart one service | `docker compose restart backend` |
| Delete the Docker-hosted database too (Option A) | `docker compose down -v` |

Careful: running `docker compose down` and then `up` again, or restarting the
`tunnel` container, gives you a **new** public link.

## Troubleshooting

| Problem | Fix |
|---|---|
| `failed to connect to the docker API` / `dockerDesktopLinuxEngine` | Docker Desktop is not running. Open it and wait for *Engine running*. |
| `port is already allocated` | Something else uses port 5000, 5173, 7000 or 8000. Close old `npm run dev` / `uvicorn` windows, or stop the other program. |
| Sign-in shows **502** | The backend container is not running. Run `docker compose ps` and `docker compose logs backend`. |
| Backend log: `ECONNREFUSED host.docker.internal:27017` | Option B only: MongoDB is not running or `bindIp` is not set (step 3). Or just switch to Option A. |
| Backend log: `Cannot find module …` | Usually a file-name capital-letter mismatch (Windows ignores case, Linux does not). Fix the import to match the real file name. |
| Backend log: `secretOrPrivateKey must have a value` | `JWT_ACCESS_SECRET` is missing in `backend/.env`. |
| Logged in but payments / reports fail with 401 | `JWT_SECRET` in `blockchain_backend/.env` is not the same as `JWT_ACCESS_SECRET`. |
| AI assistant gives errors | `GEMINI_API_KEY` is missing or wrong in `ai_backend/.env`. |
| Video call: you only see yourself | Both people must use **different accounts**, and need a TURN server (see *Video calls*). |
| Page looks old after an update | Hard-refresh the browser (Ctrl+F5 / Cmd+Shift+R). |
| `npm ci` lock-file error during build | The Dockerfiles already use `npm install`; make sure you are on the latest Dockerfiles. |

## Running without Docker (development)

Docker is not required for development. See `Installation.txt` for the manual
steps. `npm run dev` in `frontend/` proxies `/api`, `/chain`, `/ai` and
`/socket.io` to the services on ports 5000, 7000 and 8000, exactly like nginx
does in Docker.