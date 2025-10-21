# Use the official Node.js 20 image as a base
FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive

# Update package lists and install required system packages
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install Cloud Foundry CLI (corrected for Linux)
RUN curl -L "https://packages.cloudfoundry.org/stable?release=linux64-binary&source=github" | tar -zx \
    && mv cf8 /usr/local/bin/cf \
    && chmod +x /usr/local/bin/cf

# Install MBT (Multi-Target Application Build Tool)
RUN wget -O /usr/local/bin/mbt https://github.com/SAP/cloud-mta-build-tool/releases/latest/download/cloud-mta-build-tool_linux_amd64 \
    && chmod +x /usr/local/bin/mbt

# Install required global npm packages for SAP CAP development
RUN npm install -g \
    @ui5/cli \
    @sap/cds-dk \
    yo \
    @sapui5/generator-sapui5-templates \
    @sap/generator-base-mta-module \
    @sap/generator-cap-project \
    @sap/generator-fiori \
    @sap/generator-hdb-project \
    mbt \
    typescript \
    hana-cli

# Install additional useful tools for SAP development
RUN npm install -g \
    @sap/generator-add-hdb-module \
    @sap/generator-hdb-table \
    rimraf

# Set default shell to bash
SHELL ["/bin/bash", "-c"]

# Create workspace directory
RUN mkdir -p /workspaces

# Set the default working directory
WORKDIR /workspaces
