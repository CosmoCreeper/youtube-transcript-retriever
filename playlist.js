console.clear();
const prompt = require("prompt-sync")({sigint: true});

const API_KEY = prompt("What is your API key (Youtube Data API v3)? ");
let PLAYLIST_ID = prompt("What is the ID of your playlist? ");
if (PLAYLIST_ID === "") PLAYLIST_ID = "PLDgRNhRk716aAzsef8-FSiybk9_BSz02C";

const COMPLETED_TRANSCRIPTS_FILE = `${PLAYLIST_ID}.completed_transcripts.json`;
let TRANSCRIPTS_OUTPUT_FILE = prompt("Name of completion file (Where transcripts are saved). ");
if (TRANSCRIPTS_OUTPUT_FILE === "") TRANSCRIPTS_OUTPUT_FILE = `${PLAYLIST_ID}.transcripts.txt`;

console.clear();

const puppeteer = require('puppeteer');
const xml2js = require('xml2js');
const he = require('he');
const axios = require('axios');
const fs = require('fs');

// Load completed transcripts from file
let completedTranscripts = [];
if (fs.existsSync(COMPLETED_TRANSCRIPTS_FILE)) {
    const data = fs.readFileSync(COMPLETED_TRANSCRIPTS_FILE);
    completedTranscripts = JSON.parse(data);
}

async function getVideoIds(playlistId) {
    try {
        let videoIds = [];
        let nextPageToken = '';

        do {
            const playlistResponse = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&key=${API_KEY}&maxResults=50&pageToken=${nextPageToken}`);
            const items = playlistResponse.data.items;

            videoIds.push(...items.map(item => item.snippet.resourceId.videoId));
            nextPageToken = playlistResponse.data.nextPageToken;
        } while (nextPageToken);

        return videoIds;
    } catch (error) {
        console.error('Error fetching video IDs from playlist:', error);
        return [];
    }
}

async function getCaptions(videoId) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle2' });

    const captionsUrl = await page.evaluate(() => {
        if (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
            const rawPlayerResponse = window.ytplayer.config.args.raw_player_response;
            if (rawPlayerResponse && rawPlayerResponse.captions) {
                const captionTracks = rawPlayerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
                if (captionTracks && captionTracks.length > 0) {
                    return captionTracks[0].baseUrl; // Return the first caption track URL
                }
            }
        }
        return null; // Return null if no captions are found
    });

    let plain = '';

    if (captionsUrl) {
        try {
            const response = await page.goto(captionsUrl, { waitUntil: 'networkidle2' });
            const xmlText = await response.text(); // Get the XML text

            // Parse the XML
            await xml2js.parseString(xmlText, (err, result) => {
                if (err) {
                    console.error('Error parsing XML:', err);
                } else {
                    // Extract and decode captions
                    result["transcript"]["text"].forEach((el) => {
                        if (el["_"]) {
                            plain += he.decode(el["_"]) + " "; // Decode HTML entities
                        }
                    });
                }
            });
        } catch (error) {
            console.error('Error fetching captions:', error);
        }
    } else {
        console.log(`No captions URL found for video ID: ${videoId}`);
    }

    await browser.close();
    return plain.trim();
}

(async () => {
    const videoIds = await getVideoIds(PLAYLIST_ID);
    console.log("Retrieved video IDs.");
    console.log(`0/${videoIds.length} transcripts are completed.\n`);
    let allTranscripts = ''; // String to accumulate all transcripts
    let currTranscript = 0;

    for (const videoId of videoIds) {
        currTranscript++;
        // Skip already completed transcripts
        if (completedTranscripts.includes(videoId)) {
            console.log(`Skipping already completed transcript for video ID: ${videoId}`);
            continue;
        }

        try {
            const transcript = await getCaptions(videoId);
            if (transcript) {
                const videoName = `Video ID: ${videoId}`; // You can customize this to include the video title if needed
                // Accumulate the transcript
                if (currTranscript === 1) allTranscripts += `--> ${videoName}\n\n${transcript}`;
                else allTranscripts += `\n\n--> ${videoName}\n\n${transcript}`;
                // Add the video ID to the completed list
                completedTranscripts.push(videoId);
                // Save the updated list of completed transcripts to the file
                fs.writeFileSync(COMPLETED_TRANSCRIPTS_FILE, JSON.stringify(completedTranscripts, null, 2));
                console.log(`Completed video transcript: ${videoId}. ${currTranscript}/${videoIds.length}`);
            }
        } catch (error) {
            if (error.response && error.response.data.error.code === 403) {
                console.error('Quota exceeded. Saving current transcripts and exiting.');
                // Save the accumulated transcripts to the output file
                fs.writeFileSync(TRANSCRIPTS_OUTPUT_FILE, allTranscripts);
                console.log(`Transcripts saved to ${TRANSCRIPTS_OUTPUT_FILE}. Exiting...`);
                return; // Exit the script
            } else {
                console.error('Error fetching captions:', error);
            }
        }
    }

    // After processing all videos, save the accumulated transcripts to the output file
    if (allTranscripts) {
        fs.writeFileSync(TRANSCRIPTS_OUTPUT_FILE, allTranscripts);
        console.log(`All transcripts saved to ${TRANSCRIPTS_OUTPUT_FILE}.`);
    }
})();
                