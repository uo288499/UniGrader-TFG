# Use Node.js 22 as the base image
FROM node:22

# Set the working directory in the container
WORKDIR /usr/src/app/common

# Copy package.json and package-lock.json to the working directory
COPY ./services/packages/common/package*.json ./

# Install common dependencies
RUN npm install --ignore-scripts --omit=dev

# Copy common
COPY ./services/packages/common/src ./src

# Set the working directory inside the container
WORKDIR /usr/src/app/evalservice

# Copy package.json and package-lock.json to the working directory
COPY ./services/evalservice/package*.json ./

# Install dependencies
RUN npm install --ignore-scripts --omit=dev

# Copy the source code to the working directory
COPY ./services/evalservice/src ./src

# Use a non-root user for security
USER node

# Start the evaluation system service
CMD ["npm", "start"]