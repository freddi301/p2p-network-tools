# Setup Desktop

- install node js (12 or 14)
- `npm install -g yarn`
- `npm install --global --production windows-build-tools` (in admin powershell) (needed only on on windows)
- clone this repo
- `cd backend && yarn --production=false && yarn start`
- `cd frontend && yarn --production=false && yarn start`

# Setup CLI

- install node js (12 or 14)
- `npm install -g yarn`
- `npm install --global --production windows-build-tools` (in admin powershell) (needed only on on windows)
- clone this repo
- `cd cli && yarn --production=false && yarn build`

## CLI Usage

- `cd cli`
- `echo hello | node dist/cli.js seed`
- in another terminal
- `node dist/cli.js leech <hash printed by seed command>`
