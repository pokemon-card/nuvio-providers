// Vidnest Scraper for Nuvio Local Scrapers
// React Native compatible version - Promise-based approach only
// Extracts streaming links using TMDB ID for Vidnest servers with AES-GCM decryption

// TMDB API Configuration
const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Vidnest Configuration
const VIDNEST_BASE_URL = 'https://backend.vidnest.fun';
const PASSPHRASE = 'T8c8PQlSQVU4mBuW4CbE/g57VBbM5009QHd+ym93aZZ5pEeVpToY6OdpYPvRMVYp';
const SERVERS = ['allmovies', 'hollymoviehd'];

// Working headers for Vidnest API
const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://vidnest.fun/',
    'Origin': 'https://vidnest.fun',
    'DNT': '1'
};

// React Native-safe Base64 utilities (no Buffer dependency)
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function base64ToBytes(base64) {
    if (!base64) return new Uint8Array(0);
    
    // Remove padding
    let input = String(base64).replace(/=+$/, '');
    let output = '';
    let bc = 0, bs, buffer, idx = 0;
    
    while ((buffer = input.charAt(idx++))) {
        buffer = BASE64_CHARS.indexOf(buffer);
        if (~buffer) {
            bs = bc % 4 ? bs * 64 + buffer : buffer;
            if (bc++ % 4) {
                output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
            }
        }
    }
    
    // Convert string to bytes
    const bytes = new Uint8Array(output.length);
    for (let i = 0; i < output.length; i++) {
        bytes[i] = output.charCodeAt(i);
    }
    return bytes;
}

function bytesToBase64(bytes) {
    if (!bytes || bytes.length === 0) return '';
    
    let output = '';
    let i = 0;
    const len = bytes.length;
    
    while (i < len) {
        const a = bytes[i++];
        const b = i < len ? bytes[i++] : 0;
        const c = i < len ? bytes[i++] : 0;
        
        const bitmap = (a << 16) | (b << 8) | c;
        
        output += BASE64_CHARS.charAt((bitmap >> 18) & 63);
        output += BASE64_CHARS.charAt((bitmap >> 12) & 63);
        output += i - 2 < len ? BASE64_CHARS.charAt((bitmap >> 6) & 63) : '=';
        output += i - 1 < len ? BASE64_CHARS.charAt(bitmap & 63) : '=';
    }
    
    return output;
}

// Node.js compatible atob function
function atob(str) {
    return base64ToBytes(str).map(byte => String.fromCharCode(byte)).join('');
}

// AES-GCM Decryption using crypto-js (React Native compatible)
function decryptAesGcm(encryptedB64, passphraseB64) {
    console.log('[Vidnest] Starting AES-GCM decryption with crypto-js...');
    
    try {
        // Import crypto-js from sandbox
        const CryptoJS = require('crypto-js');
        
        // Base64 decode encrypted data and key
        const encryptedBytes = base64ToBytes(encryptedB64);
        const keyBytes = base64ToBytes(passphraseB64).slice(0, 32); // Take first 32 bytes
        
        console.log(`[Vidnest] Encrypted data length: ${encryptedBytes.length} bytes`);
        console.log(`[Vidnest] Key length: ${keyBytes.length} bytes`);
        
        // Extract components (AES-GCM format: IV + ciphertext + auth tag)
        const iv = encryptedBytes.slice(0, 12); // 12-byte IV for GCM
        const ciphertext = encryptedBytes.slice(12, -16); // Middle part
        const tag = encryptedBytes.slice(-16); // Last 16 bytes for auth tag
        
        console.log(`[Vidnest] IV length: ${iv.length}, Ciphertext length: ${ciphertext.length}, Tag length: ${tag.length}`);
        
        // Convert to CryptoJS format
        const key = CryptoJS.lib.WordArray.create(keyBytes);
        const ivWordArray = CryptoJS.lib.WordArray.create(iv);
        const ciphertextWordArray = CryptoJS.lib.WordArray.create(ciphertext);
        const tagWordArray = CryptoJS.lib.WordArray.create(tag);
        
        // Combine ciphertext and tag for GCM
        const combined = ciphertextWordArray.concat(tagWordArray);
        
        // Decrypt using AES-GCM
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: combined },
            key,
            { 
                iv: ivWordArray, 
                mode: CryptoJS.mode.GCM, 
                padding: CryptoJS.pad.NoPadding 
            }
        );
        
        const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
        
        if (!decryptedText) {
            throw new Error('Decryption resulted in empty string');
        }
        
        console.log('[Vidnest] Successfully decrypted response with crypto-js');
        return decryptedText;
        
    } catch (error) {
        console.error(`[Vidnest] Crypto-js decryption failed: ${error.message}`);
        
        // Fallback: try manual decryption
        console.log('[Vidnest] Attempting manual decryption fallback...');
        return manualDecrypt(encryptedB64, passphraseB64);
    }
}

// Manual decryption fallback using proper AES-GCM
function manualDecrypt(encryptedB64, passphraseB64) {
    try {
        console.log('[Vidnest] Manual AES-GCM decryption fallback...');
        
        // Base64 decode encrypted data and key
        const encryptedBytes = base64ToBytes(encryptedB64);
        const keyBytes = base64ToBytes(passphraseB64).slice(0, 32); // Take first 32 bytes
        
        console.log(`[Vidnest] Encrypted data length: ${encryptedBytes.length} bytes`);
        console.log(`[Vidnest] Key length: ${keyBytes.length} bytes`);
        
        // Extract components (AES-GCM format: IV + ciphertext + auth tag)
        const iv = encryptedBytes.slice(0, 12); // 12-byte IV for GCM
        const ciphertext = encryptedBytes.slice(12, -16); // Middle part
        const tag = encryptedBytes.slice(-16); // Last 16 bytes for auth tag
        
        console.log(`[Vidnest] IV length: ${iv.length}, Ciphertext length: ${ciphertext.length}, Tag length: ${tag.length}`);
        
        // For now, let's try a different approach - use the Python script's exact logic
        // The Python script uses pycryptodome's AES.new(key, AES.MODE_GCM, nonce=iv)
        // and then cipher.decrypt_and_verify(ciphertext, tag)
        
        // Since we can't use pycryptodome in JavaScript, let's try to simulate the decryption
        // by using a simpler approach that might work for this specific case
        
        // Try to decode as if it's just base64 encoded JSON (sometimes the encryption is just base64)
        try {
            const directDecode = atob(encryptedB64);
            if (directDecode.includes('{') && directDecode.includes('}')) {
                console.log('[Vidnest] Direct base64 decode successful');
                return directDecode;
            }
        } catch (e) {
            // Not base64, continue with other methods
        }
        
        // Try to use Web Crypto API if available (for browsers)
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            console.log('[Vidnest] Attempting Web Crypto API decryption...');
            return webCryptoDecrypt(keyBytes, iv, ciphertext, tag);
        }
        
        // Fallback: return empty result for now
        console.log('[Vidnest] No suitable decryption method available');
        throw new Error('Unable to decrypt - no suitable method available');
        
    } catch (error) {
        console.error(`[Vidnest] Manual decryption error: ${error.message}`);
        throw error;
    }
}

// Web Crypto API decryption (for browsers)
function webCryptoDecrypt(keyBytes, iv, ciphertext, tag) {
    return new Promise((resolve, reject) => {
        try {
            // Import the key
            crypto.subtle.importKey(
                'raw',
                keyBytes,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            ).then(function(key) {
                // Combine ciphertext and tag for GCM
                const combinedCiphertext = new Uint8Array(ciphertext.length + tag.length);
                combinedCiphertext.set(ciphertext);
                combinedCiphertext.set(tag, ciphertext.length);
                
                // Decrypt
                return crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv: iv },
                    key,
                    combinedCiphertext
                );
            }).then(function(decryptedBuffer) {
                const decryptedText = new TextDecoder().decode(decryptedBuffer);
                console.log('[Vidnest] Web Crypto API decryption successful');
                resolve(decryptedText);
            }).catch(function(error) {
                console.error(`[Vidnest] Web Crypto API decryption failed: ${error.message}`);
                reject(error);
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    const defaultHeaders = { ...WORKING_HEADERS };
    
    return fetch(url, {
        method: options.method || 'GET',
        headers: { ...defaultHeaders, ...options.headers },
        ...options
    }).then(function(response) {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
    }).catch(function(error) {
        console.error(`[Vidnest] Request failed for ${url}: ${error.message}`);
        throw error;
    });
}

// Get movie/TV show details from TMDB
function getTMDBDetails(tmdbId, mediaType) {
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    
    return makeRequest(url)
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            const title = mediaType === 'tv' ? data.name : data.title;
            const releaseDate = mediaType === 'tv' ? data.first_air_date : data.release_date;
            const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;
            
            return {
                title: title,
                year: year,
                imdbId: data.external_ids?.imdb_id || null
            };
        });
}

// Extract quality from URL or response
function extractQuality(url) {
    if (!url) return 'Unknown';
    
    // Try to extract quality from URL patterns
    const qualityPatterns = [
        /(\d{3,4})p/i,  // 1080p, 720p, etc.
        /(\d{3,4})k/i,  // 1080k, 720k, etc.
        /quality[_-]?(\d{3,4})/i,  // quality-1080, quality_720, etc.
        /res[_-]?(\d{3,4})/i,  // res-1080, res_720, etc.
        /(\d{3,4})x\d{3,4}/i,  // 1920x1080, 1280x720, etc.
    ];

    for (const pattern of qualityPatterns) {
        const match = url.match(pattern);
        if (match) {
            const qualityNum = parseInt(match[1]);
            if (qualityNum >= 240 && qualityNum <= 4320) {
                return `${qualityNum}p`;
            }
        }
    }

    // Additional quality detection based on URL patterns
    if (url.includes('1080') || url.includes('1920')) return '1080p';
    if (url.includes('720') || url.includes('1280')) return '720p';
    if (url.includes('480') || url.includes('854')) return '480p';
    if (url.includes('360') || url.includes('640')) return '360p';
    if (url.includes('240') || url.includes('426')) return '240p';

    return 'Unknown';
}

// Process Vidnest API response
function processVidnestResponse(data, serverName, mediaInfo, seasonNum, episodeNum) {
    const streams = [];
    
    try {
        console.log(`[Vidnest] Processing response from ${serverName}:`, JSON.stringify(data, null, 2));
        
        // Check if response has success field and streams/sources
        if (!data.success && !data.streams && !data.sources) {
            console.log(`[Vidnest] ${serverName}: No valid streams found in response`);
            return streams;
        }
        
        // Extract sources or streams array
        const sources = data.sources || data.streams || [];
        
        if (!Array.isArray(sources) || sources.length === 0) {
            console.log(`[Vidnest] ${serverName}: No sources/streams array found`);
            return streams;
        }
        
        // Process each source
        sources.forEach((source, index) => {
            if (!source) return;
            
            // Extract video URL from various possible fields
            const videoUrl = source.file || source.url || source.src || source.link;
            
            if (!videoUrl) {
                console.log(`[Vidnest] ${serverName}: Source ${index} has no video URL`);
                return;
            }
            
            // Extract quality
            let quality = extractQuality(videoUrl);
            
            // Extract language information
            let languageInfo = '';
            if (source.language) {
                languageInfo = ` [${source.language}]`;
            }
            
            // Extract label information for better naming
            let labelInfo = '';
            if (source.label) {
                labelInfo = ` - ${source.label}`;
            }
            
            // Determine stream type
            let streamType = 'Unknown';
            if (source.type === 'hls' || videoUrl.includes('.m3u8')) {
                streamType = 'HLS';
                if (quality === 'Unknown') {
                    quality = 'Adaptive'; // HLS streams are usually adaptive
                }
            } else if (videoUrl.includes('.mp4')) {
                streamType = 'MP4';
            } else if (videoUrl.includes('.mkv')) {
                streamType = 'MKV';
            }
            
            // Create media title
            let mediaTitle = mediaInfo.title || 'Unknown';
            if (mediaInfo.year) {
                mediaTitle += ` (${mediaInfo.year})`;
            }
            if (seasonNum && episodeNum) {
                mediaTitle = `${mediaInfo.title} S${String(seasonNum).padStart(2, '0')}E${String(episodeNum).padStart(2, '0')}`;
            }
            
            // Create headers with referer if available
            let headers = { ...WORKING_HEADERS };
            if (source.headers && source.headers.Referer) {
                headers.Referer = source.headers.Referer;
            }
            
            streams.push({
                name: `Vidnest ${serverName.charAt(0).toUpperCase() + serverName.slice(1)}${labelInfo}${languageInfo} - ${quality}`,
                title: mediaTitle,
                url: videoUrl,
                quality: quality,
                size: 'Unknown',
                headers: headers,
                provider: 'vidnest'
            });
            
            console.log(`[Vidnest] ${serverName}: Added ${quality}${languageInfo} stream: ${videoUrl.substring(0, 60)}...`);
        });
        
    } catch (error) {
        console.error(`[Vidnest] Error processing ${serverName} response: ${error.message}`);
    }
    
    return streams;
}

// Fetch streams from a single server
function fetchFromServer(serverName, mediaType, tmdbId, mediaInfo, seasonNum, episodeNum) {
    console.log(`[Vidnest] Fetching from ${serverName}...`);
    
    // Build API URL
    let apiUrl;
    if (mediaType === 'tv' && seasonNum && episodeNum) {
        apiUrl = `${VIDNEST_BASE_URL}/${serverName}/${mediaType}/${tmdbId}/${seasonNum}/${episodeNum}`;
    } else {
        apiUrl = `${VIDNEST_BASE_URL}/${serverName}/${mediaType}/${tmdbId}`;
    }
    
    console.log(`[Vidnest] ${serverName} API URL: ${apiUrl}`);
    
    return makeRequest(apiUrl)
        .then(function(response) {
            return response.text();
        })
        .then(function(responseText) {
            console.log(`[Vidnest] ${serverName} response length: ${responseText.length} characters`);
            
            // Try to parse as JSON first
            try {
                const data = JSON.parse(responseText);
                
                // Check if response contains encrypted data
                if (data.encrypted && data.data) {
                    console.log(`[Vidnest] ${serverName}: Detected encrypted response, decrypting...`);
                    
                    return decryptAesGcm(data.data, PASSPHRASE)
                        .then(function(decryptedText) {
                            console.log(`[Vidnest] ${serverName}: Decryption successful`);
                            
                            try {
                                const decryptedData = JSON.parse(decryptedText);
                                return processVidnestResponse(decryptedData, serverName, mediaInfo, seasonNum, episodeNum);
                            } catch (parseError) {
                                console.error(`[Vidnest] ${serverName}: JSON parse error after decryption: ${parseError.message}`);
                                return [];
                            }
                        });
                } else {
                    // Process non-encrypted response
                    return processVidnestResponse(data, serverName, mediaInfo, seasonNum, episodeNum);
                }
            } catch (parseError) {
                console.error(`[Vidnest] ${serverName}: Invalid JSON response: ${parseError.message}`);
                return [];
            }
        })
        .catch(function(error) {
            console.error(`[Vidnest] ${serverName} error: ${error.message}`);
            return [];
        });
}

// Main function to extract streaming links for Nuvio
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log(`[Vidnest] Starting extraction for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === 'tv' ? `, S:${seasonNum}E:${episodeNum}` : ''}`);
    
    return new Promise((resolve, reject) => {
        // First, fetch media details from TMDB
        getTMDBDetails(tmdbId, mediaType)
            .then(function(mediaInfo) {
                console.log(`[Vidnest] TMDB Info: "${mediaInfo.title}" (${mediaInfo.year || 'N/A'})`);
                
                // Process both servers in parallel
                const serverPromises = SERVERS.map(serverName => {
                    return fetchFromServer(serverName, mediaType, tmdbId, mediaInfo, seasonNum, episodeNum);
                });
                
                return Promise.all(serverPromises)
                    .then(function(results) {
                        // Combine all streams from all servers
                        const allStreams = [];
                        results.forEach(streams => {
                            allStreams.push(...streams);
                        });
                        
                        // Remove duplicate streams by URL
                        const uniqueStreams = [];
                        const seenUrls = new Set();
                        allStreams.forEach(stream => {
                            if (!seenUrls.has(stream.url)) {
                                seenUrls.add(stream.url);
                                uniqueStreams.push(stream);
                            }
                        });
                        
                        // Sort streams by quality (highest first)
                        const getQualityValue = (quality) => {
                            const q = quality.toLowerCase().replace(/p$/, ''); // Remove trailing 'p'
                            
                            // Handle specific quality names
                            if (q === '4k' || q === '2160') return 2160;
                            if (q === '1440') return 1440;
                            if (q === '1080') return 1080;
                            if (q === '720') return 720;
                            if (q === '480') return 480;
                            if (q === '360') return 360;
                            if (q === '240') return 240;
                            
                            // Handle unknown quality (put at end)
                            if (q === 'unknown') return 0;
                            
                            // Try to parse as number
                            const numQuality = parseInt(q);
                            if (!isNaN(numQuality) && numQuality > 0) {
                                return numQuality;
                            }
                            
                            // Default for unrecognized qualities
                            return 1;
                        };
                        
                        uniqueStreams.sort((a, b) => {
                            const qualityA = getQualityValue(a.quality);
                            const qualityB = getQualityValue(b.quality);
                            return qualityB - qualityA;
                        });
                        
                        console.log(`[Vidnest] Total streams found: ${uniqueStreams.length}`);
                        resolve(uniqueStreams);
                    });
            })
            .catch(function(error) {
                console.error(`[Vidnest] Error fetching media details: ${error.message}`);
                resolve([]); // Return empty array on error for Nuvio compatibility
            });
    });
}

// Export for React Native compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
