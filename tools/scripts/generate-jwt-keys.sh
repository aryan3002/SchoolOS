#!/bin/bash

# Generate RS256 key pair for JWT signing
# Run this script to create production keys

set -e

KEY_DIR="${1:-./keys}"
mkdir -p "$KEY_DIR"

echo "Generating RS256 key pair for JWT signing..."

# Generate private key
openssl genpkey -algorithm RSA -out "$KEY_DIR/jwt-private.pem" -pkeyopt rsa_keygen_bits:2048

# Generate public key
openssl rsa -in "$KEY_DIR/jwt-private.pem" -pubout -out "$KEY_DIR/jwt-public.pem"

echo "Keys generated successfully in $KEY_DIR/"
echo ""
echo "To use in .env, run these commands to get the base64 encoded keys:"
echo ""
echo "JWT_PRIVATE_KEY:"
echo "base64 -w 0 $KEY_DIR/jwt-private.pem"
echo ""
echo "JWT_PUBLIC_KEY:"
echo "base64 -w 0 $KEY_DIR/jwt-public.pem"
echo ""
echo "Or for multi-line env vars, copy the contents directly."
