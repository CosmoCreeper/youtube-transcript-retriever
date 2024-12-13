# ⏯️ Youtube Transcript Retriever
This script makes it possible to download the transcripts of every video in a playlist (Youtube).
If this script would be useful to you, please consider giving it a shot.

## Installation
We now have a much easier way to use this tool, even if you are not a developer.
This method has just one prerequisite, you must have a Youtube Data API v3 API Key.
After that, all you have to do is go to the releases page of this repo and download the .exe from the latest version.
Once you have done this, you may open up the exe and begin transcript-ing!

If you would like to use this tool without the .exe, you must have the following requirements.
- NodeJS
- Yarn or NPM. (Not sure of PNPM)
- Youtube Data API v3 | API Key

Once you have acquired these prerequisites, you may continue with the installation.
Download the .zip file from this repo. Move it to your wanted location and extract it.
Open the folder and run the following commands.

If you have yarn:
```
  yarn
  node playlist.js
```

If you have npm:
```
  npm install
  node playlist.js
```

That's all. Enjoy!

## Common questions
How do I get the ID of a playlist? Simply go to the playlist on youtube and copy the part of the url that comes after "youtube.com/playlist?list=".