FROM mcr.microsoft.com/devcontainers/base:bullseye

# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive

# Configure apt and install packages
RUN apt-get update \
    && apt-get -y install --no-install-recommends \
    build-essential \
    curl \
    git \
    gnupg2 \
    lsb-release \
    ca-certificates \
    apt-transport-https \
    software-properties-common \
    python3 \
    python3-pip \
    python3-venv \
    sudo \
    unzip \
    wget \
    zip \
    zsh \
    postgresql-client

# Install Node.js v20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install PHP 8.1 Runtime and Modules
# RUN echo "deb https://packages.sury.org/php/ $(lsb_release -sc) main" | tee /etc/apt/sources.list.d/sury-php.list \
#     && wget -qO - https://packages.sury.org/php/apt.gpg | apt-key add - \
#     && apt-get update -y \
#     && apt-get install -y php8.2 \
#     php8.2-bcmath \
#     php8.2-bz2 \
#     php8.2-cgi \
#     php8.2-cli \
#     php8.2-common \
#     php8.2-curl \
#     php8.2-dba \
#     php8.2-dev \
#     php8.2-enchant \
#     php8.2-fpm \
#     php8.2-gd \
#     php8.2-gmp \
#     php8.2-imap \
#     php8.2-interbase \
#     php8.2-intl \
#     php8.2-ldap \
#     php8.2-mbstring \
#     php8.2-mysql \
#     php8.2-odbc \
#     php8.2-opcache \
#     php8.2-pgsql \
#     php8.2-phpdbg \
#     php8.2-pspell \
#     php8.2-readline \
#     php8.2-snmp \
#     php8.2-soap \
#     php8.2-sqlite3 \
#     php8.2-sybase \
#     php8.2-tidy \
#     php8.2-xml \
#     php8.2-xsl \
#     php8.2-zip \
#     && apt-get clean && rm -rf /var/lib/apt/lists/*
# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install AWS v2 CLI
RUN curl -sSL https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o awscliv2.zip \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws

# Install AWS CDK
RUN npm install -g aws-cdk
