# Desktop

## Setup

- install node js (12 or 14)
- `npm install -g yarn`
- `npm install --global --production windows-build-tools` (in admin powershell) (needed only on on windows)
- clone this repo
- `cd backend && yarn --production=false && yarn start`
- `cd frontend && yarn --production=false && yarn start`

# CLI

## Setup

- install node js (12 or 14)
- `npm install -g yarn`
- `npm install --global --production windows-build-tools` (in admin powershell) (needed only on on windows)
- clone this repo
- `cd cli && yarn --production=false && yarn build`

## Usage

- `cd cli`
- `echo hello | node dist/cli.js seed`
- in another terminal
- `node dist/cli.js leech <hash printed by seed command>`

# Resources

## Electron build configurations

- https://medium.com/@johndyer24/building-a-production-electron-create-react-app-application-with-shared-code-using-electron-builder-c1f70f0e2649
- https://finbits.io/blog/electron-create-react-app-electron-builder/
- https://blog.bitsrc.io/building-an-electron-app-with-electron-react-boilerplate-c7ef8d010a91
