# Use Node.js 22 as the base image
FROM node:22

# Set the working directory in the container
WORKDIR /usr/src/app/packages/common

# Copy package.json and package-lock.json to the working directory
COPY ./services/packages/common/package*.json ./

# Copy common
COPY ./services/packages/common/src ./src

# Set the working directory inside the container
WORKDIR /usr/src/app/authservice

# Copy package.json and package-lock.json to the working directory
COPY ./services/authservice/package*.json ./

# Copy the source code to the working directory
COPY ./services/authservice/src ./src

# Install dependencies
RUN npm install --ignore-scripts --omit=dev

# Use a non-root user for security
USER node

# Start the authentication service
CMD ["npm", "start"]