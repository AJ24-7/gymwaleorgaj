// Logo embedding utility for emails
const fs = require('fs');
const path = require('path');

/**
 * Convert local image to base64 data URL for email embedding
 * @param {string} imagePath - Path to local image file
 * @returns {string} - Base64 data URL
 */
function getBase64Logo(imagePath) {
  try {
    if (!imagePath || !fs.existsSync(imagePath)) {
      // Return a simple SVG logo as fallback
      const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
        <rect width="56" height="56" rx="16" fill="#0d4d89"/>
        <text x="28" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">GW</text>
      </svg>`;
      return `data:image/svg+xml;base64,${Buffer.from(svgLogo).toString('base64')}`;
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    const imageExt = path.extname(imagePath).slice(1).toLowerCase();
    const mimeType = imageExt === 'png' ? 'image/png' : 
                     imageExt === 'jpg' || imageExt === 'jpeg' ? 'image/jpeg' :
                     imageExt === 'svg' ? 'image/svg+xml' : 'image/png';
    
    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error converting logo to base64:', error);
    // Fallback SVG
    const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
      <rect width="56" height="56" rx="16" fill="#0d4d89"/>
      <text x="28" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">GW</text>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svgLogo).toString('base64')}`;
  }
}

module.exports = { getBase64Logo };