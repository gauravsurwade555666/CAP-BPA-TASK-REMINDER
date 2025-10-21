# Use the official Node.js image as a base
FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Install Cloud Foundry CLI
RUN curl -L "https://packages.cloudfoundry.org/stable?release=windows64-binary&source=github" -o cf-cli.zip \
    && unzip cf-cli.zip -d /usr/local/bin \
    && rm cf-cli.zip

# Install MBT (Multi-Target Application Build Tool)
RUN wget https://github.com/SAP/cloud-mta-build-tool/releases/latest/download/mbt-linux-x64 \
    && chmod +x mbt-linux-x64 \
    && mv mbt-linux-x64 /usr/local/bin/mbt

# Install required global npm packages
RUN npm install -g @ui5/cli @sap/cds-dk yo @sapui5/generator-sapui5-templates \
    @sap/generator-base-mta-module @sap/generator-cap-project @sap/generator-fiori \
    @sap/generator-hdb-project mbt typescript hana-cli

# Set default shell to bash
SHELL ["/bin/bash", "-c"]
