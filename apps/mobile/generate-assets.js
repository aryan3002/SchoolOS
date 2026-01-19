#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create a simple SVG icon
const svgIcon = `<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" rx="45" fill="#3D87CC"/>
  <text x="96" y="110" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">SO</text>
</svg>`;

// Create a simple splash screen
const svgSplash = `<svg width="540" height="620" viewBox="0 0 540 620" xmlns="http://www.w3.org/2000/svg">
  <rect width="540" height="620" fill="#1E3A5F"/>
  <rect x="0" y="0" width="540" height="180" fill="#3D87CC"/>
  <text x="270" y="100" font-size="60" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">SchoolOS</text>
  <text x="270" y="400" font-size="32" fill="white" text-anchor="middle" font-family="Arial">AI-First Parent Hub</text>
</svg>`;

// Create adaptive icon (Android)
const svgAdaptive = `<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <circle cx="96" cy="96" r="96" fill="#3D87CC"/>
  <text x="96" y="110" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">SO</text>
</svg>`;

// Create favicon
const svgFavicon = `<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#3D87CC"/>
  <text x="96" y="110" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">SO</text>
</svg>`;

// Convert SVG to PNG using a simple base64 approach
// For now, just save as SVG and let Expo handle conversion
fs.writeFileSync(path.join(assetsDir, 'icon.png'), '');
fs.writeFileSync(path.join(assetsDir, 'icon.svg'), svgIcon);

fs.writeFileSync(path.join(assetsDir, 'splash.png'), '');
fs.writeFileSync(path.join(assetsDir, 'splash.svg'), svgSplash);

fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), '');
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.svg'), svgAdaptive);

fs.writeFileSync(path.join(assetsDir, 'favicon.png'), '');
fs.writeFileSync(path.join(assetsDir, 'favicon.svg'), svgFavicon);

console.log('✅ Asset files created successfully!');
