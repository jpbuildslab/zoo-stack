FROM mcr.microsoft.com/playwright@sha256:6e3fb709361521eb27161606e6da6d2674e5e89fa16516cb37d6fdd91372273d
WORKDIR /opt/zoo
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
