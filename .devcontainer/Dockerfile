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
    zsh

# Install Node.js v20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install PHP 8.1 Runtime and Modules
RUN echo "deb https://packages.sury.org/php/ $(lsb_release -sc) main" | tee /etc/apt/sources.list.d/sury-php.list \
    && wget -qO - https://packages.sury.org/php/apt.gpg | apt-key add - \
    && apt-get update -y \
    && apt-get install -y php8.1 \
    php8.1-bcmath \
    php8.1-bz2 \
    php8.1-cgi \
    php8.1-cli \
    php8.1-common \
    php8.1-curl \
    php8.1-dba \
    php8.1-dev \
    php8.1-enchant \
    php8.1-fpm \
    php8.1-gd \
    php8.1-gmp \
    php8.1-imap \
    php8.1-interbase \
    php8.1-intl \
    php8.1-ldap \
    php8.1-mbstring \
    php8.1-mysql \
    php8.1-odbc \
    php8.1-opcache \
    php8.1-pgsql \
    php8.1-phpdbg \
    php8.1-pspell \
    php8.1-readline \
    php8.1-snmp \
    php8.1-soap \
    php8.1-sqlite3 \
    php8.1-sybase \
    php8.1-tidy \
    php8.1-xml \
    php8.1-xsl \
    php8.1-zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install AWS v2 CLI
RUN curl -sSL https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o awscliv2.zip \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws

# Install AWS CDK
RUN npm install -g aws-cdk
