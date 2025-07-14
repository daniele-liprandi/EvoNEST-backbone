# Use Node.js official image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port for development server
EXPOSE 5173

# Default command for development
CMD ["npm", "run", "docs:dev", "--", "--host", "0.0.0.0"]
