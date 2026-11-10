# YouTube AI Video Filter

Chrome extension that hides YouTube videos labelled as AI-generated, and every video from channels on your AI blocklist.

A channel is added to the blocklist automatically when YouTube labels one of its videos as altered or generated with AI. You can also mark or unmark a channel from the bar below a video or on the channel page. A blocked video that opens in the player is paused behind an overlay with a "Show anyway" button, and autoplay skips past it.

## Install

Requires Chrome 111 or newer (or another Chromium browser). Firefox is not supported.

1. Clone or download this repository
2. Open `chrome://extensions` and turn on **Developer mode**
3. Click **Load unpacked** and choose the repository root

The toolbar popup lists blocked channels, toggles filtering, switches language (English/Finnish) and exports or imports the blocklist as JSON.

## Privacy

The blocklist and settings are stored in `chrome.storage.local` on your machine. The extension makes no network requests of its own; it reads the data YouTube already sends to the page.

## Development

```sh
npm test
```

Needs Node 20 or newer. There are no dependencies to install.

## License

MIT
