# Use Node.js 22 as the base image
FROM node:22

# Set the working directory in the container
WORKDIR /usr/src/app/services/packages/common

# Copy package.json and package-lock.json to the working directory
COPY ./services/packages/common/package*.json ./

# Copy common
COPY ./services/packages/common/src ./src

# Set the working directory inside the container
WORKDIR /usr/src/app/gatewayservice

# Copy package.json and package-lock.json to the working directory
COPY ./gatewayservice/package*.json ./

# Copy the source code to the working directory
COPY ./gatewayservice/src ./src

# Install dependencies
RUN npm install --ignore-scripts --omit=dev

# Use a non-root user for security
USER node

# Start the gateway service
CMD ["npm", "start"]