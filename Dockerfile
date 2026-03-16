# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the server
RUN CGO_ENABLED=0 go build -o server server.go

# Runtime stage
FROM alpine:latest

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Copy built binary
COPY --from=builder /app/server .

# Create db directory
RUN mkdir -p /app/db

# Disable notifications (avoids Twilio/Google credential errors for demo)
ENV NOTIFICATIONS_ENABLED=false

CMD ["./server"]
